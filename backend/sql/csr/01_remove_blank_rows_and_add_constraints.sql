-- CSR Projects (QC CSR-15): remove the blank project rows and the expenditure rows whose project
-- no longer exists, then add database rules so neither can happen again.
--
-- Where the blank rows came from: 2.0's POST /add-csr-projects had no login check and saved any
-- request body, so empty requests sent to the API (not through the form, which validates)
-- created rows with only created_date filled in. 3.0 needs a login, CSR access and a valid body.
--
-- Removed rows are copied to tbl_csr_cleanup_backup first, so they can be looked at later.
-- Safe to run more than once. Take a backup first.
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
        removed_date DATETIME NOT NULL DEFAULT GETDATE()
    );

-- 1. Blank projects: no organisation, no name and no creator (13 rows on the 6 Nov 2026 copy)
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

-- 3. Required project fields (the form and the API already require them)
ALTER TABLE tbl_csr_projects ALTER COLUMN organisation_id INT NOT NULL;
ALTER TABLE tbl_csr_projects ALTER COLUMN project_name VARCHAR(255) NOT NULL;
ALTER TABLE tbl_csr_projects ALTER COLUMN project_value DECIMAL(12,2) NOT NULL;
ALTER TABLE tbl_csr_projects ALTER COLUMN project_status VARCHAR(50) NOT NULL;
-- csr_focus has an index, which has to be dropped while the column changes
IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_tbl_csr_projects_csr_focus' AND object_id = OBJECT_ID('dbo.tbl_csr_projects'))
    DROP INDEX IX_tbl_csr_projects_csr_focus ON tbl_csr_projects;
ALTER TABLE tbl_csr_projects ALTER COLUMN csr_focus INT NOT NULL;
CREATE INDEX IX_tbl_csr_projects_csr_focus ON tbl_csr_projects (csr_focus);
ALTER TABLE tbl_csr_expenditure ALTER COLUMN csr_project_id INT NOT NULL;
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
