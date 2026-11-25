/*
    GeM Procurement · one-time fix for "Last Updated Date"
    -------------------------------------------------------
    Until this fix, saving monthly actuals in Sagarmanthan 3.0 stamped updated_date only on
    the monthly table, while the list's "Last Updated Date" reads the target table. So the
    screen kept showing the last target change (e.g. 13.11.2026).

    This copies the monthly table's updated_by / updated_date to the target table wherever
    the monthly save is newer, for goods, service and works. Old portal rows have a NULL
    monthly updated_date and are left as they are.

    Safe to run again: a row is changed only when its monthly date is newer.
    Run once on each database (local, test, live) after deploying the backend fix.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE g
SET g.updated_by = m.updated_by,
    g.updated_date = m.updated_date
FROM dbo.tbl_gem_procurement_goods g
JOIN dbo.tbl_gem_procurement_goods_monthly m ON m.goods_gem_id = g.goods_gem_id
WHERE m.updated_date IS NOT NULL
  AND (g.updated_date IS NULL OR m.updated_date > g.updated_date);
PRINT CONCAT('Goods rows updated: ', @@ROWCOUNT);

UPDATE s
SET s.updated_by = m.updated_by,
    s.updated_date = m.updated_date
FROM dbo.tbl_gem_procurement_service s
JOIN dbo.tbl_gem_procurement_service_monthly m ON m.service_gem_id = s.service_gem_id
WHERE m.updated_date IS NOT NULL
  AND (s.updated_date IS NULL OR m.updated_date > s.updated_date);
PRINT CONCAT('Service rows updated: ', @@ROWCOUNT);

UPDATE w
SET w.updated_by = m.updated_by,
    w.updated_date = m.updated_date
FROM dbo.tbl_gem_procurement_works w
JOIN dbo.tbl_gem_procurement_works_monthly m ON m.works_gem_id = w.works_gem_id
WHERE m.updated_date IS NOT NULL
  AND (w.updated_date IS NULL OR m.updated_date > w.updated_date);
PRINT CONCAT('Works rows updated: ', @@ROWCOUNT);

COMMIT TRANSACTION;
