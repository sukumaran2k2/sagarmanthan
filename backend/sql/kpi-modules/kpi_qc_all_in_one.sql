-- KPI modules (DGLL / CSL / IMU / SCI) - QC database script, one file (run it once, top to bottom)
--
-- Run it AFTER the new KPI code (branch fix/kpi-modules-qc) is deployed.
-- 1. Take a backup of the database.
-- 2. Run the whole file (SSMS: Execute / F5). It runs 3 parts in order and prints each one.
--
-- Part 1 removes CSL fabrication months entered twice with the same figures (a copy of each
-- removed row is kept in tbl_kpi_cleanup_backup). If a month is entered twice with DIFFERENT
-- figures it stops, lists them and changes nothing - decide which row is right, delete the
-- other, run the file again.
-- Part 2 makes the database refuse a second entry for the same period (financial year, or year +
-- quarter / month) in 32 KPI tables, and a second lighthouse with the same name. A table that
-- still has repeats is skipped and named in the output.
-- Part 3 adds tbl_kpi_delete_log: a copy of every KPI entry the portal deletes, with who deleted
-- it and when (until now these went to text files on the app server).
--
-- Safe to run more than once. If a part stops with an error it is rolled back and the parts
-- after it are skipped; the last message says where it stopped.
-- Needs SQL Server 2017 or later (SESSION_CONTEXT, STRING_AGG).
--
-- Parts:
--   1. Remove repeated months in CSL Fabrication of Steels (QC KPI-04)
--   2. Unique period indexes on the KPI tables (QC KPI-05 / KPI-13)
--   3. Delete log table for KPI entries (QC KPI-08)

SET NOCOUNT ON;
SET XACT_ABORT ON;   -- any error rolls the part back and stops it
SET NOEXEC OFF;
EXEC sp_set_session_context @key = N'kpi_qc_step', @value = 0;
GO

-- ============================================================================================
-- Part 1 of 3: Remove repeated months in CSL Fabrication of Steels (QC KPI-04)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'kpi_qc_step') AS INT), -1) <> 0
BEGIN
    PRINT 'Part 1 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 1 of 3: Remove repeated months in CSL Fabrication of Steels (QC KPI-04)';

-- KPI CSL (QC KPI-04): remove repeated months in CSL K-4.5 Fabrication of Steels.
--
-- The add form had no duplicate check, so a month could be entered twice (locally: 2024-25 May,
-- ids 2 and 14, same figures). The report sums every row, so that month was counted twice.
--
-- For each financial year + month entered more than once with the SAME figures, the earliest row
-- is kept and the others are removed; a copy of each removed row goes to
-- tbl_kpi_cleanup_backup first. If the repeated rows have DIFFERENT figures, the script stops,
-- lists them and changes nothing - decide which row is right, delete the other, run it again.
--
-- Safe to run more than once. Take a backup first.

SET XACT_ABORT ON;
SET NOCOUNT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.tbl_kpi_cleanup_backup', 'U') IS NULL
    CREATE TABLE dbo.tbl_kpi_cleanup_backup (
        backup_id     INT IDENTITY(1, 1) PRIMARY KEY,
        table_name    SYSNAME        NOT NULL,
        record_id     INT            NOT NULL,
        row_json      NVARCHAR(MAX)  NOT NULL,
        reason        NVARCHAR(200)  NOT NULL,
        removed_date  DATETIME2(0)   NOT NULL DEFAULT SYSUTCDATETIME()
    );

-- Repeated months whose figures differ: stop and list them
DECLARE @conflicts NVARCHAR(MAX) = (
    SELECT STRING_AGG(CONCAT(financial_year, ' ', [month]), ', ')
    FROM (
        SELECT financial_year, [month]
        FROM dbo.tbl_csl_fabrication_of_steels
        GROUP BY financial_year, [month]
        HAVING COUNT(*) > 1
           AND (COUNT(DISTINCT fabrication_of_steel_targets) > 1 OR COUNT(DISTINCT fabrication_of_steel_actual) > 1)
    ) AS d);
IF @conflicts IS NOT NULL
BEGIN
    DECLARE @msg NVARCHAR(2048) = CONCAT('These months are entered more than once with different figures: ', @conflicts,
        '. Decide which row is right, delete the other, then run again. Nothing was changed.');
    THROW 50010, @msg, 1;
END

-- Exact repeats: keep the earliest row of each month
;WITH ranked AS (
    SELECT csl_fabrication_id,
           ROW_NUMBER() OVER (PARTITION BY financial_year, [month] ORDER BY csl_fabrication_id) AS rn
    FROM dbo.tbl_csl_fabrication_of_steels
)
INSERT INTO dbo.tbl_kpi_cleanup_backup (table_name, record_id, row_json, reason)
SELECT 'tbl_csl_fabrication_of_steels', f.csl_fabrication_id,
       (SELECT f.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES),
       'QC KPI-04: repeated month, same figures as an earlier row'
FROM dbo.tbl_csl_fabrication_of_steels AS f
JOIN ranked ON ranked.csl_fabrication_id = f.csl_fabrication_id
WHERE ranked.rn > 1;

DECLARE @removed INT = @@ROWCOUNT;

DELETE f
FROM dbo.tbl_csl_fabrication_of_steels AS f
WHERE EXISTS (SELECT 1 FROM dbo.tbl_kpi_cleanup_backup AS b
              WHERE b.table_name = 'tbl_csl_fabrication_of_steels' AND b.record_id = f.csl_fabrication_id);

PRINT CONCAT('CSL fabrication repeated months removed: ', @removed);

COMMIT TRANSACTION;

EXEC sp_set_session_context @key = N'kpi_qc_step', @value = 1;
PRINT 'Part 1 done.';
GO

-- ============================================================================================
-- Part 2 of 3: Unique period indexes on the KPI tables (QC KPI-05 / KPI-13)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'kpi_qc_step') AS INT), -1) <> 1
BEGIN
    PRINT 'Part 2 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 2 of 3: Unique period indexes on the KPI tables (QC KPI-05 / KPI-13)';

-- KPI DGLL / CSL / IMU / SCI (QC KPI-05 / KPI-13): the database refuses a second entry for the same
-- period (financial year, or year + quarter / month) - and a second lighthouse with the same name -
-- even if a request gets past the API checks.
--
-- Each index is added only when the table has no repeats. A table that still has repeats is skipped
-- and named in the output: clean it (for CSL fabrication run 01_remove_csl_fabrication_duplicates.sql
-- first), then run this again. Rows with an empty period are not affected (filtered indexes).
-- Safe to run more than once. Take a backup first.

SET NOCOUNT ON;
DECLARE @added INT = 0, @skipped NVARCHAR(MAX) = N'';

IF OBJECT_ID('dbo.tbl_light_house_master', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_light_house_master_light_house_name' AND object_id = OBJECT_ID('dbo.tbl_light_house_master'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_light_house_master WHERE light_house_name IS NOT NULL GROUP BY light_house_name HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_light_house_master');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_light_house_master_light_house_name ON dbo.tbl_light_house_master (light_house_name) WHERE light_house_name IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_vtms_integration', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_vtms_integration_financial_year' AND object_id = OBJECT_ID('dbo.tbl_vtms_integration'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_vtms_integration WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_vtms_integration');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_vtms_integration_financial_year ON dbo.tbl_vtms_integration (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_nais_uptime', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_nais_uptime_financial_year' AND object_id = OBJECT_ID('dbo.tbl_nais_uptime'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_nais_uptime WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_nais_uptime');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_nais_uptime_financial_year ON dbo.tbl_nais_uptime (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_nais_integration', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_nais_integration_financial_year' AND object_id = OBJECT_ID('dbo.tbl_nais_integration'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_nais_integration WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_nais_integration');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_nais_integration_financial_year ON dbo.tbl_nais_integration (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_kpi_dgll_3_5_1', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_kpi_dgll_3_5_1_finacial_year' AND object_id = OBJECT_ID('dbo.tbl_kpi_dgll_3_5_1'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_kpi_dgll_3_5_1 WHERE finacial_year IS NOT NULL GROUP BY finacial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_kpi_dgll_3_5_1');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_kpi_dgll_3_5_1_finacial_year ON dbo.tbl_kpi_dgll_3_5_1 (finacial_year) WHERE finacial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_kpi_dgll_3_5_2', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_kpi_dgll_3_5_2_year' AND object_id = OBJECT_ID('dbo.tbl_kpi_dgll_3_5_2'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_kpi_dgll_3_5_2 WHERE year IS NOT NULL GROUP BY year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_kpi_dgll_3_5_2');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_kpi_dgll_3_5_2_year ON dbo.tbl_kpi_dgll_3_5_2 (year) WHERE year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_dgll_k_3_6', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_dgll_k_3_6_financialyear' AND object_id = OBJECT_ID('dbo.tbl_dgll_k_3_6'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_dgll_k_3_6 WHERE financialyear IS NOT NULL GROUP BY financialyear HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_dgll_k_3_6');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_dgll_k_3_6_financialyear ON dbo.tbl_dgll_k_3_6 (financialyear) WHERE financialyear IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_vessels_built', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_vessels_built_financial_year' AND object_id = OBJECT_ID('dbo.tbl_csl_vessels_built'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_vessels_built WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_vessels_built');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_vessels_built_financial_year ON dbo.tbl_csl_vessels_built (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_ship_building_orders', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_ship_building_orders_financial_year_financial_quater' AND object_id = OBJECT_ID('dbo.tbl_csl_ship_building_orders'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_ship_building_orders WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL GROUP BY financial_year, financial_quater HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_ship_building_orders');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_ship_building_orders_financial_year_financial_quater ON dbo.tbl_csl_ship_building_orders (financial_year, financial_quater) WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_ship_delivery_performance', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_ship_delivery_performance_financial_year_financial_quater' AND object_id = OBJECT_ID('dbo.tbl_csl_ship_delivery_performance'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_ship_delivery_performance WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL GROUP BY financial_year, financial_quater HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_ship_delivery_performance');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_ship_delivery_performance_financial_year_financial_quater ON dbo.tbl_csl_ship_delivery_performance (financial_year, financial_quater) WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_capacity_utilization', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_capacity_utilization_financial_year' AND object_id = OBJECT_ID('dbo.tbl_csl_capacity_utilization'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_capacity_utilization WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_capacity_utilization');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_capacity_utilization_financial_year ON dbo.tbl_csl_capacity_utilization (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_fabrication_of_steels', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_fabrication_of_steels_financial_year_month' AND object_id = OBJECT_ID('dbo.tbl_csl_fabrication_of_steels'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_fabrication_of_steels WHERE financial_year IS NOT NULL AND month IS NOT NULL GROUP BY financial_year, month HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_fabrication_of_steels');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_fabrication_of_steels_financial_year_month ON dbo.tbl_csl_fabrication_of_steels (financial_year, month) WHERE financial_year IS NOT NULL AND month IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_fabrication_of_steels_update', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_fabrication_of_steels_update_financial_year' AND object_id = OBJECT_ID('dbo.tbl_csl_fabrication_of_steels_update'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_fabrication_of_steels_update WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_fabrication_of_steels_update');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_fabrication_of_steels_update_financial_year ON dbo.tbl_csl_fabrication_of_steels_update (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_ships_repaired', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_ships_repaired_financial_year_financial_quater' AND object_id = OBJECT_ID('dbo.tbl_csl_ships_repaired'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_ships_repaired WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL GROUP BY financial_year, financial_quater HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_ships_repaired');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_ships_repaired_financial_year_financial_quater ON dbo.tbl_csl_ships_repaired (financial_year, financial_quater) WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_1', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_1_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_1'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_1 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_1');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_1_financial_year ON dbo.tbl_imu_k_5_1 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_2', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_2_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_2'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_2 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_2');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_2_financial_year ON dbo.tbl_imu_k_5_2 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_3', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_3_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_3'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_3 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_3');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_3_financial_year ON dbo.tbl_imu_k_5_3 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_4', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_4_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_4'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_4 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_4');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_4_financial_year ON dbo.tbl_imu_k_5_4 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_5', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_5_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_5'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_5 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_5');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_5_financial_year ON dbo.tbl_imu_k_5_5 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_vessel_availability', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_vessel_availability_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_vessel_availability'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_vessel_availability WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_vessel_availability');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_vessel_availability_financial_year ON dbo.tbl_sci_vessel_availability (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_time_voyage_bulk', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_time_voyage_bulk_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_time_voyage_bulk'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_time_voyage_bulk WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_time_voyage_bulk');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_time_voyage_bulk_financial_year ON dbo.tbl_sci_time_voyage_bulk (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_time_voyage_tanker', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_time_voyage_tanker_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_time_voyage_tanker'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_time_voyage_tanker WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_time_voyage_tanker');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_time_voyage_tanker_financial_year ON dbo.tbl_sci_time_voyage_tanker (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_time_voyage_offshore', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_time_voyage_offshore_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_time_voyage_offshore'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_time_voyage_offshore WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_time_voyage_offshore');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_time_voyage_offshore_financial_year ON dbo.tbl_sci_time_voyage_offshore (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_vessel_availability_linear', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_vessel_availability_linear_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_vessel_availability_linear'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_vessel_availability_linear WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_vessel_availability_linear');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_vessel_availability_linear_financial_year ON dbo.tbl_sci_vessel_availability_linear (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_vessel_procurement', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_vessel_procurement_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_vessel_procurement'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_vessel_procurement WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_vessel_procurement');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_vessel_procurement_financial_year ON dbo.tbl_sci_vessel_procurement (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_secondhand_vessel_procurement', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_secondhand_vessel_procurement_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_secondhand_vessel_procurement'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_secondhand_vessel_procurement WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_secondhand_vessel_procurement');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_secondhand_vessel_procurement_financial_year ON dbo.tbl_sci_secondhand_vessel_procurement (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_ship_dry_docking', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_ship_dry_docking_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_ship_dry_docking'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_ship_dry_docking WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_ship_dry_docking');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_ship_dry_docking_financial_year ON dbo.tbl_sci_ship_dry_docking (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_repair_and_maintanace', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_repair_and_maintanace_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_repair_and_maintanace'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_repair_and_maintanace WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_repair_and_maintanace');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_repair_and_maintanace_financial_year ON dbo.tbl_sci_repair_and_maintanace (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_sale_and_recycling_oldvessels_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_sale_and_recycling_oldvessels WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_sale_and_recycling_oldvessels');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_sale_and_recycling_oldvessels_financial_year ON dbo.tbl_sci_sale_and_recycling_oldvessels (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_sale_and_recycling_oldvessels_green_recycling_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_sale_and_recycling_oldvessels_green_recycling');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_sale_and_recycling_oldvessels_green_recycling_financial_year ON dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_manning_of_owned_ships', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_manning_of_owned_ships_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_manning_of_owned_ships'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_manning_of_owned_ships WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_manning_of_owned_ships');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_manning_of_owned_ships_financial_year ON dbo.tbl_sci_manning_of_owned_ships (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_ship_management_business', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_ship_management_business_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_ship_management_business'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_ship_management_business WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_ship_management_business');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_ship_management_business_financial_year ON dbo.tbl_sci_ship_management_business (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

PRINT CONCAT('Unique period indexes added: ', @added);
IF @skipped <> N'' PRINT CONCAT('Skipped (repeated periods - clean them first):', @skipped);

EXEC sp_set_session_context @key = N'kpi_qc_step', @value = 2;
PRINT 'Part 2 done.';
GO

-- ============================================================================================
-- Part 3 of 3: Delete log table for KPI entries (QC KPI-08)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'kpi_qc_step') AS INT), -1) <> 2
BEGIN
    PRINT 'Part 3 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 3 of 3: Delete log table for KPI entries (QC KPI-08)';

-- KPI DGLL / CSL / IMU / SCI (QC KPI-08): a copy of every KPI entry the portal deletes, with who
-- deleted it and when, kept in the database (until now it went to text files under ./delete_log on
-- the app server, which are lost on redeploy and not backed up with the data).
--
-- The new code writes to this table in the same transaction as the delete. Until the table exists
-- it keeps writing the text files, so the script can run before or after the deploy.
-- Safe to run more than once.

SET XACT_ABORT ON;
SET NOCOUNT ON;

IF OBJECT_ID('dbo.tbl_kpi_delete_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_kpi_delete_log (
        delete_log_id   INT IDENTITY(1, 1) PRIMARY KEY,
        table_name      SYSNAME         NOT NULL,   -- e.g. tbl_csl_vessels_built
        record_id       INT             NOT NULL,   -- the deleted entry's id
        row_json        NVARCHAR(MAX)   NOT NULL,   -- the entry as it was
        deleted_by      INT             NULL,       -- tbl_user.user_id of the signed-in user
        deleted_date    DATETIME2(0)    NOT NULL CONSTRAINT DF_tbl_kpi_delete_log_date DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_tbl_kpi_delete_log_table ON dbo.tbl_kpi_delete_log (table_name, record_id);
END
PRINT 'tbl_kpi_delete_log ready';

EXEC sp_set_session_context @key = N'kpi_qc_step', @value = 3;
PRINT 'Part 3 done.';
GO

-- ============================================================================================
SET NOEXEC OFF;
DECLARE @done INT = ISNULL(CAST(SESSION_CONTEXT(N'kpi_qc_step') AS INT), 0);
DECLARE @failed INT = @done + 1;
EXEC sp_set_session_context @key = N'kpi_qc_step', @value = NULL;
IF @done = 3
    PRINT 'All 3 parts done.';
ELSE IF @done = 0
    RAISERROR('Stopped: part 1 failed (see the error above), nothing was changed. Fix it and run the whole file again.', 16, 1);
ELSE
    RAISERROR('Stopped: parts 1 to %d are done, part %d failed (see the error above). Fix it and run the whole file again.', 16, 1, @done, @failed);
