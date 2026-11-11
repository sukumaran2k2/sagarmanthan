/*
    GeM Procurement · change log (same idea as dbo.tbl_capex_monthly_log)
    ---------------------------------------------------------------------
    Run once on each database (local, test, live) BEFORE deploying the backend that writes
    to it: every GeM target add / update / delete and every monthly save writes its log row
    in the same transaction, so without this table those saves fail. Safe to run again: the
    table and indexes are created only if they are missing. No existing data is changed.

    category    : goods, service or works
    record_type : TARGET (planned procurement) or ACTUAL (monthly procurement)
    action      : CREATE, UPDATE, DELETE (targets) or SAVE (monthly data, as in Capex)
    gem_id      : goods_gem_id / service_gem_id / works_gem_id of the record

    payload_json holds full copies of the row before and after the change:
      { "previous": { ...row } | null, "new": { ...row } | null }
    CREATE has previous = null. DELETE has new = null and keeps the deleted target together
    with its monthly row: { "previous": { "target": {...}, "monthly": {...} | null }, "new": null }.

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database
    and execute it, or run it with sqlcmd -d <database> -i 01_tbl_gem_procurement_log.sql
*/

SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.tbl_gem_procurement_log', 'U') IS NULL
  CREATE TABLE dbo.tbl_gem_procurement_log (
    log_id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_gem_procurement_log PRIMARY KEY,
    category        NVARCHAR(10)  NOT NULL,
    record_type     NVARCHAR(10)  NOT NULL,
    action          NVARCHAR(10)  NOT NULL,
    gem_id          INT           NULL,
    organisation_id INT           NULL,
    financial_year  NVARCHAR(100) NULL,
    target_summary  NVARCHAR(500) NULL,
    payload_json    NVARCHAR(MAX) NOT NULL CONSTRAINT CK_gem_procurement_log_json CHECK (ISJSON(payload_json) = 1),
    created_by      INT           NOT NULL,
    created_date    DATETIME      NOT NULL CONSTRAINT DF_gem_procurement_log_created DEFAULT GETDATE(),
    CONSTRAINT CK_gem_procurement_log_category CHECK (category IN ('goods', 'service', 'works')),
    CONSTRAINT CK_gem_procurement_log_type CHECK (record_type IN ('TARGET', 'ACTUAL')),
    CONSTRAINT CK_gem_procurement_log_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'SAVE'))
  );
GO

-- History of one record
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_gem_procurement_log_record'
    AND object_id = OBJECT_ID(N'dbo.tbl_gem_procurement_log')
)
  CREATE NONCLUSTERED INDEX IX_gem_procurement_log_record
    ON dbo.tbl_gem_procurement_log (category, gem_id, created_date);
GO

-- History of one organisation / financial year (also finds deleted records)
IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_gem_procurement_log_org_fy'
    AND object_id = OBJECT_ID(N'dbo.tbl_gem_procurement_log')
)
  CREATE NONCLUSTERED INDEX IX_gem_procurement_log_org_fy
    ON dbo.tbl_gem_procurement_log (organisation_id, financial_year, created_date);
GO
