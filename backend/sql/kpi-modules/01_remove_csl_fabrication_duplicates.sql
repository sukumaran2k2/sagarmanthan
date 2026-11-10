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
