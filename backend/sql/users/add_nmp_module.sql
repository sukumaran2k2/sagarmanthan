-- NMP (National Monetisation Pipeline) was never registered in tbl_modules, so it could not be
-- granted or withheld in the User / Module Permission matrix. The UI worked around that by
-- listing the NMP tabs as public and defaulting its CRUD flags to true, which gave every
-- signed-in user full create/update/delete on the module.
--
-- Registering the module here lets the matrix control it like every other module.
-- getActiveModules() lists modules WHERE ISNULL(is_active, 1) = 1, ordered by module_name.
--
-- No GO batch separators: these files are run through the mssql driver, which rejects GO.
-- Safe to run more than once.

IF NOT EXISTS (SELECT 1 FROM tbl_modules WHERE module_code = 'NMP')
    INSERT INTO tbl_modules (module_name, module_code, is_active)
    VALUES ('National Monetisation Pipeline', 'NMP', 1);
