import { pool } from "../../db.js";
import sql from 'mssql';


async function getProjectDashboard(req,res) {
    try {
          const clusterID = parseInt(req.body.clusterID, 10) || 0;
        const organisationID = parseInt(req.body.organisationID, 10) || 0;

        const fromFoundationTentativeDate = req.body.fromFoundationTentativeDate || null;
        const toFoundationTentativeDate = req.body.toFoundationTentativeDate || null;
        const fromTentativeInaugurationDate = req.body.fromTentativeInaugurationDate || null;
        const toTentativeInaugurationDate = req.body.toTentativeInaugurationDate || null;        
        const fromAwardedDate = req.body.fromAwardedDate || null;
        const toAwardedDate = req.body.toAwardedDate || null;
        const fromActCompletionDate = req.body.fromActCompletionDate || null;
        const toActCompletionDate = req.body.toActCompletionDate || null;
        const fromSantionedDate = req.body.fromSantionedDate || null;
        const toSantionedDate = req.body.toSantionedDate || null;


        const conn = await pool;
        const request = conn.request();
 
        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);

        request.input("fromFoundationTentativeDate", fromFoundationTentativeDate);
        request.input("toFoundationTentativeDate", toFoundationTentativeDate);
        request.input("fromTentativeInaugurationDate", fromTentativeInaugurationDate);
        request.input("toTentativeInaugurationDate", toTentativeInaugurationDate);
        request.input("fromAwardedDate", fromAwardedDate);
        request.input("toAwardedDate", toAwardedDate);
        request.input("fromActCompletionDate", fromActCompletionDate);
        request.input("toActCompletionDate", toActCompletionDate);
        request.input("fromSantionedDate", fromSantionedDate);
        request.input("toSantionedDate", toSantionedDate);

                console.log("org", clusterID)

        console.log(fromFoundationTentativeDate, toFoundationTentativeDate, toAwardedDate, toActCompletionDate, "FINAL DATE");           

        const combinedQuery = `     
            SELECT
                COUNT(DISTINCT COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)) AS total_projects,

                SUM(
                    COALESCE(
                        tbl_sub_project.sub_estimated_cost,
                        tbl_project.estimated_cost
                    )
                ) AS total_cost,


                SUM(
                    COALESCE(
                        tbl_sub_project.sub_capacity_addition,
                        tbl_project.capacity_addition
                    )
                ) AS total_capacity_addition,





                                
                -- Total EPC Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Total_EPC_Count,

                -- Total EPC Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost)
                    ELSE 0
                END) AS Total_EPC_Cost,


                -- Total PPP Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Total_PPP_Count,

                -- Total PPP Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost)
                    ELSE 0
                END) AS Total_PPP_Cost,





                -- Planning
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) BETWEEN 0 AND 11 
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Planning_Count,

                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) BETWEEN 0 AND 11 
                    THEN COALESCE(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost)
                    ELSE 0 
                END) AS Planning_Cost,

                   SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) BETWEEN 0 AND 11 
                    THEN COALESCE(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition)
                    ELSE 0 
                END) AS Cap_Add_Planning_Cost,


                




                -- Planning EPC Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) BETWEEN 0 AND 11
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Planning_EPC_Count,

                -- Planning EPC Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) BETWEEN 0 AND 11
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost)
                    ELSE 0
                END) AS Planning_EPC_Cost,


                -- Planning PPP Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) BETWEEN 0 AND 11
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Planning_PPP_Count,

                -- Planning PPP Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) BETWEEN 0 AND 11
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost)
                    ELSE 0
                END) AS Planning_PPP_Cost,






                -- Tendering
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12 
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Tendering_Count,

                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12 
                     --   AND pd.project_id IS NOT NULL
                    THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                    ELSE 0 
                END) AS Tendering_Cost,
                
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12 
                     --   AND pd.project_id IS NOT NULL
                    THEN COALESCE(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition)
                    ELSE 0 
                END) AS Cap_Add_Tendering_Cost,






                -- UT EPC Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Ut_EPC_Count,

                -- UT EPC Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                    ELSE 0
                END) AS Ut_EPC_Cost,


                -- UT PPP Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Ut_PPP_Count,

                -- Ut PPP Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                    ELSE 0
                END) AS Ut_PPP_Cost,




                -- Implementation
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13 
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Implementation_Count,

                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13 
                    THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                    ELSE 0 
                END) AS Implementation_Cost,

                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13 
                    THEN COALESCE(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition)
                    ELSE 0 
                END) AS Cap_Add_Implementation_Cost,




                -- UT EPC Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Ui_EPC_Count,

                -- UT EPC Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                    THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                    ELSE 0
                END) AS Ui_EPC_Cost,


                -- UT PPP Count
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Ui_PPP_Count,

                -- UI PPP Cost
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                        AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                    THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                    ELSE 0
                END) AS Ui_PPP_Cost,




                -- Completed
                COUNT(DISTINCT CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                    THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
                END) AS Completed_Count,

                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                    THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                    ELSE 0 
                END) AS Completed_Cost,


                

                
                SUM(CASE 
                    WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                    THEN COALESCE(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition)
                    ELSE 0 
                END) AS Cap_Add_Completed_Cost,





                -- Completed EPC Count
            COUNT(DISTINCT CASE 
                WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14
                    AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
            END) AS Completed_EPC_Count,

            -- Completed EPC Cost
            SUM(CASE 
                WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14
                    AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'EPC'
                THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                ELSE 0
            END) AS Completed_EPC_Cost,


            -- Completed PPP Count
            COUNT(DISTINCT CASE 
                WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14
                    AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                THEN COALESCE(tbl_sub_project.sub_project_id, tbl_project.project_id)
            END) AS Completed_PPP_Count,

            -- Completed PPP Cost
            SUM(CASE 
                WHEN COALESCE(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14
                    AND COALESCE(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) = 'PPP'
                THEN COALESCE(tbl_sub_project.sub_award_project_cost, tbl_project.award_project_cost)
                ELSE 0
            END) AS Completed_PPP_Cost


            FROM tbl_project

            LEFT JOIN tbl_sub_project 
                ON tbl_project.project_id = tbl_sub_project.project_id

            LEFT JOIN (
                SELECT DISTINCT project_id, sub_project_id, actual_date
                FROM tbl_project_date
                WHERE sub_stage_id = 9 
                AND actual_date IS NOT NULL
            ) pd 
            ON pd.project_id = tbl_project.project_id
            AND (
                    (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
                OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
                )

            INNER JOIN mmt_organisation 
                ON tbl_project.organisation_id = mmt_organisation.organisation_id

            INNER JOIN mmt_hr_cluster 
                ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

            WHERE
                --  Dynamic filters
                (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR mmt_organisation.organisation_id = @organisationID)

                AND (
                        (tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1)
                        OR 
                        (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1)
                    )

                      
    -- Foundation Date

                    AND (
                        (@fromFoundationTentativeDate IS NULL OR @toFoundationTentativeDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_foundation_tentative_date, 
                                    tbl_project.foundation_tentative_date
                                ) AS DATE
                            ) BETWEEN @fromFoundationTentativeDate AND @toFoundationTentativeDate
                        )
                    )
                        

                    
    -- Inauguration Date
                    AND (
                        (@fromTentativeInaugurationDate IS NULL OR @toTentativeInaugurationDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_tentative_inauguration_date, 
                                    tbl_project.tentative_inauguration_date
                                ) AS DATE
                            ) BETWEEN @fromTentativeInaugurationDate AND @toTentativeInaugurationDate
                        )
                    )


                        -- Work Awarded Date
    AND (
        (@fromAwardedDate IS NULL OR @toAwardedDate IS NULL)
        OR
        (
            TRY_CAST(pd.actual_date AS DATE)
            BETWEEN @fromAwardedDate AND @toAwardedDate
        )
    )


        -- Actual Completion Date

                    AND (
                        (@fromActCompletionDate IS NULL OR @toActCompletionDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                        tbl_sub_project.sub_actual_date_of_completion,
                                        tbl_project.actual_date_of_completion
                                ) AS DATE
                            ) BETWEEN @fromActCompletionDate AND @toActCompletionDate
                        )
                    )




                     
                --Santioned date
                    AND (
                        (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                     tbl_sub_project.sub_chairman_approval_date,
                                        tbl_project.chairman_approval_date,
                                        tbl_sub_project.sub_admin_approval_approval_date,
                                        tbl_project.admin_approval_approval_date
                                ) AS DATE
                            ) BETWEEN @fromSantionedDate AND @toSantionedDate
                        )
                    )
        `;

        const combinedResult = await request.query(combinedQuery);

        return res.json({
            combinedTotals: combinedResult.recordset[0],
            message: "stage wise projects"
        });

    } catch (error) {
        console.error("Error stage wise projects:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function detailedStageWiseProjectData(req, res) {
  try {

     const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    let firstDateCurrentFy, todayDate;

    if (currentDate.getMonth() + 1 <= 3) {
        firstDateCurrentFy = (currentYear - 1) + "-04-01";
    } else {
        firstDateCurrentFy = currentYear + "-04-01";
    }

    todayDate = currentDate.toISOString().split('T')[0];

        const clusterID = parseInt(req.body.clusterID, 10) || 0;
        const organisationID = parseInt(req.body.organisationID, 10) || 0;
        const stageType = req.body.stage || 'overall';

        const fromFoundationDate = req.body.fromFoundationDate || null;
        const toFoundationDate = req.body.toFoundationDate || null;
        const fromTentativeDate = req.body.fromTentativeDate || null;
        const toTentativeDate = req.body.toTentativeDate || null;

        const fromWorkAwardedDate = req.body.fromWorkAwardedDate || null;
        const toWorkAwardedDate = req.body.toWorkAwardedDate || null;
        const fromActualCompletionDate = req.body.fromActualCompletionDate || null;
        const toActualCompletionDate = req.body.toActualCompletionDate || null;

        const fromSantionedDate = req.body.fromSantionedDate || null;
        const toSantionedDate = req.body.toSantionedDate || null;


 console.log(fromFoundationDate, typeof(fromFoundationDate), toFoundationDate, fromTentativeDate, toTentativeDate, "FINAL DATE");           

        let stageFilter = '';
        switch (stageType.toLowerCase()) {
        case 'overall':
            stageFilter = '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14';
            break;
        case 'underdevelopment':
            stageFilter = '0,1,2,3,4,5,6,7,8,9,10,11';
            break;
        case 'undertendering':
            stageFilter = '12';
            break;
        case 'underimplementation':
            stageFilter = '13';
            break;
        case 'completedprojects':
            stageFilter = '14';
            break;
        default:
            stageFilter = '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14';
        }

    const conn = await pool;
    const request = conn.request();
    
    request.input("firstDateCurrentFy", firstDateCurrentFy);
    request.input("todayDate", todayDate);
    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);
    request.input("stageFilter", stageFilter);
    
        request.input("fromFoundationDate", fromFoundationDate);
        request.input("toFoundationDate", toFoundationDate);
        request.input("fromTentativeDate", fromTentativeDate);
        request.input("toTentativeDate", toTentativeDate);
        
        request.input("fromWorkAwardedDate", fromWorkAwardedDate);
        request.input("toWorkAwardedDate", toWorkAwardedDate);
        request.input("fromActualCompletionDate", fromActualCompletionDate);
        request.input("toActualCompletionDate", toActualCompletionDate);
        request.input("fromSantionedDate", fromSantionedDate);
        request.input("toSantionedDate", toSantionedDate);
        
        console.log("stageFilter", stageFilter)

      const result = await request.query(`

        ;WITH ProjectBase AS
        (
            SELECT 
                tbl_project.project_id,
                tbl_sub_project.sub_project_id,

                COALESCE(
                    tbl_sub_project.sub_current_project_stage_id, 
                    tbl_project.current_project_stage_id
                ) AS final_stage_id,

                COALESCE(
                    tbl_sub_project.sub_award_project_cost, 
                    tbl_project.award_project_cost
                ) AS final_cost

            FROM tbl_project

            LEFT JOIN tbl_sub_project 
                ON tbl_project.project_id = tbl_sub_project.project_id

                LEFT JOIN (
                SELECT DISTINCT project_id, sub_project_id, actual_date
                FROM tbl_project_date
                WHERE sub_stage_id = 9 
                AND actual_date IS NOT NULL
            ) pd 
            ON pd.project_id = tbl_project.project_id
            AND (
                    (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
                OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
                )


            INNER JOIN mmt_organisation 
                ON tbl_project.organisation_id = mmt_organisation.organisation_id

            INNER JOIN mmt_hr_cluster 
                ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

            WHERE
                (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR mmt_organisation.organisation_id = @organisationID)

                AND (
                    (tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1)
                    OR 
                    (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1)
                )
    
                --DATE FILTER
                -- Foundation Date
                AND (
                (@fromFoundationDate IS NULL OR @toFoundationDate IS NULL)
                OR
                (
                    TRY_CAST(
                        COALESCE(
                            tbl_sub_project.sub_foundation_tentative_date,
                            tbl_project.foundation_tentative_date
                        ) AS DATE
                    ) BETWEEN @fromFoundationDate AND @toFoundationDate
                )
            )
            
            -- Inauguration Date
            AND (
                (@fromTentativeDate IS NULL OR @toTentativeDate IS NULL)
                OR
                (
                    TRY_CAST(
                        COALESCE(
                            tbl_sub_project.sub_tentative_inauguration_date,
                            tbl_project.tentative_inauguration_date
                        ) AS DATE
                    ) BETWEEN @fromTentativeDate AND @toTentativeDate
                )
            )

            -- Work Awarded Date
            AND (
                (@fromWorkAwardedDate IS NULL OR @toWorkAwardedDate IS NULL)
                OR
                (
                    TRY_CAST(pd.actual_date AS DATE)
                    BETWEEN @fromWorkAwardedDate AND @toWorkAwardedDate
                )
            )
    
            -- Actual Completion Date
            AND (
                (@fromActualCompletionDate IS NULL OR @toActualCompletionDate IS NULL)
                OR
                (
                    TRY_CAST(
                        COALESCE(
                            tbl_sub_project.sub_actual_date_of_completion,
                            tbl_project.actual_date_of_completion
                        ) AS DATE
                    ) BETWEEN @fromActualCompletionDate AND @toActualCompletionDate
                )
            )
                     
            --Santioned date
                AND (
                    (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                    tbl_sub_project.sub_chairman_approval_date,
            tbl_project.chairman_approval_date,
            tbl_sub_project.sub_admin_approval_approval_date,
            tbl_project.admin_approval_approval_date
                            ) AS DATE
                        ) BETWEEN @fromSantionedDate AND @toSantionedDate
                    )
                )


        ),

        FinalData AS
        (
            SELECT 
                mmt_organisation.organisation_name,

                CASE 
                    WHEN ProjectBase.sub_project_id IS NOT NULL THEN ProjectBase.sub_project_id
                    ELSE ProjectBase.project_id
                END AS project_id,

                tbl_project.project_name,
                tbl_sub_project.sub_project_name,

                CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated), 106) AS last_updated_date,

                ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,

                CONVERT(VARCHAR,
                    CASE 
                        WHEN ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) = 'Port level approval'
                            THEN ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                        ELSE 
                            ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                    END,
                106) AS sanctioned_date,

                CONVERT(VARCHAR, workDate.work_awarded_date, 106) AS work_awarded_date,

                CONVERT(VARCHAR,
                    CASE 
                        WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL 
                            OR tbl_project.actual_date_of_completion IS NOT NULL
                        THEN ISNULL(
                                tbl_sub_project.sub_actual_date_of_completion,
                                tbl_project.actual_date_of_completion
                            )
                        ELSE ISNULL(
                                tbl_sub_project.sub_target_completion_date,
                                tbl_project.target_completion_date
                            )
                    END,
                106) AS completion_date,

                ISNULL(currentFY.current_fy_expenditure, 0) AS current_fy_expenditure,

                ISNULL(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,
                    
                CASE 
                    WHEN phyProgress.physical_progress_value IS NOT NULL 
                    THEN CAST(phyProgress.physical_progress_value AS VARCHAR) + ' %'
                    ELSE ''
                END AS physical_progress_value,

                financialProgress.financial_progress,

                stageName.stage_name AS current_stage_name,


                CASE 

                    -- 0 → Project Initiated (no column → NULL safe)
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
                    THEN 'Project Initiated  (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
                    ,106) + ')'

                    -- 1 → Pre-Feasibility
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
                    THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
                    ,106) + ')'

                    -- 2 → DPR
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
                    THEN 'DPR (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
                    ,106) + ')'

                    -- 3 → Chairman Approval
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
                    THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                    ,106) + ')'

                    -- 4 → Ministry Submission
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
                    THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                    ,106) + ')'

                    -- 5 → Submitted to Ministry
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
                    THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                    ,106) + ')'

                    -- 6 → DA
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
                    THEN 'DA Concurrence (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
                    ,106) + ')'

                    -- 7 → IFW
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
                    THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
                    ,106) + ')'

                    -- 8 → IMC Circulation
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
                    THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
                    ,106) + ')'

                    -- 9 → Response to Comments
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
                    THEN 'Response to Comments received (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
                    ,106) + ')'

                    -- 10 → SFC / EFC
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
                    THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
                    ,106) + ')'

                    -- 11 → Admin Approval
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
                    THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                    ,106) + ')'

                    -- 12 → TENDERING
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                    THEN
                    (
                        SELECT TOP 1 
                            CASE tbl_project_date.sub_stage_id
                                WHEN 3 THEN 'Tech. Sanction obtained'
                                WHEN 4 THEN 'Tender Document approved'
                                WHEN 5 THEN 'Tender Notice Issued'
                                WHEN 6 THEN 'Technical Evaluation completed'
                                WHEN 7 THEN 'Financial Evaluation completed'
                                WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
                                WHEN 9 THEN 'Work Awarded / LOA Issued'
                                WHEN 10 THEN 'Contract Agreement Signed'
                            END
                            + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
                        FROM tbl_project_date
                        WHERE tbl_project_date.project_id = tbl_project.project_id
                        AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                        AND tbl_project_date.actual_date IS NOT NULL
                        ORDER BY tbl_project_date.actual_date DESC
                    )
                    -- 13 → IMPLEMENTATION
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                    THEN
                    (
                        CASE 
                            WHEN phyProgress.physical_progress_value BETWEEN 0 AND 19 
                            THEN 
                                'Milestone 0 (' + 
                                CONVERT(VARCHAR,
                                    (SELECT MAX(end_date)
                                    FROM tbl_project_activity
                                    WHERE project_id = tbl_project.project_id
                                    AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND milestone_id = 0
                                    ),106) + ')'

                            WHEN phyProgress.physical_progress_value BETWEEN 20 AND 39 
                            THEN 
                                'Milestone 1 (' + 
                                CONVERT(VARCHAR,
                                    (SELECT MAX(end_date)
                                    FROM tbl_project_activity
                                    WHERE project_id = tbl_project.project_id
                                    AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND milestone_id = 1
                                    ),106) + ')'

                            WHEN phyProgress.physical_progress_value BETWEEN 40 AND 59 
                            THEN 
                                'Milestone 2 (' + 
                                CONVERT(VARCHAR,
                                    (SELECT MAX(end_date)
                                    FROM tbl_project_activity
                                    WHERE project_id = tbl_project.project_id
                                    AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND milestone_id = 2
                                    ),106) + ')'

                            WHEN phyProgress.physical_progress_value BETWEEN 60 AND 79 
                            THEN 
                                'Milestone 3 (' + 
                                CONVERT(VARCHAR,
                                    (SELECT MAX(end_date)
                                    FROM tbl_project_activity
                                    WHERE project_id = tbl_project.project_id
                                    AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND milestone_id = 3
                                    ),106) + ')'

                            WHEN phyProgress.physical_progress_value BETWEEN 80 AND 99 
                            THEN 
                                'Milestone 4 (' + 
                                CONVERT(VARCHAR,
                                    (SELECT MAX(end_date)
                                    FROM tbl_project_activity
                                    WHERE project_id = tbl_project.project_id
                                    AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND milestone_id = 4
                                    ),106) + ')'

                            WHEN phyProgress.physical_progress_value = 100 
                            THEN 
                                'Milestone 5 (' + 
                                CONVERT(VARCHAR,
                                    (SELECT MAX(end_date)
                                    FROM tbl_project_activity
                                    WHERE project_id = tbl_project.project_id
                                    AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND milestone_id = 5
                                    ),106) + ')'

                            ELSE 'Not Started'
                        END
                    )

                    -- 14 → COMPLETED
                    WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                    THEN 'Completed (' + CONVERT(VARCHAR,
                        ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
                    ,106) + ')'

                END AS current_sub_stage,


                CASE
                    WHEN tbl_project.actual_date_of_completion IS NULL
                        OR tbl_project.target_completion_date IS NULL
                        THEN 'In Progress'
                    WHEN tbl_project.actual_date_of_completion <= tbl_project.target_completion_date
                        THEN 'On Time'
                    ELSE 'Delayed'
                END AS project_status,

                ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
            
                ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,
                
                ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,
                
                ISNULL((
                    SELECT STRING_AGG(mpc.project_category_name, ', ')
                    FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS sps
                    JOIN mmt_project_category AS mpc 
                        ON TRY_CAST(sps.value AS INT) = mpc.project_category_id
                ), (
                    SELECT STRING_AGG(mpc.project_category_name, ', ')
                    FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS ps
                    JOIN mmt_project_category AS mpc 
                        ON TRY_CAST(ps.value AS INT) = mpc.project_category_id
                )) AS project_category_names,


                --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
                CONVERT(VARCHAR,
                    CASE 
                        WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
                            OR tbl_project.foundation_laid_date IS NOT NULL
                        THEN ISNULL(
                                tbl_sub_project.sub_foundation_laid_date,
                                tbl_project.foundation_laid_date
                            )
                        ELSE ISNULL(
                                tbl_sub_project.sub_foundation_tentative_date,
                                tbl_project.foundation_tentative_date
                            )
                    END,
                106) AS foundation_laid_date,

            -- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
                CONVERT(VARCHAR,
                    CASE 
                        WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
                            OR tbl_project.inauguration_date IS NOT NULL
                        THEN ISNULL(
                                tbl_sub_project.sub_inauguration_date,
                                tbl_project.inauguration_date
                            )
                        ELSE ISNULL(
                                tbl_sub_project.sub_tentative_inauguration_date,
                                tbl_project.tentative_inauguration_date
                            )
                    END,
                106) AS inauguration_date,

                -- DUPLICATE CONTROL
                ROW_NUMBER() OVER (
                    PARTITION BY 
                        CASE 
                            WHEN ProjectBase.sub_project_id IS NOT NULL THEN ProjectBase.sub_project_id
                            ELSE ProjectBase.project_id
                        END
                    ORDER BY ProjectBase.project_id
                ) AS row_num

            FROM ProjectBase

            INNER JOIN tbl_project     
                ON tbl_project.project_id = ProjectBase.project_id

            LEFT JOIN tbl_sub_project 
                ON tbl_sub_project.project_id = ProjectBase.project_id
                AND ISNULL(tbl_sub_project.sub_project_id,-1) = ISNULL(ProjectBase.sub_project_id,-1)

            INNER JOIN mmt_organisation 
                ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)

            INNER JOIN mmt_hr_cluster 
                ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

            LEFT JOIN 
            (
                SELECT 
                    project_id,
                    sub_project_id,             
                -- If actual_date exists, take it, otherwise take planned_date
                MAX(ISNULL(actual_date, planned_date)) AS work_awarded_date
                FROM tbl_project_date
                WHERE sub_stage_id = 9
                GROUP BY project_id, sub_project_id
            ) workDate
                ON workDate.project_id = tbl_project.project_id
                AND ISNULL(workDate.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                LEFT JOIN 
                (
                    SELECT 
                        project_id,
                        sub_project_id,
                        MAX(physical_progress) AS physical_progress_value
                    FROM tbl_project_physical_progress
                    GROUP BY project_id, sub_project_id
                ) AS phyProgress
                    ON phyProgress.project_id = ProjectBase.project_id
                    AND ISNULL(phyProgress.sub_project_id,-1) = ISNULL(ProjectBase.sub_project_id,-1)

            LEFT JOIN 
            (
                SELECT 
                    project_id,
                    sub_project_id,
                    SUM(
                        ISNULL(gbs_components,0) + ISNULL(iebr_components,0) +
                        ISNULL(ppp_components,0) + ISNULL(loans_components,0) +
                        ISNULL(multilateral_components,0) + ISNULL(state_gov_fund_components,0) +
                        ISNULL(pmmsy_components,0) + ISNULL(sagarmala_components,0) +
                        ISNULL(other_source_funding_comp,0)
                    ) AS current_fy_expenditure
                FROM tbl_project_expenditure
                WHERE expenditure_date BETWEEN @firstDateCurrentFy AND @todayDate
                GROUP BY project_id, sub_project_id
            ) AS currentFY
                ON currentFY.project_id = ProjectBase.project_id
                AND ISNULL(currentFY.sub_project_id,-1) = ISNULL(ProjectBase.sub_project_id,-1)

                LEFT JOIN 
                (
                    SELECT 
                        tbl_project_expenditure.project_id,
                        tbl_project_expenditure.sub_project_id,

                        ROUND(
                            (
                                SUM(
                                    ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                                    ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                                    ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                                    ISNULL(tbl_project_expenditure.loans_components, 0) + 
                                    ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                                    ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                                    ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                     
                                    ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                                    ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                                ) 
                                /
                                NULLIF(
                                    (ISNULL(tbl_project.award_project_cost, 0) + 
                                    ISNULL(tbl_sub_project.sub_award_project_cost, 0)), 0
                                )
                            ) * 100
                        , 2) AS financial_progress

                    FROM tbl_project_expenditure

                    LEFT JOIN tbl_project 
                        ON tbl_project.project_id = tbl_project_expenditure.project_id

                    LEFT JOIN tbl_sub_project 
                        ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

                    GROUP BY 
                        tbl_project_expenditure.project_id,
                        tbl_project_expenditure.sub_project_id,
                        tbl_project.award_project_cost,
                        tbl_sub_project.sub_award_project_cost
                ) financialProgress
                    ON financialProgress.project_id = tbl_project.project_id
                    AND ISNULL(financialProgress.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                    
            LEFT JOIN 
            (
                SELECT stage_id, MAX(stage_name) AS stage_name
                FROM tbl_project_stage
                GROUP BY stage_id
            ) AS stageName
                ON stageName.stage_id = ProjectBase.final_stage_id

            WHERE 
                ProjectBase.final_stage_id IN (SELECT value FROM STRING_SPLIT(@stageFilter, ','))
        )

        -- FINAL RESULT (NO DUPLICATES)
        SELECT *
        FROM FinalData
        WHERE row_num = 1;
            
    `);
// -- WHERE final_stage_id IN (${stageFilter});
        const rowData = result.recordset;
        // console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

   
        let columnDefs = [
            { 
                headerName: 'Organisation Name',
                headerClass: "headercenter",
                children: [
                    { headerName: "A", field: "organisation_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project ID',
                headerClass: "headercenter",
                children: [
                    { headerName: "B", field: "project_id", cellClass: 'text-left', headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Name of',
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'C',
                                field: 'project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    },
                    {
                        headerName: 'Sub Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'D',
                                field: 'sub_project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    }
                ]
            },

            { 
                headerName: 'Last Updated Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "E", field: "last_updated_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Total Estimated Cost (In Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "F", field: "estimated_cost", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Sanctioned Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "G", field: "sanctioned_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Target Award / Awarded Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "H", field: "work_awarded_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Completion Date / Target Completion Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "I", field: "completion_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Expenditure in Current FY (in Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "J", field: "current_fy_expenditure", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Capacity Addition (in MTPA)',
                headerClass: "headercenter",
                children: [
                    { headerName: "K", field: "capacity_addition", headerClass: "headercenter" }
                ] 
            },

           {
                headerName: 'Physical Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "L", 
                        field: "physical_progress_value",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },
            { 
                headerName: 'Financial Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "M", 
                        field: "financial_progress",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },

            { 
                headerName: 'Current Stage',
                headerClass: "headercenter",
                children: [
                    { headerName: "N", field: "current_stage_name", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Current Sub-stage (with date)',
                headerClass: "headercenter",
                children: [
                    { headerName: "O", field: "current_sub_stage", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Delayed Status',
                headerClass: "headercenter",
                children: [
                    { headerName: "P", field: "project_status", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Mode of Implementation',
                headerClass: "headercenter",
                children: [
                    { headerName: "Q", field: "mode_of_implememtation", width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Type',
                headerClass: "headercenter",
                children: [
                    { headerName: "R", field: "project_type", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Category',
                headerClass: "headercenter",
                children: [
                    { headerName: "S", field: "project_category_names", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Foundation laying / Tentative Foundation laying date',
                headerClass: "headercenter",
                children: [
                    { headerName: "T", field: "foundation_laid_date", headerClass: "headercenter",  width: 300, }
                ] 
            },

            { 
                headerName: 'Inauguration date / Tentative Inauguration date',
                headerClass: "headercenter",
                children: [
                    { headerName: "U", field: "inauguration_date", headerClass: "headercenter",  width: 250, }
                ] 
            }

        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getProjectDetailsByProject(req,res) {
  try {
    const projectID = req.params.projectID;

    const conn = await pool;
    const request = conn.request();
    
    request.input("projectID", projectID);

    const sqlQuery = `
    SELECT
        tc.project_id,
        tc.project_name,
        tc.estimated_cost,
        tc.chairman_approval_date AS sanctioned_date,
        tc.actual_date_of_completion AS awarded_date,
        tc.target_completion_date,
        tc.foundation_laid_date,
        tc.capacity_addition,
        tps.stage_name,
        CASE
            WHEN tc.actual_date_of_completion IS NULL
              OR tc.target_completion_date IS NULL
                THEN 'In Progress'
            WHEN tc.actual_date_of_completion <= tc.target_completion_date
                THEN 'On Time'
            ELSE 'Delayed'
        END AS project_status,
        tc.inauguration_date,
        tc.mode_of_implememtation,
        tc.chairman_approval_remarks
    FROM tbl_project tc
    INNER JOIN tbl_project_stage tps ON tc.current_project_stage_id = tps.stage_id
    INNER JOIN mmt_organisation o ON tc.organisation_id = o.organisation_id
    INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
    WHERE tc.project_id = @projectID;
    `;

    const { recordset } = await request.query(sqlQuery);

    res.status(200).json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}


// ------------------------------------------------------------------------------------------------------------------------

async function getPysicalProgressOrgWise(req, res) {
  try {
  const clusterID = parseInt(req.body.clusterID, 10) || 0;
        const organisationID = parseInt(req.body.organisationID, 10) || 0;

        const fromFoundationTentativeDate = req.body.fromFoundationTentativeDate || null;
        const toFoundationTentativeDate = req.body.toFoundationTentativeDate || null;
        const fromTentativeInaugurationDate = req.body.fromTentativeInaugurationDate || null;
        const toTentativeInaugurationDate = req.body.toTentativeInaugurationDate || null;        
        const fromAwardedDate = req.body.fromAwardedDate || null;
        const toAwardedDate = req.body.toAwardedDate || null;
        const fromActCompletionDate = req.body.fromActCompletionDate || null;
        const toActCompletionDate = req.body.toActCompletionDate || null;
        const fromSantionedDate = req.body.fromSantionedDate || null;
        const toSantionedDate = req.body.toSantionedDate || null;


        const conn = await pool;
        const request = conn.request();
        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);

        
        request.input("fromFoundationTentativeDate", fromFoundationTentativeDate);
        request.input("toFoundationTentativeDate", toFoundationTentativeDate);
        request.input("fromTentativeInaugurationDate", fromTentativeInaugurationDate);
        request.input("toTentativeInaugurationDate", toTentativeInaugurationDate);
        request.input("fromAwardedDate", fromAwardedDate);
        request.input("toAwardedDate", toAwardedDate);
        request.input("fromActCompletionDate", fromActCompletionDate);
        request.input("toActCompletionDate", toActCompletionDate);
        request.input("fromSantionedDate", fromSantionedDate);
        request.input("toSantionedDate", toSantionedDate);


    const sqlQuery = `

        ;WITH BaseData AS
        (
            SELECT 
                tbl_project.project_id,
                tbl_sub_project.sub_project_id,
                ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id) AS unique_id,
                mmt_hr_cluster.hr_cluster_id ,
                mmt_organisation.organisation_id,
                mmt_organisation.organisation_code
            FROM tbl_project
            LEFT JOIN tbl_sub_project 
                ON tbl_sub_project.project_id = tbl_project.project_id

                LEFT JOIN (
                SELECT DISTINCT project_id, sub_project_id, actual_date
                FROM tbl_project_date
                WHERE sub_stage_id = 9 
                AND actual_date IS NOT NULL
            ) pd 
            ON pd.project_id = tbl_project.project_id
            AND (
                    (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
                OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
                )

            INNER JOIN mmt_organisation 
                ON mmt_organisation.organisation_id = tbl_project.organisation_id
            INNER JOIN mmt_hr_cluster 
                ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id
            WHERE 
                (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
                AND (@organisationID = 0 OR mmt_organisation.organisation_id = @organisationID)

                --  STATUS CONDITION
                AND ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1


                                    
                -- Foundation Date

                AND (
                    (@fromFoundationTentativeDate IS NULL OR @toFoundationTentativeDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_foundation_tentative_date, 
                                tbl_project.foundation_tentative_date
                            ) AS DATE
                        ) BETWEEN @fromFoundationTentativeDate AND @toFoundationTentativeDate
                    )
                )
                                        
                -- Inauguration Date
                AND (
                    (@fromTentativeInaugurationDate IS NULL OR @toTentativeInaugurationDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_tentative_inauguration_date, 
                                tbl_project.tentative_inauguration_date
                            ) AS DATE
                        ) BETWEEN @fromTentativeInaugurationDate AND @toTentativeInaugurationDate
                    )
                )

                -- Work Awarded Date
                AND (
                    (@fromAwardedDate IS NULL OR @toAwardedDate IS NULL)
                    OR
                    (
                        TRY_CAST(pd.actual_date AS DATE)
                        BETWEEN @fromAwardedDate AND @toAwardedDate
                    )
                )

                -- Actual Completion Date

                AND (
                    (@fromActCompletionDate IS NULL OR @toActCompletionDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                    tbl_sub_project.sub_actual_date_of_completion,
                                    tbl_project.actual_date_of_completion
                            ) AS DATE
                        ) BETWEEN @fromActCompletionDate AND @toActCompletionDate
                    )
                )
                    
            --Santioned date
                AND (
                    (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                    tbl_sub_project.sub_chairman_approval_date,
                                    tbl_project.chairman_approval_date,
                                    tbl_sub_project.sub_admin_approval_approval_date,
                                    tbl_project.admin_approval_approval_date
                            ) AS DATE
                        ) BETWEEN @fromSantionedDate AND @toSantionedDate
                    )
                )
        ),

        ProgressData AS
        (
            SELECT 
                BaseData.unique_id,
                BaseData.project_id,
                BaseData.sub_project_id,
                BaseData.hr_cluster_id,
                BaseData.organisation_id,
                BaseData.organisation_code,
                ISNULL(MAX(tbl_project_physical_progress.physical_progress), 0) AS progress_percent
            FROM BaseData
            LEFT JOIN tbl_project_physical_progress 
                ON tbl_project_physical_progress.project_id = BaseData.project_id
                AND ISNULL(tbl_project_physical_progress.sub_project_id, -1) = ISNULL(BaseData.sub_project_id, -1)
            GROUP BY 
                BaseData.unique_id,
                BaseData.project_id,
                BaseData.sub_project_id,
     			BaseData.hr_cluster_id,
                BaseData.organisation_id,
                BaseData.organisation_code
        )

        SELECT
            hr_cluster_id,
            organisation_id,
            organisation_code,
            CASE 
                WHEN progress_percent <= 20 THEN '0-20'
                WHEN progress_percent <= 40 THEN '20-40'
                WHEN progress_percent <= 60 THEN '40-60'
                WHEN progress_percent <= 80 THEN '60-80'
                ELSE '80-100'
            END AS progress_range,
            COUNT(unique_id) AS project_count
        FROM ProgressData
        GROUP BY 
            hr_cluster_id,
            organisation_id,
            organisation_code,
            CASE 
                WHEN progress_percent <= 20 THEN '0-20'
                WHEN progress_percent <= 40 THEN '20-40'
                WHEN progress_percent <= 60 THEN '40-60'
                WHEN progress_percent <= 80 THEN '60-80'
                ELSE '80-100'
            END
        ORDER BY organisation_code, progress_range;
    `;

  
    const { recordset } = await request.query(sqlQuery);
    res.json(recordset);

  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}



async function detailedPysicalProgressOrgWise(req, res) {
  try {
        const clusterID = req.body.clusterID;

        const organisationID = req.body.organisationID;
        const organisationCode = req.body.organisationCode;
        const progress = req.body.progress;
        const isTotal = req.body.isTotal;

        const fromFoundationDate = req.body.fromFoundationDate || null;
        const toFoundationDate = req.body.toFoundationDate || null;
        const fromTentativeDate = req.body.fromTentativeDate || null;
        const toTentativeDate = req.body.toTentativeDate || null;

        const fromWorkAwardedDate = req.body.fromWorkAwardedDate || null;
        const toWorkAwardedDate = req.body.toWorkAwardedDate || null;
        const fromActualCompletionDate = req.body.fromActualCompletionDate || null;
        const toActualCompletionDate = req.body.toActualCompletionDate || null;

        const fromSantionedDate = req.body.fromSantionedDate || null;
        const toSantionedDate = req.body.toSantionedDate || null;

        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
        request.input("organisationCode", organisationCode);
        request.input("isTotal", isTotal);

        request.input("fromFoundationDate", fromFoundationDate);
        request.input("toFoundationDate", toFoundationDate);
        request.input("fromTentativeDate", fromTentativeDate);
        request.input("toTentativeDate", toTentativeDate);
        request.input("fromWorkAwardedDate", fromWorkAwardedDate);
        request.input("toWorkAwardedDate", toWorkAwardedDate);
        request.input("fromActualCompletionDate", fromActualCompletionDate);
        request.input("toActualCompletionDate", toActualCompletionDate);
        request.input("fromSantionedDate", fromSantionedDate);
        request.input("toSantionedDate", toSantionedDate);
console.log(isTotal, "isTotal")


        let minProgress = 0, maxProgress = 100;
        switch (progress) {
        case "0-20": minProgress = 0; maxProgress = 20; break;
        case "20-40": minProgress = 21; maxProgress = 40; break;
        case "40-60": minProgress = 41; maxProgress = 60; break;
        case "60-80": minProgress = 61; maxProgress = 80; break;
        case "80-100": minProgress = 81; maxProgress = 100; break;
        default: minProgress = 0; maxProgress = 100;
        }

        request.input("minProgress", minProgress);
        request.input("maxProgress", maxProgress);

    
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        let firstDateCurrentFy, todayDate;

        if (currentDate.getMonth() + 1 <= 3) {
            firstDateCurrentFy = (currentYear - 1) + "-04-01";
        } else {
            firstDateCurrentFy = currentYear + "-04-01";
        }

        todayDate = currentDate.toISOString().split('T')[0];

        request.input("firstDateCurrentFy", firstDateCurrentFy);
        request.input("todayDate", todayDate);
        let result;
        if (isTotal == 0)  { // only organisation
            result = await request.query(`
                
                WITH FilteredData AS (
            SELECT 
            mmt_organisation.organisation_name,
                ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id) AS unique_id,
                
                tbl_project.project_id,
                tbl_sub_project.sub_project_id,

                tbl_project.project_name,
                tbl_sub_project.sub_project_name,

                    CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated), 106) AS last_updated_date,

                    ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,

                    CONVERT(VARCHAR,
                        CASE 
                            WHEN ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) = 'Port level approval'
                                THEN ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                            ELSE 
                                ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                        END, 106) AS sanctioned_date,

                    CONVERT(VARCHAR, work_award.work_awarded_date, 106) AS work_awarded_date,

                    CONVERT(VARCHAR,
                        CASE 
                            -- Step 1: If actual completion exists → show actual date
                            WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL 
                                OR tbl_project.actual_date_of_completion IS NOT NULL
                            THEN ISNULL(
                                    tbl_sub_project.sub_actual_date_of_completion,
                                    tbl_project.actual_date_of_completion
                                )

                            -- Step 2: Else show target completion date
                            ELSE ISNULL(
                                    tbl_sub_project.sub_target_completion_date,
                                    tbl_project.target_completion_date
                                )
                        END,
                    106) AS completion_date,

                    ISNULL(current_fy.current_fy_expenditure, 0) AS current_fy_expenditure,

                    ISNULL(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,

                    ISNULL(physical_progress_data.physical_progress_value, 0) AS physical_progress_value,

                    financialProgress.financial_progress,            

                    tbl_project_stage.stage_name AS current_stage_name,

                    ------------------------------------------------------------
                    -- CURRENT SUB STAGE
                    ------------------------------------------------------------
                    CASE 

                        -- 0 → Project Initiated (no column → NULL safe)
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
                        THEN 'Project Initiated  (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
                        ,106) + ')'

                        -- 1 → Pre-Feasibility
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
                        THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
                        ,106) + ')'

                        -- 2 → DPR
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
                        THEN 'DPR (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
                        ,106) + ')'

                        -- 3 → Chairman Approval
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
                        THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                        ,106) + ')'

                        -- 4 → Ministry Submission
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
                        THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                        ,106) + ')'

                        -- 5 → Submitted to Ministry
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
                        THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                        ,106) + ')'

                        -- 6 → DA
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
                        THEN 'DA Concurrence (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
                        ,106) + ')'

                        -- 7 → IFW
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
                        THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
                        ,106) + ')'

                        -- 8 → IMC Circulation
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
                        THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
                        ,106) + ')'

                        -- 9 → Response to Comments
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
                        THEN 'Response to Comments received (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
                        ,106) + ')'

                        -- 10 → SFC / EFC
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
                        THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
                        ,106) + ')'

                        -- 11 → Admin Approval
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
                        THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                        ,106) + ')'

                        -- 12 → TENDERING
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                        THEN
                        (
                            SELECT TOP 1 
                                CASE tbl_project_date.sub_stage_id
                                    WHEN 3 THEN 'Tech. Sanction obtained'
                                    WHEN 4 THEN 'Tender Document approved'
                                    WHEN 5 THEN 'Tender Notice Issued'
                                    WHEN 6 THEN 'Technical Evaluation completed'
                                    WHEN 7 THEN 'Financial Evaluation completed'
                                    WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
                                    WHEN 9 THEN 'Work Awarded / LOA Issued'
                                    WHEN 10 THEN 'Contract Agreement Signed'
                                END
                                + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
                            FROM tbl_project_date
                            WHERE tbl_project_date.project_id = tbl_project.project_id
                            AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                            AND tbl_project_date.actual_date IS NOT NULL
                            ORDER BY tbl_project_date.actual_date DESC
                        )
                        -- 13 → IMPLEMENTATION
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                        THEN
                        (
                            CASE 
                                WHEN physical_progress_data.physical_progress_value BETWEEN 0 AND 19 
                                THEN 
                                    'Milestone 0 (' + 
                                    CONVERT(VARCHAR,
                                        (SELECT MAX(end_date)
                                        FROM tbl_project_activity
                                        WHERE project_id = tbl_project.project_id
                                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                        AND milestone_id = 0
                                        ),106) + ')'

                                WHEN physical_progress_data.physical_progress_value BETWEEN 20 AND 39 
                                THEN 
                                    'Milestone 1 (' + 
                                    CONVERT(VARCHAR,
                                        (SELECT MAX(end_date)
                                        FROM tbl_project_activity
                                        WHERE project_id = tbl_project.project_id
                                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                        AND milestone_id = 1
                                        ),106) + ')'

                                WHEN physical_progress_data.physical_progress_value BETWEEN 40 AND 59 
                                THEN 
                                    'Milestone 2 (' + 
                                    CONVERT(VARCHAR,
                                        (SELECT MAX(end_date)
                                        FROM tbl_project_activity
                                        WHERE project_id = tbl_project.project_id
                                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                        AND milestone_id = 2
                                        ),106) + ')'

                                WHEN physical_progress_data.physical_progress_value BETWEEN 60 AND 79 
                                THEN 
                                    'Milestone 3 (' + 
                                    CONVERT(VARCHAR,
                                        (SELECT MAX(end_date)
                                        FROM tbl_project_activity
                                        WHERE project_id = tbl_project.project_id
                                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                        AND milestone_id = 3
                                        ),106) + ')'

                                WHEN physical_progress_data.physical_progress_value BETWEEN 80 AND 99 
                                THEN 
                                    'Milestone 4 (' + 
                                    CONVERT(VARCHAR,
                                        (SELECT MAX(end_date)
                                        FROM tbl_project_activity
                                        WHERE project_id = tbl_project.project_id
                                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                        AND milestone_id = 4
                                        ),106) + ')'

                                WHEN physical_progress_data.physical_progress_value = 100 
                                THEN 
                                    'Milestone 5 (' + 
                                    CONVERT(VARCHAR,
                                        (SELECT MAX(end_date)
                                        FROM tbl_project_activity
                                        WHERE project_id = tbl_project.project_id
                                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                        AND milestone_id = 5
                                        ),106) + ')'

                                ELSE 'Not Started'
                            END
                        )

                        -- 14 → COMPLETED
                        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                        THEN 'Completed (' + CONVERT(VARCHAR,
                            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
                        ,106) + ')'

                    END AS current_sub_stage,

                    ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
                    ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,
                    ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,

                    ISNULL((
                        SELECT STRING_AGG(mmt_project_category.project_category_name, ', ')
                        FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS split_sub
                        JOIN mmt_project_category 
                            ON TRY_CAST(split_sub.value AS INT) = mmt_project_category.project_category_id
                    ), (
                        SELECT STRING_AGG(mmt_project_category.project_category_name, ', ')
                        FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS split_main
                        JOIN mmt_project_category 
                            ON TRY_CAST(split_main.value AS INT) = mmt_project_category.project_category_id
                    )) AS project_category_names,

                    CASE
                        WHEN tbl_project.actual_date_of_completion IS NULL OR tbl_project.target_completion_date IS NULL THEN 'In Progress'
                        WHEN tbl_project.actual_date_of_completion <= tbl_project.target_completion_date THEN 'On Time'
                        ELSE 'Delayed'
                    END AS project_status,

                            --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
                    CONVERT(VARCHAR,
                        CASE 
                            WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
                                OR tbl_project.foundation_laid_date IS NOT NULL
                            THEN ISNULL(
                                    tbl_sub_project.sub_foundation_laid_date,
                                    tbl_project.foundation_laid_date
                                )
                            ELSE ISNULL(
                                    tbl_sub_project.sub_foundation_tentative_date,
                                    tbl_project.foundation_tentative_date
                                )
                        END,
                    106) AS foundation_laid_date,

                -- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
                    CONVERT(VARCHAR,
                        CASE 
                            WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
                                OR tbl_project.inauguration_date IS NOT NULL
                            THEN ISNULL(
                                    tbl_sub_project.sub_inauguration_date,
                                    tbl_project.inauguration_date
                                )
                            ELSE ISNULL(
                                    tbl_sub_project.sub_tentative_inauguration_date,
                                    tbl_project.tentative_inauguration_date
                                )
                        END,
                    106) AS inauguration_date,

                    ROW_NUMBER() OVER (
                    PARTITION BY 
                        ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)
                    ORDER BY 
                        tbl_project.project_id
                ) AS rn

                FROM tbl_project

                LEFT JOIN tbl_sub_project 
                    ON tbl_sub_project.project_id = tbl_project.project_id

                LEFT JOIN (
                    SELECT 
                        project_id, 
                        sub_project_id,
                        MAX(physical_progress) AS physical_progress_value
                    FROM tbl_project_physical_progress
                    GROUP BY project_id, sub_project_id
                ) physical_progress_data
                ON physical_progress_data.project_id = tbl_project.project_id
                AND ISNULL(physical_progress_data.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


                LEFT JOIN 
                (
                    SELECT 
                        project_id,
                        sub_project_id,             
                    -- If actual_date exists, take it, otherwise take planned_date
                    MAX(ISNULL(actual_date, planned_date)) AS work_awarded_date
                    FROM tbl_project_date
                    WHERE sub_stage_id = 9
                    GROUP BY project_id, sub_project_id
                ) work_award
                    ON work_award.project_id = tbl_project.project_id
                    AND ISNULL(work_award.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                LEFT JOIN (
                    SELECT DISTINCT project_id, sub_project_id, actual_date
                    FROM tbl_project_date
                    WHERE sub_stage_id = 9 
                    AND actual_date IS NOT NULL
                    ) pd 
                    ON pd.project_id = tbl_project.project_id
                    AND (
                            (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
                            OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
                        )

                LEFT JOIN 
                (
                    SELECT 
                        tbl_project_expenditure.project_id,
                        tbl_project_expenditure.sub_project_id,

                        (
                            SUM(
                                ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                                ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                                ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                                ISNULL(tbl_project_expenditure.loans_components, 0) + 
                                ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                                ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                                ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                     
                                ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                                ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                            ) 
                            /
                            NULLIF(
                                (ISNULL(tbl_project.award_project_cost, 0) + 
                                ISNULL(tbl_sub_project.sub_award_project_cost, 0)), 0
                            )
                        ) * 100 AS financial_progress

                    FROM tbl_project_expenditure

                    LEFT JOIN tbl_project 
                        ON tbl_project.project_id = tbl_project_expenditure.project_id

                    LEFT JOIN tbl_sub_project 
                        ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

                    GROUP BY 
                        tbl_project_expenditure.project_id,
                        tbl_project_expenditure.sub_project_id,
                        tbl_project.award_project_cost,
                        tbl_sub_project.sub_award_project_cost
                ) financialProgress
                    ON financialProgress.project_id = tbl_project.project_id
                    AND ISNULL(financialProgress.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                LEFT JOIN tbl_project_stage 
                    ON tbl_project_stage.stage_id = ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id)
                
                LEFT JOIN mmt_organisation
                    ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)

                INNER JOIN mmt_hr_cluster ON  mmt_hr_cluster.hr_cluster_id = mmt_organisation.hr_cluster_id 


                LEFT JOIN (
                    SELECT 
                        project_id, 
                        sub_project_id,
                        SUM(ISNULL(gbs_components,0)+ISNULL(iebr_components,0)) AS current_fy_expenditure
                    FROM tbl_project_expenditure
                    WHERE expenditure_date BETWEEN @firstDateCurrentFy AND @todayDate
                    GROUP BY project_id, sub_project_id
                ) current_fy
                ON current_fy.project_id = tbl_project.project_id
                AND ISNULL(current_fy.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                WHERE 
                ISNULL(physical_progress_data.physical_progress_value, 0) BETWEEN @minProgress AND @maxProgress
                AND (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
                AND ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID 
                
                --  ISNULL(physical_progress_data.physical_progress_value, 0) >= @minProgress
                --     AND ISNULL(physical_progress_data.physical_progress_value, 0) < @maxProgress
            
                AND ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1              

                                                      
                --DATE FILTER
                -- Foundation Date
                    AND (
                    (@fromFoundationDate IS NULL OR @toFoundationDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_foundation_tentative_date,
                                tbl_project.foundation_tentative_date
                            ) AS DATE
                        ) BETWEEN @fromFoundationDate AND @toFoundationDate
                    )
                )
                
                -- Inauguration Date
                AND (
                    (@fromTentativeDate IS NULL OR @toTentativeDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_tentative_inauguration_date,
                                tbl_project.tentative_inauguration_date
                            ) AS DATE
                        ) BETWEEN @fromTentativeDate AND @toTentativeDate
                    )
                )

                -- Work Awarded Date
                AND (
                    (@fromWorkAwardedDate IS NULL OR @toWorkAwardedDate IS NULL)
                    OR
                    (
                        TRY_CAST(pd.actual_date AS DATE)
                        BETWEEN @fromWorkAwardedDate AND @toWorkAwardedDate
                    )
                )
        
                -- Actual Completion Date
                AND (
                    (@fromActualCompletionDate IS NULL OR @toActualCompletionDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_actual_date_of_completion,
                                tbl_project.actual_date_of_completion
                            ) AS DATE
                        ) BETWEEN @fromActualCompletionDate AND @toActualCompletionDate
                    )
                )
                        
                --Santioned date
                AND (
                    (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                    tbl_sub_project.sub_chairman_approval_date,
                                    tbl_project.chairman_approval_date,
                                    tbl_sub_project.sub_admin_approval_approval_date,
                                    tbl_project.admin_approval_approval_date
                                ) AS DATE
                            ) BETWEEN @fromSantionedDate AND @toSantionedDate
                        )
                    )
      
                )

                SELECT *
                FROM FilteredData
                WHERE rn = 1   --  duplicate remove
                ORDER BY FilteredData.project_id;

            `);
        }
        else{
            result = await request.query(`
                
                WITH FilteredData AS (
                    SELECT 
                    mmt_organisation.organisation_name,
                                ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id) AS unique_id,
                        
                            tbl_project.project_id,
                        tbl_sub_project.sub_project_id,

                        tbl_project.project_name,
                        tbl_sub_project.sub_project_name,

                            CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated), 106) AS last_updated_date,

                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,

                            CONVERT(VARCHAR,
                                CASE 
                                    WHEN ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) = 'Port level approval'
                                        THEN ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                                    ELSE 
                                        ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                                END, 106) AS sanctioned_date,

                            CONVERT(VARCHAR, work_award.work_awarded_date, 106) AS work_awarded_date,

                            CONVERT(VARCHAR,
                                CASE 
                                    -- Step 1: If actual completion exists → show actual date
                                    WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL 
                                        OR tbl_project.actual_date_of_completion IS NOT NULL
                                    THEN ISNULL(
                                            tbl_sub_project.sub_actual_date_of_completion,
                                            tbl_project.actual_date_of_completion
                                        )

                                    -- Step 2: Else show target completion date
                                    ELSE ISNULL(
                                            tbl_sub_project.sub_target_completion_date,
                                            tbl_project.target_completion_date
                                        )
                                END,
                            106) AS completion_date,

                            ISNULL(current_fy.current_fy_expenditure, 0) AS current_fy_expenditure,

                            ISNULL(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,

                            ISNULL(physical_progress_data.physical_progress_value, 0) AS physical_progress_value,

                            financialProgress.financial_progress,

                            tbl_project_stage.stage_name AS current_stage_name,

                            ------------------------------------------------------------
                            -- CURRENT SUB STAGE
                            ------------------------------------------------------------
                            CASE 

                                -- 0 → Project Initiated (no column → NULL safe)
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
                                THEN 'Project Initiated  (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
                                ,106) + ')'

                                -- 1 → Pre-Feasibility
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
                                THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
                                ,106) + ')'

                                -- 2 → DPR
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
                                THEN 'DPR (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
                                ,106) + ')'

                                -- 3 → Chairman Approval
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
                                THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                                ,106) + ')'

                                -- 4 → Ministry Submission
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
                                THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                                ,106) + ')'

                                -- 5 → Submitted to Ministry
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
                                THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                                ,106) + ')'

                                -- 6 → DA
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
                                THEN 'DA Concurrence (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
                                ,106) + ')'

                                -- 7 → IFW
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
                                THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
                                ,106) + ')'

                                -- 8 → IMC Circulation
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
                                THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
                                ,106) + ')'

                                -- 9 → Response to Comments
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
                                THEN 'Response to Comments received (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
                                ,106) + ')'

                                -- 10 → SFC / EFC
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
                                THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
                                ,106) + ')'

                                -- 11 → Admin Approval
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
                                THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                                ,106) + ')'

                                -- 12 → TENDERING
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                                THEN
                                (
                                    SELECT TOP 1 
                                        CASE tbl_project_date.sub_stage_id
                                            WHEN 3 THEN 'Tech. Sanction obtained'
                                            WHEN 4 THEN 'Tender Document approved'
                                            WHEN 5 THEN 'Tender Notice Issued'
                                            WHEN 6 THEN 'Technical Evaluation completed'
                                            WHEN 7 THEN 'Financial Evaluation completed'
                                            WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
                                            WHEN 9 THEN 'Work Awarded / LOA Issued'
                                            WHEN 10 THEN 'Contract Agreement Signed'
                                        END
                                        + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
                                    FROM tbl_project_date
                                    WHERE tbl_project_date.project_id = tbl_project.project_id
                                    AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND tbl_project_date.actual_date IS NOT NULL
                                    ORDER BY tbl_project_date.actual_date DESC
                                )
                                -- 13 → IMPLEMENTATION
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                                THEN
                                (
                                    CASE 
                                        WHEN physical_progress_data.physical_progress_value BETWEEN 0 AND 19 
                                        THEN 
                                            'Milestone 0 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 0
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 20 AND 39 
                                        THEN 
                                            'Milestone 1 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 1
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 40 AND 59 
                                        THEN 
                                            'Milestone 2 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 2
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 60 AND 79 
                                        THEN 
                                            'Milestone 3 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 3
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 80 AND 99 
                                        THEN 
                                            'Milestone 4 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 4
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value = 100 
                                        THEN 
                                            'Milestone 5 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 5
                                                ),106) + ')'

                                        ELSE 'Not Started'
                                    END
                                )

                                -- 14 → COMPLETED
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                                THEN 'Completed (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
                                ,106) + ')'

                            END AS current_sub_stage,

                            ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
                            ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,
                            ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,

                            ISNULL((
                                SELECT STRING_AGG(mmt_project_category.project_category_name, ', ')
                                FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS split_sub
                                JOIN mmt_project_category 
                                    ON TRY_CAST(split_sub.value AS INT) = mmt_project_category.project_category_id
                            ), (
                                SELECT STRING_AGG(mmt_project_category.project_category_name, ', ')
                                FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS split_main
                                JOIN mmt_project_category 
                                    ON TRY_CAST(split_main.value AS INT) = mmt_project_category.project_category_id
                            )) AS project_category_names,

                            CASE
                                WHEN tbl_project.actual_date_of_completion IS NULL OR tbl_project.target_completion_date IS NULL THEN 'In Progress'
                                WHEN tbl_project.actual_date_of_completion <= tbl_project.target_completion_date THEN 'On Time'
                                ELSE 'Delayed'
                            END AS project_status,

                            --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
                            CONVERT(VARCHAR,
                                CASE 
                                    WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
                                        OR tbl_project.foundation_laid_date IS NOT NULL
                                    THEN ISNULL(
                                            tbl_sub_project.sub_foundation_laid_date,
                                            tbl_project.foundation_laid_date
                                        )
                                    ELSE ISNULL(
                                            tbl_sub_project.sub_foundation_tentative_date,
                                            tbl_project.foundation_tentative_date
                                        )
                                END,
                            106) AS foundation_laid_date,

                        -- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
                            CONVERT(VARCHAR,
                                CASE 
                                    WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
                                        OR tbl_project.inauguration_date IS NOT NULL
                                    THEN ISNULL(
                                            tbl_sub_project.sub_inauguration_date,
                                            tbl_project.inauguration_date
                                        )
                                    ELSE ISNULL(
                                            tbl_sub_project.sub_tentative_inauguration_date,
                                            tbl_project.tentative_inauguration_date
                                        )
                                END,
                            106) AS inauguration_date,

                            ROW_NUMBER() OVER (
                            PARTITION BY 
                                ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)
                            ORDER BY 
                                tbl_project.project_id
                        ) AS rn

                        FROM tbl_project

                        LEFT JOIN tbl_sub_project 
                            ON tbl_sub_project.project_id = tbl_project.project_id

                        LEFT JOIN (
                            SELECT 
                                project_id, 
                                sub_project_id,
                                MAX(physical_progress) AS physical_progress_value
                            FROM tbl_project_physical_progress
                            GROUP BY project_id, sub_project_id
                        ) physical_progress_data
                        ON physical_progress_data.project_id = tbl_project.project_id
                        AND ISNULL(physical_progress_data.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                        LEFT JOIN (
                            SELECT project_id, sub_project_id,
                            MAX(ISNULL(actual_date, planned_date)) AS work_awarded_date
                            FROM tbl_project_date
                            WHERE sub_stage_id = 9
                            GROUP BY project_id, sub_project_id
                        ) work_award
                        ON work_award.project_id = tbl_project.project_id
                        AND ISNULL(work_award.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


                        LEFT JOIN (
                            SELECT DISTINCT project_id, sub_project_id, actual_date
                            FROM tbl_project_date
                            WHERE sub_stage_id = 9 
                            AND actual_date IS NOT NULL
                        ) pd 
                        ON pd.project_id = tbl_project.project_id
                        AND (
                                (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
                                OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
                            )
                        
                        LEFT JOIN 
                        (
                            SELECT 
                                tbl_project_expenditure.project_id,
                                tbl_project_expenditure.sub_project_id,

                                (
                                    SUM(
                                        ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                                        ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                                        ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                                        ISNULL(tbl_project_expenditure.loans_components, 0) + 
                                        ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                                        ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                                        ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                     
                                        ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                                        ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                                    ) 
                                    /
                                    NULLIF(
                                        (ISNULL(tbl_project.award_project_cost, 0) + 
                                        ISNULL(tbl_sub_project.sub_award_project_cost, 0)), 0
                                    )
                                ) * 100 AS financial_progress

                            FROM tbl_project_expenditure

                            LEFT JOIN tbl_project 
                                ON tbl_project.project_id = tbl_project_expenditure.project_id

                            LEFT JOIN tbl_sub_project 
                                ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

                            GROUP BY 
                                tbl_project_expenditure.project_id,
                                tbl_project_expenditure.sub_project_id,
                                tbl_project.award_project_cost,
                                tbl_sub_project.sub_award_project_cost
                        ) financialProgress
                            ON financialProgress.project_id = tbl_project.project_id
                            AND ISNULL(financialProgress.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


                        LEFT JOIN tbl_project_stage 
                            ON tbl_project_stage.stage_id = ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id)
                        
                        LEFT JOIN mmt_organisation
                            ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)

                        INNER JOIN mmt_hr_cluster ON  mmt_hr_cluster.hr_cluster_id = mmt_organisation.hr_cluster_id 


                        LEFT JOIN (
                            SELECT 
                                project_id, 
                                sub_project_id,
                                SUM(ISNULL(gbs_components,0)+ISNULL(iebr_components,0)) AS current_fy_expenditure
                            FROM tbl_project_expenditure
                            WHERE expenditure_date BETWEEN @firstDateCurrentFy AND @todayDate
                            GROUP BY project_id, sub_project_id
                        ) current_fy
                        ON current_fy.project_id = tbl_project.project_id
                        AND ISNULL(current_fy.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                        WHERE 
                            ISNULL(physical_progress_data.physical_progress_value, 0) BETWEEN @minProgress AND @maxProgress
                            AND (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
                        
                            --  ISNULL(physical_progress_data.physical_progress_value, 0) >= @minProgress
                            --     AND ISNULL(physical_progress_data.physical_progress_value, 0) < @maxProgress
                        
                            AND ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1
                                                                
                            --DATE FILTER
                            -- Foundation Date
                            AND (
                            (@fromFoundationDate IS NULL OR @toFoundationDate IS NULL)
                            OR
                            (
                                TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_foundation_tentative_date,
                                        tbl_project.foundation_tentative_date
                                    ) AS DATE
                                ) BETWEEN @fromFoundationDate AND @toFoundationDate
                            )
                        )
                        
                        -- Inauguration Date
                        AND (
                            (@fromTentativeDate IS NULL OR @toTentativeDate IS NULL)
                            OR
                            (
                                TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_tentative_inauguration_date,
                                        tbl_project.tentative_inauguration_date
                                    ) AS DATE
                                ) BETWEEN @fromTentativeDate AND @toTentativeDate
                            )
                        )

                        -- Work Awarded Date
                        AND (
                            (@fromWorkAwardedDate IS NULL OR @toWorkAwardedDate IS NULL)
                            OR
                            (
                                TRY_CAST(pd.actual_date AS DATE)
                                BETWEEN @fromWorkAwardedDate AND @toWorkAwardedDate
                            )
                        )
                
                        -- Actual Completion Date
                        AND (
                            (@fromActualCompletionDate IS NULL OR @toActualCompletionDate IS NULL)
                            OR
                            (
                                TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_actual_date_of_completion,
                                        tbl_project.actual_date_of_completion
                                    ) AS DATE
                                ) BETWEEN @fromActualCompletionDate AND @toActualCompletionDate
                            )
                        )
                                
                        --Santioned date
                            AND (
                                (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                                OR
                                (
                                    TRY_CAST(
                                        COALESCE(
                                                tbl_sub_project.sub_chairman_approval_date,
                                                tbl_project.chairman_approval_date,
                                                tbl_sub_project.sub_admin_approval_approval_date,
                                                tbl_project.admin_approval_approval_date
                                        ) AS DATE
                                    ) BETWEEN @fromSantionedDate AND @toSantionedDate
                                )
                            )
                        )

                        SELECT *
                FROM FilteredData
                WHERE rn = 1   --  duplicate remove
                ORDER BY FilteredData.project_id;

            `);
        }

    
        const rowData = result.recordset;
        // console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [

            { 
                headerName: 'Organisation Name',
                headerClass: "headercenter",
                children: [
                    { headerName: "A", field: "organisation_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project ID',
                headerClass: "headercenter",
                children: [
                    { headerName: "B", field: "project_id", cellClass: 'text-left', headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Name of',
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'C',
                                field: 'project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    },
                    {
                        headerName: 'Sub Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'D',
                                field: 'sub_project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    }
                ]
            },

            { 
                headerName: 'Last Updated Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "E", field: "last_updated_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Total Estimated Cost (In Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "F", field: "estimated_cost", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Sanctioned Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "G", field: "sanctioned_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Target Award / Awarded Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "H", field: "work_awarded_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Completion Date / Target Completion Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "I", field: "completion_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Expenditure in Current FY (in Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "J", field: "current_fy_expenditure", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Capacity Addition (in MTPA)',
                headerClass: "headercenter",
                children: [
                    { headerName: "K", field: "capacity_addition", headerClass: "headercenter" }
                ] 
            },

            {
    headerName: 'Physical Progress %',
    headerClass: "headercenter",
    children: [
        { 
            headerName: "L", 
            field: "physical_progress_value",
            headerClass: "headercenter",
            valueFormatter: params => {
                if (params.value === null || params.value === undefined || params.value == 0) {
                    return '';
                }
                return Number(params.value).toFixed(2) + '%';
            }
        }
    ] 
},
{ 
    headerName: 'Financial Progress %',
    headerClass: "headercenter",
    children: [
        { 
            headerName: "M", 
            field: "financial_progress",
            headerClass: "headercenter",
            valueFormatter: params => {
                if (params.value === null || params.value === undefined || params.value == 0) {
                    return '';
                }
                return Number(params.value).toFixed(2) + '%';
            }
        }
    ] 
},


            { 
                headerName: 'Current Stage',
                headerClass: "headercenter",
                children: [
                    { headerName: "N", field: "current_stage_name", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Current Sub-stage (with date)',
                headerClass: "headercenter",
                children: [
                    { headerName: "O", field: "current_sub_stage", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Delayed Status',
                headerClass: "headercenter",
                children: [
                    { headerName: "P", field: "project_status", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Mode of Implementation',
                headerClass: "headercenter",
                children: [
                    { headerName: "Q", field: "mode_of_implememtation", width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Type',
                headerClass: "headercenter",
                children: [
                    { headerName: "R", field: "project_type", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Category',
                headerClass: "headercenter",
                children: [
                    { headerName: "S", field: "project_category_names", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Foundation laying / Tentative Foundation laying date',
                headerClass: "headercenter",
                children: [
                    { headerName: "T", field: "foundation_laid_date", headerClass: "headercenter",  width: 300, }
                ] 
            },

            { 
                headerName: 'Inauguration date / Tentative Inauguration date',
                headerClass: "headercenter",
                children: [
                    { headerName: "U", field: "inauguration_date", headerClass: "headercenter",  width: 250, }
                ] 
            }

        ];

        // console.log(columnDefs,  "columnDefs, rowData")

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}




// async function getProjectCostWise(req,res) {
//     try {
//         const clusterID = parseInt(req.params.clusterID, 10) || 0;
//         const organisationID = parseInt(req.params.organisationID, 10) || 0;

//         const conn = await pool;
//         const request = conn.request();

//         request.input("clusterID", clusterID);
//         request.input("organisationID", organisationID);
//         console.log(organisationID, clusterID, "clusterID")

//         const combinedQuery = `     
//         ;WITH ProjectBase AS
//             (
//                 SELECT 
//                     tbl_project.project_id,
//                     tbl_sub_project.sub_project_id,

//                     -- FINAL UNIQUE ID (IMPORTANT)
//                     CASE 
//                         WHEN tbl_sub_project.sub_project_id IS NOT NULL 
//                             THEN tbl_sub_project.sub_project_id
//                         ELSE tbl_project.project_id
//                     END AS final_id,

//                     -- COST FIELDS
//                     COALESCE(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,
//                     COALESCE(tbl_sub_project.sub_sanctioned_cost, tbl_project.sanctioned_cost) AS sanctioned_cost,
//                     COALESCE(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,
//                     COALESCE(tbl_sub_project.sub_ppp_components, tbl_project.ppp_components) AS ppp_components,

//                     -- OTHER THAN PPP COMPONENTS
//                     (
//                         ISNULL(tbl_project.gbs_components,0) +
//                         ISNULL(tbl_project.iebr_components,0) +
//                         ISNULL(tbl_project.loans_components,0) +
//                         ISNULL(tbl_project.multilateral_components,0) +
//                         ISNULL(tbl_project.state_gov_fund_components,0) +
//                         ISNULL(tbl_project.pmmsy_components,0) +
//                         ISNULL(tbl_project.sagarmala_components,0) +
//                         ISNULL(tbl_project.other_source_funding_comp,0)
//                     ) AS other_than_ppp_components

//                 FROM tbl_project

//                 LEFT JOIN tbl_sub_project 
//                     ON tbl_project.project_id = tbl_sub_project.project_id

//                 INNER JOIN mmt_organisation 
//                     ON tbl_project.organisation_id = mmt_organisation.organisation_id

//                 INNER JOIN mmt_hr_cluster 
//                     ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

//                 WHERE
//                     (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
//                     AND (@organisationID = 0 OR mmt_organisation.organisation_id = @organisationID)

//                     AND (
//                         (tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1)
//                         OR 
//                         (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1)
//                     )
//             )

//             SELECT
//                 -- SAME COUNT LOGIC
//                 COUNT(DISTINCT final_id) AS Total_Projects_Count,

//                 SUM(estimated_cost) AS Total_Estimated_Cost,
//                 SUM(sanctioned_cost) AS Total_Sanctioned_Cost,
//                 SUM(capacity_addition) AS Total_Capacity_Addition,
//                 SUM(ppp_components) AS Total_PPP_Component,
//                 SUM(other_than_ppp_components) AS Other_than_PPP_Component

//             FROM ProjectBase;
//         `;

//         const combinedResult = await request.query(combinedQuery);

//         return res.json({
//             combinedTotals: combinedResult.recordset[0],
//             message: "stage wise projects"
//         });

//     } catch (error) {
//         console.error("Error stage wise projects:", error);
//         return res.status(500).json({ message: "Internal Server Error" });
//     }
// }



async function getProjectOrgWiseBarGraph(req, res) {
  try {
    const clusterID = parseInt(req.body.clusterID, 10) || 0;
        const organisationID = parseInt(req.body.organisationID, 10) || 0;

        const fromFoundationTentativeDate = req.body.fromFoundationTentativeDate || null;
        const toFoundationTentativeDate = req.body.toFoundationTentativeDate || null;
        const fromTentativeInaugurationDate = req.body.fromTentativeInaugurationDate || null;
        const toTentativeInaugurationDate = req.body.toTentativeInaugurationDate || null;        
        const fromAwardedDate = req.body.fromAwardedDate || null;
        const toAwardedDate = req.body.toAwardedDate || null;
        const fromActCompletionDate = req.body.fromActCompletionDate || null;
        const toActCompletionDate = req.body.toActCompletionDate || null;
        const fromSantionedDate = req.body.fromSantionedDate || null;
        const toSantionedDate = req.body.toSantionedDate || null;


    const conn = await pool;
    const request = conn.request();
    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);

     request.input("fromFoundationTentativeDate", fromFoundationTentativeDate);
    request.input("toFoundationTentativeDate", toFoundationTentativeDate);
    request.input("fromTentativeInaugurationDate", fromTentativeInaugurationDate);
    request.input("toTentativeInaugurationDate", toTentativeInaugurationDate);
    request.input("fromAwardedDate", fromAwardedDate);
    request.input("toAwardedDate", toAwardedDate);
    request.input("fromActCompletionDate", fromActCompletionDate);
    request.input("toActCompletionDate", toActCompletionDate);
    request.input("fromSantionedDate", fromSantionedDate);
    request.input("toSantionedDate", toSantionedDate);


    const sqlQuery = `
       SELECT
    mmt_organisation.organisation_id,
    mmt_organisation.organisation_code,
    COUNT(*) AS total_projects

FROM tbl_project

LEFT JOIN tbl_sub_project 
    ON tbl_sub_project.project_id = tbl_project.project_id

LEFT JOIN (
    SELECT DISTINCT project_id, sub_project_id, actual_date
    FROM tbl_project_date
    WHERE sub_stage_id = 9 
    AND actual_date IS NOT NULL
) pd 
ON pd.project_id = tbl_project.project_id
AND (
        (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
    OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
)

INNER JOIN mmt_organisation 
    ON mmt_organisation.organisation_id = 
        ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)

INNER JOIN mmt_hr_cluster 
    ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

WHERE 
    ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1

    AND (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
            AND (@organisationID = 0 OR mmt_organisation.organisation_id = @organisationID)

                              
        -- Foundation Date

                    AND (
                        (@fromFoundationTentativeDate IS NULL OR @toFoundationTentativeDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_foundation_tentative_date, 
                                    tbl_project.foundation_tentative_date
                                ) AS DATE
                            ) BETWEEN @fromFoundationTentativeDate AND @toFoundationTentativeDate
                        )
                    )
                        

                                    
                    -- Inauguration Date
                    AND (
                        (@fromTentativeInaugurationDate IS NULL OR @toTentativeInaugurationDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_tentative_inauguration_date, 
                                    tbl_project.tentative_inauguration_date
                                ) AS DATE
                            ) BETWEEN @fromTentativeInaugurationDate AND @toTentativeInaugurationDate
                        )
                    )


                    -- Work Awarded Date
                    AND (
                        (@fromAwardedDate IS NULL OR @toAwardedDate IS NULL)
                        OR
                        (
                            TRY_CAST(pd.actual_date AS DATE)
                            BETWEEN @fromAwardedDate AND @toAwardedDate
                        )
                    )


                    -- Actual Completion Date

                    AND (
                        (@fromActCompletionDate IS NULL OR @toActCompletionDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                        tbl_sub_project.sub_actual_date_of_completion,
                                        tbl_project.actual_date_of_completion
                                ) AS DATE
                            ) BETWEEN @fromActCompletionDate AND @toActCompletionDate
                        )
                    )
                     
                    --Santioned date
                    AND (
                        (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                     tbl_sub_project.sub_chairman_approval_date,
                                        tbl_project.chairman_approval_date,
                                        tbl_sub_project.sub_admin_approval_approval_date,
                                        tbl_project.admin_approval_approval_date
                                ) AS DATE
                            ) BETWEEN @fromSantionedDate AND @toSantionedDate
                        )
                    )

GROUP BY 
    mmt_organisation.organisation_id,
    mmt_organisation.organisation_code

ORDER BY 
    mmt_organisation.organisation_code;

    `;

    const { recordset } = await request.query(sqlQuery);

    if (!recordset.length) {
      return res.status(404).json({ error: "No data available" });
    }

    // res.json({
    //   labels: recordset.map(r => r.organisation_code),
    //   organisation_ids: recordset.map(r => r.organisation_id),

    //   datasets: [
    //     {
    //       label: "Total Projects",
    //       data: recordset.map(r => r.total_projects),
    //     }
    //   ]
    // });
    res.json({
  labels: recordset.map(r => r.organisation_code),
  organisation_ids: recordset.map(r => r.organisation_id),
  datasets: [
    {
      data: recordset.map(r => r.total_projects)
    }
  ]
});
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}


async function detailedOrgWiseProjectData(req, res) 
{
      const organisationID = req.body.organisationID;

        const fromFoundationDate = req.body.fromFoundationDate || null;
        const toFoundationDate = req.body.toFoundationDate || null;
        const fromTentativeDate = req.body.fromTentativeDate || null;
        const toTentativeDate = req.body.toTentativeDate || null;

        const fromWorkAwardedDate = req.body.fromWorkAwardedDate || null;
        const toWorkAwardedDate = req.body.toWorkAwardedDate || null;
        const fromActualCompletionDate = req.body.fromActualCompletionDate || null;
        const toActualCompletionDate = req.body.toActualCompletionDate || null;

        const fromSantionedDate = req.body.fromSantionedDate || null;
        const toSantionedDate = req.body.toSantionedDate || null;


        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);
        request.input("fromFoundationDate", fromFoundationDate);
        request.input("toFoundationDate", toFoundationDate);
        request.input("fromTentativeDate", fromTentativeDate);
        request.input("toTentativeDate", toTentativeDate);
        
        request.input("fromWorkAwardedDate", fromWorkAwardedDate);
        request.input("toWorkAwardedDate", toWorkAwardedDate);
        request.input("fromActualCompletionDate", fromActualCompletionDate);
        request.input("toActualCompletionDate", toActualCompletionDate);
        request.input("fromSantionedDate", fromSantionedDate);
        request.input("toSantionedDate", toSantionedDate);
        
     
    try {

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        let firstDateCurrentFy, todayDate;

        if (currentDate.getMonth() + 1 <= 3) {
            firstDateCurrentFy = (currentYear - 1) + "-04-01";
        } else {
            firstDateCurrentFy = currentYear + "-04-01";
        }

        todayDate = currentDate.toISOString().split('T')[0];

        request.input("firstDateCurrentFy", firstDateCurrentFy);
        request.input("todayDate", todayDate);

    const result = await request.query(`SELECT
            mmt_organisation.organisation_name,
            ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id) AS project_id,

            tbl_project.project_name,
            tbl_sub_project.sub_project_name,

            CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated), 106) AS last_updated_date,

            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,

            CONVERT(VARCHAR,
                CASE 
                    WHEN ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) = 'Port level approval'
                        THEN ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                    ELSE 
                        ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                END,
            106) AS sanctioned_date,

            CONVERT(VARCHAR, workDate.work_awarded_date, 106) AS work_awarded_date,

          CONVERT(VARCHAR,
                CASE 
                    -- Step 1: If actual completion exists → show actual date
                    WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL 
                        OR tbl_project.actual_date_of_completion IS NOT NULL
                    THEN ISNULL(
                            tbl_sub_project.sub_actual_date_of_completion,
                            tbl_project.actual_date_of_completion
                        )

                    -- Step 2: Else show target completion date
                    ELSE ISNULL(
                            tbl_sub_project.sub_target_completion_date,
                            tbl_project.target_completion_date
                        )
                END,
            106) AS completion_date,

            ISNULL(currentFY.current_fy_expenditure, 0) AS current_fy_expenditure,

            ISNULL(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,
                
            CASE 
            WHEN phyProgress.physical_progress_value IS NOT NULL 
                THEN CAST(phyProgress.physical_progress_value AS VARCHAR) + ' %'
                ELSE ''
            END AS physical_progress_value,
            

            financialProgress.financial_progress,

            stageName.stage_name AS current_stage_name,


            CASE 

                -- 0 → Project Initiated (no column → NULL safe)
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
                THEN 'Project Initiated  (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
                ,106) + ')'

                -- 1 → Pre-Feasibility
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
                THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
                ,106) + ')'

                -- 2 → DPR
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
                THEN 'DPR (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
                ,106) + ')'

                -- 3 → Chairman Approval
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
                THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                ,106) + ')'

                -- 4 → Ministry Submission
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
                THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                ,106) + ')'

                -- 5 → Submitted to Ministry
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
                THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                ,106) + ')'

                -- 6 → DA
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
                THEN 'DA Concurrence (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
                ,106) + ')'

                -- 7 → IFW
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
                THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
                ,106) + ')'

                -- 8 → IMC Circulation
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
                THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
                ,106) + ')'

                -- 9 → Response to Comments
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
                THEN 'Response to Comments received (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
                ,106) + ')'

                -- 10 → SFC / EFC
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
                THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
                ,106) + ')'

                -- 11 → Admin Approval
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
                THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                ,106) + ')'

                -- 12 → TENDERING
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                THEN
                (
                    SELECT TOP 1 
                        CASE tbl_project_date.sub_stage_id
                            WHEN 3 THEN 'Tech. Sanction obtained'
                            WHEN 4 THEN 'Tender Document approved'
                            WHEN 5 THEN 'Tender Notice Issued'
                            WHEN 6 THEN 'Technical Evaluation completed'
                            WHEN 7 THEN 'Financial Evaluation completed'
                            WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
                            WHEN 9 THEN 'Work Awarded / LOA Issued'
                            WHEN 10 THEN 'Contract Agreement Signed'
                        END
                        + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
                    FROM tbl_project_date
                    WHERE tbl_project_date.project_id = tbl_project.project_id
                    AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                    AND tbl_project_date.actual_date IS NOT NULL
                    ORDER BY tbl_project_date.actual_date DESC
                )
                -- 13 → IMPLEMENTATION
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                THEN
                (
                    CASE 
                        WHEN phyProgress.physical_progress_value BETWEEN 0 AND 19 
                        THEN 
                            'Milestone 0 (' + 
                            CONVERT(VARCHAR,
                                (SELECT MAX(end_date)
                                FROM tbl_project_activity
                                WHERE project_id = tbl_project.project_id
                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                AND milestone_id = 0
                                ),106) + ')'

                        WHEN phyProgress.physical_progress_value BETWEEN 20 AND 39 
                        THEN 
                            'Milestone 1 (' + 
                            CONVERT(VARCHAR,
                                (SELECT MAX(end_date)
                                FROM tbl_project_activity
                                WHERE project_id = tbl_project.project_id
                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                AND milestone_id = 1
                                ),106) + ')'

                        WHEN phyProgress.physical_progress_value BETWEEN 40 AND 59 
                        THEN 
                            'Milestone 2 (' + 
                            CONVERT(VARCHAR,
                                (SELECT MAX(end_date)
                                FROM tbl_project_activity
                                WHERE project_id = tbl_project.project_id
                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                AND milestone_id = 2
                                ),106) + ')'

                        WHEN phyProgress.physical_progress_value BETWEEN 60 AND 79 
                        THEN 
                            'Milestone 3 (' + 
                            CONVERT(VARCHAR,
                                (SELECT MAX(end_date)
                                FROM tbl_project_activity
                                WHERE project_id = tbl_project.project_id
                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                AND milestone_id = 3
                                ),106) + ')'

                        WHEN phyProgress.physical_progress_value BETWEEN 80 AND 99 
                        THEN 
                            'Milestone 4 (' + 
                            CONVERT(VARCHAR,
                                (SELECT MAX(end_date)
                                FROM tbl_project_activity
                                WHERE project_id = tbl_project.project_id
                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                AND milestone_id = 4
                                ),106) + ')'

                        WHEN phyProgress.physical_progress_value = 100 
                        THEN 
                            'Milestone 5 (' + 
                            CONVERT(VARCHAR,
                                (SELECT MAX(end_date)
                                FROM tbl_project_activity
                                WHERE project_id = tbl_project.project_id
                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                AND milestone_id = 5
                                ),106) + ')'

                        ELSE 'Not Started'
                    END
                )

                -- 14 → COMPLETED
                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                THEN 'Completed (' + CONVERT(VARCHAR,
                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
                ,106) + ')'

            END AS current_sub_stage,

                    

            CASE
                WHEN tbl_project.actual_date_of_completion IS NULL
                    OR tbl_project.target_completion_date IS NULL
                    THEN 'In Progress'
                WHEN tbl_project.actual_date_of_completion <= tbl_project.target_completion_date
                    THEN 'On Time'
                ELSE 'Delayed'
            END AS project_status,

            ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
            
            ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,
            
            ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,
            
            ISNULL((
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS sps
                JOIN mmt_project_category AS mpc 
                    ON TRY_CAST(sps.value AS INT) = mpc.project_category_id
            ), (
                SELECT STRING_AGG(mpc.project_category_name, ', ')
                FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS ps
                JOIN mmt_project_category AS mpc 
                    ON TRY_CAST(ps.value AS INT) = mpc.project_category_id
            )) AS project_category_names,

         --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
            CONVERT(VARCHAR,
                CASE 
                    WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
                        OR tbl_project.foundation_laid_date IS NOT NULL
                    THEN ISNULL(
                            tbl_sub_project.sub_foundation_laid_date,
                            tbl_project.foundation_laid_date
                        )
                    ELSE ISNULL(
                            tbl_sub_project.sub_foundation_tentative_date,
                            tbl_project.foundation_tentative_date
                        )
                END,
            106) AS foundation_laid_date,

           -- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
            CONVERT(VARCHAR,
                CASE 
                    WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
                        OR tbl_project.inauguration_date IS NOT NULL
                    THEN ISNULL(
                            tbl_sub_project.sub_inauguration_date,
                            tbl_project.inauguration_date
                        )
                    ELSE ISNULL(
                            tbl_sub_project.sub_tentative_inauguration_date,
                            tbl_project.tentative_inauguration_date
                        )
                END,
            106) AS inauguration_date


        FROM tbl_project     

        LEFT JOIN tbl_sub_project 
            ON tbl_sub_project.project_id = tbl_project.project_id

        LEFT JOIN mmt_organisation
            ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)


        LEFT JOIN (
                SELECT DISTINCT project_id, sub_project_id, actual_date
                FROM tbl_project_date
                WHERE sub_stage_id = 9 
                AND actual_date IS NOT NULL
            ) pd 
            ON pd.project_id = tbl_project.project_id
            AND (
                    (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
                OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
                )


        LEFT JOIN 
        (
            SELECT 
                project_id,
                sub_project_id,             
            -- If actual_date exists, take it, otherwise take planned_date
            MAX(ISNULL(actual_date, planned_date)) AS work_awarded_date
            FROM tbl_project_date
            WHERE sub_stage_id = 9
            GROUP BY project_id, sub_project_id
        ) workDate
            ON workDate.project_id = tbl_project.project_id
            AND ISNULL(workDate.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

        LEFT JOIN 
        (
            SELECT 
                project_id,
                sub_project_id,
                MAX(physical_progress) AS physical_progress_value
            FROM tbl_project_physical_progress
            GROUP BY project_id, sub_project_id
        ) phyProgress
            ON phyProgress.project_id = tbl_project.project_id
            AND ISNULL(phyProgress.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

        LEFT JOIN 
        (
            SELECT 
                tbl_project_expenditure.project_id,
                tbl_project_expenditure.sub_project_id,

                ROUND(
                    (
                        SUM(
                            ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                            ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                            ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                            ISNULL(tbl_project_expenditure.loans_components, 0) + 
                            ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                            ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                            ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                     
                            ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                            ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                        ) 
                        /
                        NULLIF(
                            (ISNULL(tbl_project.award_project_cost, 0) + 
                            ISNULL(tbl_sub_project.sub_award_project_cost, 0)), 0
                        )
                    ) * 100
                , 2) AS financial_progress

            FROM tbl_project_expenditure

            LEFT JOIN tbl_project 
                ON tbl_project.project_id = tbl_project_expenditure.project_id

            LEFT JOIN tbl_sub_project 
                ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

            GROUP BY 
                tbl_project_expenditure.project_id,
                tbl_project_expenditure.sub_project_id,
                tbl_project.award_project_cost,
                tbl_sub_project.sub_award_project_cost
        ) financialProgress
            ON financialProgress.project_id = tbl_project.project_id
            AND ISNULL(financialProgress.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


            LEFT JOIN (
                    SELECT MAX(tbl_project_stage.stage_name) AS stage_name,
                        tbl_project_stage.stage_id
                    FROM tbl_project
                    LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id = tbl_project.current_project_stage_id
                    GROUP BY tbl_project_stage.stage_id
                    UNION
                    SELECT MAX(tbl_project_stage.stage_name) AS stage_name,
                        tbl_project_stage.stage_id
                    FROM tbl_sub_project
                    LEFT JOIN tbl_project_stage ON tbl_project_stage.stage_id = tbl_sub_project.sub_current_project_stage_id
                    WHERE tbl_sub_project.sub_project_id != '-1'  
                    GROUP BY tbl_project_stage.stage_id
                ) AS stageName ON stageName.stage_id = ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id)
            


                LEFT JOIN 
                (
                    SELECT 
                        project_id,
                        sub_project_id,

                        SUM(
                            ISNULL(gbs_components, 0) + 
                            ISNULL(iebr_components, 0) + 
                            ISNULL(ppp_components, 0) + 
                            ISNULL(loans_components, 0) + 
                            ISNULL(multilateral_components, 0) + 
                            ISNULL(state_gov_fund_components, 0) + 
                            ISNULL(pmmsy_components, 0) + 
                            ISNULL(sagarmala_components, 0) + 
                            ISNULL(other_source_funding_comp, 0)
                        ) AS current_fy_expenditure

                    FROM tbl_project_expenditure

                    WHERE expenditure_date BETWEEN @firstDateCurrentFy AND @todayDate

                    GROUP BY project_id, sub_project_id
                ) currentFY
                ON currentFY.project_id = tbl_project.project_id
                AND ISNULL(currentFY.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                WHERE 
                    ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID
                    AND ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1

                                  
                    --DATE FILTER
                    -- Foundation Date
                    AND (
                    (@fromFoundationDate IS NULL OR @toFoundationDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_foundation_tentative_date,
                                tbl_project.foundation_tentative_date
                            ) AS DATE
                        ) BETWEEN @fromFoundationDate AND @toFoundationDate
                    )
                )
                
                -- Inauguration Date
                AND (
                    (@fromTentativeDate IS NULL OR @toTentativeDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_tentative_inauguration_date,
                                tbl_project.tentative_inauguration_date
                            ) AS DATE
                        ) BETWEEN @fromTentativeDate AND @toTentativeDate
                    )
                )

                -- Work Awarded Date
                AND (
                    (@fromWorkAwardedDate IS NULL OR @toWorkAwardedDate IS NULL)
                    OR
                    (
                        TRY_CAST(pd.actual_date AS DATE)
                        BETWEEN @fromWorkAwardedDate AND @toWorkAwardedDate
                    )
                )
        
                -- Actual Completion Date
                AND (
                    (@fromActualCompletionDate IS NULL OR @toActualCompletionDate IS NULL)
                    OR
                    (
                        TRY_CAST(
                            COALESCE(
                                tbl_sub_project.sub_actual_date_of_completion,
                                tbl_project.actual_date_of_completion
                            ) AS DATE
                        ) BETWEEN @fromActualCompletionDate AND @toActualCompletionDate
                    )
                )
                        
                --Santioned date
                    AND (
                        (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                        tbl_sub_project.sub_chairman_approval_date,
                tbl_project.chairman_approval_date,
                tbl_sub_project.sub_admin_approval_approval_date,
                tbl_project.admin_approval_approval_date
                                ) AS DATE
                            ) BETWEEN @fromSantionedDate AND @toSantionedDate
                        )
                    );
        

    `);
        // console.log(result, "result")
        const rowData = result.recordset;
        // console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [

            { 
                headerName: 'Organisation Name',
                headerClass: "headercenter",
                children: [
                    { headerName: "A", field: "organisation_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project ID',
                headerClass: "headercenter",
                children: [
                    { headerName: "B", field: "project_id", cellClass: 'text-left', headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Name of',
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'C',
                                field: 'project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    },
                    {
                        headerName: 'Sub Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'D',
                                field: 'sub_project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    }
                ]
            },

            { 
                headerName: 'Last Updated Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "E", field: "last_updated_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Total Estimated Cost (In Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "F", field: "estimated_cost", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Sanctioned Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "G", field: "sanctioned_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Target Award / Awarded Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "H", field: "work_awarded_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Completion Date / Target Completion Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "I", field: "completion_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Expenditure in Current FY (in Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "J", field: "current_fy_expenditure", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Capacity Addition (in MTPA)',
                headerClass: "headercenter",
                children: [
                    { headerName: "K", field: "capacity_addition", headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Physical Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "L", 
                        field: "physical_progress_value",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },
            { 
                headerName: 'Financial Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "M", 
                        field: "financial_progress",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },


            { 
                headerName: 'Current Stage',
                headerClass: "headercenter",
                children: [
                    { headerName: "N", field: "current_stage_name", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Current Sub-stage (with date)',
                headerClass: "headercenter",
                children: [
                    { headerName: "O", field: "current_sub_stage", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Delayed Status',
                headerClass: "headercenter",
                children: [
                    { headerName: "P", field: "project_status", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Mode of Implementation',
                headerClass: "headercenter",
                children: [
                    { headerName: "Q", field: "mode_of_implememtation", width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Type',
                headerClass: "headercenter",
                children: [
                    { headerName: "R", field: "project_type", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Category',
                headerClass: "headercenter",
                children: [
                    { headerName: "S", field: "project_category_names", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Foundation laying / Tentative Foundation laying date',
                headerClass: "headercenter",
                children: [
                    { headerName: "T", field: "foundation_laid_date", headerClass: "headercenter",  width: 300, }
                ] 
            },

            { 
                headerName: 'Inauguration date / Tentative Inauguration date',
                headerClass: "headercenter",
                children: [
                    { headerName: "U", field: "inauguration_date", headerClass: "headercenter",  width: 250, }
                ] 
            }

        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



async function getOngingProjectDashboard(req, res) 
{
    //   const organisationID = req.params.organisationID;

    const conn = await pool;
    const request = conn.request();
    
    // request.input("organisationID", organisationID);

 
    try {

            const result = await request.query(`SELECT 
                SUM(ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost)) AS estimated_cost,

                COUNT(DISTINCT 
                    CASE 
                        WHEN tbl_sub_project.sub_project_id IS NOT NULL 
                            THEN tbl_sub_project.sub_project_id
                        ELSE tbl_project.project_id
                    END
                ) AS total_ongoing_projects

            FROM tbl_project

            LEFT JOIN tbl_sub_project 
                ON tbl_sub_project.project_id = tbl_project.project_id

            INNER JOIN mmt_organisation 
                ON tbl_project.organisation_id = mmt_organisation.organisation_id

            INNER JOIN mmt_hr_cluster 
                ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

            WHERE 
            (
                (tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1)
                OR 
                (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1)
            )
            AND ISNULL(
                    tbl_sub_project.sub_current_project_stage_id, 
                    tbl_project.current_project_stage_id
                ) != 14

            AND mmt_hr_cluster.hr_cluster_id = 1;
    `);
        // console.log(result, result.recordset , "result")
      
        res.status(200).json(result.recordset[0]);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



async function detailedOngoingProDashboard(req, res) 
{
    //   const moi = req.params.moi;
    //   const broadId = req.params.broadId;


    const conn = await pool;
    const request = conn.request();
    
    // request.input("moi", moi);
    // request.input("broadId", broadId);


    try {

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        let firstDateCurrentFy, todayDate;

        if (currentDate.getMonth() + 1 <= 3) {
            firstDateCurrentFy = (currentYear - 1) + "-04-01";
        } else {
            firstDateCurrentFy = currentYear + "-04-01";
        }

        todayDate = currentDate.toISOString().split('T')[0];

        request.input("firstDateCurrentFy", firstDateCurrentFy);
        request.input("todayDate", todayDate);

    const result = await request.query(`SELECT
    mmt_organisation.organisation_name,

    ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id) AS project_id,

    tbl_project.project_name,
    tbl_sub_project.sub_project_name,

    CONVERT(
        VARCHAR,
        ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated),
        106
    ) AS last_updated_date,

    ISNULL(
        tbl_sub_project.sub_estimated_cost,
        tbl_project.estimated_cost
    ) AS estimated_cost,

    --------------------------------------------------
    -- SANCTIONED DATE
    --------------------------------------------------

    CONVERT(
        VARCHAR,
        CASE 
            WHEN ISNULL(
                    tbl_sub_project.sub_project_type,
                    tbl_project.project_type
                 ) = 'Port level approval'

            THEN ISNULL(
                    tbl_sub_project.sub_chairman_approval_date,
                    tbl_project.chairman_approval_date
                 )

            ELSE ISNULL(
                    tbl_sub_project.sub_admin_approval_approval_date,
                    tbl_project.admin_approval_approval_date
                 )
        END,
        106
    ) AS sanctioned_date,

    --------------------------------------------------
    -- WORK AWARDED DATE
    --------------------------------------------------

    CONVERT(VARCHAR, workDate.work_awarded_date, 106)
    AS work_awarded_date,

    --------------------------------------------------
    -- COMPLETION DATE
    --------------------------------------------------

    CONVERT(
        VARCHAR,
        CASE 
            WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL
                 OR tbl_project.actual_date_of_completion IS NOT NULL

            THEN ISNULL(
                    tbl_sub_project.sub_actual_date_of_completion,
                    tbl_project.actual_date_of_completion
                 )

            ELSE ISNULL(
                    tbl_sub_project.sub_target_completion_date,
                    tbl_project.target_completion_date
                 )
        END,
        106
    ) AS completion_date,

    --------------------------------------------------
    -- CURRENT FY EXPENDITURE
    --------------------------------------------------

    ISNULL(currentFY.current_fy_expenditure, 0) AS current_fy_expenditure,

    --------------------------------------------------
    -- CAPACITY ADDITION
    --------------------------------------------------

    ISNULL(
        tbl_sub_project.sub_capacity_addition,
        tbl_project.capacity_addition
    ) AS capacity_addition,

    --------------------------------------------------
    -- PHYSICAL PROGRESS
    --------------------------------------------------

    CASE 
        WHEN phyProgress.physical_progress_value IS NOT NULL
        THEN CAST(phyProgress.physical_progress_value AS VARCHAR) + ' %'
        ELSE ''
    END AS physical_progress_value,

    --------------------------------------------------
    -- FINANCIAL PROGRESS
    --------------------------------------------------

    financialProgress.financial_progress,

    --------------------------------------------------
    -- STAGE NAME
    --------------------------------------------------

    stageName.stage_name AS current_stage_name,

    
    CASE 

        -- 0 → Project Initiated (no column → NULL safe)
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
        THEN 'Project Initiated  (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
        ,106) + ')'

        -- 1 → Pre-Feasibility
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
        THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
        ,106) + ')'

        -- 2 → DPR
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
        THEN 'DPR (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
        ,106) + ')'

        -- 3 → Chairman Approval
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
        THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
        ,106) + ')'

        -- 4 → Ministry Submission
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
        THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
        ,106) + ')'

        -- 5 → Submitted to Ministry
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
        THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
        ,106) + ')'

        -- 6 → DA
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
        THEN 'DA Concurrence (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
        ,106) + ')'

        -- 7 → IFW
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
        THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
        ,106) + ')'

        -- 8 → IMC Circulation
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
        THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
        ,106) + ')'

        -- 9 → Response to Comments
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
        THEN 'Response to Comments received (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
        ,106) + ')'

        -- 10 → SFC / EFC
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
        THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
        ,106) + ')'

        -- 11 → Admin Approval
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
        THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
        ,106) + ')'

        -- 12 → TENDERING
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
        THEN
        (
            SELECT TOP 1 
                CASE tbl_project_date.sub_stage_id
                    WHEN 3 THEN 'Tech. Sanction obtained'
                    WHEN 4 THEN 'Tender Document approved'
                    WHEN 5 THEN 'Tender Notice Issued'
                    WHEN 6 THEN 'Technical Evaluation completed'
                    WHEN 7 THEN 'Financial Evaluation completed'
                    WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
                    WHEN 9 THEN 'Work Awarded / LOA Issued'
                    WHEN 10 THEN 'Contract Agreement Signed'
                END
                + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
            FROM tbl_project_date
            WHERE tbl_project_date.project_id = tbl_project.project_id
            AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
            AND tbl_project_date.actual_date IS NOT NULL
            ORDER BY tbl_project_date.actual_date DESC
        )
        -- 13 → IMPLEMENTATION
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
        THEN
        (
            CASE 
                WHEN phyProgress.physical_progress_value BETWEEN 0 AND 19 
                THEN 
                    'Milestone 0 (' + 
                    CONVERT(VARCHAR,
                        (SELECT MAX(end_date)
                        FROM tbl_project_activity
                        WHERE project_id = tbl_project.project_id
                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                        AND milestone_id = 0
                        ),106) + ')'

                WHEN phyProgress.physical_progress_value BETWEEN 20 AND 39 
                THEN 
                    'Milestone 1 (' + 
                    CONVERT(VARCHAR,
                        (SELECT MAX(end_date)
                        FROM tbl_project_activity
                        WHERE project_id = tbl_project.project_id
                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                        AND milestone_id = 1
                        ),106) + ')'

                WHEN phyProgress.physical_progress_value BETWEEN 40 AND 59 
                THEN 
                    'Milestone 2 (' + 
                    CONVERT(VARCHAR,
                        (SELECT MAX(end_date)
                        FROM tbl_project_activity
                        WHERE project_id = tbl_project.project_id
                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                        AND milestone_id = 2
                        ),106) + ')'

                WHEN phyProgress.physical_progress_value BETWEEN 60 AND 79 
                THEN 
                    'Milestone 3 (' + 
                    CONVERT(VARCHAR,
                        (SELECT MAX(end_date)
                        FROM tbl_project_activity
                        WHERE project_id = tbl_project.project_id
                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                        AND milestone_id = 3
                        ),106) + ')'

                WHEN phyProgress.physical_progress_value BETWEEN 80 AND 99 
                THEN 
                    'Milestone 4 (' + 
                    CONVERT(VARCHAR,
                        (SELECT MAX(end_date)
                        FROM tbl_project_activity
                        WHERE project_id = tbl_project.project_id
                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                        AND milestone_id = 4
                        ),106) + ')'

                WHEN phyProgress.physical_progress_value = 100 
                THEN 
                    'Milestone 5 (' + 
                    CONVERT(VARCHAR,
                        (SELECT MAX(end_date)
                        FROM tbl_project_activity
                        WHERE project_id = tbl_project.project_id
                        AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                        AND milestone_id = 5
                        ),106) + ')'

                ELSE 'Not Started'
            END
        )

        -- 14 → COMPLETED
        WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
        THEN 'Completed (' + CONVERT(VARCHAR,
            ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
        ,106) + ')'

    END AS current_sub_stage,

        
    ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,
    
    ISNULL((
        SELECT STRING_AGG(mpc.project_category_name, ', ')
        FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS sps
        JOIN mmt_project_category AS mpc 
            ON TRY_CAST(sps.value AS INT) = mpc.project_category_id
    ), (
        SELECT STRING_AGG(mpc.project_category_name, ', ')
        FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS ps
        JOIN mmt_project_category AS mpc 
            ON TRY_CAST(ps.value AS INT) = mpc.project_category_id
    )) AS project_category_names,

    --------------------------------------------------
    -- PROJECT STATUS
    --------------------------------------------------

    CASE
        WHEN tbl_project.actual_date_of_completion IS NULL
             OR tbl_project.target_completion_date IS NULL
        THEN 'In Progress'

        WHEN tbl_project.actual_date_of_completion
             <= tbl_project.target_completion_date
        THEN 'On Time'

        ELSE 'Delayed'
    END AS project_status,

    
    --------------------------------------------------
    -- MODE OF IMPLEMENTATION
    --------------------------------------------------

    ISNULL(
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_project.mode_of_implememtation
    ) AS mode_of_implememtation,

    ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,

     --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
    CONVERT(VARCHAR,
        CASE 
            WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
                OR tbl_project.foundation_laid_date IS NOT NULL
            THEN ISNULL(
                    tbl_sub_project.sub_foundation_laid_date,
                    tbl_project.foundation_laid_date
                )
            ELSE ISNULL(
                    tbl_sub_project.sub_foundation_tentative_date,
                    tbl_project.foundation_tentative_date
                )
        END,
    106) AS foundation_laid_date,

-- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
    CONVERT(VARCHAR,
        CASE 
            WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
                OR tbl_project.inauguration_date IS NOT NULL
            THEN ISNULL(
                    tbl_sub_project.sub_inauguration_date,
                    tbl_project.inauguration_date
                )
            ELSE ISNULL(
                    tbl_sub_project.sub_tentative_inauguration_date,
                    tbl_project.tentative_inauguration_date
                )
        END,
    106) AS inauguration_date


FROM tbl_project

--------------------------------------------------
-- SUB PROJECT
--------------------------------------------------

LEFT JOIN tbl_sub_project
    ON tbl_sub_project.project_id = tbl_project.project_id

--------------------------------------------------
-- ORGANISATION
--------------------------------------------------

INNER JOIN mmt_organisation
    ON mmt_organisation.organisation_id =
       tbl_project.organisation_id

--------------------------------------------------
-- CLUSTER
--------------------------------------------------

INNER JOIN mmt_hr_cluster
    ON mmt_organisation.hr_cluster_id =
       mmt_hr_cluster.hr_cluster_id

--------------------------------------------------
-- WORK AWARDED
--------------------------------------------------

LEFT JOIN
(
    SELECT
        project_id,
        sub_project_id,

        MAX(ISNULL(actual_date, planned_date))
        AS work_awarded_date

    FROM tbl_project_date

    WHERE sub_stage_id = 9

    GROUP BY
        project_id,
        sub_project_id

) workDate

ON workDate.project_id = tbl_project.project_id

AND ISNULL(workDate.sub_project_id, -1) =
    ISNULL(tbl_sub_project.sub_project_id, -1)

--------------------------------------------------
-- PHYSICAL PROGRESS
--------------------------------------------------

LEFT JOIN
(
    SELECT
        project_id,
        sub_project_id,

        MAX(physical_progress)
        AS physical_progress_value

    FROM tbl_project_physical_progress

    GROUP BY
        project_id,
        sub_project_id

) phyProgress

ON phyProgress.project_id = tbl_project.project_id

AND ISNULL(phyProgress.sub_project_id, -1) =
    ISNULL(tbl_sub_project.sub_project_id, -1)

--------------------------------------------------
-- FINANCIAL PROGRESS
--------------------------------------------------

LEFT JOIN
(
    SELECT
        tbl_project_expenditure.project_id,
        tbl_project_expenditure.sub_project_id,

        ROUND(
            (
                SUM(
                    ISNULL(tbl_project_expenditure.gbs_components, 0) +
                    ISNULL(tbl_project_expenditure.iebr_components, 0) +
                    ISNULL(tbl_project_expenditure.ppp_components, 0) +
                    ISNULL(tbl_project_expenditure.loans_components, 0) +
                    ISNULL(tbl_project_expenditure.multilateral_components, 0) +
                    ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) +
                    ISNULL(tbl_project_expenditure.pmmsy_components, 0) +
                    ISNULL(tbl_project_expenditure.sagarmala_components, 0) +
                    ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                )
                /
                NULLIF(
                    (
                        ISNULL(tbl_project.award_project_cost, 0) +
                        ISNULL(tbl_sub_project.sub_award_project_cost, 0)
                    ),
                    0
                )
            ) * 100,
            2
        ) AS financial_progress

    FROM tbl_project_expenditure

    LEFT JOIN tbl_project
        ON tbl_project.project_id =
           tbl_project_expenditure.project_id

    LEFT JOIN tbl_sub_project
        ON tbl_sub_project.sub_project_id =
           tbl_project_expenditure.sub_project_id

    GROUP BY
        tbl_project_expenditure.project_id,
        tbl_project_expenditure.sub_project_id,
        tbl_project.award_project_cost,
        tbl_sub_project.sub_award_project_cost

) financialProgress

ON financialProgress.project_id = tbl_project.project_id

AND ISNULL(financialProgress.sub_project_id, -1) =
    ISNULL(tbl_sub_project.sub_project_id, -1)

--------------------------------------------------
-- CURRENT FY EXPENDITURE
--------------------------------------------------

LEFT JOIN
(
    SELECT
        project_id,
        sub_project_id,

        SUM(
            ISNULL(gbs_components,0) +
            ISNULL(iebr_components,0) +
            ISNULL(ppp_components,0) +
            ISNULL(loans_components,0) +
            ISNULL(multilateral_components,0) +
            ISNULL(state_gov_fund_components,0) +
            ISNULL(pmmsy_components,0) +
            ISNULL(sagarmala_components,0) +
            ISNULL(other_source_funding_comp,0)
        ) AS current_fy_expenditure

    FROM tbl_project_expenditure

    WHERE expenditure_date BETWEEN
          @firstDateCurrentFy
          AND @todayDate

    GROUP BY
        project_id,
        sub_project_id

) currentFY

ON currentFY.project_id = tbl_project.project_id

AND ISNULL(currentFY.sub_project_id,-1) =
    ISNULL(tbl_sub_project.sub_project_id,-1)

--------------------------------------------------
-- STAGE NAME
--------------------------------------------------

LEFT JOIN tbl_project_stage stageName

ON stageName.stage_id =
   ISNULL(
        tbl_sub_project.sub_current_project_stage_id,
        tbl_project.current_project_stage_id
   )

--------------------------------------------------
-- MAIN FILTER
--------------------------------------------------

WHERE


--------------------------------------------------
-- ACTIVE PROJECT FILTER
--------------------------------------------------


(
    (
        tbl_sub_project.sub_project_id IS NOT NULL
        AND tbl_sub_project.sub_status = 1
    )

    OR

    (
        tbl_sub_project.sub_project_id IS NULL
        AND tbl_project.status = 1
    )
)

--------------------------------------------------
-- NOT COMPLETED
--------------------------------------------------

AND ISNULL(
        tbl_sub_project.sub_current_project_stage_id,
        tbl_project.current_project_stage_id
    ) != 14

--------------------------------------------------
-- CLUSTER FILTER
--------------------------------------------------

AND mmt_hr_cluster.hr_cluster_id = 1


    `);
        // console.log(result, "result")
        const rowData = result.recordset;
        // console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [

            { 
                headerName: 'Organisation Name',
                headerClass: "headercenter",
                children: [
                    { headerName: "A", field: "organisation_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project ID',
                headerClass: "headercenter",
                children: [
                    { headerName: "B", field: "project_id", cellClass: 'text-left', headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Name of',
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'C',
                                field: 'project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    },
                    {
                        headerName: 'Sub Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'D',
                                field: 'sub_project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    }
                ]
            },

            { 
                headerName: 'Last Updated Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "E", field: "last_updated_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Total Estimated Cost (In Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "F", field: "estimated_cost", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Sanctioned Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "G", field: "sanctioned_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Target Award / Awarded Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "H", field: "work_awarded_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Completion Date / Target Completion Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "I", field: "completion_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Expenditure in Current FY (in Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "J", field: "current_fy_expenditure", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Capacity Addition (in MTPA)',
                headerClass: "headercenter",
                children: [
                    { headerName: "K", field: "capacity_addition", headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Physical Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "L", 
                        field: "physical_progress_value",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },
            { 
                headerName: 'Financial Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "M", 
                        field: "financial_progress",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },


            { 
                headerName: 'Current Stage',
                headerClass: "headercenter",
                children: [
                    { headerName: "N", field: "current_stage_name", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Current Sub-stage (with date)',
                headerClass: "headercenter",
                children: [
                    { headerName: "O", field: "current_sub_stage", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Delayed Status',
                headerClass: "headercenter",
                children: [
                    { headerName: "P", field: "project_status", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Mode of Implementation',
                headerClass: "headercenter",
                children: [
                    { headerName: "Q", field: "mode_of_implememtation", width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Type',
                headerClass: "headercenter",
                children: [
                    { headerName: "R", field: "project_type", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Category',
                headerClass: "headercenter",
                children: [
                    { headerName: "S", field: "project_category_names", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Foundation laying / Tentative Foundation laying date',
                headerClass: "headercenter",
                children: [
                    { headerName: "T", field: "foundation_laid_date", headerClass: "headercenter",  width: 300, }
                ] 
            },

            { 
                headerName: 'Inauguration date / Tentative Inauguration date',
                headerClass: "headercenter",
                children: [
                    { headerName: "U", field: "inauguration_date", headerClass: "headercenter",  width: 250, }
                ] 
            }

        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



async function getBroadCategoryListDashboard(req, res) 
{
    const conn = await pool;
    const request = conn.request();
     
    try {

        const result = await request.query(`;WITH base_cte AS
            (
                SELECT 
                    CASE 
                        WHEN sp.sub_project_id IS NOT NULL THEN sp.sub_project_id
                        ELSE p.project_id
                    END AS unique_id,

                    ISNULL(sp.sub_mode_of_implememtation, p.mode_of_implememtation) AS mode_of_impl,

                    -- FIRST CATEGORY ONLY
                    TRY_CAST(
                        LEFT(
                            ISNULL(
                                CONVERT(VARCHAR(MAX), sp.sub_project_category_id),
                                CONVERT(VARCHAR(MAX), p.project_category_id)
                            ),
                            CHARINDEX(
                                ',',
                                ISNULL(
                                    CONVERT(VARCHAR(MAX), sp.sub_project_category_id),
                                    CONVERT(VARCHAR(MAX), p.project_category_id)
                                ) + ','
                            ) - 1
                        ) AS INT
                    ) AS project_category_id,

                    ISNULL(sp.sub_estimated_cost, p.estimated_cost) AS estimated_cost

                FROM tbl_project p

                LEFT JOIN tbl_sub_project sp 
                    ON sp.project_id = p.project_id

                INNER JOIN mmt_organisation o
                    ON o.organisation_id = p.organisation_id

                INNER JOIN mmt_hr_cluster h
                    ON o.hr_cluster_id = h.hr_cluster_id

                WHERE 
                    (
                        (sp.sub_project_id IS NOT NULL AND sp.sub_status = 1)
                        OR 
                        (sp.sub_project_id IS NULL AND p.status = 1)
                    )

                    AND ISNULL(
                        sp.sub_current_project_stage_id,
                        p.current_project_stage_id
                    ) != 14

                    AND h.hr_cluster_id = 1
            ),

            main_data AS
            (
                SELECT 
                    bc.broad_category_id,
                    bc.broad_category_name,

                    COUNT(DISTINCT CASE 
                        WHEN b.mode_of_impl = 'EPC' 
                        THEN b.unique_id 
                    END) AS epc_projects,

                    COUNT(DISTINCT CASE 
                        WHEN b.mode_of_impl = 'PPP' 
                        THEN b.unique_id 
                    END) AS ppp_projects,

                    COUNT(DISTINCT b.unique_id) AS total_ongoing_projects,

                    COUNT(DISTINCT pc.project_category_id) AS total_project_categories,

                    SUM(b.estimated_cost) AS total_estimated_cost

                FROM base_cte b

                INNER JOIN mmt_project_category pc 
                    ON b.project_category_id = pc.project_category_id

                INNER JOIN mmt_broad_category bc 
                    ON pc.broad_category_id = bc.broad_category_id

                WHERE 
                    bc.status = 1
                    AND pc.status = 1

                GROUP BY 
                    bc.broad_category_id,
                    bc.broad_category_name
            )

            SELECT 
                broad_category_id,
                broad_category_name,

                epc_projects,
                ppp_projects,

                total_ongoing_projects,

                CAST(
                    total_ongoing_projects * 100.0
                    / SUM(total_ongoing_projects) OVER()
                    AS DECIMAL(10,2)
                ) AS percentage,

                total_project_categories,

                total_estimated_cost

            FROM main_data

            ORDER BY broad_category_id;
    `);
      
        const rowData = result.recordset;
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [

         { 
                headerName: 'Broad Category Name',
                headerClass: "headercenter",
                children: [
                    { headerName: "A", field: "broad_category_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'EPC Projects',
                headerClass: "headercenter",
                children: [
                    { headerName: "B", field: "epc_projects", cellClass: 'text-left', headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'PPP Projects',
                headerClass: "headercenter",
                children: [
                    { headerName: "C", field: "ppp_projects", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Total Ongoing Projects',
                headerClass: "headercenter",
                children: [
                    { headerName: "D = B+C", field: "total_ongoing_projects", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Percentage',
                headerClass: "headercenter",
                children: [
                    { headerName: "E", field: "percentage", headerClass: "headercenter" }
                ] 
            },

             { 
                headerName: 'Estimated Cost',
                headerClass: "headercenter",
                children: [
                    { headerName: "F", field: "total_estimated_cost", headerClass: "headercenter" }
                ] 
            }

        ];

        // console.log(columnDefs,  "columnDefs, rowData")

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}




async function detailedBroadCategoryDashboard(req, res) 
{
      const moi = req.params.moi;
      const broadId = req.params.broadId;


    const conn = await pool;
    const request = conn.request();
    
    request.input("moi", moi);
    request.input("broadId", broadId);


    try {

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        let firstDateCurrentFy, todayDate;

        if (currentDate.getMonth() + 1 <= 3) {
            firstDateCurrentFy = (currentYear - 1) + "-04-01";
        } else {
            firstDateCurrentFy = currentYear + "-04-01";
        }

        todayDate = currentDate.toISOString().split('T')[0];

        request.input("firstDateCurrentFy", firstDateCurrentFy);
        request.input("todayDate", todayDate);

    const result = await request.query(`SELECT
    mmt_organisation.organisation_name,

    ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id) AS project_id,

    tbl_project.project_name,
    tbl_sub_project.sub_project_name,

    CONVERT(
        VARCHAR,
        ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated),
        106
    ) AS last_updated_date,

    ISNULL(
        tbl_sub_project.sub_estimated_cost,
        tbl_project.estimated_cost
    ) AS estimated_cost,

    --------------------------------------------------
    -- SANCTIONED DATE
    --------------------------------------------------

    CONVERT(
        VARCHAR,
        CASE 
            WHEN ISNULL(
                    tbl_sub_project.sub_project_type,
                    tbl_project.project_type
                 ) = 'Port level approval'

            THEN ISNULL(
                    tbl_sub_project.sub_chairman_approval_date,
                    tbl_project.chairman_approval_date
                 )

            ELSE ISNULL(
                    tbl_sub_project.sub_admin_approval_approval_date,
                    tbl_project.admin_approval_approval_date
                 )
        END,
        106
    ) AS sanctioned_date,

    --------------------------------------------------
    -- WORK AWARDED DATE
    --------------------------------------------------

    CONVERT(VARCHAR, workDate.work_awarded_date, 106)
    AS work_awarded_date,

    --------------------------------------------------
    -- COMPLETION DATE
    --------------------------------------------------

    CONVERT(
        VARCHAR,
        CASE 
            WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL
                 OR tbl_project.actual_date_of_completion IS NOT NULL

            THEN ISNULL(
                    tbl_sub_project.sub_actual_date_of_completion,
                    tbl_project.actual_date_of_completion
                 )

            ELSE ISNULL(
                    tbl_sub_project.sub_target_completion_date,
                    tbl_project.target_completion_date
                 )
        END,
        106
    ) AS completion_date,

    --------------------------------------------------
    -- CURRENT FY EXPENDITURE
    --------------------------------------------------

    ISNULL(currentFY.current_fy_expenditure, 0) AS current_fy_expenditure,

    --------------------------------------------------
    -- CAPACITY ADDITION
    --------------------------------------------------

    ISNULL(
        tbl_sub_project.sub_capacity_addition,
        tbl_project.capacity_addition
    ) AS capacity_addition,

    --------------------------------------------------
    -- PHYSICAL PROGRESS
    --------------------------------------------------

    CASE 
        WHEN phyProgress.physical_progress_value IS NOT NULL
        THEN CAST(phyProgress.physical_progress_value AS VARCHAR) + ' %'
        ELSE ''
    END AS physical_progress_value,

    --------------------------------------------------
    -- FINANCIAL PROGRESS
    --------------------------------------------------

    financialProgress.financial_progress,

    --------------------------------------------------
    -- STAGE NAME
    --------------------------------------------------

    stageName.stage_name AS current_stage_name,

     --------------------------------------------------
    -- SUB STAGE NAME
    --------------------------------------------------

    CASE 

            -- 0 → Project Initiated (no column → NULL safe)
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
            THEN 'Project Initiated  (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
            ,106) + ')'

            -- 1 → Pre-Feasibility
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
            THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
            ,106) + ')'

            -- 2 → DPR
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
            THEN 'DPR (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
            ,106) + ')'

            -- 3 → Chairman Approval
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
            THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
            ,106) + ')'

            -- 4 → Ministry Submission
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
            THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
            ,106) + ')'

            -- 5 → Submitted to Ministry
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
            THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
            ,106) + ')'

            -- 6 → DA
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
            THEN 'DA Concurrence (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
            ,106) + ')'

            -- 7 → IFW
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
            THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
            ,106) + ')'

            -- 8 → IMC Circulation
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
            THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
            ,106) + ')'

            -- 9 → Response to Comments
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
            THEN 'Response to Comments received (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
            ,106) + ')'

            -- 10 → SFC / EFC
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
            THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
            ,106) + ')'

            -- 11 → Admin Approval
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
            THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
            ,106) + ')'

            -- 12 → TENDERING
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
            THEN
            (
                SELECT TOP 1 
                    CASE tbl_project_date.sub_stage_id
                        WHEN 3 THEN 'Tech. Sanction obtained'
                        WHEN 4 THEN 'Tender Document approved'
                        WHEN 5 THEN 'Tender Notice Issued'
                        WHEN 6 THEN 'Technical Evaluation completed'
                        WHEN 7 THEN 'Financial Evaluation completed'
                        WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
                        WHEN 9 THEN 'Work Awarded / LOA Issued'
                        WHEN 10 THEN 'Contract Agreement Signed'
                    END
                    + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
                FROM tbl_project_date
                WHERE tbl_project_date.project_id = tbl_project.project_id
                AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                AND tbl_project_date.actual_date IS NOT NULL
                ORDER BY tbl_project_date.actual_date DESC
            )
            -- 13 → IMPLEMENTATION
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
            THEN
            (
                CASE 
                    WHEN phyProgress.physical_progress_value BETWEEN 0 AND 19 
                    THEN 
                        'Milestone 0 (' + 
                        CONVERT(VARCHAR,
                            (SELECT MAX(end_date)
                            FROM tbl_project_activity
                            WHERE project_id = tbl_project.project_id
                            AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                            AND milestone_id = 0
                            ),106) + ')'

                    WHEN phyProgress.physical_progress_value BETWEEN 20 AND 39 
                    THEN 
                        'Milestone 1 (' + 
                        CONVERT(VARCHAR,
                            (SELECT MAX(end_date)
                            FROM tbl_project_activity
                            WHERE project_id = tbl_project.project_id
                            AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                            AND milestone_id = 1
                            ),106) + ')'

                    WHEN phyProgress.physical_progress_value BETWEEN 40 AND 59 
                    THEN 
                        'Milestone 2 (' + 
                        CONVERT(VARCHAR,
                            (SELECT MAX(end_date)
                            FROM tbl_project_activity
                            WHERE project_id = tbl_project.project_id
                            AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                            AND milestone_id = 2
                            ),106) + ')'

                    WHEN phyProgress.physical_progress_value BETWEEN 60 AND 79 
                    THEN 
                        'Milestone 3 (' + 
                        CONVERT(VARCHAR,
                            (SELECT MAX(end_date)
                            FROM tbl_project_activity
                            WHERE project_id = tbl_project.project_id
                            AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                            AND milestone_id = 3
                            ),106) + ')'

                    WHEN phyProgress.physical_progress_value BETWEEN 80 AND 99 
                    THEN 
                        'Milestone 4 (' + 
                        CONVERT(VARCHAR,
                            (SELECT MAX(end_date)
                            FROM tbl_project_activity
                            WHERE project_id = tbl_project.project_id
                            AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                            AND milestone_id = 4
                            ),106) + ')'

                    WHEN phyProgress.physical_progress_value = 100 
                    THEN 
                        'Milestone 5 (' + 
                        CONVERT(VARCHAR,
                            (SELECT MAX(end_date)
                            FROM tbl_project_activity
                            WHERE project_id = tbl_project.project_id
                            AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                            AND milestone_id = 5
                            ),106) + ')'

                    ELSE 'Not Started'
                END
            )

            -- 14 → COMPLETED
            WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
            THEN 'Completed (' + CONVERT(VARCHAR,
                ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
            ,106) + ')'

        END AS current_sub_stage,

        ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,

  
    
        ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,
        
        ISNULL((
            SELECT STRING_AGG(mpc.project_category_name, ', ')
            FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS sps
            JOIN mmt_project_category AS mpc 
                ON TRY_CAST(sps.value AS INT) = mpc.project_category_id
        ), (
            SELECT STRING_AGG(mpc.project_category_name, ', ')
            FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS ps
            JOIN mmt_project_category AS mpc 
                ON TRY_CAST(ps.value AS INT) = mpc.project_category_id
        )) AS project_category_names,

    --------------------------------------------------
    -- PROJECT STATUS
    --------------------------------------------------

    CASE
        WHEN tbl_project.actual_date_of_completion IS NULL
             OR tbl_project.target_completion_date IS NULL
        THEN 'In Progress'

        WHEN tbl_project.actual_date_of_completion
             <= tbl_project.target_completion_date
        THEN 'On Time'

        ELSE 'Delayed'
    END AS project_status,

    --------------------------------------------------
    -- MODE OF IMPLEMENTATION
    --------------------------------------------------

    ISNULL(
        tbl_sub_project.sub_mode_of_implememtation,
        tbl_project.mode_of_implememtation
    ) AS mode_of_implememtation,

    --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
    CONVERT(VARCHAR,
        CASE 
            WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
                OR tbl_project.foundation_laid_date IS NOT NULL
            THEN ISNULL(
                    tbl_sub_project.sub_foundation_laid_date,
                    tbl_project.foundation_laid_date
                )
            ELSE ISNULL(
                    tbl_sub_project.sub_foundation_tentative_date,
                    tbl_project.foundation_tentative_date
                )
        END,
    106) AS foundation_laid_date,

-- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
    CONVERT(VARCHAR,
        CASE 
            WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
                OR tbl_project.inauguration_date IS NOT NULL
            THEN ISNULL(
                    tbl_sub_project.sub_inauguration_date,
                    tbl_project.inauguration_date
                )
            ELSE ISNULL(
                    tbl_sub_project.sub_tentative_inauguration_date,
                    tbl_project.tentative_inauguration_date
                )
        END,
    106) AS inauguration_date



FROM tbl_project

--------------------------------------------------
-- SUB PROJECT
--------------------------------------------------

LEFT JOIN tbl_sub_project
    ON tbl_sub_project.project_id = tbl_project.project_id

--------------------------------------------------
-- ORGANISATION
--------------------------------------------------

INNER JOIN mmt_organisation
    ON mmt_organisation.organisation_id =
       tbl_project.organisation_id

--------------------------------------------------
-- CLUSTER
--------------------------------------------------

INNER JOIN mmt_hr_cluster
    ON mmt_organisation.hr_cluster_id =
       mmt_hr_cluster.hr_cluster_id

--------------------------------------------------
-- WORK AWARDED
--------------------------------------------------

LEFT JOIN
(
    SELECT
        project_id,
        sub_project_id,

        MAX(ISNULL(actual_date, planned_date))
        AS work_awarded_date

    FROM tbl_project_date

    WHERE sub_stage_id = 9

    GROUP BY
        project_id,
        sub_project_id

) workDate

ON workDate.project_id = tbl_project.project_id

AND ISNULL(workDate.sub_project_id, -1) =
    ISNULL(tbl_sub_project.sub_project_id, -1)

--------------------------------------------------
-- PHYSICAL PROGRESS
--------------------------------------------------

LEFT JOIN
(
    SELECT
        project_id,
        sub_project_id,

        MAX(physical_progress)
        AS physical_progress_value

    FROM tbl_project_physical_progress

    GROUP BY
        project_id,
        sub_project_id

) phyProgress

ON phyProgress.project_id = tbl_project.project_id

AND ISNULL(phyProgress.sub_project_id, -1) =
    ISNULL(tbl_sub_project.sub_project_id, -1)

--------------------------------------------------
-- FINANCIAL PROGRESS
--------------------------------------------------

LEFT JOIN
(
    SELECT
        tbl_project_expenditure.project_id,
        tbl_project_expenditure.sub_project_id,

        ROUND(
            (
                SUM(
                    ISNULL(tbl_project_expenditure.gbs_components, 0) +
                    ISNULL(tbl_project_expenditure.iebr_components, 0) +
                    ISNULL(tbl_project_expenditure.ppp_components, 0) +
                    ISNULL(tbl_project_expenditure.loans_components, 0) +
                    ISNULL(tbl_project_expenditure.multilateral_components, 0) +
                    ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) +
                    ISNULL(tbl_project_expenditure.pmmsy_components, 0) +
                    ISNULL(tbl_project_expenditure.sagarmala_components, 0) +
                    ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                )
                /
                NULLIF(
                    (
                        ISNULL(tbl_project.award_project_cost, 0) +
                        ISNULL(tbl_sub_project.sub_award_project_cost, 0)
                    ),
                    0
                )
            ) * 100,
            2
        ) AS financial_progress

    FROM tbl_project_expenditure

    LEFT JOIN tbl_project
        ON tbl_project.project_id =
           tbl_project_expenditure.project_id

    LEFT JOIN tbl_sub_project
        ON tbl_sub_project.sub_project_id =
           tbl_project_expenditure.sub_project_id

    GROUP BY
        tbl_project_expenditure.project_id,
        tbl_project_expenditure.sub_project_id,
        tbl_project.award_project_cost,
        tbl_sub_project.sub_award_project_cost

) financialProgress

ON financialProgress.project_id = tbl_project.project_id

AND ISNULL(financialProgress.sub_project_id, -1) =
    ISNULL(tbl_sub_project.sub_project_id, -1)

--------------------------------------------------
-- CURRENT FY EXPENDITURE
--------------------------------------------------

LEFT JOIN
(
    SELECT
        project_id,
        sub_project_id,

        SUM(
            ISNULL(gbs_components,0) +
            ISNULL(iebr_components,0) +
            ISNULL(ppp_components,0) +
            ISNULL(loans_components,0) +
            ISNULL(multilateral_components,0) +
            ISNULL(state_gov_fund_components,0) +
            ISNULL(pmmsy_components,0) +
            ISNULL(sagarmala_components,0) +
            ISNULL(other_source_funding_comp,0)
        ) AS current_fy_expenditure

    FROM tbl_project_expenditure

    WHERE expenditure_date BETWEEN
          @firstDateCurrentFy
          AND @todayDate

    GROUP BY
        project_id,
        sub_project_id

) currentFY

ON currentFY.project_id = tbl_project.project_id

AND ISNULL(currentFY.sub_project_id,-1) =
    ISNULL(tbl_sub_project.sub_project_id,-1)

--------------------------------------------------
-- STAGE NAME
--------------------------------------------------

LEFT JOIN tbl_project_stage stageName

ON stageName.stage_id =
   ISNULL(
        tbl_sub_project.sub_current_project_stage_id,
        tbl_project.current_project_stage_id
   )

--------------------------------------------------
-- MAIN FILTER
--------------------------------------------------

WHERE

--------------------------------------------------
-- MODE FILTER
--------------------------------------------------

ISNULL(
    tbl_sub_project.sub_mode_of_implememtation,
    tbl_project.mode_of_implememtation
) = @moi

--------------------------------------------------
-- ACTIVE PROJECT FILTER
--------------------------------------------------

AND
(
    (
        tbl_sub_project.sub_project_id IS NOT NULL
        AND tbl_sub_project.sub_status = 1
    )

    OR

    (
        tbl_sub_project.sub_project_id IS NULL
        AND tbl_project.status = 1
    )
)

--------------------------------------------------
-- NOT COMPLETED
--------------------------------------------------

AND ISNULL(
        tbl_sub_project.sub_current_project_stage_id,
        tbl_project.current_project_stage_id
    ) != 14

--------------------------------------------------
-- CLUSTER FILTER
--------------------------------------------------

AND mmt_hr_cluster.hr_cluster_id = 1

--------------------------------------------------
-- FIRST CATEGORY BROAD CATEGORY FILTER
--------------------------------------------------

AND EXISTS
(
    SELECT 1
    FROM mmt_project_category mpc

    WHERE mpc.project_category_id =
        TRY_CAST(
            LEFT(
                CONVERT(
                    VARCHAR(MAX),
                    ISNULL(
                        tbl_sub_project.sub_project_category_id,
                        tbl_project.project_category_id
                    )
                ),
                CHARINDEX(
                    ',',
                    CONVERT(
                        VARCHAR(MAX),
                        ISNULL(
                            tbl_sub_project.sub_project_category_id,
                            tbl_project.project_category_id
                        )
                    ) + ','
                ) - 1
            ) AS INT
        )

    AND mpc.broad_category_id = @broadId
)
    `);
        // console.log(result, "result")
        const rowData = result.recordset;
        // console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        let columnDefs = [

            { 
                headerName: 'Organisation Name',
                headerClass: "headercenter",
                children: [
                    { headerName: "A", field: "organisation_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project ID',
                headerClass: "headercenter",
                children: [
                    { headerName: "B", field: "project_id", cellClass: 'text-left', headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Name of',
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'C',
                                field: 'project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    },
                    {
                        headerName: 'Sub Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'D',
                                field: 'sub_project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    }
                ]
            },

            { 
                headerName: 'Last Updated Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "E", field: "last_updated_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Total Estimated Cost (In Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "F", field: "estimated_cost", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Sanctioned Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "G", field: "sanctioned_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Target Award / Awarded Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "H", field: "work_awarded_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Completion Date / Target Completion Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "I", field: "completion_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Expenditure in Current FY (in Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "J", field: "current_fy_expenditure", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Capacity Addition (in MTPA)',
                headerClass: "headercenter",
                children: [
                    { headerName: "K", field: "capacity_addition", headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Physical Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "L", 
                        field: "physical_progress_value",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },
            { 
                headerName: 'Financial Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "M", 
                        field: "financial_progress",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },


            { 
                headerName: 'Current Stage',
                headerClass: "headercenter",
                children: [
                    { headerName: "N", field: "current_stage_name", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Current Sub-stage (with date)',
                headerClass: "headercenter",
                children: [
                    { headerName: "O", field: "current_sub_stage", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Delayed Status',
                headerClass: "headercenter",
                children: [
                    { headerName: "P", field: "project_status", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Mode of Implementation',
                headerClass: "headercenter",
                children: [
                    { headerName: "Q", field: "mode_of_implememtation", width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Type',
                headerClass: "headercenter",
                children: [
                    { headerName: "R", field: "project_type", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Category',
                headerClass: "headercenter",
                children: [
                    { headerName: "S", field: "project_category_names", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Foundation laying / Tentative Foundation laying date',
                headerClass: "headercenter",
                children: [
                    { headerName: "T", field: "foundation_laid_date", headerClass: "headercenter",  width: 300, }
                ] 
            },

            { 
                headerName: 'Inauguration date / Tentative Inauguration date',
                headerClass: "headercenter",
                children: [
                    { headerName: "U", field: "inauguration_date", headerClass: "headercenter",  width: 250, }
                ] 
            }

        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


async function getDelayedStatusPieChart(req, res) 
{
    const clusterID = parseInt(req.body.clusterID, 10) || 0;
    const organisationID = parseInt(req.body.organisationID, 10) || 0;

    const fromFoundationTentativeDate = req.body.fromFoundationTentativeDate || null;
    const toFoundationTentativeDate = req.body.toFoundationTentativeDate || null;
    const fromTentativeInaugurationDate = req.body.fromTentativeInaugurationDate || null;
    const toTentativeInaugurationDate = req.body.toTentativeInaugurationDate || null;        
    const fromAwardedDate = req.body.fromAwardedDate || null;
    const toAwardedDate = req.body.toAwardedDate || null;
    const fromActCompletionDate = req.body.fromActCompletionDate || null;
    const toActCompletionDate = req.body.toActCompletionDate || null;
    const fromSantionedDate = req.body.fromSantionedDate || null;
    const toSantionedDate = req.body.toSantionedDate || null;


    const conn = await pool;
    const request = conn.request();
    request.input("clusterID", clusterID);
    request.input("organisationID", organisationID);

    request.input("fromFoundationTentativeDate", fromFoundationTentativeDate);
    request.input("toFoundationTentativeDate", toFoundationTentativeDate);
    request.input("fromTentativeInaugurationDate", fromTentativeInaugurationDate);
    request.input("toTentativeInaugurationDate", toTentativeInaugurationDate);
    request.input("fromAwardedDate", fromAwardedDate);
    request.input("toAwardedDate", toAwardedDate);
    request.input("fromActCompletionDate", fromActCompletionDate);
    request.input("toActCompletionDate", toActCompletionDate);
    request.input("fromSantionedDate", fromSantionedDate);
    request.input("toSantionedDate", toSantionedDate);

    try {

            const result = await request.query(`
               SELECT
                    CASE
                        WHEN TRY_CAST(tbl_project_physical_progress.progress_date AS DATE)
                            <= TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_target_completion_date,
                                        tbl_project.target_completion_date
                                    ) AS DATE
                                )
                        THEN 'On Time'
                        ELSE 'Delayed'
                    END AS status,

                    COUNT(DISTINCT
                        COALESCE(
                            tbl_sub_project.sub_project_id,
                            tbl_project.project_id
                        )
                    ) AS project_count

                FROM tbl_project

                LEFT JOIN tbl_sub_project
                    ON tbl_sub_project.project_id = tbl_project.project_id

                INNER JOIN mmt_organisation
                    ON mmt_organisation.organisation_id =
                        ISNULL(
                            tbl_sub_project.sub_organisation_id,
                            tbl_project.organisation_id
                        )

                INNER JOIN mmt_hr_cluster
                    ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

                LEFT JOIN (
                    SELECT DISTINCT
                        project_id,
                        sub_project_id,
                        actual_date
                    FROM tbl_project_date
                    WHERE sub_stage_id = 9
                    AND actual_date IS NOT NULL
                ) AS tbl_project_date
                ON tbl_project_date.project_id = tbl_project.project_id
                AND (
                        (
                            tbl_sub_project.sub_project_id IS NOT NULL
                            AND tbl_project_date.sub_project_id = tbl_sub_project.sub_project_id
                        )
                    OR (
                            tbl_sub_project.sub_project_id IS NULL
                            AND tbl_project_date.sub_project_id = '-1'
                        )
                )

                LEFT JOIN (
                    SELECT
                        project_id,
                        sub_project_id,
                        MAX(progress_date) AS progress_date
                    FROM tbl_project_physical_progress
                    GROUP BY project_id, sub_project_id

                ) AS tbl_project_physical_progress
                ON tbl_project_physical_progress.project_id = tbl_project.project_id
                AND (
                        (
                            tbl_sub_project.sub_project_id IS NOT NULL
                            AND tbl_project_physical_progress.sub_project_id = tbl_sub_project.sub_project_id
                        )
                    OR (
                            tbl_sub_project.sub_project_id IS NULL
                            AND tbl_project_physical_progress.sub_project_id = '-1'
                        )
                )

                WHERE
                    COALESCE(
                        tbl_sub_project.sub_current_project_stage_id,
                        tbl_project.current_project_stage_id
                    ) = 13

                    AND (
                        (
                            tbl_sub_project.sub_project_id IS NOT NULL
                            AND tbl_sub_project.sub_status = 1
                        )
                        OR
                        (
                            tbl_sub_project.sub_project_id IS NULL
                            AND tbl_project.status = 1
                        )
                    )

                    AND (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)

                    AND (@organisationID = 0 OR mmt_organisation.organisation_id = @organisationID)

                    -- Foundation Date
                    AND (
                        (@fromFoundationTentativeDate IS NULL OR @toFoundationTentativeDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_foundation_tentative_date,
                                    tbl_project.foundation_tentative_date
                                ) AS DATE
                            ) BETWEEN @fromFoundationTentativeDate
                            AND @toFoundationTentativeDate
                        )
                    )

                    -- Inauguration Date
                    AND (
                        (@fromTentativeInaugurationDate IS NULL OR @toTentativeInaugurationDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_tentative_inauguration_date,
                                    tbl_project.tentative_inauguration_date
                                ) AS DATE
                            ) BETWEEN @fromTentativeInaugurationDate
                            AND @toTentativeInaugurationDate
                        )
                    )

                    -- Work Awarded Date
                    AND (
                        (@fromAwardedDate IS NULL OR @toAwardedDate IS NULL)
                        OR
                        (
                            TRY_CAST(tbl_project_date.actual_date AS DATE)
                            BETWEEN @fromAwardedDate AND @toAwardedDate
                        )
                    )

                    -- Actual Completion Date
                    AND (
                        (@fromActCompletionDate IS NULL OR @toActCompletionDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_actual_date_of_completion,
                                    tbl_project.actual_date_of_completion
                                ) AS DATE
                            ) BETWEEN @fromActCompletionDate
                            AND @toActCompletionDate
                        )
                    )

                    -- Santioned Date
                    AND (
                        (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                        OR
                        (
                            TRY_CAST(
                                COALESCE(
                                    tbl_sub_project.sub_chairman_approval_date,
                                    tbl_project.chairman_approval_date,
                                    tbl_sub_project.sub_admin_approval_approval_date,
                                    tbl_project.admin_approval_approval_date
                                ) AS DATE
                            ) BETWEEN @fromSantionedDate
                            AND @toSantionedDate
                        )
                    )

                GROUP BY
                    CASE
                        WHEN TRY_CAST(tbl_project_physical_progress.progress_date AS DATE)
                            <= TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_target_completion_date,
                                        tbl_project.target_completion_date
                                    ) AS DATE
                                )
                        THEN 'On Time'
                        ELSE 'Delayed'
                    END
    `);
        // console.log(result, result.recordset , "result")
      
        // res.status(200).json(result.recordset[0]);

        const data = result.recordset;

res.status(200).json({
  ontime_count: data.find(x => x.status === 'On Time')?.project_count || 0,
  delayed_count: data.find(x => x.status === 'Delayed')?.project_count || 0
});

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function detailedDelayedStatusProjectData(req, res) {
  try {

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();

        let firstDateCurrentFy, todayDate;

        if (currentDate.getMonth() + 1 <= 3) {
            firstDateCurrentFy = (currentYear - 1) + "-04-01";
        } else {
            firstDateCurrentFy = currentYear + "-04-01";
        }

        todayDate = currentDate.toISOString().split('T')[0];

       
        const clusterID = parseInt(req.body.clusterID, 10) || 0;
        const organisationID = parseInt(req.body.organisationID, 10) || 0;
    
        const fromFoundationDate = req.body.fromFoundationDate || null;
        const toFoundationDate = req.body.toFoundationDate || null;
        const fromTentativeDate = req.body.fromTentativeDate || null;
        const toTentativeDate = req.body.toTentativeDate || null;

        const fromWorkAwardedDate = req.body.fromWorkAwardedDate || null;
        const toWorkAwardedDate = req.body.toWorkAwardedDate || null;
        const fromActualCompletionDate = req.body.fromActualCompletionDate || null;
        const toActualCompletionDate = req.body.toActualCompletionDate || null;
        const fromSantionedDate = req.body.fromSantionedDate || null;
        const toSantionedDate = req.body.toSantionedDate || null;
        const projectStatus = req.body.projectStatus || null;

       
       const conn = await pool;
        const request = conn.request();
        
        request.input("firstDateCurrentFy", firstDateCurrentFy);
        request.input("todayDate", todayDate);
        request.input("clusterID", clusterID);
        request.input("organisationID", organisationID);
    
        request.input("fromFoundationDate", fromFoundationDate);
        request.input("toFoundationDate", toFoundationDate);
        request.input("fromTentativeDate", fromTentativeDate);
        request.input("toTentativeDate", toTentativeDate);
        
        request.input("fromWorkAwardedDate", fromWorkAwardedDate);
        request.input("toWorkAwardedDate", toWorkAwardedDate);
        request.input("fromActualCompletionDate", fromActualCompletionDate);
        request.input("toActualCompletionDate", toActualCompletionDate);
        request.input("fromSantionedDate", fromSantionedDate);
        request.input("toSantionedDate", toSantionedDate);
        request.input("projectStatus", projectStatus);

      const result = await request.query(`

                WITH FilteredData AS (
                    SELECT 
                    mmt_organisation.organisation_name,
                                ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id) AS unique_id,
                        
                            tbl_project.project_id,
                        tbl_sub_project.sub_project_id,

                        tbl_project.project_name,
                        tbl_sub_project.sub_project_name,

                            CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated), 106) AS last_updated_date,

                            ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,

                            CONVERT(VARCHAR,
                                CASE 
                                    WHEN ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) = 'Port level approval'
                                        THEN ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                                    ELSE 
                                        ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                                END, 106) AS sanctioned_date,

                            CONVERT(VARCHAR, work_award.work_awarded_date, 106) AS work_awarded_date,

                            CONVERT(VARCHAR,
                                CASE 
                                    -- Step 1: If actual completion exists → show actual date
                                    WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL 
                                        OR tbl_project.actual_date_of_completion IS NOT NULL
                                    THEN ISNULL(
                                            tbl_sub_project.sub_actual_date_of_completion,
                                            tbl_project.actual_date_of_completion
                                        )

                                    -- Step 2: Else show target completion date
                                    ELSE ISNULL(
                                            tbl_sub_project.sub_target_completion_date,
                                            tbl_project.target_completion_date
                                        )
                                END,
                            106) AS completion_date,

                            ISNULL(current_fy.current_fy_expenditure, 0) AS current_fy_expenditure,

                            ISNULL(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,

                            ISNULL(physical_progress_data.physical_progress_value, 0) AS physical_progress_value,

                            financialProgress.financial_progress,

                            tbl_project_stage.stage_name AS current_stage_name,

                            ------------------------------------------------------------
                            -- CURRENT SUB STAGE
                            ------------------------------------------------------------
                            CASE 

                                -- 0 → Project Initiated (no column → NULL safe)
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
                                THEN 'Project Initiated  (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
                                ,106) + ')'

                                -- 1 → Pre-Feasibility
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
                                THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
                                ,106) + ')'

                                -- 2 → DPR
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
                                THEN 'DPR (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
                                ,106) + ')'

                                -- 3 → Chairman Approval
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
                                THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
                                ,106) + ')'

                                -- 4 → Ministry Submission
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
                                THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                                ,106) + ')'

                                -- 5 → Submitted to Ministry
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
                                THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
                                ,106) + ')'

                                -- 6 → DA
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
                                THEN 'DA Concurrence (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
                                ,106) + ')'

                                -- 7 → IFW
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
                                THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
                                ,106) + ')'

                                -- 8 → IMC Circulation
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
                                THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
                                ,106) + ')'

                                -- 9 → Response to Comments
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
                                THEN 'Response to Comments received (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
                                ,106) + ')'

                                -- 10 → SFC / EFC
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
                                THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
                                ,106) + ')'

                                -- 11 → Admin Approval
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
                                THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
                                ,106) + ')'

                                -- 12 → TENDERING
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
                                THEN
                                (
                                    SELECT TOP 1 
                                        CASE tbl_project_date.sub_stage_id
                                            WHEN 3 THEN 'Tech. Sanction obtained'
                                            WHEN 4 THEN 'Tender Document approved'
                                            WHEN 5 THEN 'Tender Notice Issued'
                                            WHEN 6 THEN 'Technical Evaluation completed'
                                            WHEN 7 THEN 'Financial Evaluation completed'
                                            WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
                                            WHEN 9 THEN 'Work Awarded / LOA Issued'
                                            WHEN 10 THEN 'Contract Agreement Signed'
                                        END
                                        + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
                                    FROM tbl_project_date
                                    WHERE tbl_project_date.project_id = tbl_project.project_id
                                    AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                    AND tbl_project_date.actual_date IS NOT NULL
                                    ORDER BY tbl_project_date.actual_date DESC
                                )
                                -- 13 → IMPLEMENTATION
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
                                THEN
                                (
                                    CASE 
                                        WHEN physical_progress_data.physical_progress_value BETWEEN 0 AND 19 
                                        THEN 
                                            'Milestone 0 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 0
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 20 AND 39 
                                        THEN 
                                            'Milestone 1 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 1
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 40 AND 59 
                                        THEN 
                                            'Milestone 2 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 2
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 60 AND 79 
                                        THEN 
                                            'Milestone 3 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 3
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value BETWEEN 80 AND 99 
                                        THEN 
                                            'Milestone 4 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 4
                                                ),106) + ')'

                                        WHEN physical_progress_data.physical_progress_value = 100 
                                        THEN 
                                            'Milestone 5 (' + 
                                            CONVERT(VARCHAR,
                                                (SELECT MAX(end_date)
                                                FROM tbl_project_activity
                                                WHERE project_id = tbl_project.project_id
                                                AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
                                                AND milestone_id = 5
                                                ),106) + ')'

                                        ELSE 'Not Started'
                                    END
                                )

                                -- 14 → COMPLETED
                                WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
                                THEN 'Completed (' + CONVERT(VARCHAR,
                                    ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
                                ,106) + ')'

                            END AS current_sub_stage,

                            ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
                            ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,
                            ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,

                            ISNULL((
                                SELECT STRING_AGG(mmt_project_category.project_category_name, ', ')
                                FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS split_sub
                                JOIN mmt_project_category 
                                    ON TRY_CAST(split_sub.value AS INT) = mmt_project_category.project_category_id
                            ), (
                                SELECT STRING_AGG(mmt_project_category.project_category_name, ', ')
                                FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS split_main
                                JOIN mmt_project_category 
                                    ON TRY_CAST(split_main.value AS INT) = mmt_project_category.project_category_id
                            )) AS project_category_names,

                            CASE
                                WHEN tbl_project.actual_date_of_completion IS NULL OR tbl_project.target_completion_date IS NULL THEN 'In Progress'
                                WHEN tbl_project.actual_date_of_completion <= tbl_project.target_completion_date THEN 'On Time'
                                ELSE 'Delayed'
                            END AS project_status,

                            --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
                            CONVERT(VARCHAR,
                                CASE 
                                    WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
                                        OR tbl_project.foundation_laid_date IS NOT NULL
                                    THEN ISNULL(
                                            tbl_sub_project.sub_foundation_laid_date,
                                            tbl_project.foundation_laid_date
                                        )
                                    ELSE ISNULL(
                                            tbl_sub_project.sub_foundation_tentative_date,
                                            tbl_project.foundation_tentative_date
                                        )
                                END,
                            106) AS foundation_laid_date,

                        -- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
                            CONVERT(VARCHAR,
                                CASE 
                                    WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
                                        OR tbl_project.inauguration_date IS NOT NULL
                                    THEN ISNULL(
                                            tbl_sub_project.sub_inauguration_date,
                                            tbl_project.inauguration_date
                                        )
                                    ELSE ISNULL(
                                            tbl_sub_project.sub_tentative_inauguration_date,
                                            tbl_project.tentative_inauguration_date
                                        )
                                END,
                            106) AS inauguration_date,

                            ROW_NUMBER() OVER (
                            PARTITION BY 
                                ISNULL(tbl_sub_project.sub_project_id, tbl_project.project_id)
                            ORDER BY 
                                tbl_project.project_id
                        ) AS rn

                        FROM tbl_project

                        LEFT JOIN tbl_sub_project 
                            ON tbl_sub_project.project_id = tbl_project.project_id

                        LEFT JOIN (
                            SELECT 
                                project_id, 
                                sub_project_id,
                                MAX(physical_progress) AS physical_progress_value
                            FROM tbl_project_physical_progress
                            GROUP BY project_id, sub_project_id
                        ) physical_progress_data
                        ON physical_progress_data.project_id = tbl_project.project_id
                        AND ISNULL(physical_progress_data.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


                           LEFT JOIN (
                    SELECT
                        project_id, sub_project_id, MAX(progress_date) AS progress_date
                    FROM tbl_project_physical_progress
                    GROUP BY project_id, sub_project_id

                ) AS tbl_phy_delay_status
               ON tbl_phy_delay_status.project_id = tbl_project.project_id
                        AND ISNULL(tbl_phy_delay_status.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


                        LEFT JOIN (
                            SELECT project_id, sub_project_id,
                            MAX(ISNULL(actual_date, planned_date)) AS work_awarded_date
                            FROM tbl_project_date
                            WHERE sub_stage_id = 9
                            GROUP BY project_id, sub_project_id
                        ) work_award
                        ON work_award.project_id = tbl_project.project_id
                        AND ISNULL(work_award.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


                        LEFT JOIN (
                            SELECT DISTINCT project_id, sub_project_id, actual_date
                            FROM tbl_project_date
                            WHERE sub_stage_id = 9 
                            AND actual_date IS NOT NULL
                        ) pd 
                        ON pd.project_id = tbl_project.project_id
                        AND (
                                (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
                                OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
                            )
                        
                        LEFT JOIN 
                        (
                            SELECT 
                                tbl_project_expenditure.project_id,
                                tbl_project_expenditure.sub_project_id,

                                (
                                    SUM(
                                        ISNULL(tbl_project_expenditure.gbs_components, 0) + 
                                        ISNULL(tbl_project_expenditure.iebr_components, 0) + 
                                        ISNULL(tbl_project_expenditure.ppp_components, 0) + 
                                        ISNULL(tbl_project_expenditure.loans_components, 0) + 
                                        ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
                                        ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
                                        ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                     
                                        ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
                                        ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
                                    ) 
                                    /
                                    NULLIF(
                                        (ISNULL(tbl_project.award_project_cost, 0) + 
                                        ISNULL(tbl_sub_project.sub_award_project_cost, 0)), 0
                                    )
                                ) * 100 AS financial_progress

                            FROM tbl_project_expenditure

                            LEFT JOIN tbl_project 
                                ON tbl_project.project_id = tbl_project_expenditure.project_id

                            LEFT JOIN tbl_sub_project 
                                ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

                            GROUP BY 
                                tbl_project_expenditure.project_id,
                                tbl_project_expenditure.sub_project_id,
                                tbl_project.award_project_cost,
                                tbl_sub_project.sub_award_project_cost
                        ) financialProgress
                            ON financialProgress.project_id = tbl_project.project_id
                            AND ISNULL(financialProgress.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)


                        LEFT JOIN tbl_project_stage 
                            ON tbl_project_stage.stage_id = ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id)
                        
                        LEFT JOIN mmt_organisation
                            ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)

                        INNER JOIN mmt_hr_cluster ON  mmt_hr_cluster.hr_cluster_id = mmt_organisation.hr_cluster_id 


                        LEFT JOIN (
                            SELECT 
                                project_id, 
                                sub_project_id,
                                SUM(ISNULL(gbs_components,0)+ISNULL(iebr_components,0)) AS current_fy_expenditure
                            FROM tbl_project_expenditure
                            WHERE expenditure_date BETWEEN @firstDateCurrentFy AND @todayDate
                            GROUP BY project_id, sub_project_id
                        ) current_fy
                        ON current_fy.project_id = tbl_project.project_id
                        AND ISNULL(current_fy.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                        WHERE 
                            --  (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
                        
               -- AND ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID


                (
                    @clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID
                )

                AND
                (
                    @organisationID = 0
                    OR ISNULL(
                        tbl_sub_project.sub_organisation_id, tbl_project.organisation_id) = @organisationID
                )
                 
                          
                AND COALESCE(
                        tbl_sub_project.sub_current_project_stage_id,
                        tbl_project.current_project_stage_id
                    ) = 13

                AND (
                    @projectStatus IS NULL
                    OR
                    (
                        CASE
                            WHEN TRY_CAST(tbl_phy_delay_status.progress_date AS DATE)
                                <= TRY_CAST(
                                        COALESCE(
                                            tbl_sub_project.sub_target_completion_date,
                                            tbl_project.target_completion_date
                                        ) AS DATE
                                    )
                            THEN 'On Time'
                            ELSE 'Delayed'
                        END = @projectStatus
                    )
                )
                    
                            AND ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1
                                                                
                            --DATE FILTER
                            -- Foundation Date
                            AND (
                            (@fromFoundationDate IS NULL OR @toFoundationDate IS NULL)
                            OR
                            (
                                TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_foundation_tentative_date,
                                        tbl_project.foundation_tentative_date
                                    ) AS DATE
                                ) BETWEEN @fromFoundationDate AND @toFoundationDate
                            )
                        )
                        
                        -- Inauguration Date
                        AND (
                            (@fromTentativeDate IS NULL OR @toTentativeDate IS NULL)
                            OR
                            (
                                TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_tentative_inauguration_date,
                                        tbl_project.tentative_inauguration_date
                                    ) AS DATE
                                ) BETWEEN @fromTentativeDate AND @toTentativeDate
                            )
                        )

                        -- Work Awarded Date
                        AND (
                            (@fromWorkAwardedDate IS NULL OR @toWorkAwardedDate IS NULL)
                            OR
                            (
                                TRY_CAST(pd.actual_date AS DATE)
                                BETWEEN @fromWorkAwardedDate AND @toWorkAwardedDate
                            )
                        )
                
                        -- Actual Completion Date
                        AND (
                            (@fromActualCompletionDate IS NULL OR @toActualCompletionDate IS NULL)
                            OR
                            (
                                TRY_CAST(
                                    COALESCE(
                                        tbl_sub_project.sub_actual_date_of_completion,
                                        tbl_project.actual_date_of_completion
                                    ) AS DATE
                                ) BETWEEN @fromActualCompletionDate AND @toActualCompletionDate
                            )
                        )
                                
                        --Santioned date
                            AND (
                                (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
                                OR
                                (
                                    TRY_CAST(
                                        COALESCE(
                                                tbl_sub_project.sub_chairman_approval_date,
                                                tbl_project.chairman_approval_date,
                                                tbl_sub_project.sub_admin_approval_approval_date,
                                                tbl_project.admin_approval_approval_date
                                        ) AS DATE
                                    ) BETWEEN @fromSantionedDate AND @toSantionedDate
                                )
                            )
                        )

                        SELECT *
                FROM FilteredData
                WHERE rn = 1   --  duplicate remove
                ORDER BY FilteredData.project_id;
            
    `);
// -- WHERE final_stage_id IN (${stageFilter});
        const rowData = result.recordset;
        console.log(result.recordset, "result.recordset")
        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

   
        let columnDefs = [
            { 
                headerName: 'Organisation Name',
                headerClass: "headercenter",
                children: [
                    { headerName: "A", field: "organisation_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project ID',
                headerClass: "headercenter",
                children: [
                    { headerName: "B", field: "project_id", cellClass: 'text-left', headerClass: "headercenter" }
                ] 
            },

            {
                headerName: 'Name of',
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'C',
                                field: 'project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    },
                    {
                        headerName: 'Sub Project',
                        headerClass: "headercenter",
                        children: [
                            {
                                headerName: 'D',
                                field: 'sub_project_name',
                                width: 350,
                                headerClass: "headercenter"
                            }
                        ]
                    }
                ]
            },

            { 
                headerName: 'Last Updated Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "E", field: "last_updated_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Total Estimated Cost (In Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "F", field: "estimated_cost", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Sanctioned Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "G", field: "sanctioned_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Target Award / Awarded Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "H", field: "work_awarded_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Completion Date / Target Completion Date',
                headerClass: "headercenter",
                children: [
                    { headerName: "I", field: "completion_date", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Expenditure in Current FY (in Cr.)',
                headerClass: "headercenter",
                children: [
                    { headerName: "J", field: "current_fy_expenditure", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Capacity Addition (in MTPA)',
                headerClass: "headercenter",
                children: [
                    { headerName: "K", field: "capacity_addition", headerClass: "headercenter" }
                ] 
            },

           {
                headerName: 'Physical Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "L", 
                        field: "physical_progress_value",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },
            { 
                headerName: 'Financial Progress %',
                headerClass: "headercenter",
                children: [
                    { 
                        headerName: "M", 
                        field: "financial_progress",
                        headerClass: "headercenter",
                        valueFormatter: params => {
                            return (params.value && params.value != 0) ? params.value : '';
                        }
                    }
                ] 
            },

            { 
                headerName: 'Current Stage',
                headerClass: "headercenter",
                children: [
                    { headerName: "N", field: "current_stage_name", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Current Sub-stage (with date)',
                headerClass: "headercenter",
                children: [
                    { headerName: "O", field: "current_sub_stage", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Delayed Status',
                headerClass: "headercenter",
                children: [
                    { headerName: "P", field: "project_status", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Mode of Implementation',
                headerClass: "headercenter",
                children: [
                    { headerName: "Q", field: "mode_of_implememtation", width: 250, headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Type',
                headerClass: "headercenter",
                children: [
                    { headerName: "R", field: "project_type", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Project Category',
                headerClass: "headercenter",
                children: [
                    { headerName: "S", field: "project_category_names", headerClass: "headercenter" }
                ] 
            },

            { 
                headerName: 'Foundation laying / Tentative Foundation laying date',
                headerClass: "headercenter",
                children: [
                    { headerName: "T", field: "foundation_laid_date", headerClass: "headercenter",  width: 300, }
                ] 
            },

            { 
                headerName: 'Inauguration date / Tentative Inauguration date',
                headerClass: "headercenter",
                children: [
                    { headerName: "U", field: "inauguration_date", headerClass: "headercenter",  width: 250, }
                ] 
            }

        ];

        res.json({ columnDefs, rowData });

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// async function detailedDelayedStatusProjectData(req, res) {
//   try {

//      const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();

//     let firstDateCurrentFy, todayDate;

//     if (currentDate.getMonth() + 1 <= 3) {
//         firstDateCurrentFy = (currentYear - 1) + "-04-01";
//     } else {
//         firstDateCurrentFy = currentYear + "-04-01";
//     }

//     todayDate = currentDate.toISOString().split('T')[0];

//         const clusterID = parseInt(req.body.clusterID, 10) || 0;
//         const organisationID = parseInt(req.body.organisationID, 10) || 0;
    
//         const fromFoundationDate = req.body.fromFoundationDate || null;
//         const toFoundationDate = req.body.toFoundationDate || null;
//         const fromTentativeDate = req.body.fromTentativeDate || null;
//         const toTentativeDate = req.body.toTentativeDate || null;

//         const fromWorkAwardedDate = req.body.fromWorkAwardedDate || null;
//         const toWorkAwardedDate = req.body.toWorkAwardedDate || null;
//         const fromActualCompletionDate = req.body.fromActualCompletionDate || null;
//         const toActualCompletionDate = req.body.toActualCompletionDate || null;

//         const fromSantionedDate = req.body.fromSantionedDate || null;
//         const toSantionedDate = req.body.toSantionedDate || null;
// const status = req.body.status || null;


//        const conn = await pool;
//     const request = conn.request();
    
//     request.input("firstDateCurrentFy", firstDateCurrentFy);
//     request.input("todayDate", todayDate);
//     request.input("clusterID", clusterID);
//     request.input("organisationID", organisationID);
//     request.input("stageFilter", stageFilter);
    
//         request.input("fromFoundationDate", fromFoundationDate);
//         request.input("toFoundationDate", toFoundationDate);
//         request.input("fromTentativeDate", fromTentativeDate);
//         request.input("toTentativeDate", toTentativeDate);
        
//         request.input("fromWorkAwardedDate", fromWorkAwardedDate);
//         request.input("toWorkAwardedDate", toWorkAwardedDate);
//         request.input("fromActualCompletionDate", fromActualCompletionDate);
//         request.input("toActualCompletionDate", toActualCompletionDate);
//         request.input("fromSantionedDate", fromSantionedDate);
//         request.input("toSantionedDate", toSantionedDate);
        
       
// request.input("status", status);
//       const result = await request.query(`

//          ;WITH ProjectBase AS
//         (
//             SELECT 
//                 tbl_project.project_id,
//                 tbl_sub_project.sub_project_id,

//                 COALESCE(
//                     tbl_sub_project.sub_current_project_stage_id, 
//                     tbl_project.current_project_stage_id
//                 ) AS final_stage_id,

//                 COALESCE(
//                     tbl_sub_project.sub_award_project_cost, 
//                     tbl_project.award_project_cost
//                 ) AS final_cost

//             FROM tbl_project

//             LEFT JOIN tbl_sub_project 
//                 ON tbl_project.project_id = tbl_sub_project.project_id

//                 LEFT JOIN (
//                 SELECT DISTINCT project_id, sub_project_id, actual_date
//                 FROM tbl_project_date
//                 WHERE sub_stage_id = 9 
//                 AND actual_date IS NOT NULL
//             ) pd 
//             ON pd.project_id = tbl_project.project_id
//             AND (
//                     (tbl_sub_project.sub_project_id IS NOT NULL AND pd.sub_project_id = tbl_sub_project.sub_project_id)
//                 OR (tbl_sub_project.sub_project_id IS NULL AND pd.sub_project_id = '-1')
//                 )


//             INNER JOIN mmt_organisation 
//                 ON tbl_project.organisation_id = mmt_organisation.organisation_id

//             INNER JOIN mmt_hr_cluster 
//                 ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

//             WHERE
//                 (@clusterID = 0 OR mmt_organisation.hr_cluster_id = @clusterID)
//                 AND (@organisationID = 0 OR mmt_organisation.organisation_id = @organisationID)

//                 AND (
//                     (tbl_sub_project.sub_project_id IS NOT NULL AND tbl_sub_project.sub_status = 1)
//                     OR 
//                     (tbl_sub_project.sub_project_id IS NULL AND tbl_project.status = 1)
//                 )
    
//                 --DATE FILTER
//                 -- Foundation Date
//                 AND (
//                 (@fromFoundationDate IS NULL OR @toFoundationDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_foundation_tentative_date,
//                             tbl_project.foundation_tentative_date
//                         ) AS DATE
//                     ) BETWEEN @fromFoundationDate AND @toFoundationDate
//                 )
//             )
            
//             -- Inauguration Date
//             AND (
//                 (@fromTentativeDate IS NULL OR @toTentativeDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_tentative_inauguration_date,
//                             tbl_project.tentative_inauguration_date
//                         ) AS DATE
//                     ) BETWEEN @fromTentativeDate AND @toTentativeDate
//                 )
//             )

//             -- Work Awarded Date
//             AND (
//                 (@fromWorkAwardedDate IS NULL OR @toWorkAwardedDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(pd.actual_date AS DATE)
//                     BETWEEN @fromWorkAwardedDate AND @toWorkAwardedDate
//                 )
//             )
    
//             -- Actual Completion Date
//             AND (
//                 (@fromActualCompletionDate IS NULL OR @toActualCompletionDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_actual_date_of_completion,
//                             tbl_project.actual_date_of_completion
//                         ) AS DATE
//                     ) BETWEEN @fromActualCompletionDate AND @toActualCompletionDate
//                 )
//             )
                     
//             --Santioned date
//                 AND (
//                     (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
//                     OR
//                     (
//                         TRY_CAST(
//                             COALESCE(
//                                     tbl_sub_project.sub_chairman_approval_date,
//             tbl_project.chairman_approval_date,
//             tbl_sub_project.sub_admin_approval_approval_date,
//             tbl_project.admin_approval_approval_date
//                             ) AS DATE
//                         ) BETWEEN @fromSantionedDate AND @toSantionedDate
//                     )
//                 )


//         ),

//         FinalData AS
//         (
//             SELECT 
//                 mmt_organisation.organisation_name,

//                 CASE 
//                     WHEN ProjectBase.sub_project_id IS NOT NULL THEN ProjectBase.sub_project_id
//                     ELSE ProjectBase.project_id
//                 END AS project_id,

//                 tbl_project.project_name,
//                 tbl_sub_project.sub_project_name,

//                 CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_last_updated, tbl_project.last_updated), 106) AS last_updated_date,

//                 ISNULL(tbl_sub_project.sub_estimated_cost, tbl_project.estimated_cost) AS estimated_cost,

//                 CONVERT(VARCHAR,
//                     CASE 
//                         WHEN ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) = 'Port level approval'
//                             THEN ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
//                         ELSE 
//                             ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
//                     END,
//                 106) AS sanctioned_date,

//                 CONVERT(VARCHAR, workDate.work_awarded_date, 106) AS work_awarded_date,

//                 CONVERT(VARCHAR,
//                     CASE 
//                         WHEN tbl_sub_project.sub_actual_date_of_completion IS NOT NULL 
//                             OR tbl_project.actual_date_of_completion IS NOT NULL
//                         THEN ISNULL(
//                                 tbl_sub_project.sub_actual_date_of_completion,
//                                 tbl_project.actual_date_of_completion
//                             )
//                         ELSE ISNULL(
//                                 tbl_sub_project.sub_target_completion_date,
//                                 tbl_project.target_completion_date
//                             )
//                     END,
//                 106) AS completion_date,

//                 ISNULL(currentFY.current_fy_expenditure, 0) AS current_fy_expenditure,

//                 ISNULL(tbl_sub_project.sub_capacity_addition, tbl_project.capacity_addition) AS capacity_addition,
                    
//                 CASE 
//                     WHEN phyProgress.physical_progress_value IS NOT NULL 
//                     THEN CAST(phyProgress.physical_progress_value AS VARCHAR) + ' %'
//                     ELSE ''
//                 END AS physical_progress_value,

//                 financialProgress.financial_progress,

//                 stageName.stage_name AS current_stage_name,


//                 CASE 

//                     -- 0 → Project Initiated (no column → NULL safe)
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 0 
//                     THEN 'Project Initiated  (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_project_intiated_date, tbl_project.project_intiated_date)
//                     ,106) + ')'

//                     -- 1 → Pre-Feasibility
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 1 
//                     THEN 'Pre-Feasibility (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_prefeasiblity_actual_date, tbl_project.prefeasiblity_actual_date)
//                     ,106) + ')'

//                     -- 2 → DPR
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 2 
//                     THEN 'DPR (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_dpr_actual_date, tbl_project.dpr_actual_date)
//                     ,106) + ')'

//                     -- 3 → Chairman Approval
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 3 
//                     THEN 'Chairman / Board Approval (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_chairman_approval_date, tbl_project.chairman_approval_date)
//                     ,106) + ')'

//                     -- 4 → Ministry Submission
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 4 
//                     THEN 'To be submitted to Ministry (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
//                     ,106) + ')'

//                     -- 5 → Submitted to Ministry
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 5 
//                     THEN 'Submitted to Ministry for approval (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_ministry_submission_date, tbl_project.ministry_submission_date)
//                     ,106) + ')'

//                     -- 6 → DA
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 6 
//                     THEN 'DA Concurrence (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_da_approval_date, tbl_project.da_approval_date)
//                     ,106) + ')'

//                     -- 7 → IFW
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 7 
//                     THEN 'IFW Concurrence (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_ifw_approval_date, tbl_project.ifw_approval_date)
//                     ,106) + ')'

//                     -- 8 → IMC Circulation
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 8 
//                     THEN 'Circulated for IMC (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_imc_circulation_date, tbl_project.imc_circulation_date)
//                     ,106) + ')'

//                     -- 9 → Response to Comments
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 9 
//                     THEN 'Response to Comments received (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_response_com_rec_approval_date, tbl_project.response_com_rec_approval_date)
//                     ,106) + ')'

//                     -- 10 → SFC / EFC
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 10 
//                     THEN 'Approved/Recommended by DIB / SFC / EFC (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_sfc_approval_date, tbl_project.sfc_approval_date)
//                     ,106) + ')'

//                     -- 11 → Admin Approval
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 11 
//                     THEN 'Admn. Approval / Estimate Sanction (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_admin_approval_approval_date, tbl_project.admin_approval_approval_date)
//                     ,106) + ')'

//                     -- 12 → TENDERING
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 12
//                     THEN
//                     (
//                         SELECT TOP 1 
//                             CASE tbl_project_date.sub_stage_id
//                                 WHEN 3 THEN 'Tech. Sanction obtained'
//                                 WHEN 4 THEN 'Tender Document approved'
//                                 WHEN 5 THEN 'Tender Notice Issued'
//                                 WHEN 6 THEN 'Technical Evaluation completed'
//                                 WHEN 7 THEN 'Financial Evaluation completed'
//                                 WHEN 8 THEN 'Sanction of Competent Authority obtained for Award'
//                                 WHEN 9 THEN 'Work Awarded / LOA Issued'
//                                 WHEN 10 THEN 'Contract Agreement Signed'
//                             END
//                             + ' (' + CONVERT(VARCHAR, tbl_project_date.actual_date, 106) + ')'
//                         FROM tbl_project_date
//                         WHERE tbl_project_date.project_id = tbl_project.project_id
//                         AND ISNULL(tbl_project_date.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                         AND tbl_project_date.actual_date IS NOT NULL
//                         ORDER BY tbl_project_date.actual_date DESC
//                     )
//                     -- 13 → IMPLEMENTATION
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 13
//                     THEN
//                     (
//                         CASE 
//                             WHEN phyProgress.physical_progress_value BETWEEN 0 AND 19 
//                             THEN 
//                                 'Milestone 0 (' + 
//                                 CONVERT(VARCHAR,
//                                     (SELECT MAX(end_date)
//                                     FROM tbl_project_activity
//                                     WHERE project_id = tbl_project.project_id
//                                     AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                                     AND milestone_id = 0
//                                     ),106) + ')'

//                             WHEN phyProgress.physical_progress_value BETWEEN 20 AND 39 
//                             THEN 
//                                 'Milestone 1 (' + 
//                                 CONVERT(VARCHAR,
//                                     (SELECT MAX(end_date)
//                                     FROM tbl_project_activity
//                                     WHERE project_id = tbl_project.project_id
//                                     AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                                     AND milestone_id = 1
//                                     ),106) + ')'

//                             WHEN phyProgress.physical_progress_value BETWEEN 40 AND 59 
//                             THEN 
//                                 'Milestone 2 (' + 
//                                 CONVERT(VARCHAR,
//                                     (SELECT MAX(end_date)
//                                     FROM tbl_project_activity
//                                     WHERE project_id = tbl_project.project_id
//                                     AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                                     AND milestone_id = 2
//                                     ),106) + ')'

//                             WHEN phyProgress.physical_progress_value BETWEEN 60 AND 79 
//                             THEN 
//                                 'Milestone 3 (' + 
//                                 CONVERT(VARCHAR,
//                                     (SELECT MAX(end_date)
//                                     FROM tbl_project_activity
//                                     WHERE project_id = tbl_project.project_id
//                                     AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                                     AND milestone_id = 3
//                                     ),106) + ')'

//                             WHEN phyProgress.physical_progress_value BETWEEN 80 AND 99 
//                             THEN 
//                                 'Milestone 4 (' + 
//                                 CONVERT(VARCHAR,
//                                     (SELECT MAX(end_date)
//                                     FROM tbl_project_activity
//                                     WHERE project_id = tbl_project.project_id
//                                     AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                                     AND milestone_id = 4
//                                     ),106) + ')'

//                             WHEN phyProgress.physical_progress_value = 100 
//                             THEN 
//                                 'Milestone 5 (' + 
//                                 CONVERT(VARCHAR,
//                                     (SELECT MAX(end_date)
//                                     FROM tbl_project_activity
//                                     WHERE project_id = tbl_project.project_id
//                                     AND ISNULL(sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                                     AND milestone_id = 5
//                                     ),106) + ')'

//                             ELSE 'Not Started'
//                         END
//                     )

//                     -- 14 → COMPLETED
//                     WHEN ISNULL(tbl_sub_project.sub_current_project_stage_id, tbl_project.current_project_stage_id) = 14 
//                     THEN 'Completed (' + CONVERT(VARCHAR,
//                         ISNULL(tbl_sub_project.sub_actual_date_of_completion, tbl_project.actual_date_of_completion)
//                     ,106) + ')'

//                 END AS current_sub_stage,


//                 CASE
//                     WHEN tbl_project.actual_date_of_completion IS NULL
//                         OR tbl_project.target_completion_date IS NULL
//                         THEN 'In Progress'
//                     WHEN tbl_project.actual_date_of_completion <= tbl_project.target_completion_date
//                         THEN 'On Time'
//                     ELSE 'Delayed'
//                 END AS project_status,

//                 ISNULL(tbl_sub_project.sub_mode_of_implememtation, tbl_project.mode_of_implememtation) AS mode_of_implememtation,
            
//                 ISNULL(tbl_sub_project.sub_project_type, tbl_project.project_type) AS project_type,
                
//                 ISNULL(tbl_sub_project.sub_project_category_id, tbl_project.project_category_id) AS project_category,
                
//                 ISNULL((
//                     SELECT STRING_AGG(mpc.project_category_name, ', ')
//                     FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_sub_project.sub_project_category_id), ',') AS sps
//                     JOIN mmt_project_category AS mpc 
//                         ON TRY_CAST(sps.value AS INT) = mpc.project_category_id
//                 ), (
//                     SELECT STRING_AGG(mpc.project_category_name, ', ')
//                     FROM STRING_SPLIT(CONVERT(VARCHAR(MAX), tbl_project.project_category_id), ',') AS ps
//                     JOIN mmt_project_category AS mpc 
//                         ON TRY_CAST(ps.value AS INT) = mpc.project_category_id
//                 )) AS project_category_names,


//                 --   CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_foundation_laid_date, tbl_project.foundation_laid_date), 106) AS foundation_laid_date,
//                 CONVERT(VARCHAR,
//                     CASE 
//                         WHEN tbl_sub_project.sub_foundation_laid_date IS NOT NULL 
//                             OR tbl_project.foundation_laid_date IS NOT NULL
//                         THEN ISNULL(
//                                 tbl_sub_project.sub_foundation_laid_date,
//                                 tbl_project.foundation_laid_date
//                             )
//                         ELSE ISNULL(
//                                 tbl_sub_project.sub_foundation_tentative_date,
//                                 tbl_project.foundation_tentative_date
//                             )
//                     END,
//                 106) AS foundation_laid_date,

//             -- CONVERT(VARCHAR, ISNULL(tbl_sub_project.sub_inauguration_date, tbl_project.inauguration_date), 106) AS inauguration_date
//                 CONVERT(VARCHAR,
//                     CASE 
//                         WHEN tbl_sub_project.sub_inauguration_date IS NOT NULL 
//                             OR tbl_project.inauguration_date IS NOT NULL
//                         THEN ISNULL(
//                                 tbl_sub_project.sub_inauguration_date,
//                                 tbl_project.inauguration_date
//                             )
//                         ELSE ISNULL(
//                                 tbl_sub_project.sub_tentative_inauguration_date,
//                                 tbl_project.tentative_inauguration_date
//                             )
//                     END,
//                 106) AS inauguration_date,

//                 -- DUPLICATE CONTROL
//                 ROW_NUMBER() OVER (
//                     PARTITION BY 
//                         CASE 
//                             WHEN ProjectBase.sub_project_id IS NOT NULL THEN ProjectBase.sub_project_id
//                             ELSE ProjectBase.project_id
//                         END
//                     ORDER BY ProjectBase.project_id
//                 ) AS row_num

//             FROM ProjectBase

//             INNER JOIN tbl_project     
//                 ON tbl_project.project_id = ProjectBase.project_id

//             LEFT JOIN tbl_sub_project 
//                 ON tbl_sub_project.project_id = ProjectBase.project_id
//                 AND ISNULL(tbl_sub_project.sub_project_id,-1) = ISNULL(ProjectBase.sub_project_id,-1)

//             INNER JOIN mmt_organisation 
//                 ON mmt_organisation.organisation_id = ISNULL(tbl_sub_project.sub_organisation_id, tbl_project.organisation_id)

//             INNER JOIN mmt_hr_cluster 
//                 ON mmt_organisation.hr_cluster_id = mmt_hr_cluster.hr_cluster_id

//             LEFT JOIN (
//             SELECT
//                 project_id,
//                 sub_project_id,
//                 MAX(progress_date) AS progress_date
//             FROM tbl_project_physical_progress
//             GROUP BY project_id, sub_project_id
//         ) AS progress_status_data
//         ON progress_status_data.project_id = tbl_project.project_id
//         AND ISNULL(progress_status_data.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

//             LEFT JOIN 
//             (
//                 SELECT 
//                     project_id,
//                     sub_project_id,             
//                 -- If actual_date exists, take it, otherwise take planned_date
//                 MAX(ISNULL(actual_date, planned_date)) AS work_awarded_date
//                 FROM tbl_project_date
//                 WHERE sub_stage_id = 9
//                 GROUP BY project_id, sub_project_id
//             ) workDate
//                 ON workDate.project_id = tbl_project.project_id
//                 AND ISNULL(workDate.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)
//                 LEFT JOIN 
//                 (
//                     SELECT 
//                         project_id,
//                         sub_project_id,
//                         MAX(physical_progress) AS physical_progress_value
//                     FROM tbl_project_physical_progress
//                     GROUP BY project_id, sub_project_id
//                 ) AS phyProgress
//                     ON phyProgress.project_id = ProjectBase.project_id
//                     AND ISNULL(phyProgress.sub_project_id,-1) = ISNULL(ProjectBase.sub_project_id,-1)

//             LEFT JOIN 
//             (
//                 SELECT 
//                     project_id,
//                     sub_project_id,
//                     SUM(
//                         ISNULL(gbs_components,0) + ISNULL(iebr_components,0) +
//                         ISNULL(ppp_components,0) + ISNULL(loans_components,0) +
//                         ISNULL(multilateral_components,0) + ISNULL(state_gov_fund_components,0) +
//                         ISNULL(pmmsy_components,0) + ISNULL(sagarmala_components,0) +
//                         ISNULL(other_source_funding_comp,0)
//                     ) AS current_fy_expenditure
//                 FROM tbl_project_expenditure
//                 WHERE expenditure_date BETWEEN @firstDateCurrentFy AND @todayDate
//                 GROUP BY project_id, sub_project_id
//             ) AS currentFY
//                 ON currentFY.project_id = ProjectBase.project_id
//                 AND ISNULL(currentFY.sub_project_id,-1) = ISNULL(ProjectBase.sub_project_id,-1)

//                 LEFT JOIN 
//                 (
//                     SELECT 
//                         tbl_project_expenditure.project_id,
//                         tbl_project_expenditure.sub_project_id,

//                         ROUND(
//                             (
//                                 SUM(
//                                     ISNULL(tbl_project_expenditure.gbs_components, 0) + 
//                                     ISNULL(tbl_project_expenditure.iebr_components, 0) + 
//                                     ISNULL(tbl_project_expenditure.ppp_components, 0) + 
//                                     ISNULL(tbl_project_expenditure.loans_components, 0) + 
//                                     ISNULL(tbl_project_expenditure.multilateral_components, 0) + 
//                                     ISNULL(tbl_project_expenditure.state_gov_fund_components, 0) + 
//                                     ISNULL(tbl_project_expenditure.pmmsy_components, 0) +                     
//                                     ISNULL(tbl_project_expenditure.sagarmala_components, 0) + 
//                                     ISNULL(tbl_project_expenditure.other_source_funding_comp, 0)
//                                 ) 
//                                 /
//                                 NULLIF(
//                                     (ISNULL(tbl_project.award_project_cost, 0) + 
//                                     ISNULL(tbl_sub_project.sub_award_project_cost, 0)), 0
//                                 )
//                             ) * 100
//                         , 2) AS financial_progress

//                     FROM tbl_project_expenditure

//                     LEFT JOIN tbl_project 
//                         ON tbl_project.project_id = tbl_project_expenditure.project_id

//                     LEFT JOIN tbl_sub_project 
//                         ON tbl_sub_project.sub_project_id = tbl_project_expenditure.sub_project_id

//                     GROUP BY 
//                         tbl_project_expenditure.project_id,
//                         tbl_project_expenditure.sub_project_id,
//                         tbl_project.award_project_cost,
//                         tbl_sub_project.sub_award_project_cost
//                 ) financialProgress
//                     ON financialProgress.project_id = tbl_project.project_id
//                     AND ISNULL(financialProgress.sub_project_id,-1) = ISNULL(tbl_sub_project.sub_project_id,-1)

                    
//             LEFT JOIN 
//             (
//                 SELECT stage_id, MAX(stage_name) AS stage_name
//                 FROM tbl_project_stage
//                 GROUP BY stage_id
//             ) AS stageName
//                 ON stageName.stage_id = ProjectBase.final_stage_id

//             WHERE 
//             (@clusterID = 0 
//                 OR mmt_organisation.hr_cluster_id = @clusterID)

//             AND (
//                     @organisationID = 0
//                     OR ISNULL(
//                             tbl_sub_project.sub_organisation_id,
//                             tbl_project.organisation_id
//                         ) = @organisationID
//                 )

//             AND ISNULL(tbl_sub_project.sub_status, tbl_project.status) = 1


//             -- ON TIME CONDITION
//             AND (
//                 TRY_CAST(progress_status_data.progress_date AS DATE)
//                 <= TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_target_completion_date,
//                             tbl_project.target_completion_date
//                         ) AS DATE
//                     )
//             )


//             -- Foundation Date
//             AND (
//                 (@fromFoundationDate IS NULL OR @toFoundationDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_foundation_tentative_date,
//                             tbl_project.foundation_tentative_date
//                         ) AS DATE
//                     ) BETWEEN @fromFoundationDate AND @toFoundationDate
//                 )
//             )



//             -- Inauguration Date
//             AND (
//                 (@fromTentativeDate IS NULL OR @toTentativeDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_tentative_inauguration_date,
//                             tbl_project.tentative_inauguration_date
//                         ) AS DATE
//                     ) BETWEEN @fromTentativeDate AND @toTentativeDate
//                 )
//             )



//             -- Work Awarded Date
//             AND (
//                 (@fromWorkAwardedDate IS NULL OR @toWorkAwardedDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(pd.actual_date AS DATE)
//                     BETWEEN @fromWorkAwardedDate AND @toWorkAwardedDate
//                 )
//             )



//             -- Actual Completion Date
//             AND (
//                 (@fromActualCompletionDate IS NULL OR @toActualCompletionDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_actual_date_of_completion,
//                             tbl_project.actual_date_of_completion
//                         ) AS DATE
//                     ) BETWEEN @fromActualCompletionDate 
//                     AND @toActualCompletionDate
//                 )
//             )



//             -- Santioned date
//             AND (
//                 (@fromSantionedDate IS NULL OR @toSantionedDate IS NULL)
//                 OR
//                 (
//                     TRY_CAST(
//                         COALESCE(
//                             tbl_sub_project.sub_chairman_approval_date,
//                             tbl_project.chairman_approval_date,
//                             tbl_sub_project.sub_admin_approval_approval_date,
//                             tbl_project.admin_approval_approval_date
//                         ) AS DATE
//                     ) BETWEEN @fromSantionedDate AND @toSantionedDate
//                 )
//             )
//         )

//         -- FINAL RESULT (NO DUPLICATES)
//         SELECT *
//         FROM FinalData
//         WHERE row_num = 1;
            
//     `);
// // -- WHERE final_stage_id IN (${stageFilter});
//         const rowData = result.recordset;
//         // console.log(result.recordset, "result.recordset")
//         if (rowData.length === 0) {
//             return res.status(404).json({ error: 'No data available' });
//         }

   
//         let columnDefs = [
//             { 
//                 headerName: 'Organisation Name',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "A", field: "organisation_name", cellClass: 'text-left', width: 250, headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Project ID',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "B", field: "project_id", cellClass: 'text-left', headerClass: "headercenter" }
//                 ] 
//             },

//             {
//                 headerName: 'Name of',
//                 headerClass: "headercenter",
//                 children: [
//                     {
//                         headerName: 'Project',
//                         headerClass: "headercenter",
//                         children: [
//                             {
//                                 headerName: 'C',
//                                 field: 'project_name',
//                                 width: 350,
//                                 headerClass: "headercenter"
//                             }
//                         ]
//                     },
//                     {
//                         headerName: 'Sub Project',
//                         headerClass: "headercenter",
//                         children: [
//                             {
//                                 headerName: 'D',
//                                 field: 'sub_project_name',
//                                 width: 350,
//                                 headerClass: "headercenter"
//                             }
//                         ]
//                     }
//                 ]
//             },

//             { 
//                 headerName: 'Last Updated Date',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "E", field: "last_updated_date", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Total Estimated Cost (In Cr.)',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "F", field: "estimated_cost", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Sanctioned Date',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "G", field: "sanctioned_date", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Target Award / Awarded Date',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "H", field: "work_awarded_date", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Completion Date / Target Completion Date',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "I", field: "completion_date", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Expenditure in Current FY (in Cr.)',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "J", field: "current_fy_expenditure", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Capacity Addition (in MTPA)',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "K", field: "capacity_addition", headerClass: "headercenter" }
//                 ] 
//             },

//            {
//                 headerName: 'Physical Progress %',
//                 headerClass: "headercenter",
//                 children: [
//                     { 
//                         headerName: "L", 
//                         field: "physical_progress_value",
//                         headerClass: "headercenter",
//                         valueFormatter: params => {
//                             return (params.value && params.value != 0) ? params.value : '';
//                         }
//                     }
//                 ] 
//             },
//             { 
//                 headerName: 'Financial Progress %',
//                 headerClass: "headercenter",
//                 children: [
//                     { 
//                         headerName: "M", 
//                         field: "financial_progress",
//                         headerClass: "headercenter",
//                         valueFormatter: params => {
//                             return (params.value && params.value != 0) ? params.value : '';
//                         }
//                     }
//                 ] 
//             },

//             { 
//                 headerName: 'Current Stage',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "N", field: "current_stage_name", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Current Sub-stage (with date)',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "O", field: "current_sub_stage", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Delayed Status',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "P", field: "project_status", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Mode of Implementation',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "Q", field: "mode_of_implememtation", width: 250, headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Project Type',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "R", field: "project_type", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Project Category',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "S", field: "project_category_names", headerClass: "headercenter" }
//                 ] 
//             },

//             { 
//                 headerName: 'Foundation laying / Tentative Foundation laying date',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "T", field: "foundation_laid_date", headerClass: "headercenter",  width: 300, }
//                 ] 
//             },

//             { 
//                 headerName: 'Inauguration date / Tentative Inauguration date',
//                 headerClass: "headercenter",
//                 children: [
//                     { headerName: "U", field: "inauguration_date", headerClass: "headercenter",  width: 250, }
//                 ] 
//             }

//         ];

//         res.json({ columnDefs, rowData });

//     } catch (err) {
//         console.log(err);
//         return res.sendStatus(500);
//     }
// }




export default {getProjectDashboard,getProjectOrgWiseBarGraph,getPysicalProgressOrgWise,
   getProjectDetailsByProject, detailedPysicalProgressOrgWise,
 detailedOrgWiseProjectData, detailedStageWiseProjectData, getOngingProjectDashboard, detailedOngoingProDashboard,
getBroadCategoryListDashboard, detailedBroadCategoryDashboard, getDelayedStatusPieChart, detailedDelayedStatusProjectData};








// SELECT

//     COALESCE(
//         sp.sub_project_id,
//         p.project_id
//     ) AS project_id,


//     -- WORK AWARDED DATE
//     TRY_CAST(pd.actual_date AS DATE) AS work_awarded_date,


//     -- TARGET COMPLETION DATE
//     TRY_CAST(
//         COALESCE(
//             sp.sub_target_completion_date,
//             p.target_completion_date
//         ) AS DATE
//     ) AS target_completion_date,


//     -- TOTAL SPAN
//     DATEDIFF(
//         DAY,
//         TRY_CAST(pd.actual_date AS DATE),
//         TRY_CAST(COALESCE(sp.sub_target_completion_date, p.target_completion_date) AS DATE)
//     ) AS Total_Span,


//     -- DAYS PER PERCENTAGE
//     CASE 
//         WHEN DATEDIFF(
//                 DAY,
//                 TRY_CAST(pd.actual_date AS DATE),
//                 TRY_CAST(COALESCE(sp.sub_target_completion_date, p.target_completion_date) AS DATE)
//              ) = 0
//         THEN 0
//         ELSE 
//             CAST(
//                 DATEDIFF(
//                     DAY,
//                     TRY_CAST(pd.actual_date AS DATE),
//                     TRY_CAST(COALESCE(sp.sub_target_completion_date, p.target_completion_date) AS DATE)
//                 ) AS FLOAT
//             ) / 100
//     END AS Days_Per_Percentage,


//     -- PROGRESS DATE
//     TRY_CAST(pp.progress_date AS DATE) AS progress_date,


//     -- EXPECTED PHYSICAL PROGRESS DAYS
//     DATEDIFF(
//         DAY,
//         TRY_CAST(pd.actual_date AS DATE),
//         TRY_CAST(pp.progress_date AS DATE)
//     ) AS Expected_Physical_Progress_Days,


//     -- EXPECTED PHYSICAL PROGRESS (%)
//     ROUND(
//         CASE
//             WHEN DATEDIFF(
//                     DAY,
//                     TRY_CAST(pd.actual_date AS DATE),
//                     TRY_CAST(COALESCE(sp.sub_target_completion_date, p.target_completion_date) AS DATE)
//                  ) = 0
//             THEN 0

//             ELSE
//                 (
//                     CAST(
//                         DATEDIFF(
//                             DAY,
//                             TRY_CAST(pd.actual_date AS DATE),
//                             TRY_CAST(pp.progress_date AS DATE)
//                         ) AS FLOAT
//                     )
//                     /
//                     CAST(
//                         DATEDIFF(
//                             DAY,
//                             TRY_CAST(pd.actual_date AS DATE),
//                             TRY_CAST(COALESCE(sp.sub_target_completion_date, p.target_completion_date) AS DATE)
//                         ) AS FLOAT
//                     )
//                 ) * 100
//         END
//     , 2) AS Expected_Physical_Progress,


//     -- STATUS
//     CASE
//         WHEN TRY_CAST(pp.progress_date AS DATE)
//              <= TRY_CAST(COALESCE(sp.sub_target_completion_date, p.target_completion_date) AS DATE)
//         THEN 'On Time'
//         ELSE 'Delayed'
//     END AS Progress_Status


// FROM tbl_project p


// LEFT JOIN tbl_sub_project sp
//     ON p.project_id = sp.project_id


// -- ORGANISATION + CLUSTER JOIN (FIXED)
// INNER JOIN mmt_organisation o
//     ON p.organisation_id = o.organisation_id

// INNER JOIN mmt_hr_cluster c
//     ON o.hr_cluster_id = c.hr_cluster_id


// -- WORK AWARDED DATE
// LEFT JOIN (
//     SELECT DISTINCT
//         project_id,
//         sub_project_id,
//         actual_date
//     FROM tbl_project_date
//     WHERE sub_stage_id = 9
//       AND actual_date IS NOT NULL
// ) pd
//     ON pd.project_id = p.project_id
//     AND (
//         (sp.sub_project_id IS NOT NULL AND pd.sub_project_id = sp.sub_project_id)
//         OR
//         (sp.sub_project_id IS NULL AND pd.sub_project_id = '-1')
//     )


// -- MAX PROGRESS DATE
// LEFT JOIN (
//     SELECT
//         project_id,
//         sub_project_id,
//         MAX(progress_date) AS progress_date
//     FROM tbl_project_physical_progress
//     GROUP BY project_id, sub_project_id
// ) pp
//     ON pp.project_id = p.project_id
//     AND (
//         (sp.sub_project_id IS NOT NULL AND pp.sub_project_id = sp.sub_project_id)
//         OR
//         (sp.sub_project_id IS NULL AND pp.sub_project_id = '-1')
//     )


// WHERE

//     COALESCE(
//         sp.sub_current_project_stage_id,
//         p.current_project_stage_id
//     ) = 13

//     AND (
//         (sp.sub_project_id IS NOT NULL AND sp.sub_status = 1)
//         OR
//         (sp.sub_project_id IS NULL AND p.status = 1)
//     )

//     AND pd.actual_date IS NOT NULL

//     AND COALESCE(
//         sp.sub_target_completion_date,
//         p.target_completion_date
//     ) IS NOT NULL

//     AND pp.progress_date IS NOT NULL

//     AND c.hr_cluster_id = 1;