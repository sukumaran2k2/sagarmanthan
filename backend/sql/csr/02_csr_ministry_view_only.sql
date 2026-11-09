-- CSR Projects (QC CSR-18 / CSR-34 / R-01 / R-14): CSR rights in the user CRUD matrix, matching
-- the rule the portal applies:
--   - organisation logins (data scope ORGANISATION: Nodal and Senior Officers) enter their own
--     organisation's CSR data: their create / update rights are left as they are
--   - Ministry-side roles (data scope MINISTRY / MASTER) only view: create / update off
--   - nobody gets delete (CSR has no delete feature)
-- Read rights are never changed, so nobody gains or loses CSR access through this script.
-- Only existing CSR rows are changed; no rows are added. Safe to run more than once.
-- Set @updatedBy to the user_id of the admin running the script (recorded on changed rows).

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @updatedBy INT = NULL;   -- e.g. 1 for the superadmin account
DECLARE @csr INT = (SELECT module_id FROM tbl_modules WHERE module_code = 'CSR_PROJECTS');
IF @csr IS NULL THROW 50001, 'Module CSR_PROJECTS not found in tbl_modules.', 1;

-- Ministry-side roles: no create / update / delete
UPDATE c
SET can_create = 0, can_update = 0, can_delete = 0, updated_at = SYSUTCDATETIME(), updated_by = @updatedBy
FROM tbl_rbac_user_module_crud c
JOIN tbl_user u ON u.user_id = c.user_id
LEFT JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
LEFT JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
WHERE c.module_id = @csr
  AND ISNULL(ds.data_scope_code, '') <> 'ORGANISATION'
  AND (c.can_create = 1 OR c.can_update = 1 OR c.can_delete = 1);
PRINT 'Ministry-side rows set to view only: ' + CAST(@@ROWCOUNT AS VARCHAR(12));

-- Organisation logins: delete off; create / update unchanged
UPDATE c
SET can_delete = 0, updated_at = SYSUTCDATETIME(), updated_by = @updatedBy
FROM tbl_rbac_user_module_crud c
JOIN tbl_user u ON u.user_id = c.user_id
JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
WHERE c.module_id = @csr
  AND ds.data_scope_code = 'ORGANISATION'
  AND c.can_delete = 1;
PRINT 'Organisation rows, delete removed: ' + CAST(@@ROWCOUNT AS VARCHAR(12));

COMMIT;
