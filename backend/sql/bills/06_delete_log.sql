-- Bills: tbl_bill_delete_log, one row per deleted bill: who deleted it, when, and the bill as it
-- was just before (every tbl_bill column, as JSON). The bill itself stays in tbl_bill, marked
-- is_deleted (02/03). The code writes the log only once this table exists, so it can run before
-- or after the deploy. Safe to run more than once.

SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.tbl_bill_delete_log', 'U') IS NULL
  CREATE TABLE dbo.tbl_bill_delete_log (
    log_id       INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_bill_delete_log PRIMARY KEY,
    bill_id      INT           NOT NULL,
    subject      NVARCHAR(256) NULL,
    bill_json    NVARCHAR(MAX) NOT NULL CONSTRAINT CK_bill_delete_log_json CHECK (ISJSON(bill_json) = 1),
    deleted_by   INT           NOT NULL,
    deleted_date DATETIME      NOT NULL CONSTRAINT DF_bill_delete_log_deleted DEFAULT GETDATE()
  );
GO

-- Deletions of one bill, newest first
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_bill_delete_log_bill'
               AND object_id = OBJECT_ID('dbo.tbl_bill_delete_log'))
  CREATE NONCLUSTERED INDEX IX_bill_delete_log_bill
    ON dbo.tbl_bill_delete_log (bill_id, deleted_date DESC);
GO
