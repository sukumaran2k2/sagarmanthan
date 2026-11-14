/* ============================================================================
   Sagarmanthan — rename the "Drishti portal" module to "OVOD"

   What this changes
     tbl_modules.module_name  'Drishti portal'  ->  'OVOD'

   What this does NOT change
     module_code stays DRISHTI_PORTAL. It is the identifier used by the API
     route guards (requireModulePermission('DRISHTI_PORTAL', ...)) and by every
     permission grant in tbl_rbac_org_module_permission and
     tbl_rbac_user_module_crud. Renaming the code would invalidate those grants
     and require migrating both tables. The UI already treats DRISHTI_PORTAL,
     ONE_VISION_ONE_DOCUMENT and OVOD as the same module.

   Effect
     The User / Module Permission matrix lists the module as "OVOD".
     No grant is added, removed or altered. No user needs to sign in again.

   Notes for whoever runs it
     - Safe to run more than once (the WHERE clause makes it a no-op the
       second time).
     - No GO separators, so it runs in SSMS, sqlcmd, Azure Data Studio and
       through the Node mssql driver alike.
     - Run against the Sagarmanthan application database.
   ============================================================================ */

-- 1. Before
SELECT module_id, module_name, module_code, is_active
FROM tbl_modules
WHERE module_code = 'DRISHTI_PORTAL';

-- 2. Rename
UPDATE tbl_modules
SET module_name = 'OVOD'
WHERE module_code = 'DRISHTI_PORTAL'
  AND module_name <> 'OVOD';

-- 3. After — expect exactly one row reading OVOD / DRISHTI_PORTAL
SELECT module_id, module_name, module_code, is_active
FROM tbl_modules
WHERE module_code = 'DRISHTI_PORTAL';


/* ----------------------------------------------------------------------------
   Rollback, if it ever needs undoing:

   UPDATE tbl_modules
   SET module_name = 'Drishti portal'
   WHERE module_code = 'DRISHTI_PORTAL';
   -------------------------------------------------------------------------- */
