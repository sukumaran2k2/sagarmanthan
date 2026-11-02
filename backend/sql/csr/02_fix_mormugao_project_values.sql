-- CSR Projects: Mormugao Port Authority's (organisation 7) 2025-2026 and 2026-2027 project values
-- were typed in lakhs into the crore field, so they are stored 100 times too large (the
-- dashboard showed Rs 12,505 crore for Mormugao). Divide them by 100, once.
-- Run ONCE, after 01_fix_amounts_entered_in_lakhs.sql. Take a backup first.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE tbl_csr_projects
SET project_value = ROUND(project_value / 100.0, 2)
WHERE organisation_id = 7
  AND financial_year IN ('2025-2026', '2026-2027')
  AND project_value > 0;
PRINT 'tbl_csr_projects.project_value: ' + CAST(@@ROWCOUNT AS VARCHAR(12)) + ' rows';

COMMIT TRANSACTION;
