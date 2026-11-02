-- Bills: add the per-stage remark columns to tbl_bill (skips any that already exist)

IF COL_LENGTH('tbl_bill', 'draft_bill_prepared_remarks') IS NULL ALTER TABLE tbl_bill ADD draft_bill_prepared_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'dcn_draft_bill_approved_minister_remarks') IS NULL ALTER TABLE tbl_bill ADD dcn_draft_bill_approved_minister_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'circulated_imc_remarks') IS NULL ALTER TABLE tbl_bill ADD circulated_imc_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'imc_comments_rec_remarks') IS NULL ALTER TABLE tbl_bill ADD imc_comments_rec_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'dcn_draft_bill_prepared_remarks') IS NULL ALTER TABLE tbl_bill ADD dcn_draft_bill_prepared_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'dcn_draft_bill_approved_remarks') IS NULL ALTER TABLE tbl_bill ADD dcn_draft_bill_approved_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'submitted_legal_vetting_remarks') IS NULL ALTER TABLE tbl_bill ADD submitted_legal_vetting_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'legal_vetting_completed_remarks') IS NULL ALTER TABLE tbl_bill ADD legal_vetting_completed_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'final_dcn_draft_approved_remarks') IS NULL ALTER TABLE tbl_bill ADD final_dcn_draft_approved_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'advance_copy_remarks') IS NULL ALTER TABLE tbl_bill ADD advance_copy_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'approved_by_cabinet_remarks') IS NULL ALTER TABLE tbl_bill ADD approved_by_cabinet_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'bill_introduced_in_parliament_remarks') IS NULL ALTER TABLE tbl_bill ADD bill_introduced_in_parliament_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'bill_passed_remarks') IS NULL ALTER TABLE tbl_bill ADD bill_passed_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'bill_notified_remarks') IS NULL ALTER TABLE tbl_bill ADD bill_notified_remarks NVARCHAR(250) NULL;
IF COL_LENGTH('tbl_bill', 'completed_remarks') IS NULL ALTER TABLE tbl_bill ADD completed_remarks NVARCHAR(250) NULL;
