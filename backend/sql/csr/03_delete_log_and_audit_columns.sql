-- CSR Projects (QC CSR-11 / CSR-36): record who changed or removed CSR data, and when.
--   1. tbl_csr_delete_log: a copy of every CSR row the portal removes (today: an expenditure
--      year taken off a project), with who removed it and when. The code writes to it only
--      once this table exists, so the script can run before or after the deploy.
--   2. tbl_csr_image gets created_by / created_date (gallery files had no audit columns).
--   3. Project and fund created / updated dates keep the time too (DATE -> DATETIME2).
--      Existing dates stay as they are (midnight of that day).
--   New times are saved in UTC (SYSUTCDATETIME), which the portal shows in local time (QC R-09).
-- Safe to run more than once. Take a backup first.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

-- 1. Delete log
IF OBJECT_ID('dbo.tbl_csr_delete_log', 'U') IS NULL
    CREATE TABLE dbo.tbl_csr_delete_log (
        log_id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_tbl_csr_delete_log PRIMARY KEY,
        entity          VARCHAR(30)    NOT NULL,          -- e.g. 'expenditure'
        record_id       INT            NOT NULL,          -- id of the removed row
        csr_project_id  INT            NULL,
        organisation_id INT            NULL,
        row_json        NVARCHAR(MAX)  NOT NULL CONSTRAINT CK_tbl_csr_delete_log_json CHECK (ISJSON(row_json) = 1),
        deleted_by      INT            NOT NULL,
        deleted_date    DATETIME2(0)   NOT NULL CONSTRAINT DF_tbl_csr_delete_log_date DEFAULT SYSUTCDATETIME()
    );
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_delete_log_project' AND object_id = OBJECT_ID('dbo.tbl_csr_delete_log'))
    CREATE INDEX IX_tbl_csr_delete_log_project ON dbo.tbl_csr_delete_log (csr_project_id, deleted_date DESC);
PRINT 'tbl_csr_delete_log ready';

-- 2. Gallery audit columns (existing rows: unknown, so left empty)
IF COL_LENGTH('dbo.tbl_csr_image', 'created_by') IS NULL
    ALTER TABLE dbo.tbl_csr_image ADD created_by INT NULL;
IF COL_LENGTH('dbo.tbl_csr_image', 'created_date') IS NULL
    ALTER TABLE dbo.tbl_csr_image ADD created_date DATETIME2(0) NULL CONSTRAINT DF_tbl_csr_image_created_date DEFAULT SYSUTCDATETIME();
PRINT 'tbl_csr_image audit columns ready';

-- 3. DATE -> DATETIME2 for the project and fund audit dates. A default on the column has to be
-- dropped while its type changes, then put back.
DECLARE @t SYSNAME, @c SYSNAME, @df SYSNAME, @def NVARCHAR(200), @sql NVARCHAR(MAX);
DECLARE cols CURSOR LOCAL FAST_FORWARD FOR
    SELECT t, c FROM (VALUES ('tbl_csr_projects', 'created_date'), ('tbl_csr_projects', 'updated_date'),
                             ('tbl_csr_fund', 'created_date'), ('tbl_csr_fund', 'updated_date')) v(t, c)
    WHERE EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS i
                  WHERE i.TABLE_NAME = v.t AND i.COLUMN_NAME = v.c AND i.DATA_TYPE = 'date');
OPEN cols;
FETCH NEXT FROM cols INTO @t, @c;
WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @df = d.name, @def = d.definition
    FROM sys.default_constraints d
    JOIN sys.columns col ON col.object_id = d.parent_object_id AND col.column_id = d.parent_column_id
    WHERE d.parent_object_id = OBJECT_ID('dbo.' + @t) AND col.name = @c;

    IF @df IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE dbo.' + QUOTENAME(@t) + N' DROP CONSTRAINT ' + QUOTENAME(@df);
        EXEC (@sql);
    END
    SET @sql = N'ALTER TABLE dbo.' + QUOTENAME(@t) + N' ALTER COLUMN ' + QUOTENAME(@c) + N' DATETIME2(0) NULL';
    EXEC (@sql);
    IF @df IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE dbo.' + QUOTENAME(@t) + N' ADD CONSTRAINT ' + QUOTENAME('DF_' + @t + '_' + @c)
                 + N' DEFAULT ' + @def + N' FOR ' + QUOTENAME(@c);
        EXEC (@sql);
    END
    PRINT @t + '.' + @c + ' now DATETIME2';
    SELECT @df = NULL, @def = NULL;
    FETCH NEXT FROM cols INTO @t, @c;
END
CLOSE cols; DEALLOCATE cols;

COMMIT;
