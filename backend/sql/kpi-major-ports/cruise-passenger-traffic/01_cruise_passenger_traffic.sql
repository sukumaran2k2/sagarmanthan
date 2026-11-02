/*
    KPI Major Ports · Cruise and Passenger Traffic: duplicate clean-up and unique indexes
    -------------------------------------------------------------------------------------
    Run once on each database (local, test, live) after deploying the Cruise and Passenger
    Traffic module. Safe to run again: every step only touches rows that still need it, and
    every index is created only if it is missing.

    Why:
      1. The earlier portal saved some months twice (a double click on Submit), so a few
         organisation / financial year / month combinations have two or more rows with exactly
         the same values. The reports add them up, so those months are counted twice.
         Step 2 keeps the first row of each such group and deletes the exact copies.
         Rows that differ in any value are never deleted; if any remain, step 3 stops and
         lists them so they can be resolved by hand.
      2. One actuals record per organisation, financial year and month, and one set of
         targets per organisation and financial year. The save paths rely on this; the
         unique indexes make the database enforce it too.

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database
    and execute it, or run it with sqlcmd -d <database> -i 01_cruise_passenger_traffic.sql
*/

-- Filtered unique indexes need this; SSMS has it on already, sqlcmd does not
SET QUOTED_IDENTIFIER ON;
GO

-- 1. One financial-year format ("2024-2025") ---------------------------------------------------

UPDATE dbo.tbl_traffic_vessel
SET fiscal_year = REPLACE(fiscal_year, ' ', '')
WHERE fiscal_year LIKE '% %';

UPDATE dbo.tbl_traffic_vessel_target
SET fiscal_year = REPLACE(fiscal_year, ' ', '')
WHERE fiscal_year LIKE '% %';
GO

-- 2. Delete exact copies of a monthly record (same organisation, year, month and values) -------
-- INTERSECT compares NULLs as equal, so a copy with the same empty ferry values also matches.
DELETE dup
FROM dbo.tbl_traffic_vessel dup
WHERE EXISTS (
    SELECT 1 FROM dbo.tbl_traffic_vessel keep
    WHERE keep.id < dup.id
      AND EXISTS (
          SELECT keep.organisation_id, keep.fiscal_year, keep.month,
                 keep.total_cruise_vessel_domestic, keep.total_cruise_vessel_international,
                 keep.total_cruise_passengers_domestic, keep.total_cruise_passengers_international,
                 keep.total_ferry_calls, keep.total_ferry_passengers, keep.handles_passenger_ferry
          INTERSECT
          SELECT dup.organisation_id, dup.fiscal_year, dup.month,
                 dup.total_cruise_vessel_domestic, dup.total_cruise_vessel_international,
                 dup.total_cruise_passengers_domestic, dup.total_cruise_passengers_international,
                 dup.total_ferry_calls, dup.total_ferry_passengers, dup.handles_passenger_ferry
      )
);
GO

-- 3. One actuals record per organisation, financial year and month -----------------------------
IF EXISTS (
    SELECT 1 FROM dbo.tbl_traffic_vessel
    WHERE organisation_id IS NOT NULL AND fiscal_year IS NOT NULL AND month IS NOT NULL
    GROUP BY organisation_id, fiscal_year, month HAVING COUNT(*) > 1
)
BEGIN
    -- Different values for the same month: decide which row is right, delete the other, run again
    SELECT organisation_id, fiscal_year, month, COUNT(*) AS records
    FROM dbo.tbl_traffic_vessel
    WHERE organisation_id IS NOT NULL AND fiscal_year IS NOT NULL AND month IS NOT NULL
    GROUP BY organisation_id, fiscal_year, month HAVING COUNT(*) > 1;
    RAISERROR('tbl_traffic_vessel still has more than one record for the months listed above. Resolve them and run this script again.', 16, 1);
END
ELSE IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_traffic_vessel_org_fy_month'
                    AND object_id = OBJECT_ID('dbo.tbl_traffic_vessel'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_traffic_vessel_org_fy_month
    ON dbo.tbl_traffic_vessel (organisation_id, fiscal_year, month)
    WHERE organisation_id IS NOT NULL AND fiscal_year IS NOT NULL AND month IS NOT NULL;
GO

-- 4. One set of targets per organisation and financial year ------------------------------------
-- Fails (and changes nothing) if duplicates already exist; find them with:
--   SELECT organisation_id, fiscal_year, COUNT(*) FROM dbo.tbl_traffic_vessel_target
--   GROUP BY organisation_id, fiscal_year HAVING COUNT(*) > 1;
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_traffic_vessel_target_org_fy'
               AND object_id = OBJECT_ID('dbo.tbl_traffic_vessel_target'))
  CREATE UNIQUE NONCLUSTERED INDEX UX_traffic_vessel_target_org_fy
    ON dbo.tbl_traffic_vessel_target (organisation_id, fiscal_year)
    WHERE organisation_id IS NOT NULL AND fiscal_year IS NOT NULL;
GO
