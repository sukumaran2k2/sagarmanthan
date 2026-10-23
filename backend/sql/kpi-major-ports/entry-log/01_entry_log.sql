/*
    KPI Major Ports · Entry log (add / update / delete history)
    -----------------------------------------------------------
    Run once on each database (local, test, live) BEFORE deploying the backend that writes
    to it: every save and delete in the five KPI Major Ports sections writes its log row in
    the same transaction, so without this table those saves fail. Safe to run again: the
    table and indexes are created only if they are missing. No existing data is changed.

    Sections: TRAFFIC, PORT_PERFORMANCE, FINANCIAL_PARAMETERS, CRUISE_PASSENGER_TRAFFIC,
              RENEWABLE_ENERGY
    record_type: ACTUAL (monthly values entered by the port) or TARGET (set by the Ministry)
    action: CREATE, UPDATE or DELETE

    changes_json holds only the values that changed, as { "column": { "from": x, "to": y } }.
    CREATE has "from": null everywhere and DELETE has "to": null, so a delete keeps a full
    copy of the removed values. A save that changes nothing writes no row.

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database
    and execute it, or run it with sqlcmd -d <database> -i 01_entry_log.sql
*/

SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.tbl_kpi_major_ports_entry_log', 'U') IS NULL
  CREATE TABLE dbo.tbl_kpi_major_ports_entry_log (
    log_id          INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_kpi_major_ports_entry_log PRIMARY KEY,
    section         NVARCHAR(40)  NOT NULL,
    record_type     NVARCHAR(10)  NOT NULL,
    action          NVARCHAR(10)  NOT NULL,
    organisation_id INT           NULL,      -- NULL for Port Performance Overall / Total SMPA targets
    fiscal_year     NVARCHAR(20)  NULL,
    month           INT           NULL,      -- NULL for targets
    record_id       INT           NULL,      -- id of the changed row, when the table has one
    summary         NVARCHAR(500) NULL,
    changes_json    NVARCHAR(MAX) NOT NULL CONSTRAINT CK_kpi_major_ports_entry_log_json CHECK (ISJSON(changes_json) = 1),
    created_by      INT           NOT NULL,
    created_date    DATETIME      NOT NULL CONSTRAINT DF_kpi_major_ports_entry_log_created DEFAULT GETDATE(),
    CONSTRAINT CK_kpi_major_ports_entry_log_action CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
    CONSTRAINT CK_kpi_major_ports_entry_log_type CHECK (record_type IN ('ACTUAL', 'TARGET'))
  );
GO

-- History of one organisation's period: section + organisation + year + month
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_kpi_major_ports_entry_log_period'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_major_ports_entry_log'))
  CREATE NONCLUSTERED INDEX IX_kpi_major_ports_entry_log_period
    ON dbo.tbl_kpi_major_ports_entry_log (section, organisation_id, fiscal_year, month, created_date DESC);
GO

-- What one user changed, newest first
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_kpi_major_ports_entry_log_user'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_major_ports_entry_log'))
  CREATE NONCLUSTERED INDEX IX_kpi_major_ports_entry_log_user
    ON dbo.tbl_kpi_major_ports_entry_log (created_by, created_date DESC);
GO
