/*
    Consultant Appointment · Full module schema
    -------------------------------------------
    Creates every table the Consultant Appointment module reads or writes. Run once on each
    database (local, test, live) before deploying the backend. Safe to run again: each table,
    column, index and stage row is created only if it is missing, and no existing data is
    overwritten.

    Tables
      mmt_consultant_appointment_stage  stage master, stage_id 0-8. The Data List's Stage
                                        filter compares stage_name, so the names below must
                                        read exactly as written.
      tbl_consultant_appointment        the appointment record and its eight milestone dates
      tbl_ca_candidate                  candidates appointed against an appointment
      tbl_ca_candidate_document         the appointment order PDF for each candidate

    Candidate linkage
      tbl_ca_candidate.consultant_appointment_id is the link the candidate reports join on.
      tbl_consultant_appointment.candidate_id holds the same relationship as a legacy
      comma-separated list and is still maintained for older records. The backfill at the end
      of this file fills the foreign key from that list for candidates created before the
      backend started writing it.

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database and
    execute it, or run it with sqlcmd -d <database> -i 01_schema.sql
*/

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

/* ---------- Stage master ---------- */

IF OBJECT_ID('dbo.mmt_consultant_appointment_stage', 'U') IS NULL
  CREATE TABLE dbo.mmt_consultant_appointment_stage (
    stage_id    INT IDENTITY(1,1) NOT NULL
                  CONSTRAINT PK_mmt_consultant_appointment_stage PRIMARY KEY CLUSTERED,
    stage_name  NVARCHAR(256) NULL
  );
GO

-- Stage 0 is seeded explicitly because stage_id is an IDENTITY column.
SET IDENTITY_INSERT dbo.mmt_consultant_appointment_stage ON;
GO
INSERT INTO dbo.mmt_consultant_appointment_stage (stage_id, stage_name)
SELECT v.stage_id, v.stage_name
FROM (VALUES
    (0, N'No Status'),
    (1, N'Admin Approval for engaging Consultant'),
    (2, N'Tender Published'),
    (3, N'Pre-bid Queries Responded'),
    (4, N'Bid Received'),
    (5, N'Technical Bid Finalized'),
    (6, N'Financial Bid Finalized'),
    (7, N'Work Order Issued'),
    (8, N'Contract Signed')
) AS v(stage_id, stage_name)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.mmt_consultant_appointment_stage s WHERE s.stage_id = v.stage_id
);
GO
SET IDENTITY_INSERT dbo.mmt_consultant_appointment_stage OFF;
GO

/* ---------- Appointment record ---------- */

IF OBJECT_ID('dbo.tbl_consultant_appointment', 'U') IS NULL
  CREATE TABLE dbo.tbl_consultant_appointment (
    consultant_appointment_id                  INT IDENTITY(1,1) NOT NULL
                                                 CONSTRAINT PK_tbl_consultant_appointment PRIMARY KEY CLUSTERED,
    wing                                       INT NULL,
    division                                   INT NULL,
    number_of_resources                        INT NULL,
    appointment_type                           NVARCHAR(100) NULL,
    admin_approval_for_nkg_consultant_date     DATE NULL,
    tender_published_date                      DATE NULL,
    pre_bid_queries_responded_date             DATE NULL,
    bid_received_date                          DATE NULL,
    technical_bid_finalized_date               DATE NULL,
    financial_bid_finalized_date               DATE NULL,
    work_order_issued_date                     DATE NULL,
    contract_signed_date                       DATE NULL,
    name_of_consulting_firm                    NVARCHAR(256) NULL,
    candidate_id                               NVARCHAR(MAX) NULL,
    stage_id                                   INT NULL,
    created_by                                 INT NULL,
    updated_by                                 INT NULL,
    created_date                               DATETIME NULL
                                                 CONSTRAINT DF_tbl_consultant_appointment_created_date DEFAULT (GETDATE()),
    updated_date                               DATETIME NULL,
    admin_approval_for_nkg_consultant_remarks  NVARCHAR(MAX) NULL,
    tender_published_remarks                   NVARCHAR(MAX) NULL,
    pre_bid_queries_responded_remarks          NVARCHAR(MAX) NULL,
    bid_received_remarks                       NVARCHAR(MAX) NULL,
    technical_bid_finalized_remarks            NVARCHAR(MAX) NULL,
    financial_bid_finalized_remarks            NVARCHAR(MAX) NULL,
    work_order_issued_remarks                  NVARCHAR(MAX) NULL,
    contract_signed_remarks                    NVARCHAR(MAX) NULL
  );
GO

/* ---------- Candidates ---------- */

IF OBJECT_ID('dbo.tbl_ca_candidate', 'U') IS NULL
  CREATE TABLE dbo.tbl_ca_candidate (
    candidate_id               INT IDENTITY(1,1) NOT NULL
                                 CONSTRAINT PK_tbl_ca_candidate PRIMARY KEY CLUSTERED,
    consultant_appointment_id  INT NULL,
    name                       NVARCHAR(50) NULL,
    qualification              NVARCHAR(256) NULL,
    work_experience            DECIMAL(12, 2) NULL,
    category                   NVARCHAR(50) NULL,
    date_of_appointment        DATE NULL,
    skill_set                  NVARCHAR(256) NULL,
    salary                     DECIMAL(12, 2) NULL
  );
GO

-- Older databases predate this column. The backend probes for it and falls back to the
-- legacy comma-separated list when it is absent, but the candidate reports need it.
IF COL_LENGTH('dbo.tbl_ca_candidate', 'consultant_appointment_id') IS NULL
  ALTER TABLE dbo.tbl_ca_candidate ADD consultant_appointment_id INT NULL;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_tbl_ca_candidate_consultant_appointment_id'
      AND object_id = OBJECT_ID('dbo.tbl_ca_candidate')
)
  CREATE NONCLUSTERED INDEX IX_tbl_ca_candidate_consultant_appointment_id
    ON dbo.tbl_ca_candidate (consultant_appointment_id);
GO

/* ---------- Appointment order documents ---------- */

IF OBJECT_ID('dbo.tbl_ca_candidate_document', 'U') IS NULL
  CREATE TABLE dbo.tbl_ca_candidate_document (
    id                          INT IDENTITY(1,1) NOT NULL
                                  CONSTRAINT PK_tbl_ca_candidate_document PRIMARY KEY CLUSTERED,
    candidate_id                INT NULL,
    appointment_order_document  NVARCHAR(256) NULL
  );
GO

-- One appointment order per candidate: the uploader replaces the row rather than adding one
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_tbl_ca_candidate_document_candidate_id'
      AND object_id = OBJECT_ID('dbo.tbl_ca_candidate_document')
)
  CREATE NONCLUSTERED INDEX IX_tbl_ca_candidate_document_candidate_id
    ON dbo.tbl_ca_candidate_document (candidate_id);
GO

/* ---------- Backfill: legacy candidate links ---------- */

/*
    Candidates attached while an appointment was first created used to be recorded only in
    tbl_consultant_appointment.candidate_id, which left them out of the wing-wise and
    division-wise candidate reports. This fills the foreign key from that list. It touches
    only rows that have no link yet, so it is safe to run again.
*/
UPDATE c
SET c.consultant_appointment_id = ca.consultant_appointment_id
FROM dbo.tbl_ca_candidate AS c
INNER JOIN dbo.tbl_consultant_appointment AS ca
    ON ',' + REPLACE(ISNULL(ca.candidate_id, ''), ' ', '') + ','
        LIKE '%,' + CAST(c.candidate_id AS VARCHAR(20)) + ',%'
WHERE c.consultant_appointment_id IS NULL;
GO
