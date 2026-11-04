-- Bills: drop the per-stage Yes/No (done) columns from tbl_bill; each stage keeps its date and
-- remark columns. A bill's current stage stays in tbl_bill.stage_id, so nothing is lost.
-- The chatbot view tbl_chatbot_bill selects these columns, so it is rebuilt without them, and
-- without soft-deleted bills. Run 03 first (it adds is_deleted).
-- Safe to run more than once. Take a backup first.

-- 1. Drop each column with its default constraint (the constraint names can differ per database)
DECLARE @col SYSNAME, @df SYSNAME, @sql NVARCHAR(400);
DECLARE cols CURSOR LOCAL FAST_FORWARD FOR
    SELECT name FROM (VALUES
        ('pre_draft_bill_prepared'), ('pre_draft_bill_approved'), ('circulated_imc'), ('imc_comments_rec'),
        ('dcn_draft_bill_prepared'), ('dcn_draft_bill_approved'), ('submited_legal_vetting'),
        ('legal_vetting_completed'), ('final_dcn_approved'), ('advance_copy'), ('approved_by_cabinet'),
        ('bill_introduced_in_parliament'), ('bill_passed'), ('bill_notified'), ('completed')
    ) AS c(name)
    WHERE COL_LENGTH('tbl_bill', name) IS NOT NULL;
OPEN cols;
FETCH NEXT FROM cols INTO @col;
WHILE @@FETCH_STATUS = 0
BEGIN
    SELECT @df = dc.name
    FROM sys.default_constraints dc
    INNER JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
    WHERE dc.parent_object_id = OBJECT_ID('tbl_bill') AND c.name = @col;
    IF @df IS NOT NULL
    BEGIN
        SET @sql = N'ALTER TABLE tbl_bill DROP CONSTRAINT ' + QUOTENAME(@df);
        EXEC sp_executesql @sql;
    END
    SET @sql = N'ALTER TABLE tbl_bill DROP COLUMN ' + QUOTENAME(@col);
    EXEC sp_executesql @sql;
    PRINT 'Dropped tbl_bill.' + @col;
    SET @df = NULL;
    FETCH NEXT FROM cols INTO @col;
END
CLOSE cols;
DEALLOCATE cols;
GO

-- 2. The chatbot view, as before but without the Yes/No columns
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
    ON tb.wing = mw.wing_id
INNER JOIN [dbo].[mmt_bill_stage] AS mbs
    ON tb.stage_id = mbs.bill_stage_id
-- Soft-deleted bills (03) stay out of SagarBot's answers
WHERE ISNULL(tb.is_deleted, 0) = 0;
GO
