/*
    KPI Major Ports · Financial Parameters: financial-year format and unique indexes
    --------------------------------------------------------------------------------
    Run once on each database (local, test, live) after deploying the Financial Parameters
    module. Safe to run again: the update only touches rows that still need it, and every
    index is created only if it is missing.

    Why:
      1. The earlier portal saved the financial year both as "2024-2025" and "2024 - 2025".
         The Financial Parameters reports and dashboard look rows up by "2024-2025" only, so
         the spaced rows are missing from them. Step 1 rewrites them without the spaces.
         This is the only change to existing data; no values are touched.
         (The new API reads both forms, so it works before and after this script.)
      2. One actuals record per organisation, financial year and month, and one set of
         targets per organisation and financial year. The save paths rely on this; the
         unique indexes make the database enforce it too.

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database
    and execute it, or run it with sqlcmd -d <database> -i 01_financial_parameters.sql
*/

-- Filtered unique indexes need this; SSMS has it on already, sqlcmd does not
SET QUOTED_IDENTIFIER ON;
GO

-- 1. One financial-year format ("2024-2025") ---------------------------------------------------

UPDATE dbo.tbl_financial_parameter
SET annually_financial_year = REPLACE(annually_financial_year, ' ', '')
WHERE annually_financial_year LIKE '% %';

UPDATE dbo.tbl_financial_paramaters_mopsw_target
SET annually_financial_year = REPLACE(annually_financial_year, ' ', '')
WHERE annually_financial_year LIKE '% %';
GO

-- 2. One actuals record per organisation, financial year and month -----------------------------
-- Fails (and changes nothing) if duplicates already exist; find them with:
--   SELECT organisation_id, annually_financial_year, month, COUNT(*) FROM dbo.tbl_financial_parameter
--   GROUP BY organisation_id, annually_financial_year, month HAVING COUNT(*) > 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_financial_parameter_org_fy_month'
               AND object_id = OBJECT_ID('dbo.tbl_financial_parameter'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_financial_parameter_org_fy_month
    ON dbo.tbl_financial_parameter (organisation_id, annually_financial_year, month)
    WHERE organisation_id IS NOT NULL AND annually_financial_year IS NOT NULL AND month IS NOT NULL;
GO

-- 3. One set of targets per organisation and financial year ------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_financial_parameter_target_org_fy'
               AND object_id = OBJECT_ID('dbo.tbl_financial_paramaters_mopsw_target'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_financial_parameter_target_org_fy
    ON dbo.tbl_financial_paramaters_mopsw_target (organisation_id, annually_financial_year)
    WHERE organisation_id IS NOT NULL AND annually_financial_year IS NOT NULL;
GO
