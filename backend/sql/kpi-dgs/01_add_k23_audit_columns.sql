-- KPI DGS K-2.3 Exam Performance: who added / last changed each entry, and when.
--
-- Adds created_by, created_date, updated_by, updated_date to the two K-2.3 data tables:
--   tbl_kpi_dgs_2_3_1  (K-2.3.1 Exam Monthly Performance)
--   tbl_kpi_dgs_2_3_2  (K-2.3.2 Exam Overall Performance Statistics)
-- Same types as K-2.4 (tbl_kpi_dgs_entry_exit) and CSL: user ids INT, dates DATE.
--
-- The columns allow NULL and have no default, so existing rows stay empty (shown as "--" in the
-- Data List's Last Updated Date) instead of being stamped with today's date.
-- The portal fills them from the signed-in user: created_* on add, updated_* on edit.
--
-- HOW TO RUN (SSMS)
-- 1. Take a backup of the database.
-- 2. Select the right database (e.g. USE sagarmanthan_revamp) and run the whole file (Execute / F5).
-- 3. Run it BEFORE deploying the backend that writes these columns; K-2.3 saves fail without them.
--
-- Safe to run more than once: a column that already exists is skipped. Any error rolls back
-- everything this script did. The last result set lists the columns so you can check them.

SET XACT_ABORT ON;
SET NOCOUNT ON;

IF OBJECT_ID('dbo.tbl_kpi_dgs_2_3_1', 'U') IS NULL OR OBJECT_ID('dbo.tbl_kpi_dgs_2_3_2', 'U') IS NULL
BEGIN
    RAISERROR('tbl_kpi_dgs_2_3_1 / tbl_kpi_dgs_2_3_2 not found. Check that the right database is selected. Nothing was changed.', 16, 1);
    RETURN;
END

BEGIN TRANSACTION;

-- K-2.3.1 Exam Monthly Performance
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_1', 'created_by') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_1 ADD created_by INT NULL;
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_1', 'created_date') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_1 ADD created_date DATE NULL;
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_1', 'updated_by') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_1 ADD updated_by INT NULL;
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_1', 'updated_date') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_1 ADD updated_date DATE NULL;
PRINT 'tbl_kpi_dgs_2_3_1: audit columns ready';

-- K-2.3.2 Exam Overall Performance Statistics
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_2', 'created_by') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_2 ADD created_by INT NULL;
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_2', 'created_date') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_2 ADD created_date DATE NULL;
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_2', 'updated_by') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_2 ADD updated_by INT NULL;
IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_2', 'updated_date') IS NULL
    ALTER TABLE dbo.tbl_kpi_dgs_2_3_2 ADD updated_date DATE NULL;
PRINT 'tbl_kpi_dgs_2_3_2: audit columns ready';

COMMIT TRANSACTION;
PRINT 'K-2.3 audit columns added. Existing rows were not changed.';

-- Check: 8 rows expected (4 columns x 2 tables)
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME IN ('tbl_kpi_dgs_2_3_1', 'tbl_kpi_dgs_2_3_2')
  AND COLUMN_NAME IN ('created_by', 'created_date', 'updated_by', 'updated_date')
ORDER BY TABLE_NAME, COLUMN_NAME;
