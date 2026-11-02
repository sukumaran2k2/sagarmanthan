-- Bills: soft delete, and master name fixes (QC report findings 17/28 and 23).
-- Safe to run more than once.

-- 1. Soft delete: a deleted bill is kept and marked, with who deleted it and when
IF COL_LENGTH('tbl_bill', 'is_deleted') IS NULL
    ALTER TABLE tbl_bill ADD is_deleted BIT NOT NULL CONSTRAINT DF_tbl_bill_is_deleted DEFAULT 0;
IF COL_LENGTH('tbl_bill', 'deleted_by') IS NULL ALTER TABLE tbl_bill ADD deleted_by INT NULL;
IF COL_LENGTH('tbl_bill', 'deleted_date') IS NULL ALTER TABLE tbl_bill ADD deleted_date DATETIME NULL;
GO

-- 2. Stages 2 and 6 had the same name; stage 2 is the pre-DCN approval (column pre_draft_bill_approved)
UPDATE mmt_bill_stage
SET bill_stage_name = 'Pre-DCN and Draft Bill Approved by Minister'
WHERE bill_stage_id = 2 AND bill_stage_name = 'DCN and Draft Bill Approved by Minister';

-- 3. Trailing / leading spaces in wing and division names ('Sagarmala ', 'Sagarmala -II ', ...).
-- DATALENGTH is compared because = ignores trailing spaces in SQL Server.
UPDATE mmt_wings
SET wing_name = LTRIM(RTRIM(wing_name))
WHERE DATALENGTH(wing_name) <> DATALENGTH(LTRIM(RTRIM(wing_name)));

UPDATE mmt_division
SET division_name = LTRIM(RTRIM(division_name))
WHERE DATALENGTH(division_name) <> DATALENGTH(LTRIM(RTRIM(division_name)));
