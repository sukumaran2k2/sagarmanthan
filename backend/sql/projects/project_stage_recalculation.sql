/*
    Project stage check and repair
    ------------------------------
    Recalculates the stage of every active project / sub-project with the same
    rules the backend now applies on every save
    (backend/src/controllers/ProjectManagement/projectStage.js) and compares it
    with the stored stage.

    Rules (first match wins):
        14  Completed             actual completion date present
        13  Under Implementation  contract signed actual date AND awarded project cost
        12  Under Tendering       sanctioned cost AND approval date
                                  (Chairman date for Port Level Approval, Admin Approval date otherwise)
        0-11 Planning sub stage   furthest planning step that has an actual date
                                  (Port Level Approval: 1 Pre-feasibility, 2 DPR, 3 Chairman)
                                  (Others: 1, 2, 5 Ministry, 6 DA, 7 IFW, 8 IMC, 9 Response,
                                   10 SFC, 11 Admin Approval)

    How to run:
        1. Run as-is (@ApplyChanges = 0). Nothing is changed; you get a report.
        2. Review the report. TAB_DOWNGRADE rows move a project to an earlier tab
           and should be checked one by one.
        3. Set @ApplyChanges = 1 and run again to fix MOVE_UP and PLANNING_SUBSTAGE rows.
           Set @ApplyTabDowngrades = 1 as well only if TAB_DOWNGRADE rows should also be fixed.
           Old values are written to tbl_project_stage_repair_log before updating.

    Dropped projects (status = 0) are not touched.
*/

SET NOCOUNT ON;

DECLARE @ApplyChanges BIT = 0;
DECLARE @ApplyTabDowngrades BIT = 0;

IF OBJECT_ID('tempdb..#ProjectStage') IS NOT NULL DROP TABLE #ProjectStage;
IF OBJECT_ID('tempdb..#SubProjectStage') IS NOT NULL DROP TABLE #SubProjectStage;

/* ---------- Projects without sub-projects (stage stored on tbl_project) ---------- */
SELECT
    x.project_id,
    x.project_name,
    x.stored_stage_id,
    x.computed_stage_id,
    CASE
        WHEN tabs.computed_tab > tabs.stored_tab THEN 'MOVE_UP'
        WHEN tabs.computed_tab < tabs.stored_tab THEN 'TAB_DOWNGRADE'
        ELSE 'PLANNING_SUBSTAGE'
    END AS change_type
INTO #ProjectStage
FROM (
    SELECT
        p.project_id,
        p.project_name,
        ISNULL(p.current_project_stage_id, 0) AS stored_stage_id,
        CASE
            WHEN p.actual_date_of_completion IS NOT NULL THEN 14
            WHEN tender.contract_signed_date IS NOT NULL AND flags.has_award_cost = 1 THEN 13
            WHEN flags.has_sanctioned_cost = 1 AND flags.is_port_level = 1 AND p.chairman_approval_date IS NOT NULL THEN 12
            WHEN flags.has_sanctioned_cost = 1 AND flags.is_port_level = 0 AND p.admin_approval_approval_date IS NOT NULL THEN 12
            WHEN flags.is_port_level = 1 THEN
                CASE
                    WHEN p.chairman_approval_date IS NOT NULL THEN 3
                    WHEN p.dpr_actual_date IS NOT NULL THEN 2
                    WHEN p.prefeasiblity_actual_date IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE
                CASE
                    WHEN p.admin_approval_approval_date IS NOT NULL THEN 11
                    WHEN p.sfc_approval_date IS NOT NULL THEN 10
                    WHEN p.response_com_rec_approval_date IS NOT NULL THEN 9
                    WHEN p.imc_approval_date IS NOT NULL THEN 8
                    WHEN p.ifw_approval_date IS NOT NULL THEN 7
                    WHEN p.da_approval_date IS NOT NULL THEN 6
                    WHEN p.ministry_submission_date IS NOT NULL THEN 5
                    WHEN p.dpr_actual_date IS NOT NULL THEN 2
                    WHEN p.prefeasiblity_actual_date IS NOT NULL THEN 1
                    ELSE 0
                END
        END AS computed_stage_id
    FROM tbl_project p
    OUTER APPLY (
        SELECT MAX(CASE WHEN pd.sub_stage_id = 10 THEN pd.actual_date END) AS contract_signed_date
        FROM tbl_project_date pd
        WHERE pd.project_id = p.project_id
          AND (pd.sub_project_id IS NULL OR TRY_CAST(pd.sub_project_id AS INT) = -1)
    ) tender
    CROSS APPLY (
        SELECT
            CASE WHEN LOWER(LTRIM(RTRIM(CONVERT(VARCHAR(100), p.project_type)))) = 'port level approval' THEN 1 ELSE 0 END AS is_port_level,
            CASE WHEN NULLIF(LTRIM(RTRIM(CONVERT(VARCHAR(50), p.sanctioned_cost))), '') IS NOT NULL THEN 1 ELSE 0 END AS has_sanctioned_cost,
            CASE WHEN NULLIF(LTRIM(RTRIM(CONVERT(VARCHAR(50), p.award_project_cost))), '') IS NOT NULL THEN 1 ELSE 0 END AS has_award_cost
    ) flags
    WHERE ISNULL(p.status, 1) <> 0
      AND NOT EXISTS (SELECT 1 FROM tbl_sub_project sp WHERE sp.project_id = p.project_id)
) x
CROSS APPLY (
    SELECT
        CASE WHEN x.stored_stage_id >= 14 THEN 4 WHEN x.stored_stage_id = 13 THEN 3 WHEN x.stored_stage_id = 12 THEN 2 ELSE 1 END AS stored_tab,
        CASE WHEN x.computed_stage_id >= 14 THEN 4 WHEN x.computed_stage_id = 13 THEN 3 WHEN x.computed_stage_id = 12 THEN 2 ELSE 1 END AS computed_tab
) tabs
WHERE x.stored_stage_id <> x.computed_stage_id;

/* ---------- Sub-projects (stage stored on tbl_sub_project) ---------- */
SELECT
    x.project_id,
    x.sub_project_id,
    x.project_name,
    x.stored_stage_id,
    x.computed_stage_id,
    CASE
        WHEN tabs.computed_tab > tabs.stored_tab THEN 'MOVE_UP'
        WHEN tabs.computed_tab < tabs.stored_tab THEN 'TAB_DOWNGRADE'
        ELSE 'PLANNING_SUBSTAGE'
    END AS change_type
INTO #SubProjectStage
FROM (
    SELECT
        sp.project_id,
        sp.sub_project_id,
        sp.sub_project_name AS project_name,
        ISNULL(sp.sub_current_project_stage_id, 0) AS stored_stage_id,
        CASE
            WHEN sp.sub_actual_date_of_completion IS NOT NULL THEN 14
            WHEN tender.contract_signed_date IS NOT NULL AND flags.has_award_cost = 1 THEN 13
            WHEN flags.has_sanctioned_cost = 1 AND flags.is_port_level = 1 AND sp.sub_chairman_approval_date IS NOT NULL THEN 12
            WHEN flags.has_sanctioned_cost = 1 AND flags.is_port_level = 0 AND sp.sub_admin_approval_approval_date IS NOT NULL THEN 12
            WHEN flags.is_port_level = 1 THEN
                CASE
                    WHEN sp.sub_chairman_approval_date IS NOT NULL THEN 3
                    WHEN sp.sub_dpr_actual_date IS NOT NULL THEN 2
                    WHEN sp.sub_prefeasiblity_actual_date IS NOT NULL THEN 1
                    ELSE 0
                END
            ELSE
                CASE
                    WHEN sp.sub_admin_approval_approval_date IS NOT NULL THEN 11
                    WHEN sp.sub_sfc_approval_date IS NOT NULL THEN 10
                    WHEN sp.sub_response_com_rec_approval_date IS NOT NULL THEN 9
                    WHEN sp.sub_imc_approval_date IS NOT NULL THEN 8
                    WHEN sp.sub_ifw_approval_date IS NOT NULL THEN 7
                    WHEN sp.sub_da_approval_date IS NOT NULL THEN 6
                    WHEN sp.sub_ministry_submission_date IS NOT NULL THEN 5
                    WHEN sp.sub_dpr_actual_date IS NOT NULL THEN 2
                    WHEN sp.sub_prefeasiblity_actual_date IS NOT NULL THEN 1
                    ELSE 0
                END
        END AS computed_stage_id
    FROM tbl_sub_project sp
    OUTER APPLY (
        SELECT MAX(CASE WHEN pd.sub_stage_id = 10 THEN pd.actual_date END) AS contract_signed_date
        FROM tbl_project_date pd
        WHERE pd.sub_project_id = sp.sub_project_id
    ) tender
    CROSS APPLY (
        SELECT
            CASE WHEN LOWER(LTRIM(RTRIM(CONVERT(VARCHAR(100), sp.sub_project_type)))) = 'port level approval' THEN 1 ELSE 0 END AS is_port_level,
            CASE WHEN NULLIF(LTRIM(RTRIM(CONVERT(VARCHAR(50), sp.sub_sanctioned_cost))), '') IS NOT NULL THEN 1 ELSE 0 END AS has_sanctioned_cost,
            CASE WHEN NULLIF(LTRIM(RTRIM(CONVERT(VARCHAR(50), sp.sub_award_project_cost))), '') IS NOT NULL THEN 1 ELSE 0 END AS has_award_cost
    ) flags
    WHERE ISNULL(sp.sub_status, 1) <> 0
) x
CROSS APPLY (
    SELECT
        CASE WHEN x.stored_stage_id >= 14 THEN 4 WHEN x.stored_stage_id = 13 THEN 3 WHEN x.stored_stage_id = 12 THEN 2 ELSE 1 END AS stored_tab,
        CASE WHEN x.computed_stage_id >= 14 THEN 4 WHEN x.computed_stage_id = 13 THEN 3 WHEN x.computed_stage_id = 12 THEN 2 ELSE 1 END AS computed_tab
) tabs
WHERE x.stored_stage_id <> x.computed_stage_id;

/* ---------- Report ---------- */
SELECT change_type, COUNT(1) AS rows_to_fix
FROM (
    SELECT change_type FROM #ProjectStage
    UNION ALL
    SELECT change_type FROM #SubProjectStage
) c
GROUP BY change_type
ORDER BY change_type;

SELECT
    r.change_type,
    r.project_id,
    r.sub_project_id,
    r.project_name,
    r.stored_stage_id,
    stored.stage_name AS stored_stage_name,
    r.computed_stage_id,
    computed.stage_name AS computed_stage_name
FROM (
    SELECT change_type, CAST(project_id AS NVARCHAR(50)) AS project_id, CAST('-1' AS NVARCHAR(50)) AS sub_project_id,
           project_name, stored_stage_id, computed_stage_id
    FROM #ProjectStage
    UNION ALL
    SELECT change_type, CAST(project_id AS NVARCHAR(50)), CAST(sub_project_id AS NVARCHAR(50)),
           project_name, stored_stage_id, computed_stage_id
    FROM #SubProjectStage
) r
LEFT JOIN tbl_project_stage stored ON stored.stage_id = r.stored_stage_id
LEFT JOIN tbl_project_stage computed ON computed.stage_id = r.computed_stage_id
ORDER BY r.change_type, r.project_id, r.sub_project_id;

/* ---------- Repair ---------- */
IF @ApplyChanges = 1
BEGIN
    IF OBJECT_ID('dbo.tbl_project_stage_repair_log') IS NULL
    BEGIN
        CREATE TABLE dbo.tbl_project_stage_repair_log (
            repair_log_id INT IDENTITY(1, 1) PRIMARY KEY,
            entity_type VARCHAR(20) NOT NULL,
            project_id NVARCHAR(50) NOT NULL,
            sub_project_id NVARCHAR(50) NOT NULL,
            old_current_stage_id INT NULL,
            old_project_stage_id INT NULL,
            new_stage_id INT NOT NULL,
            change_type VARCHAR(30) NOT NULL,
            repaired_on DATETIME NOT NULL DEFAULT GETDATE()
        );
    END;

    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO dbo.tbl_project_stage_repair_log
            (entity_type, project_id, sub_project_id, old_current_stage_id, old_project_stage_id, new_stage_id, change_type)
        SELECT 'PROJECT', CAST(p.project_id AS NVARCHAR(50)), '-1',
               p.current_project_stage_id, p.project_stage_id, s.computed_stage_id, s.change_type
        FROM tbl_project p
        INNER JOIN #ProjectStage s ON s.project_id = p.project_id
        WHERE s.change_type <> 'TAB_DOWNGRADE' OR @ApplyTabDowngrades = 1;

        INSERT INTO dbo.tbl_project_stage_repair_log
            (entity_type, project_id, sub_project_id, old_current_stage_id, old_project_stage_id, new_stage_id, change_type)
        SELECT 'SUB_PROJECT', CAST(sp.project_id AS NVARCHAR(50)), CAST(sp.sub_project_id AS NVARCHAR(50)),
               sp.sub_current_project_stage_id, sp.sub_project_stage_id, s.computed_stage_id, s.change_type
        FROM tbl_sub_project sp
        INNER JOIN #SubProjectStage s ON s.sub_project_id = sp.sub_project_id
        WHERE s.change_type <> 'TAB_DOWNGRADE' OR @ApplyTabDowngrades = 1;

        -- project_stage_id is read by reports to detect completed projects, so it
        -- follows the same rule as the backend: planning stages, completion, and
        -- leaving completion.
        UPDATE p
        SET current_project_stage_id = s.computed_stage_id,
            project_stage_id = CASE
                WHEN s.computed_stage_id <= 11 OR s.computed_stage_id = 14 OR p.project_stage_id = 14
                THEN s.computed_stage_id
                ELSE p.project_stage_id
            END
        FROM tbl_project p
        INNER JOIN #ProjectStage s ON s.project_id = p.project_id
        WHERE s.change_type <> 'TAB_DOWNGRADE' OR @ApplyTabDowngrades = 1;

        UPDATE sp
        SET sub_current_project_stage_id = s.computed_stage_id,
            sub_project_stage_id = CASE
                WHEN s.computed_stage_id <= 11 OR s.computed_stage_id = 14 OR sp.sub_project_stage_id = 14
                THEN s.computed_stage_id
                ELSE sp.sub_project_stage_id
            END
        FROM tbl_sub_project sp
        INNER JOIN #SubProjectStage s ON s.sub_project_id = sp.sub_project_id
        WHERE s.change_type <> 'TAB_DOWNGRADE' OR @ApplyTabDowngrades = 1;

        COMMIT TRANSACTION;
        PRINT 'Stages updated. Previous values are in tbl_project_stage_repair_log.';
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH;
END
ELSE
BEGIN
    PRINT 'Report only. Set @ApplyChanges = 1 to update the stages.';
END;
