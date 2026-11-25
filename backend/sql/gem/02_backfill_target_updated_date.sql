/*
    GeM Procurement · one-time fix for "Last Updated Date"
    -------------------------------------------------------
    Rule from now on: "Last Updated Date" (updated_by / updated_date on the goods, service and
    works target tables) shows when the organisation last saved its actuals. Adding or editing
    a target no longer changes it.

    Before this fix, Sagarmanthan 3.0 did the opposite: actuals saves stamped only the monthly
    table, and target add / edit stamped the target table. This script corrects the rows
    touched since 3.0:

      Step 1  Rows with no actuals saved in 3.0 (monthly updated_date empty) whose target was
              added or edited in 3.0: put back the value they had before, from the earliest
              target entry in dbo.tbl_gem_procurement_log (a target added in 3.0 had no value
              before, so it goes back to empty).
      Step 2  Rows with actuals saved in 3.0 (monthly updated_date filled): take the monthly
              table's updated_by / updated_date.

    Old portal rows that nothing touched since 3.0 are left as they are.
    Safe to run again: it gives the same result each time.
    Run once on each database (local, test, live) after deploying the backend fix.
*/

SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
BEGIN TRANSACTION;

/* ---------------- Goods ---------------- */
WITH FirstTargetLog AS (
  SELECT gem_id, action, payload_json,
         ROW_NUMBER() OVER (PARTITION BY gem_id ORDER BY created_date, log_id) AS rn
  FROM dbo.tbl_gem_procurement_log
  WHERE category = 'goods' AND record_type = 'TARGET' AND action IN ('CREATE', 'UPDATE')
)
UPDATE g
SET g.updated_by   = CASE WHEN l.action = 'CREATE' THEN NULL
                          ELSE TRY_CONVERT(INT, JSON_VALUE(l.payload_json, '$.previous.updated_by')) END,
    g.updated_date = CASE WHEN l.action = 'CREATE' THEN NULL
                          ELSE TRY_CONVERT(DATETIME, JSON_VALUE(l.payload_json, '$.previous.updated_date'), 127) END
FROM dbo.tbl_gem_procurement_goods g
JOIN FirstTargetLog l ON l.gem_id = g.goods_gem_id AND l.rn = 1
LEFT JOIN dbo.tbl_gem_procurement_goods_monthly m ON m.goods_gem_id = g.goods_gem_id
WHERE m.updated_date IS NULL;
PRINT CONCAT('Goods rows restored after target change: ', @@ROWCOUNT);

UPDATE g
SET g.updated_by = m.updated_by,
    g.updated_date = m.updated_date
FROM dbo.tbl_gem_procurement_goods g
JOIN dbo.tbl_gem_procurement_goods_monthly m ON m.goods_gem_id = g.goods_gem_id
WHERE m.updated_date IS NOT NULL
  AND (g.updated_date IS NULL OR g.updated_date <> m.updated_date);
PRINT CONCAT('Goods rows set to actuals save date: ', @@ROWCOUNT);

/* ---------------- Service ---------------- */
WITH FirstTargetLog AS (
  SELECT gem_id, action, payload_json,
         ROW_NUMBER() OVER (PARTITION BY gem_id ORDER BY created_date, log_id) AS rn
  FROM dbo.tbl_gem_procurement_log
  WHERE category = 'service' AND record_type = 'TARGET' AND action IN ('CREATE', 'UPDATE')
)
UPDATE s
SET s.updated_by   = CASE WHEN l.action = 'CREATE' THEN NULL
                          ELSE TRY_CONVERT(INT, JSON_VALUE(l.payload_json, '$.previous.updated_by')) END,
    s.updated_date = CASE WHEN l.action = 'CREATE' THEN NULL
                          ELSE TRY_CONVERT(DATETIME, JSON_VALUE(l.payload_json, '$.previous.updated_date'), 127) END
FROM dbo.tbl_gem_procurement_service s
JOIN FirstTargetLog l ON l.gem_id = s.service_gem_id AND l.rn = 1
LEFT JOIN dbo.tbl_gem_procurement_service_monthly m ON m.service_gem_id = s.service_gem_id
WHERE m.updated_date IS NULL;
PRINT CONCAT('Service rows restored after target change: ', @@ROWCOUNT);

UPDATE s
SET s.updated_by = m.updated_by,
    s.updated_date = m.updated_date
FROM dbo.tbl_gem_procurement_service s
JOIN dbo.tbl_gem_procurement_service_monthly m ON m.service_gem_id = s.service_gem_id
WHERE m.updated_date IS NOT NULL
  AND (s.updated_date IS NULL OR s.updated_date <> m.updated_date);
PRINT CONCAT('Service rows set to actuals save date: ', @@ROWCOUNT);

/* ---------------- Works ---------------- */
WITH FirstTargetLog AS (
  SELECT gem_id, action, payload_json,
         ROW_NUMBER() OVER (PARTITION BY gem_id ORDER BY created_date, log_id) AS rn
  FROM dbo.tbl_gem_procurement_log
  WHERE category = 'works' AND record_type = 'TARGET' AND action IN ('CREATE', 'UPDATE')
)
UPDATE w
SET w.updated_by   = CASE WHEN l.action = 'CREATE' THEN NULL
                          ELSE TRY_CONVERT(INT, JSON_VALUE(l.payload_json, '$.previous.updated_by')) END,
    w.updated_date = CASE WHEN l.action = 'CREATE' THEN NULL
                          ELSE TRY_CONVERT(DATETIME, JSON_VALUE(l.payload_json, '$.previous.updated_date'), 127) END
FROM dbo.tbl_gem_procurement_works w
JOIN FirstTargetLog l ON l.gem_id = w.works_gem_id AND l.rn = 1
LEFT JOIN dbo.tbl_gem_procurement_works_monthly m ON m.works_gem_id = w.works_gem_id
WHERE m.updated_date IS NULL;
PRINT CONCAT('Works rows restored after target change: ', @@ROWCOUNT);

UPDATE w
SET w.updated_by = m.updated_by,
    w.updated_date = m.updated_date
FROM dbo.tbl_gem_procurement_works w
JOIN dbo.tbl_gem_procurement_works_monthly m ON m.works_gem_id = w.works_gem_id
WHERE m.updated_date IS NOT NULL
  AND (w.updated_date IS NULL OR w.updated_date <> m.updated_date);
PRINT CONCAT('Works rows set to actuals save date: ', @@ROWCOUNT);

COMMIT TRANSACTION;
