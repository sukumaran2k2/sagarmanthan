-- CSR Projects (QC R-14): give organisation logins CSR data-entry rights in the user CRUD matrix.
-- CSR data is entered by the organisations themselves (any organisation login - Nodal or Senior
-- Officer). The screens show Add / Edit only to users with a CSR create / update row, and most
-- organisation users have no CSR row at all, so without this they could only view.
--
-- For every ACTIVE user whose role has the ORGANISATION data scope and whose organisation has
-- the CSR module switched on (run 05 first), and who has NO CSR row yet, a row is added with
-- view / add / edit, no delete. Existing rows are never changed, so rights an admin set on
-- purpose stay as they are. The change is written to tbl_rbac_user_module_crud_log, like a change
-- made in Admin > User Module Permission. Safe to run more than once.
-- Set @updatedBy to the user_id of the admin running the script.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @updatedBy INT = NULL;   -- e.g. 1 for the superadmin account
DECLARE @csr INT = (SELECT module_id FROM tbl_modules WHERE module_code = 'CSR_PROJECTS');
IF @csr IS NULL THROW 50001, 'Module CSR_PROJECTS not found in tbl_modules.', 1;

SELECT u.user_id, u.organisation_id INTO #grant
FROM tbl_user u
JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id AND ds.data_scope_code = 'ORGANISATION'
JOIN tbl_rbac_org_module_permission op ON op.organisation_id = u.organisation_id AND op.module_id = @csr AND op.is_allowed = 1
WHERE u.status = 1
  AND NOT EXISTS (SELECT 1 FROM tbl_rbac_user_module_crud c WHERE c.user_id = u.user_id AND c.module_id = @csr);

INSERT INTO tbl_rbac_user_module_crud (user_id, module_id, can_create, can_read, can_update, can_delete,
                                       created_at, updated_at, created_by, updated_by)
SELECT g.user_id, @csr, 1, 1, 1, 0, SYSUTCDATETIME(), SYSUTCDATETIME(), @updatedBy, @updatedBy
FROM #grant g;

DECLARE @n INT = @@ROWCOUNT;
IF @n > 0
    INSERT INTO tbl_rbac_user_module_crud_log (created_by, target_summary, payload_json, created_date)
    VALUES (@updatedBy,
            'CSR_PROJECTS view / add / edit for ' + CAST(@n AS VARCHAR(12)) + ' organisation user(s) without a CSR row (sql/csr/06)',
            (SELECT user_id, organisation_id, @csr AS module_id, 1 AS can_create, 1 AS can_read, 1 AS can_update, 0 AS can_delete
             FROM #grant FOR JSON PATH),
            SYSUTCDATETIME());

PRINT 'Organisation users given CSR view / add / edit: ' + CAST(@n AS VARCHAR(12));

COMMIT;
