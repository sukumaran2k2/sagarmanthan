/*
    KPI Major Ports · Port Performance: Dwell Time uploaded from Excel
    -------------------------------------------------------------------
    Run once on each database (local, test, live) after 02_port_performance.sql.
    Safe to run again: every table and index is created only if it is missing.
    No existing data is changed.

    Why:
      From now on the Ministry uploads one Excel sheet per month with the dwell time of every
      major port (monthly and YTD import / export / overall, plus the SMPA Overall and the
      All Major Ports rows). Organisations see their port's uploaded values, view only, in the
      Dwell Time step of the Port Performance form.
      The earlier form values (import / export dwell time in tbl_kpi_time_performance) are not
      touched; reports and dashboards keep reading them as before.

      1. tbl_kpi_time_performance_dwell_upload  one row per uploaded file (upload history)
      2. tbl_kpi_time_performance_dwell         the values of the latest upload
                                                 per organisation / SMPA Overall / All Major Ports
                                                 and month

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database
    and execute it, or run it with sqlcmd -I -d <database> -i 03_dwell_time_upload.sql
    (-I turns QUOTED_IDENTIFIER on, which the filtered indexes need).
*/

-- 1. Upload history ------------------------------------------------------------------------

IF OBJECT_ID('dbo.tbl_kpi_time_performance_dwell_upload', 'U') IS NULL
CREATE TABLE dbo.tbl_kpi_time_performance_dwell_upload (
    upload_id        INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_kpi_time_performance_dwell_upload PRIMARY KEY,
    fiscal_year      NVARCHAR(20)  NOT NULL,
    month            INT           NOT NULL CONSTRAINT CK_kpi_time_performance_dwell_upload_month CHECK (month BETWEEN 1 AND 12),
    file_name        NVARCHAR(255) NOT NULL,   -- name of the file on the user's computer
    stored_file_name NVARCHAR(255) NOT NULL,   -- copy kept under fileuploads/KPI/DwellTime
    row_count        INT           NOT NULL,
    uploaded_by      INT           NOT NULL,
    uploaded_date    DATETIME      NOT NULL CONSTRAINT DF_kpi_time_performance_dwell_upload_date DEFAULT GETDATE()
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_kpi_time_performance_dwell_upload_period'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_time_performance_dwell_upload'))
  CREATE NONCLUSTERED INDEX IX_kpi_time_performance_dwell_upload_period
    ON dbo.tbl_kpi_time_performance_dwell_upload (fiscal_year, month, uploaded_date DESC);
GO

-- 2. Uploaded values -----------------------------------------------------------------------
-- organisation_id is NULL only for the two total rows of the sheet: All Major Ports (Overall)
-- (is_overall = 1) and SMPA Overall (is_total_smpa = 1), as in tbl_kpi_time_performance_target.
-- A NULL value means the sheet had "-" (no data); it is not the same as 0.

IF OBJECT_ID('dbo.tbl_kpi_time_performance_dwell', 'U') IS NULL
CREATE TABLE dbo.tbl_kpi_time_performance_dwell (
    id              INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_kpi_time_performance_dwell PRIMARY KEY,
    upload_id       INT           NOT NULL CONSTRAINT FK_kpi_time_performance_dwell_upload
                        REFERENCES dbo.tbl_kpi_time_performance_dwell_upload (upload_id),
    fiscal_year     NVARCHAR(20)  NOT NULL,
    month           INT           NOT NULL CONSTRAINT CK_kpi_time_performance_dwell_month CHECK (month BETWEEN 1 AND 12),
    organisation_id INT           NULL CONSTRAINT FK_kpi_time_performance_dwell_org
                        REFERENCES dbo.mmt_organisation (organisation_id),
    is_overall      BIT           NOT NULL CONSTRAINT DF_kpi_time_performance_dwell_overall DEFAULT 0,
    is_total_smpa   BIT           NOT NULL CONSTRAINT DF_kpi_time_performance_dwell_total_smpa DEFAULT 0,
    monthly_import  DECIMAL(12,2) NULL,
    monthly_export  DECIMAL(12,2) NULL,
    monthly_overall DECIMAL(12,2) NULL,
    ytd_import      DECIMAL(12,2) NULL,
    ytd_export      DECIMAL(12,2) NULL,
    ytd_overall     DECIMAL(12,2) NULL,
    created_by      INT           NOT NULL,
    created_date    DATETIME      NOT NULL CONSTRAINT DF_kpi_time_performance_dwell_created DEFAULT GETDATE(),
    updated_by      INT           NULL,
    updated_date    DATETIME      NULL,
    CONSTRAINT CK_kpi_time_performance_dwell_values CHECK (
        ISNULL(monthly_import, 0) >= 0 AND ISNULL(monthly_export, 0) >= 0 AND ISNULL(monthly_overall, 0) >= 0
        AND ISNULL(ytd_import, 0) >= 0 AND ISNULL(ytd_export, 0) >= 0 AND ISNULL(ytd_overall, 0) >= 0
    )
);
GO

-- Databases where the table was created before the SMPA Overall row was kept
IF COL_LENGTH('dbo.tbl_kpi_time_performance_dwell', 'is_total_smpa') IS NULL
  ALTER TABLE dbo.tbl_kpi_time_performance_dwell
    ADD is_total_smpa BIT NOT NULL CONSTRAINT DF_kpi_time_performance_dwell_total_smpa DEFAULT 0;
GO

-- Each row is one organisation, or exactly one of the two total rows
IF OBJECT_ID('dbo.CK_kpi_time_performance_dwell_row', 'C') IS NOT NULL
  ALTER TABLE dbo.tbl_kpi_time_performance_dwell DROP CONSTRAINT CK_kpi_time_performance_dwell_row;
GO
ALTER TABLE dbo.tbl_kpi_time_performance_dwell
  ADD CONSTRAINT CK_kpi_time_performance_dwell_row CHECK (
    (organisation_id IS NOT NULL AND is_overall = 0 AND is_total_smpa = 0)
    OR (organisation_id IS NULL AND is_overall = 1 AND is_total_smpa = 0)
    OR (organisation_id IS NULL AND is_overall = 0 AND is_total_smpa = 1)
  );
GO

-- One row per organisation and month ...
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_kpi_time_performance_dwell_org_fy_month'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_time_performance_dwell'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_kpi_time_performance_dwell_org_fy_month
    ON dbo.tbl_kpi_time_performance_dwell (organisation_id, fiscal_year, month)
    INCLUDE (monthly_import, monthly_export)
    WHERE organisation_id IS NOT NULL;
GO

-- ... and one All Major Ports row per month
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_kpi_time_performance_dwell_overall_fy_month'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_time_performance_dwell'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_kpi_time_performance_dwell_overall_fy_month
    ON dbo.tbl_kpi_time_performance_dwell (fiscal_year, month)
    WHERE is_overall = 1;
GO

-- ... and one SMPA Overall row per month
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_kpi_time_performance_dwell_total_smpa_fy_month'
               AND object_id = OBJECT_ID('dbo.tbl_kpi_time_performance_dwell'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_kpi_time_performance_dwell_total_smpa_fy_month
    ON dbo.tbl_kpi_time_performance_dwell (fiscal_year, month)
    WHERE is_total_smpa = 1;
GO
