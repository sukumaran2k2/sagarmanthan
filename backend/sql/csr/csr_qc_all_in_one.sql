-- CSR Projects - all QC scripts in one file (run it once, top to bottom)
--
-- 1. Take a backup of the database.
-- 2. Set @updatedBy just below to your user_id (it is recorded on the permission rows changed).
-- 3. Run the whole file (SSMS: Execute / F5). It runs 9 parts in order and prints each one.
--
-- Safe to run more than once: parts that were already done change nothing.
-- If a part stops with an error, that part is rolled back and the parts after it are skipped;
-- the last message says where it stopped. Send that message, fix, and run the file again.
-- Needs SQL Server 2016 or later (SESSION_CONTEXT).
--
-- Parts:
--   1. Indexes on CSR focus area and fund year
--   2. Created / updated by and date on CSR expenditure
--   3. Projects: who approved a drop request (QC CSR-23)
--   4. Remove blank CSR rows and add database rules (QC CSR-15)
--   5. CSR view only for Ministry users, no delete (QC CSR-18 / CSR-34 / R-01)
--   6. Delete log and audit columns (QC CSR-11 / CSR-36)
--   7. List indexes (QC CSR-25)
--   8. Switch CSR on for organisations with CSR data (QC CSR-33)
--   9. CSR view / add / edit for organisation logins (QC R-14)
--
-- Do NOT run the older scripts 01_fix_amounts_entered_in_lakhs.sql or
-- 02_fix_mormugao_project_values.sql if you have them - they would make live amounts wrong.

SET NOCOUNT ON;
SET XACT_ABORT ON;   -- any error rolls the part back and stops it
SET NOEXEC OFF;

DECLARE @updatedBy INT = NULL;   -- <<< SET THIS: your user_id, e.g. 1 for the superadmin account

IF @updatedBy IS NULL
BEGIN
    RAISERROR('Set @updatedBy at the top of the file to your user_id, then run again. Nothing was changed.', 16, 1);
    SET NOEXEC ON;   -- skip everything below
END
EXEC sp_set_session_context @key = N'csr_qc_updated_by', @value = @updatedBy;
EXEC sp_set_session_context @key = N'csr_qc_step', @value = 0;
GO

-- ============================================================================================
-- Part 1 of 9: Indexes on CSR focus area and fund year
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 0
BEGIN
    PRINT 'Part 1 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 1 of 9: Indexes on CSR focus area and fund year';

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_projects_csr_focus' AND object_id = OBJECT_ID('dbo.tbl_csr_projects'))
    CREATE INDEX IX_tbl_csr_projects_csr_focus ON dbo.tbl_csr_projects (csr_focus);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_fund_financial_year' AND object_id = OBJECT_ID('dbo.tbl_csr_fund'))
    CREATE INDEX IX_tbl_csr_fund_financial_year ON dbo.tbl_csr_fund (financial_year);

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 1;
PRINT 'Part 1 done.';
GO

-- ============================================================================================
-- Part 2 of 9: Created / updated by and date on CSR expenditure
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 1
BEGIN
    PRINT 'Part 2 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 2 of 9: Created / updated by and date on CSR expenditure';

IF COL_LENGTH('dbo.tbl_csr_expenditure', 'created_by') IS NULL ALTER TABLE dbo.tbl_csr_expenditure ADD created_by INT NULL;
IF COL_LENGTH('dbo.tbl_csr_expenditure', 'created_date') IS NULL ALTER TABLE dbo.tbl_csr_expenditure ADD created_date DATETIME NULL;
IF COL_LENGTH('dbo.tbl_csr_expenditure', 'updated_by') IS NULL ALTER TABLE dbo.tbl_csr_expenditure ADD updated_by INT NULL;
IF COL_LENGTH('dbo.tbl_csr_expenditure', 'updated_date') IS NULL ALTER TABLE dbo.tbl_csr_expenditure ADD updated_date DATETIME NULL;

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 2;
PRINT 'Part 2 done.';
GO

-- ============================================================================================
-- Part 3 of 9: Projects: who approved a drop request (QC CSR-23)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 2
BEGIN
    PRINT 'Part 3 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 3 of 9: Projects: who approved a drop request (QC CSR-23)';

-- Projects: who approved or rejected a drop request. 3.0 reads and writes
-- tbl_project_drop_request.approved_by (drop request list, approve / reject, project list)
-- but the column was never added, so those queries fail. Safe to run more than once.

IF COL_LENGTH('tbl_project_drop_request', 'approved_by') IS NULL
    ALTER TABLE tbl_project_drop_request ADD approved_by INT NULL;

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 3;
PRINT 'Part 3 done.';
GO

-- ============================================================================================
-- Part 4 of 9: Remove blank CSR rows and add database rules (QC CSR-15)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 3
BEGIN
    PRINT 'Part 4 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 4 of 9: Remove blank CSR rows and add database rules (QC CSR-15)';

-- CSR Projects (QC CSR-15): remove the blank project rows and the expenditure rows whose project
-- no longer exists, then add database rules so neither can happen again.
--
-- Where the blank rows came from: 2.0's POST /add-csr-projects had no login check and saved any
-- request body, so empty requests sent to the API (not through the form, which validates)
-- created rows with only created_date filled in. 3.0 needs a login, CSR access and a valid body.
--
-- Removed rows are copied to tbl_csr_cleanup_backup first, so they can be looked at later.
-- Safe to run more than once: a second run finds nothing to remove and skips the column changes.
-- If a real project lacks a required value, it stops with the project ids and changes nothing.
-- Run order: 01 -> 02 -> 03 -> 04 -> 05 -> 06. Take a backup first.
--
-- No foreign key to mmt_organisation: the organisation script drops and recreates that table,
-- which a foreign key would block.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.tbl_csr_cleanup_backup') IS NULL
    CREATE TABLE dbo.tbl_csr_cleanup_backup (
        backup_id INT IDENTITY(1,1) PRIMARY KEY,
        source_table VARCHAR(50) NOT NULL,
        source_id INT NOT NULL,
        row_json NVARCHAR(MAX) NOT NULL,
        removed_date DATETIME NOT NULL DEFAULT SYSUTCDATETIME()
    );

-- 1. Blank projects: no organisation, no name and no creator (13 rows on the 6 Nov 2026 copy)
DROP TABLE IF EXISTS #blank;
SELECT p.csr_project_id INTO #blank
FROM tbl_csr_projects p
WHERE p.organisation_id IS NULL AND p.project_name IS NULL AND p.created_by IS NULL;

-- Their expenditure, gallery rows and documents would be removed with them (none on the
-- 6 Nov copy); stop if a blank project unexpectedly has any, so nothing real is lost
IF EXISTS (SELECT 1 FROM tbl_csr_expenditure e JOIN #blank b ON b.csr_project_id = e.csr_project_id)
   OR EXISTS (SELECT 1 FROM tbl_csr_image i JOIN #blank b ON b.csr_project_id = i.csr_project_id)
    THROW 50001, 'A blank CSR project has expenditure or gallery rows - check before removing it.', 1;

INSERT INTO tbl_csr_cleanup_backup (source_table, source_id, row_json)
SELECT 'tbl_csr_projects', p.csr_project_id, (SELECT p.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)
FROM tbl_csr_projects p JOIN #blank b ON b.csr_project_id = p.csr_project_id;

DELETE p FROM tbl_csr_projects p JOIN #blank b ON b.csr_project_id = p.csr_project_id;
PRINT 'Blank CSR projects removed: ' + CAST(@@ROWCOUNT AS VARCHAR(12));

-- 2. Expenditure rows whose project does not exist (4 rows on the 6 Nov 2026 copy)
INSERT INTO tbl_csr_cleanup_backup (source_table, source_id, row_json)
SELECT 'tbl_csr_expenditure', e.csr_expenditure_id, (SELECT e.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)
FROM tbl_csr_expenditure e
WHERE NOT EXISTS (SELECT 1 FROM tbl_csr_projects p WHERE p.csr_project_id = e.csr_project_id);

DELETE e FROM tbl_csr_expenditure e
WHERE NOT EXISTS (SELECT 1 FROM tbl_csr_projects p WHERE p.csr_project_id = e.csr_project_id);
PRINT 'Expenditure rows without a project removed: ' + CAST(@@ROWCOUNT AS VARCHAR(12));

-- 2b. Gallery rows whose project does not exist (none on the 6 Nov 2026 copy); the foreign key
-- added below would refuse them (QC R-02)
INSERT INTO tbl_csr_cleanup_backup (source_table, source_id, row_json)
SELECT 'tbl_csr_image', i.document_id, (SELECT i.* FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES)
FROM tbl_csr_image i
WHERE NOT EXISTS (SELECT 1 FROM tbl_csr_projects p WHERE p.csr_project_id = i.csr_project_id);

DELETE i FROM tbl_csr_image i
WHERE NOT EXISTS (SELECT 1 FROM tbl_csr_projects p WHERE p.csr_project_id = i.csr_project_id);
PRINT 'Gallery rows without a project removed: ' + CAST(@@ROWCOUNT AS VARCHAR(12));

-- 3. Required project fields (the form and the API already require them).
-- First, stop with a clear list if a real project still lacks one of them (QC R-02): those
-- need correcting by their organisation, not removing.
DECLARE @missing NVARCHAR(MAX) = (
    SELECT STRING_AGG(CAST(csr_project_id AS NVARCHAR(12)), ', ')
    FROM (SELECT TOP 50 csr_project_id FROM tbl_csr_projects
          WHERE organisation_id IS NULL OR project_name IS NULL OR project_value IS NULL
             OR project_status IS NULL OR csr_focus IS NULL
          ORDER BY csr_project_id) m);
IF @missing IS NOT NULL
BEGIN
    DECLARE @msg NVARCHAR(2048) = N'These CSR projects lack an organisation, name, value, status or focus area '
        + N'(first 50 ids): ' + @missing + N'. Fill them in, then run this script again. Nothing was changed.';
    THROW 50003, @msg, 1;
END
IF EXISTS (SELECT 1 FROM tbl_csr_expenditure WHERE csr_project_id IS NULL)
    THROW 50004, 'Some tbl_csr_expenditure rows have no csr_project_id. Remove or fix them, then run again. Nothing was changed.', 1;

-- Each column is changed only while it still allows NULL, so a second run skips this part.
-- Each keeps its existing type, length and collation - only NOT NULL is added (QC R-20).
-- An index on the column has to be dropped while it changes and is then put back (the focus
-- index from schema-changes _1, and script 04's indexes if 04 was run before this one).
DROP TABLE IF EXISTS #csrColumnType;
SELECT OBJECT_NAME(c.object_id) AS tbl, c.name AS col,
       CASE WHEN t.name IN ('varchar', 'char', 'varbinary', 'binary')
                THEN t.name + '(' + CASE WHEN c.max_length = -1 THEN 'MAX' ELSE CAST(c.max_length AS VARCHAR(10)) END + ')'
            WHEN t.name IN ('nvarchar', 'nchar')
                THEN t.name + '(' + CASE WHEN c.max_length = -1 THEN 'MAX' ELSE CAST(c.max_length / 2 AS VARCHAR(10)) END + ')'
            WHEN t.name IN ('decimal', 'numeric')
                THEN t.name + '(' + CAST(c.precision AS VARCHAR(10)) + ',' + CAST(c.scale AS VARCHAR(10)) + ')'
            WHEN t.name IN ('datetime2', 'time', 'datetimeoffset')
                THEN t.name + '(' + CAST(c.scale AS VARCHAR(10)) + ')'
            ELSE t.name END
       + CASE WHEN c.collation_name IS NOT NULL THEN ' COLLATE ' + c.collation_name ELSE '' END AS spec
INTO #csrColumnType
FROM sys.columns c
JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE (c.object_id = OBJECT_ID('dbo.tbl_csr_projects') AND c.name IN ('organisation_id', 'project_name', 'project_value', 'project_status', 'csr_focus'))
   OR (c.object_id = OBJECT_ID('dbo.tbl_csr_expenditure') AND c.name = 'csr_project_id');
DECLARE @alterSql NVARCHAR(MAX);

IF COLUMNPROPERTY(OBJECT_ID('dbo.tbl_csr_projects'), 'organisation_id', 'AllowsNull') = 1
BEGIN
    DECLARE @orgIndex BIT = CASE WHEN EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_projects_organisation_year'
                                              AND object_id = OBJECT_ID('dbo.tbl_csr_projects')) THEN 1 ELSE 0 END;
    IF @orgIndex = 1 DROP INDEX IX_tbl_csr_projects_organisation_year ON tbl_csr_projects;
    SELECT @alterSql = N'ALTER TABLE dbo.tbl_csr_projects ALTER COLUMN organisation_id ' + spec + N' NOT NULL' FROM #csrColumnType WHERE tbl = 'tbl_csr_projects' AND col = 'organisation_id';
    EXEC sp_executesql @alterSql;
    IF @orgIndex = 1 CREATE INDEX IX_tbl_csr_projects_organisation_year ON tbl_csr_projects (organisation_id, financial_year);
END
IF COLUMNPROPERTY(OBJECT_ID('dbo.tbl_csr_projects'), 'project_name', 'AllowsNull') = 1
BEGIN
    SELECT @alterSql = N'ALTER TABLE dbo.tbl_csr_projects ALTER COLUMN project_name ' + spec + N' NOT NULL' FROM #csrColumnType WHERE tbl = 'tbl_csr_projects' AND col = 'project_name';
    EXEC sp_executesql @alterSql;
END
IF COLUMNPROPERTY(OBJECT_ID('dbo.tbl_csr_projects'), 'project_value', 'AllowsNull') = 1
BEGIN
    SELECT @alterSql = N'ALTER TABLE dbo.tbl_csr_projects ALTER COLUMN project_value ' + spec + N' NOT NULL' FROM #csrColumnType WHERE tbl = 'tbl_csr_projects' AND col = 'project_value';
    EXEC sp_executesql @alterSql;
END
IF COLUMNPROPERTY(OBJECT_ID('dbo.tbl_csr_projects'), 'project_status', 'AllowsNull') = 1
BEGIN
    SELECT @alterSql = N'ALTER TABLE dbo.tbl_csr_projects ALTER COLUMN project_status ' + spec + N' NOT NULL' FROM #csrColumnType WHERE tbl = 'tbl_csr_projects' AND col = 'project_status';
    EXEC sp_executesql @alterSql;
END
IF COLUMNPROPERTY(OBJECT_ID('dbo.tbl_csr_projects'), 'csr_focus', 'AllowsNull') = 1
BEGIN
    DECLARE @focusIndex BIT = CASE WHEN EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_projects_csr_focus'
                                                AND object_id = OBJECT_ID('dbo.tbl_csr_projects')) THEN 1 ELSE 0 END;
    IF @focusIndex = 1 DROP INDEX IX_tbl_csr_projects_csr_focus ON tbl_csr_projects;
    SELECT @alterSql = N'ALTER TABLE dbo.tbl_csr_projects ALTER COLUMN csr_focus ' + spec + N' NOT NULL' FROM #csrColumnType WHERE tbl = 'tbl_csr_projects' AND col = 'csr_focus';
    EXEC sp_executesql @alterSql;
    CREATE INDEX IX_tbl_csr_projects_csr_focus ON tbl_csr_projects (csr_focus);
END
IF COLUMNPROPERTY(OBJECT_ID('dbo.tbl_csr_expenditure'), 'csr_project_id', 'AllowsNull') = 1
BEGIN
    DECLARE @expIndex BIT = CASE WHEN EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_expenditure_project_year'
                                              AND object_id = OBJECT_ID('dbo.tbl_csr_expenditure')) THEN 1 ELSE 0 END;
    IF @expIndex = 1 DROP INDEX IX_tbl_csr_expenditure_project_year ON tbl_csr_expenditure;
    SELECT @alterSql = N'ALTER TABLE dbo.tbl_csr_expenditure ALTER COLUMN csr_project_id ' + spec + N' NOT NULL' FROM #csrColumnType WHERE tbl = 'tbl_csr_expenditure' AND col = 'csr_project_id';
    EXEC sp_executesql @alterSql;
    IF @expIndex = 1 CREATE INDEX IX_tbl_csr_expenditure_project_year ON tbl_csr_expenditure (csr_project_id, [year]) INCLUDE (csr_expenditure_cost);
END
PRINT 'Required fields set';

-- 4. Expenditure and gallery rows must belong to an existing project. tbl_csr_projects has no
-- primary key yet (csr_project_id is an IDENTITY column, so its values are already unique);
-- the foreign keys need one.
IF NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE type = 'PK' AND parent_object_id = OBJECT_ID('dbo.tbl_csr_projects'))
    ALTER TABLE tbl_csr_projects ADD CONSTRAINT PK_tbl_csr_projects PRIMARY KEY (csr_project_id);
IF OBJECT_ID('dbo.FK_tbl_csr_expenditure_project') IS NULL
    ALTER TABLE tbl_csr_expenditure WITH CHECK
        ADD CONSTRAINT FK_tbl_csr_expenditure_project FOREIGN KEY (csr_project_id) REFERENCES tbl_csr_projects (csr_project_id);
IF OBJECT_ID('dbo.FK_tbl_csr_image_project') IS NULL
    ALTER TABLE tbl_csr_image WITH CHECK
        ADD CONSTRAINT FK_tbl_csr_image_project FOREIGN KEY (csr_project_id) REFERENCES tbl_csr_projects (csr_project_id);
PRINT 'Foreign keys added';

-- 5. One fund entry per organisation and year (QC CSR-12; the API already refuses duplicates)
IF EXISTS (SELECT organisation_id, financial_year FROM tbl_csr_fund GROUP BY organisation_id, financial_year HAVING COUNT(*) > 1)
    THROW 50002, 'tbl_csr_fund has more than one entry for an organisation and year - merge them first.', 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_tbl_csr_fund_organisation_year' AND object_id = OBJECT_ID('dbo.tbl_csr_fund'))
    CREATE UNIQUE INDEX UQ_tbl_csr_fund_organisation_year ON tbl_csr_fund (organisation_id, financial_year);
PRINT 'Unique organisation + year on tbl_csr_fund';

COMMIT;

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 4;
PRINT 'Part 4 done.';
GO

-- ============================================================================================
-- Part 5 of 9: CSR view only for Ministry users, no delete (QC CSR-18 / CSR-34 / R-01)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 4
BEGIN
    PRINT 'Part 5 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 5 of 9: CSR view only for Ministry users, no delete (QC CSR-18 / CSR-34 / R-01)';

-- CSR Projects (QC CSR-18 / CSR-34 / R-01 / R-14): CSR rights in the user CRUD matrix, matching
-- the rule the portal applies:
--   - organisation logins (data scope ORGANISATION: Nodal and Senior Officers) enter their own
--     organisation's CSR data: their create / update rights are left as they are
--   - Ministry-side roles (data scope MINISTRY / MASTER) only view: create / update off
--   - nobody gets delete (CSR has no delete feature)
-- Read rights are never changed, so nobody gains or loses CSR access through this script.
-- Only existing CSR rows are changed; no rows are added. Safe to run more than once.
-- Set @updatedBy to the user_id of the admin running the script (recorded on changed rows).

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @updatedBy INT = CAST(SESSION_CONTEXT(N'csr_qc_updated_by') AS INT);   -- set at the top of this file
DECLARE @csr INT = (SELECT module_id FROM tbl_modules WHERE module_code = 'CSR_PROJECTS');
IF @csr IS NULL THROW 50001, 'Module CSR_PROJECTS not found in tbl_modules.', 1;

-- Ministry-side roles: no create / update / delete
UPDATE c
SET can_create = 0, can_update = 0, can_delete = 0, updated_at = SYSUTCDATETIME(), updated_by = @updatedBy
FROM tbl_rbac_user_module_crud c
JOIN tbl_user u ON u.user_id = c.user_id
LEFT JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
LEFT JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
WHERE c.module_id = @csr
  AND ISNULL(ds.data_scope_code, '') <> 'ORGANISATION'
  AND (c.can_create = 1 OR c.can_update = 1 OR c.can_delete = 1);
PRINT 'Ministry-side rows set to view only: ' + CAST(@@ROWCOUNT AS VARCHAR(12));

-- Organisation logins: delete off; create / update unchanged
UPDATE c
SET can_delete = 0, updated_at = SYSUTCDATETIME(), updated_by = @updatedBy
FROM tbl_rbac_user_module_crud c
JOIN tbl_user u ON u.user_id = c.user_id
JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
WHERE c.module_id = @csr
  AND ds.data_scope_code = 'ORGANISATION'
  AND c.can_delete = 1;
PRINT 'Organisation rows, delete removed: ' + CAST(@@ROWCOUNT AS VARCHAR(12));

COMMIT;

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 5;
PRINT 'Part 5 done.';
GO

-- ============================================================================================
-- Part 6 of 9: Delete log and audit columns (QC CSR-11 / CSR-36)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 5
BEGIN
    PRINT 'Part 6 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 6 of 9: Delete log and audit columns (QC CSR-11 / CSR-36)';

-- CSR Projects (QC CSR-11 / CSR-36): record who changed or removed CSR data, and when.
--   1. tbl_csr_delete_log: a copy of every CSR row the portal removes (today: an expenditure
--      year taken off a project), with who removed it and when. The code writes to it only
--      once this table exists, so the script can run before or after the deploy.
--   2. tbl_csr_image gets created_by / created_date (gallery files had no audit columns).
--   3. Project and fund created / updated dates keep the time too (DATE -> DATETIME2).
--      Existing dates stay as they are (midnight of that day).
--   New times are saved in UTC (SYSUTCDATETIME), which the portal shows in local time (QC R-09).
--   4. Date defaults on the CSR tables are set to UTC as well (QC R-24).
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

-- 4. Date defaults on the CSR tables use UTC, like the code (QC R-24). A default still set to the
-- server's local time (getdate / sysdatetime) is replaced; the column and its data are unchanged.
DECLARE @dt SYSNAME, @dcol SYSNAME, @dcon SYSNAME, @dsql NVARCHAR(MAX), @dn INT = 0;
DECLARE defaults CURSOR LOCAL FAST_FORWARD FOR
    SELECT OBJECT_NAME(d.parent_object_id), c.name, d.name
    FROM sys.default_constraints d
    JOIN sys.columns c ON c.object_id = d.parent_object_id AND c.column_id = d.parent_column_id
    WHERE OBJECT_NAME(d.parent_object_id) LIKE 'tbl[_]csr[_]%'
      AND REPLACE(REPLACE(LOWER(d.definition), '(', ''), ')', '') IN ('getdate', 'sysdatetime', 'current_timestamp');
OPEN defaults;
FETCH NEXT FROM defaults INTO @dt, @dcol, @dcon;
WHILE @@FETCH_STATUS = 0
BEGIN
    SET @dsql = N'ALTER TABLE dbo.' + QUOTENAME(@dt) + N' DROP CONSTRAINT ' + QUOTENAME(@dcon) + N'; '
              + N'ALTER TABLE dbo.' + QUOTENAME(@dt) + N' ADD CONSTRAINT ' + QUOTENAME(@dcon) + N' DEFAULT SYSUTCDATETIME() FOR ' + QUOTENAME(@dcol) + N';';
    EXEC (@dsql);
    SET @dn += 1;
    FETCH NEXT FROM defaults INTO @dt, @dcol, @dcon;
END
CLOSE defaults; DEALLOCATE defaults;
PRINT 'CSR date defaults set to UTC: ' + CAST(@dn AS VARCHAR(12));

COMMIT;

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 6;
PRINT 'Part 6 done.';
GO

-- ============================================================================================
-- Part 7 of 9: List indexes (QC CSR-25)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 6
BEGIN
    PRINT 'Part 7 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 7 of 9: List indexes (QC CSR-25)';

-- CSR Projects (QC CSR-25): indexes for the project list, fund list and dashboard queries,
-- which filter projects by organisation and year and total expenditure by project and year.
-- tbl_csr_fund (organisation_id, financial_year) is already indexed by 01 (unique).
-- Safe to run more than once.

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_projects_organisation_year'
               AND object_id = OBJECT_ID('dbo.tbl_csr_projects'))
    CREATE INDEX IX_tbl_csr_projects_organisation_year
        ON dbo.tbl_csr_projects (organisation_id, financial_year);

-- Not unique: old data can hold two rows for one project and year (they are merged the next
-- time that project is saved)
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_expenditure_project_year'
               AND object_id = OBJECT_ID('dbo.tbl_csr_expenditure'))
    CREATE INDEX IX_tbl_csr_expenditure_project_year
        ON dbo.tbl_csr_expenditure (csr_project_id, [year])
        INCLUDE (csr_expenditure_cost);

PRINT 'CSR list indexes ready';

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 7;
PRINT 'Part 7 done.';
GO

-- ============================================================================================
-- Part 8 of 9: Switch CSR on for organisations with CSR data (QC CSR-33)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 7
BEGIN
    PRINT 'Part 8 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 8 of 9: Switch CSR on for organisations with CSR data (QC CSR-33)';

-- CSR Projects (QC CSR-33): switch the CSR module on for every organisation that reports CSR
-- (has rows in tbl_csr_projects or tbl_csr_fund). Without it, an organisation's users can't open
-- CSR at all, so data entry stops after go-live.
-- Only switches access ON; organisations without CSR data are left as they are (an admin can
-- still enable them in Admin > Organisation Module Permission). The change is written to
-- tbl_rbac_org_module_permission_log, like a change made in that screen.
-- Safe to run more than once. Set @updatedBy to the user_id of the admin running it.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @updatedBy INT = CAST(SESSION_CONTEXT(N'csr_qc_updated_by') AS INT);   -- set at the top of this file
DECLARE @csr INT = (SELECT module_id FROM tbl_modules WHERE module_code = 'CSR_PROJECTS');
IF @csr IS NULL THROW 50001, 'Module CSR_PROJECTS not found in tbl_modules.', 1;

DROP TABLE IF EXISTS #reporting;
SELECT DISTINCT o.organisation_id, o.organisation_name INTO #reporting
FROM mmt_organisation o
WHERE EXISTS (SELECT 1 FROM tbl_csr_projects p WHERE p.organisation_id = o.organisation_id)
   OR EXISTS (SELECT 1 FROM tbl_csr_fund f WHERE f.organisation_id = o.organisation_id);

DROP TABLE IF EXISTS #toEnable;
SELECT r.organisation_id, r.organisation_name INTO #toEnable
FROM #reporting r
WHERE NOT EXISTS (SELECT 1 FROM tbl_rbac_org_module_permission p
                  WHERE p.organisation_id = r.organisation_id AND p.module_id = @csr AND p.is_allowed = 1);

UPDATE p SET is_allowed = 1, updated_at = SYSUTCDATETIME(), updated_by = @updatedBy
FROM tbl_rbac_org_module_permission p JOIN #toEnable t ON t.organisation_id = p.organisation_id
WHERE p.module_id = @csr;

INSERT INTO tbl_rbac_org_module_permission (organisation_id, module_id, is_allowed, created_at, updated_at, created_by, updated_by)
SELECT t.organisation_id, @csr, 1, SYSUTCDATETIME(), SYSUTCDATETIME(), @updatedBy, @updatedBy
FROM #toEnable t
WHERE NOT EXISTS (SELECT 1 FROM tbl_rbac_org_module_permission p WHERE p.organisation_id = t.organisation_id AND p.module_id = @csr);

DECLARE @n INT = (SELECT COUNT(*) FROM #toEnable);
IF @n > 0
    INSERT INTO tbl_rbac_org_module_permission_log (created_by, target_summary, payload_json, created_date)
    VALUES (@updatedBy,
            'CSR_PROJECTS enabled for ' + CAST(@n AS VARCHAR(12)) + ' reporting organisation(s) (sql/csr/05)',
            (SELECT organisation_id, organisation_name, @csr AS module_id, 1 AS is_allowed FROM #toEnable FOR JSON PATH),
            SYSUTCDATETIME());

DECLARE @reportingCount INT = (SELECT COUNT(*) FROM #reporting);
PRINT 'Reporting organisations: ' + CAST(@reportingCount AS VARCHAR(12))
    + ', CSR switched on now: ' + CAST(@n AS VARCHAR(12));
SELECT organisation_id, organisation_name FROM #toEnable ORDER BY organisation_name;

COMMIT;

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 8;
PRINT 'Part 8 done.';
GO

-- ============================================================================================
-- Part 9 of 9: CSR view / add / edit for organisation logins (QC R-14)
-- ============================================================================================
IF ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), -1) <> 8
BEGIN
    PRINT 'Part 9 skipped: an earlier part did not finish.';
    SET NOEXEC ON;   -- skip the remaining parts
END
GO
PRINT 'Part 9 of 9: CSR view / add / edit for organisation logins (QC R-14)';

-- CSR Projects (QC R-14): give organisation logins CSR data-entry rights in the user CRUD matrix.
-- CSR data is entered by the organisations themselves (any organisation login - Nodal or Senior
-- Officer). The screens show Add / Edit only to users with a CSR create / update row, and most
-- organisation users have no CSR row at all, so without this they could only view.
--
-- For every ACTIVE user whose role has the ORGANISATION data scope and whose organisation has
-- the CSR module switched on (run 05 first):
--   1. no CSR row yet: a row is added with view / add / edit, no delete;
--   2. a CSR row with view but without add or edit (the old script 02 of 06-Nov set organisation
--      Senior Officers to view only - QC R-21): add and edit are given back, delete stays off.
-- Rows that already have add and edit are not touched. To keep an organisation user view-only on
-- purpose, untick add / edit in Admin > User Module Permission after running this.
-- Each change is written to tbl_rbac_user_module_crud_log, like a change made in
-- Admin > User Module Permission. Safe to run more than once.
-- Set @updatedBy to the user_id of the admin running the script.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @updatedBy INT = CAST(SESSION_CONTEXT(N'csr_qc_updated_by') AS INT);   -- set at the top of this file
DECLARE @csr INT = (SELECT module_id FROM tbl_modules WHERE module_code = 'CSR_PROJECTS');
IF @csr IS NULL THROW 50001, 'Module CSR_PROJECTS not found in tbl_modules.', 1;

DROP TABLE IF EXISTS #grant;
SELECT u.user_id, u.organisation_id INTO #grant
FROM tbl_user u
JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id AND ds.data_scope_code = 'ORGANISATION'
JOIN tbl_rbac_org_module_permission op ON op.organisation_id = u.organisation_id AND op.module_id = @csr AND op.is_allowed = 1
WHERE u.status = 1
  AND NOT EXISTS (SELECT 1 FROM tbl_rbac_user_module_crud c WHERE c.user_id = u.user_id AND c.module_id = @csr);

INSERT INTO tbl_rbac_user_module_crud (user_id, module_id, can_create, can_read, can_update, can_delete,
                                       created_at, updated_at, created_by, updated_by)
SELECT g.user_id, @csr, 1, 1, 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME(), @updatedBy, @updatedBy
FROM #grant g;

DECLARE @n INT = @@ROWCOUNT;
IF @n > 0
    INSERT INTO tbl_rbac_user_module_crud_log (created_by, target_summary, payload_json, created_date)
    VALUES (@updatedBy,
            'CSR_PROJECTS view / add / edit for ' + CAST(@n AS VARCHAR(12)) + ' organisation user(s) without a CSR row (sql/csr/06)',
            (SELECT user_id, organisation_id, @csr AS module_id, 1 AS can_create, 1 AS can_read, 1 AS can_update, 0 AS can_delete
             FROM #grant FOR JSON PATH),
            SYSUTCDATETIME());

PRINT 'Organisation users given CSR view / add / edit: ' + CAST(@n AS VARCHAR(12));

-- 2. Organisation users who can view CSR but not add / edit (QC R-21)
DROP TABLE IF EXISTS #restore;
SELECT c.user_id, u.organisation_id INTO #restore
FROM tbl_rbac_user_module_crud c
JOIN tbl_user u ON u.user_id = c.user_id AND u.status = 1
JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id AND ds.data_scope_code = 'ORGANISATION'
JOIN tbl_rbac_org_module_permission op ON op.organisation_id = u.organisation_id AND op.module_id = @csr AND op.is_allowed = 1
WHERE c.module_id = @csr AND c.can_read = 1 AND (ISNULL(c.can_create, 0) = 0 OR ISNULL(c.can_update, 0) = 0);

UPDATE c SET can_create = 1, can_update = 1, can_delete = 0, updated_at = SYSUTCDATETIME(), updated_by = @updatedBy
FROM tbl_rbac_user_module_crud c JOIN #restore r ON r.user_id = c.user_id
WHERE c.module_id = @csr;

DECLARE @restored INT = @@ROWCOUNT;
IF @restored > 0
    INSERT INTO tbl_rbac_user_module_crud_log (created_by, target_summary, payload_json, created_date)
    VALUES (@updatedBy,
            'CSR_PROJECTS add / edit given back to ' + CAST(@restored AS VARCHAR(12)) + ' organisation user(s) with view only (sql/csr/06, QC R-21)',
            (SELECT user_id, organisation_id, @csr AS module_id, 1 AS can_create, 1 AS can_read, 1 AS can_update, 0 AS can_delete
             FROM #restore FOR JSON PATH),
            SYSUTCDATETIME());

PRINT 'Organisation users given back CSR add / edit: ' + CAST(@restored AS VARCHAR(12));

COMMIT;

EXEC sp_set_session_context @key = N'csr_qc_step', @value = 9;
PRINT 'Part 9 done.';
GO

-- ============================================================================================
SET NOEXEC OFF;
DECLARE @done INT = ISNULL(CAST(SESSION_CONTEXT(N'csr_qc_step') AS INT), 0);
DECLARE @failed INT = @done + 1;
DECLARE @wasSet BIT = CASE WHEN SESSION_CONTEXT(N'csr_qc_updated_by') IS NULL THEN 0 ELSE 1 END;
EXEC sp_set_session_context @key = N'csr_qc_step', @value = NULL;
EXEC sp_set_session_context @key = N'csr_qc_updated_by', @value = NULL;
IF @wasSet = 0
    PRINT 'Nothing was run: set @updatedBy at the top of the file.';
ELSE IF @done = 9
    PRINT 'All 9 parts done.';
ELSE
    RAISERROR('Stopped: parts 1 to %d are done, part %d failed (see the error above). Fix it and run the whole file again.', 16, 1, @done, @failed);
