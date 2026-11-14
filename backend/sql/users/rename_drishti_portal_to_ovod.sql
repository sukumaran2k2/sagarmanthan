-- The module is presented as OVOD throughout the UI, but tbl_modules still carried the old
-- display name "Drishti portal", which is what the User / Module Permission matrix lists.
--
-- Only the display name changes. module_code stays DRISHTI_PORTAL: it is the identifier the
-- route guards and the permission checks use, and the UI already treats DRISHTI_PORTAL,
-- ONE_VISION_ONE_DOCUMENT and OVOD as aliases of one another.
--
-- No GO batch separators: these files are run through the mssql driver, which rejects GO.
-- Safe to run more than once.

UPDATE tbl_modules
SET module_name = 'OVOD'
WHERE module_code = 'DRISHTI_PORTAL'
  AND module_name <> 'OVOD';
