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
