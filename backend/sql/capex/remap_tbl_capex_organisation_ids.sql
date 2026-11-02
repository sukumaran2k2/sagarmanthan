-- CAPEX: move tbl_capex.capex_organisation_id from the old (live portal) organisation
-- IDs to the new mmt_organisation IDs.
--
-- The organisation master was renumbered in sagarmanthan_revamp (from ID 13 up), but
-- the migrated Capex records kept the old IDs, so e.g. Shipping Corporation of India's
-- target (old ID 15) shows as MoPSW (new ID 15). Users already use the new IDs.
--
-- How it works:
--   1. The two Capex-only organisations of the old master that the new master dropped
--      (codes CAPEX1 'sagarmala+ALHW' and CAPEX2 'Secretariat-Economic Service
--      (capital)') are added to the new master, with the old name, code, category and
--      status (active), as in the old portal.
--   2. Old ID -> name comes from sagarmanthan_revamp_old.dbo.mmt_organisation;
--      name -> new ID from sagarmanthan_revamp.dbo.mmt_organisation (case and spaces
--      ignored, so "Ports,Shipping" matches "Ports, Shipping").
--   3. Only records up to @lastMigratedCapexId are moved. Records entered in the
--      revamp after that already use the new IDs.
--
-- Run with @apply = 0 first: it only shows the preview and changes nothing.
-- Set @apply = 1 to make the change. It backs up tbl_capex first and refuses to run
-- if that backup already exists, so it can't move the IDs twice.

USE sagarmanthan_revamp;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @apply BIT = 0;                    -- 0 = preview only, 1 = update
DECLARE @lastMigratedCapexId INT = 1095;   -- 1096 onwards were entered with new IDs

-- 1. Capex-only organisations to add to the new master
IF OBJECT_ID('tempdb..#orgs_to_add') IS NOT NULL DROP TABLE #orgs_to_add;
SELECT o.organisation_id AS old_id, o.organisation_name, o.organisation_code, o.organisation_category_id
INTO #orgs_to_add
FROM sagarmanthan_revamp_old.dbo.mmt_organisation o
WHERE o.organisation_code IN (N'CAPEX1', N'CAPEX2')
  AND NOT EXISTS (
    SELECT 1 FROM dbo.mmt_organisation n WHERE n.organisation_code = o.organisation_code);

SELECT old_id, organisation_name, organisation_code, organisation_category_id,
       'will be added to mmt_organisation' AS action
FROM #orgs_to_add;

-- 2. Old ID -> new ID by name. Organisations still to be added get their new ID in step 4.
IF OBJECT_ID('tempdb..#map') IS NOT NULL DROP TABLE #map;
SELECT
  o.organisation_id   AS old_id,
  o.organisation_name AS old_name,
  n.organisation_id   AS new_id,
  COUNT(n.organisation_id) OVER (PARTITION BY o.organisation_id) AS name_matches,
  CASE WHEN a.old_id IS NULL THEN 0 ELSE 1 END AS to_be_added
INTO #map
FROM sagarmanthan_revamp_old.dbo.mmt_organisation o
LEFT JOIN #orgs_to_add a ON a.old_id = o.organisation_id
LEFT JOIN dbo.mmt_organisation n
  ON REPLACE(LOWER(LTRIM(RTRIM(n.organisation_name))), ' ', '')
   = REPLACE(LOWER(LTRIM(RTRIM(o.organisation_name))), ' ', '');

-- Preview: every record in scope with its old and new organisation
SELECT
  c.capex_id, c.capex_financial_year, c.capex_total_value,
  c.capex_organisation_id AS old_id, m.old_name,
  m.new_id, n.organisation_name AS new_name,
  CASE WHEN m.to_be_added = 1 THEN 'change (organisation added first)'
       WHEN m.new_id IS NULL THEN 'NO MATCH - left unchanged'
       WHEN m.new_id = c.capex_organisation_id THEN 'same'
       ELSE 'change' END AS action
FROM dbo.tbl_capex c
LEFT JOIN #map m ON m.old_id = c.capex_organisation_id
LEFT JOIN dbo.mmt_organisation n ON n.organisation_id = m.new_id
WHERE c.capex_id <= @lastMigratedCapexId
ORDER BY action, c.capex_organisation_id, c.capex_financial_year;

-- Checks (organisations still to be added are counted as matched)
DECLARE @unmatched INT = (
  SELECT COUNT(*) FROM dbo.tbl_capex c
  LEFT JOIN #map m ON m.old_id = c.capex_organisation_id
  WHERE c.capex_id <= @lastMigratedCapexId AND m.new_id IS NULL AND ISNULL(m.to_be_added, 0) = 0);
DECLARE @ambiguous INT = (
  SELECT COUNT(*) FROM dbo.tbl_capex c
  JOIN #map m ON m.old_id = c.capex_organisation_id
  WHERE c.capex_id <= @lastMigratedCapexId AND m.name_matches > 1);
-- A record entered after the migration that already uses an ID a migrated record moves to
DECLARE @duplicates INT = (
  SELECT COUNT(*) FROM (
    SELECT c.capex_financial_year,
           CASE WHEN c.capex_id <= @lastMigratedCapexId
                THEN COALESCE(m.new_id, -c.capex_organisation_id)
                ELSE c.capex_organisation_id END AS org_id
    FROM dbo.tbl_capex c
    LEFT JOIN #map m ON m.old_id = c.capex_organisation_id
    GROUP BY c.capex_financial_year,
             CASE WHEN c.capex_id <= @lastMigratedCapexId
                  THEN COALESCE(m.new_id, -c.capex_organisation_id)
                  ELSE c.capex_organisation_id END
    HAVING COUNT(*) > 1) d);

SELECT @unmatched AS records_left_unchanged_no_match,
       @ambiguous AS records_with_two_name_matches,
       @duplicates AS fy_org_pairs_twice_after_move;

IF @apply = 0
BEGIN
  PRINT 'Preview only. Set @apply = 1 to update.';
  RETURN;
END

IF @ambiguous > 0 OR @duplicates > 0
BEGIN
  RAISERROR('Checks failed; nothing changed. Fix the counts above and run again.', 16, 1);
  RETURN;
END

IF OBJECT_ID('dbo.tbl_capex_backup_before_org_remap') IS NOT NULL
BEGIN
  RAISERROR('dbo.tbl_capex_backup_before_org_remap exists: the remap has already run. Nothing changed.', 16, 1);
  RETURN;
END

BEGIN TRANSACTION;

SELECT * INTO dbo.tbl_capex_backup_before_org_remap FROM dbo.tbl_capex;

-- 3. Add the Capex-only organisations (new IDs are given by the table), active as in
--    the old portal, where they also show in the organisation dropdowns.
INSERT INTO dbo.mmt_organisation (organisation_name, organisation_code, organisation_category_id, status)
SELECT organisation_name, organisation_code, organisation_category_id, 1
FROM #orgs_to_add;

PRINT CONCAT(@@ROWCOUNT, ' organisations added to mmt_organisation.');

-- 4. Their new IDs, looked up by code
UPDATE m
SET m.new_id = n.organisation_id
FROM #map m
JOIN #orgs_to_add a ON a.old_id = m.old_id
JOIN dbo.mmt_organisation n ON n.organisation_code = a.organisation_code;

-- 5. Move the records
UPDATE c
SET c.capex_organisation_id = m.new_id
FROM dbo.tbl_capex c
JOIN #map m ON m.old_id = c.capex_organisation_id
WHERE c.capex_id <= @lastMigratedCapexId
  AND m.new_id IS NOT NULL
  AND m.new_id <> c.capex_organisation_id;

PRINT CONCAT(@@ROWCOUNT, ' records moved to the new organisation IDs.');

COMMIT TRANSACTION;

-- Result: each record with its organisation name now
SELECT c.capex_id, c.capex_financial_year, c.capex_organisation_id, n.organisation_name, c.capex_total_value
FROM dbo.tbl_capex c
LEFT JOIN dbo.mmt_organisation n ON n.organisation_id = c.capex_organisation_id
ORDER BY n.organisation_name, c.capex_financial_year;

-- New IDs of the added organisations (Report 1.2's "Other Organisations" list needs them)
SELECT organisation_id, organisation_name, organisation_code
FROM dbo.mmt_organisation
WHERE organisation_code IN (N'CAPEX1', N'CAPEX2');

-- Undo (only if needed):
-- UPDATE c SET c.capex_organisation_id = b.capex_organisation_id
-- FROM dbo.tbl_capex c JOIN dbo.tbl_capex_backup_before_org_remap b ON b.capex_id = c.capex_id;
-- DELETE FROM dbo.mmt_organisation WHERE organisation_code IN (N'CAPEX1', N'CAPEX2');
-- DROP TABLE dbo.tbl_capex_backup_before_org_remap;
GO
