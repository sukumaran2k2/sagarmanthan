-- Bills / Pre-Constitutions Act: per-stage remark columns on tbl_bill.
--
-- Replaces the earlier "_2_create_tbl_bill_change.sql". 3.0 now keeps bills in 2.0's existing
-- tbl_bill, so no new table and no copied rows are needed: this only adds the 15 remark
-- columns 3.0's form has (one per stage), each only if it isn't there yet.
-- Run after "_1_widen_date_columns.sql". Safe to run more than once. No data is changed.

IF COL_LENGTH(N'dbo.tbl_bill', N'draft_bill_prepared_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD draft_bill_prepared_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'dcn_draft_bill_approved_minister_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD dcn_draft_bill_approved_minister_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'circulated_imc_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD circulated_imc_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'imc_comments_rec_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD imc_comments_rec_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'dcn_draft_bill_prepared_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD dcn_draft_bill_prepared_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'dcn_draft_bill_approved_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD dcn_draft_bill_approved_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'submitted_legal_vetting_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD submitted_legal_vetting_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'legal_vetting_completed_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD legal_vetting_completed_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'final_dcn_draft_approved_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD final_dcn_draft_approved_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'advance_copy_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD advance_copy_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'approved_by_cabinet_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD approved_by_cabinet_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'bill_introduced_in_parliament_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD bill_introduced_in_parliament_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'bill_passed_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD bill_passed_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'bill_notified_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD bill_notified_remarks NVARCHAR(250) NULL;
IF COL_LENGTH(N'dbo.tbl_bill', N'completed_remarks') IS NULL ALTER TABLE dbo.tbl_bill ADD completed_remarks NVARCHAR(250) NULL;
GO

-- If the earlier script was run, tbl_bill_change exists but 3.0 no longer uses it. This only
-- reports bills that are in tbl_bill_change and not in tbl_bill (entered there by 3.0), so
-- they can be re-entered before tbl_bill_change is dropped. Nothing is changed.
IF OBJECT_ID(N'dbo.tbl_bill_change') IS NOT NULL
BEGIN
  SELECT c.bill_id, c.subject, c.created_date
  FROM dbo.tbl_bill_change c
  WHERE NOT EXISTS (SELECT 1 FROM dbo.tbl_bill b WHERE b.subject = c.subject);
  PRINT N'tbl_bill_change is no longer used. Any bills listed above exist only there; once they are re-entered (or if none are listed), it can be dropped with: DROP TABLE dbo.tbl_bill_change;';
END
GO
