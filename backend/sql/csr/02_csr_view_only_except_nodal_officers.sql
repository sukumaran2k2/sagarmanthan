-- CSR Projects (QC CSR-18 / CSR-34): set the CSR permissions in the user CRUD matrix to match
-- the rule the portal now applies:
--   - Organisation Nodal Officers: view, add and edit (no delete)
--   - everyone else (Ministry roles, Organisation Senior Officers, View Only Admin): view only
--   - nobody gets delete (CSR has no delete feature)
-- The server enforces the same rule by role, so this keeps the matrix screen honest.
-- Only existing CSR rows are changed; no rows are added. Safe to run more than once.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @csr INT = (SELECT module_id FROM tbl_modules WHERE module_code = 'CSR_PROJECTS');
IF @csr IS NULL THROW 50001, 'Module CSR_PROJECTS not found in tbl_modules.', 1;

-- Everyone except Organisation Nodal Officers: view only
UPDATE c
SET can_create = 0, can_update = 0, can_delete = 0, can_read = 1, updated_at = GETDATE()
FROM tbl_rbac_user_module_crud c
JOIN tbl_user u ON u.user_id = c.user_id
JOIN tbl_role r ON r.role_id = u.role_id
WHERE c.module_id = @csr
  AND r.role_code <> 'ORG_NODAL_OFFICER'
  AND (c.can_create = 1 OR c.can_update = 1 OR c.can_delete = 1 OR ISNULL(c.can_read, 0) = 0);
PRINT 'Set to view only: ' + CAST(@@ROWCOUNT AS VARCHAR(12)) + ' rows';

-- Organisation Nodal Officers: no delete
UPDATE c
SET can_delete = 0, updated_at = GETDATE()
FROM tbl_rbac_user_module_crud c
JOIN tbl_user u ON u.user_id = c.user_id
JOIN tbl_role r ON r.role_id = u.role_id
WHERE c.module_id = @csr
  AND r.role_code = 'ORG_NODAL_OFFICER'
  AND c.can_delete = 1;
PRINT 'Nodal Officers, delete removed: ' + CAST(@@ROWCOUNT AS VARCHAR(12)) + ' rows';

COMMIT;
