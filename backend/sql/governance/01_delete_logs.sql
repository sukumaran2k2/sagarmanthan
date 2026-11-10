-- Governance (QC AP-02 / EO-02): keep a copy of what the portal deletes, with who deleted it and
-- when, in the database.
--   tbl_audit_para_delete_log  - a deleted Audit Para (until now: a text file on the app server)
--   tbl_eoffice_delete_log     - a deleted E-Office sheet: its period, file name and every row
--                                (until now: not recorded at all)
-- The code writes to these tables in the same transaction as the delete. Until a table exists the
-- copy goes to a text file under ./delete_log on the app server, so the script can run before or
-- after the deploy. Safe to run more than once.

SET XACT_ABORT ON;
SET NOCOUNT ON;

IF OBJECT_ID('dbo.tbl_audit_para_delete_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_audit_para_delete_log (
        log_id          INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_tbl_audit_para_delete_log PRIMARY KEY,
        audit_para_id   INT             NOT NULL,
        para_number     NVARCHAR(256)   NULL,
        row_json        NVARCHAR(MAX)   NOT NULL,   -- the para as it was
        deleted_by      INT             NULL,       -- tbl_user.user_id of the signed-in user
        deleted_date    DATETIME2(0)    NOT NULL CONSTRAINT DF_tbl_audit_para_delete_log_date DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_tbl_audit_para_delete_log_para ON dbo.tbl_audit_para_delete_log (audit_para_id);
END
PRINT 'tbl_audit_para_delete_log ready';

IF OBJECT_ID('dbo.tbl_eoffice_delete_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_eoffice_delete_log (
        log_id          INT IDENTITY(1, 1) NOT NULL CONSTRAINT PK_tbl_eoffice_delete_log PRIMARY KEY,
        sheet           VARCHAR(30)     NOT NULL,   -- filePendancy / receiptPendency / fileDisposal
        file_id         INT             NOT NULL,
        file_name       NVARCHAR(500)   NULL,
        period_year     INT             NULL,
        period_month    VARCHAR(20)     NULL,
        period_week     INT             NULL,
        row_count       INT             NOT NULL,
        rows_json       NVARCHAR(MAX)   NULL,       -- the sheet's rows as they were
        deleted_by      INT             NULL,
        deleted_date    DATETIME2(0)    NOT NULL CONSTRAINT DF_tbl_eoffice_delete_log_date DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_tbl_eoffice_delete_log_file ON dbo.tbl_eoffice_delete_log (sheet, file_id);
END
PRINT 'tbl_eoffice_delete_log ready';
