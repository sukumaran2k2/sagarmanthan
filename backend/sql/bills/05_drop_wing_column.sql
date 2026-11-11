-- Bills: tbl_bill keeps only the division; a bill's wing is its division's wing (mmt_division).
-- Drops tbl_bill.wing and rebuilds the chatbot view tbl_chatbot_bill to take the wing from the
-- division. Run after 04, and deploy the new code first (it no longer reads or writes wing).
-- Check first: every bill's wing should match its division's wing. This lists any that don't:
--   SELECT b.bill_id, b.wing, d.wing_id FROM tbl_bill b LEFT JOIN mmt_division d
--     ON d.division_id = b.division WHERE ISNULL(b.wing, -1) <> ISNULL(d.wing_id, -1);
-- Safe to run more than once. Take a backup first.

-- 1. Drop anything that depends on the column, then the column
IF COL_LENGTH('tbl_bill', 'wing') IS NOT NULL
BEGIN
    DECLARE @sql NVARCHAR(MAX) = N'';
    SELECT @sql += N'ALTER TABLE tbl_bill DROP CONSTRAINT ' + QUOTENAME(dc.name) + N'; '
    FROM sys.default_constraints dc
    JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('tbl_bill') AND c.name = 'wing';
    SELECT @sql += N'ALTER TABLE tbl_bill DROP CONSTRAINT ' + QUOTENAME(fk.name) + N'; '
    FROM sys.foreign_key_columns fkc
    JOIN sys.foreign_keys fk ON fk.object_id = fkc.constraint_object_id
    JOIN sys.columns c ON c.object_id = fkc.parent_object_id AND c.column_id = fkc.parent_column_id
    WHERE fkc.parent_object_id = OBJECT_ID('tbl_bill') AND c.name = 'wing';
    SELECT @sql += N'DROP INDEX ' + QUOTENAME(i.name) + N' ON tbl_bill; '
    FROM sys.indexes i
    JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
    JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID('tbl_bill') AND c.name = 'wing' AND i.is_primary_key = 0;
    EXEC sp_executesql @sql;
    EXEC (N'ALTER TABLE tbl_bill DROP COLUMN wing');
    PRINT 'Dropped tbl_bill.wing';
END
GO

-- 2. The chatbot view, with the wing taken from the division (as in 04)
IF OBJECT_ID('dbo.tbl_chatbot_bill', 'V') IS NOT NULL
    DROP VIEW dbo.tbl_chatbot_bill;
GO
CREATE VIEW [dbo].[tbl_chatbot_bill] AS
SELECT
    tb.bill_id,
    mbs.bill_stage_name,

    tb.subject,

    mw.wing_name,
    mw.wing_code,
    mw.status AS wing_status,

    md.division_name,
    md.division_code,

    tb.pre_draft_bill_prepared_date,
    tb.pre_draft_bill_approved_date,
    tb.circulated_imc_date,
    tb.imc_comments_rec_date,
    tb.dcn_draft_bill_prepared_date,
    tb.dcn_draft_bill_approved_date,
    tb.submited_legal_vetting_date,
    tb.legal_vetting_completed_date,
    tb.final_dcn_approved_date,
    tb.advance_copy_date,
    tb.approved_by_cabinet_date,
    tb.bill_introduced_in_parliament_date,
    tb.bill_passed_date,
    tb.bill_notified_date,
    tb.completed_date,

    tb.remarks,
    tb.created_date,
    tb.updated_date
FROM [dbo].[tbl_bill] AS tb
INNER JOIN [dbo].[mmt_division] AS md
    ON tb.division = md.division_id
INNER JOIN [dbo].[mmt_wings] AS mw
    ON md.wing_id = mw.wing_id
INNER JOIN [dbo].[mmt_bill_stage] AS mbs
    ON tb.stage_id = mbs.bill_stage_id
-- Soft-deleted bills (03) stay out of SagarBot's answers
WHERE ISNULL(tb.is_deleted, 0) = 0;
GO
