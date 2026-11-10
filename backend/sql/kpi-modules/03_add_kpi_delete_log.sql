-- KPI DGLL / CSL / IMU / SCI (QC KPI-08): a copy of every KPI entry the portal deletes, with who
-- deleted it and when, kept in the database (until now it went to text files under ./delete_log on
-- the app server, which are lost on redeploy and not backed up with the data).
--
-- The new code writes to this table in the same transaction as the delete. Until the table exists
-- it keeps writing the text files, so the script can run before or after the deploy.
-- Safe to run more than once.

SET XACT_ABORT ON;
SET NOCOUNT ON;

IF OBJECT_ID('dbo.tbl_kpi_delete_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.tbl_kpi_delete_log (
        delete_log_id   INT IDENTITY(1, 1) PRIMARY KEY,
        table_name      SYSNAME         NOT NULL,   -- e.g. tbl_csl_vessels_built
        record_id       INT             NOT NULL,   -- the deleted entry's id
        row_json        NVARCHAR(MAX)   NOT NULL,   -- the entry as it was
        deleted_by      INT             NULL,       -- tbl_user.user_id of the signed-in user
        deleted_date    DATETIME2(0)    NOT NULL CONSTRAINT DF_tbl_kpi_delete_log_date DEFAULT SYSUTCDATETIME()
    );
    CREATE INDEX IX_tbl_kpi_delete_log_table ON dbo.tbl_kpi_delete_log (table_name, record_id);
END
PRINT 'tbl_kpi_delete_log ready';
