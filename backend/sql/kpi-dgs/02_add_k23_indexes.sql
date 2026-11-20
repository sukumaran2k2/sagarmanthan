-- KPI DGS K-2.3 Exam Performance: speed-up indexes.
--
-- Why: every K-2.3 request looks rows up by year + month (+ type for K-2.3.2): the Data Lists
-- (totals per month / type), the duplicate checks, loading the grid for add / edit and the save.
-- The two tables' only index is their primary key, so SQL Server read the whole table each time
-- (tbl_kpi_dgs_2_3_2 grows by about 200 rows a month). These indexes let it go straight to the
-- month and read the needed columns from the index alone.
--
-- HOW TO RUN (SSMS)
-- Select the right database (e.g. USE sagarmanthan_revamp) and run the whole file (Execute / F5).
-- Can run before or after the deploy: the code works with or without these indexes.
-- Run it AFTER 01_add_k23_audit_columns.sql (the indexes include updated_date).
--
-- Safe to run more than once: an index is created only if it is missing. No data is changed.

SET NOCOUNT ON;

IF COL_LENGTH('dbo.tbl_kpi_dgs_2_3_1', 'updated_date') IS NULL
   OR COL_LENGTH('dbo.tbl_kpi_dgs_2_3_2', 'updated_date') IS NULL
BEGIN
    RAISERROR('Run 01_add_k23_audit_columns.sql first (updated_date is missing). Nothing was changed.', 16, 1);
    RETURN;
END

-- K-2.3.1 Exam Monthly Performance: Data List totals, duplicate check, edit
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_kpi_dgs_2_3_1_year_month'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_dgs_2_3_1'))
    CREATE NONCLUSTERED INDEX IX_tbl_kpi_dgs_2_3_1_year_month
        ON dbo.tbl_kpi_dgs_2_3_1 (year, month)
        INCLUDE (total_exam_nautical, total_exam_engineering, updated_date);
PRINT 'IX_tbl_kpi_dgs_2_3_1_year_month ready';

-- K-2.3.2 Exam Overall Performance Statistics: Data List totals, grid load, duplicate check, save
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_kpi_dgs_2_3_2_year_month_type'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_dgs_2_3_2'))
    CREATE NONCLUSTERED INDEX IX_tbl_kpi_dgs_2_3_2_year_month_type
        ON dbo.tbl_kpi_dgs_2_3_2 (year, month, type_id)
        INCLUDE (grade_id, code_id, subject_id, frequency_id,
                 candidates_appeared, candidate_passed, pass_percentage, updated_date);
PRINT 'IX_tbl_kpi_dgs_2_3_2_year_month_type ready';

-- Check: 2 rows expected
SELECT OBJECT_NAME(object_id) AS table_name, name AS index_name
FROM sys.indexes
WHERE name IN ('IX_tbl_kpi_dgs_2_3_1_year_month', 'IX_tbl_kpi_dgs_2_3_2_year_month_type');
