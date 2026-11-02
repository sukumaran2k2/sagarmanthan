-- Projects: who approved or rejected a drop request. 3.0 reads and writes
-- tbl_project_drop_request.approved_by (drop request list, approve / reject, project list)
-- but the column was never added, so those queries fail. Safe to run more than once.

IF COL_LENGTH('tbl_project_drop_request', 'approved_by') IS NULL
    ALTER TABLE tbl_project_drop_request ADD approved_by INT NULL;
