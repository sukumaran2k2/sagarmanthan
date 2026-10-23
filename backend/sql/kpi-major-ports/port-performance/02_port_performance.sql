/*
    KPI Major Ports · Port Performance: columns and indexes
    --------------------------------------------------------
    Run once on each database (local, test, live) after deploying the Port Performance module,
    after 01_time_performance_cppi_columns.sql. Safe to run again: every column and index is
    created only if it is missing. No existing data is changed.

    Why:
      1. The 14-step input form saves "Average Container Size" by call size and the container /
         total cargo loaded and unloaded by sailed vessels. The earlier portal's database had these
         columns; tbl_kpi_time_performance in the revamped database does not.
      2. One record per organisation, financial year and month (actuals) and one value per
         financial year, KPI type and organisation / Overall / Total SMPA (targets). The save
         paths rely on this; the unique indexes make the database enforce it too.
      3. The lists and the save path look rows up by organisation, year and month.

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database
    and execute it, or run it with sqlcmd -d <database> -i 02_port_performance.sql
*/

-- 1. Columns written by the input form ------------------------------------------------------

DECLARE @cols TABLE (name SYSNAME);
INSERT INTO @cols VALUES
 -- Average Container Size by call size
 ('avg_less_than_251'), ('avg_251_to_500'), ('avg_501_to_1000'), ('avg_1001_to_1500'),
 ('avg_1501_to_2000'), ('avg_2001_to_2500'), ('avg_2501_to_3000'), ('avg_3001_to_4000'),
 ('avg_4001_to_6000'), ('avg_greater_than_6000'),
 -- Cargo loaded to / unloaded from sailed vessels (dry, break and liquid bulk are added by
 -- 01_time_performance_cppi_columns.sql)
 ('container_bulk_cargo_loaded'), ('container_bulk_cargo_loaded_teu'), ('total_cargo_loaded'),
 ('container_bulk_cargo_unloaded'), ('container_bulk_cargo_unloaded_teu'), ('total_cargo_unloaded');

DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'ALTER TABLE dbo.tbl_kpi_time_performance ADD ' + QUOTENAME(name) + N' DECIMAL(18,2) NULL;' + CHAR(10)
FROM @cols
WHERE COL_LENGTH('dbo.tbl_kpi_time_performance', name) IS NULL;
EXEC sp_executesql @sql;
GO

-- 2. One actuals record per organisation, financial year and month ---------------------------
-- Fails (and changes nothing) if duplicates already exist; find them with:
--   SELECT organisation_id, fiscal_year, month, COUNT(*) FROM dbo.tbl_kpi_time_performance
--   GROUP BY organisation_id, fiscal_year, month HAVING COUNT(*) > 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_kpi_time_performance_org_fy_month'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_time_performance'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_kpi_time_performance_org_fy_month
    ON dbo.tbl_kpi_time_performance (organisation_id, fiscal_year, month)
    WHERE organisation_id IS NOT NULL AND fiscal_year IS NOT NULL AND month IS NOT NULL;
GO

-- 3. One target per financial year, KPI type and organisation ------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_kpi_time_performance_target_org'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_time_performance_target'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_kpi_time_performance_target_org
    ON dbo.tbl_kpi_time_performance_target (financial_year, kpi_type_id, organisation_id)
    WHERE organisation_id IS NOT NULL;
GO

-- ... and one Overall / one Total SMPA target per financial year and KPI type
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_kpi_time_performance_target_aggregate'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_time_performance_target'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_kpi_time_performance_target_aggregate
    ON dbo.tbl_kpi_time_performance_target (financial_year, kpi_type_id, is_overall, is_totalSmpa)
    WHERE organisation_id IS NULL;
GO
