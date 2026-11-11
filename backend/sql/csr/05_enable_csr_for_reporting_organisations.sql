-- CSR Projects (QC CSR-33): switch the CSR module on for every organisation that reports CSR
-- (has rows in tbl_csr_projects or tbl_csr_fund). Without it, an organisation's users can't open
-- CSR at all, so data entry stops after go-live.
-- Only switches access ON; organisations without CSR data are left as they are (an admin can
-- still enable them in Admin > Organisation Module Permission). The change is written to
-- tbl_rbac_org_module_permission_log, like a change made in that screen.
-- Safe to run more than once. Set @updatedBy to the user_id of the admin running it.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @updatedBy INT = NULL;   -- e.g. 1 for the superadmin account
DECLARE @csr INT = (SELECT module_id FROM tbl_modules WHERE module_code = 'CSR_PROJECTS');
IF @csr IS NULL THROW 50001, 'Module CSR_PROJECTS not found in tbl_modules.', 1;

DROP TABLE IF EXISTS #reporting;
SELECT DISTINCT o.organisation_id, o.organisation_name INTO #reporting
FROM mmt_organisation o
WHERE EXISTS (SELECT 1 FROM tbl_csr_projects p WHERE p.organisation_id = o.organisation_id)
   OR EXISTS (SELECT 1 FROM tbl_csr_fund f WHERE f.organisation_id = o.organisation_id);

DROP TABLE IF EXISTS #toEnable;
SELECT r.organisation_id, r.organisation_name INTO #toEnable
FROM #reporting r
WHERE NOT EXISTS (SELECT 1 FROM tbl_rbac_org_module_permission p
                  WHERE p.organisation_id = r.organisation_id AND p.module_id = @csr AND p.is_allowed = 1);

UPDATE p SET is_allowed = 1, updated_at = SYSUTCDATETIME(), updated_by = @updatedBy
FROM tbl_rbac_org_module_permission p JOIN #toEnable t ON t.organisation_id = p.organisation_id
WHERE p.module_id = @csr;

INSERT INTO tbl_rbac_org_module_permission (organisation_id, module_id, is_allowed, created_at, updated_at, created_by, updated_by)
SELECT t.organisation_id, @csr, 1, SYSUTCDATETIME(), SYSUTCDATETIME(), @updatedBy, @updatedBy
FROM #toEnable t
WHERE NOT EXISTS (SELECT 1 FROM tbl_rbac_org_module_permission p WHERE p.organisation_id = t.organisation_id AND p.module_id = @csr);

DECLARE @n INT = (SELECT COUNT(*) FROM #toEnable);
IF @n > 0
    INSERT INTO tbl_rbac_org_module_permission_log (created_by, target_summary, payload_json, created_date)
    VALUES (@updatedBy,
            'CSR_PROJECTS enabled for ' + CAST(@n AS VARCHAR(12)) + ' reporting organisation(s) (sql/csr/05)',
            (SELECT organisation_id, organisation_name, @csr AS module_id, 1 AS is_allowed FROM #toEnable FOR JSON PATH),
            SYSUTCDATETIME());

DECLARE @reportingCount INT = (SELECT COUNT(*) FROM #reporting);
PRINT 'Reporting organisations: ' + CAST(@reportingCount AS VARCHAR(12))
    + ', CSR switched on now: ' + CAST(@n AS VARCHAR(12));
SELECT organisation_id, organisation_name FROM #toEnable ORDER BY organisation_name;

COMMIT;
