-- KPI DGS K-2.4 Entry and Exit of Candidates: speed-up index.
--
-- Why: every K-2.4 request looks entries up by year + month (+ grade): the duplicate check and
-- save (one entry per year + month + grade), and the three reports, which add the counts up by
-- month. tbl_kpi_dgs_entry_exit's only index is its primary key, so SQL Server read the whole
-- table each time (it grows by about 25 rows a month). This index lets it go straight to the
-- month and read the needed columns from the index alone.
--
-- tbl_kpi_dgs_entry_exit already has created_by / created_date / updated_by / updated_date, so
-- K-2.4 needs no column script.
--
-- HOW TO RUN (SSMS)
-- Select the right database (e.g. USE sagarmanthan_revamp) and run the whole file (Execute / F5).
-- Can run before or after the deploy: the code works with or without this index.
--
-- Safe to run more than once: the index is created only if it is missing. No data is changed.

SET NOCOUNT ON;

IF OBJECT_ID('dbo.tbl_kpi_dgs_entry_exit', 'U') IS NULL
BEGIN
    RAISERROR('tbl_kpi_dgs_entry_exit not found. Check that the right database is selected. Nothing was changed.', 16, 1);
    RETURN;
END

-- Duplicate check / save, Data List order, reports by month
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_kpi_dgs_entry_exit_year_month_grade'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_dgs_entry_exit'))
    CREATE NONCLUSTERED INDEX IX_tbl_kpi_dgs_entry_exit_year_month_grade
        ON dbo.tbl_kpi_dgs_entry_exit (year, month, grade_id)
        INCLUDE (type_id, no_of_candidates_entered, no_of_candidates_exited, updated_date);
PRINT 'IX_tbl_kpi_dgs_entry_exit_year_month_grade ready';

-- Check: 1 row expected
SELECT OBJECT_NAME(object_id) AS table_name, name AS index_name
FROM sys.indexes
WHERE name = 'IX_tbl_kpi_dgs_entry_exit_year_month_grade';
