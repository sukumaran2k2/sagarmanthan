-- CSR Projects: amounts stored above Rs 1,000 crore were typed in lakhs into a crore field,
-- so they were stored 100 times too large. CSR amounts are stored in lakh (the form converts
-- crore to lakh), so Rs 1,000 crore = 100,000 lakh. Divide those amounts by 100, once.
-- Covers project values, expenditure entries and the fund's opening balance and allotment,
-- plus all of Mormugao Port Authority's 2025-2026 expenditure (see below).
-- Run ONCE, on data that has not been corrected before. Take a backup first.

SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE tbl_csr_projects
SET project_value = ROUND(project_value / 100.0, 2)
WHERE project_value > 100000;
PRINT 'tbl_csr_projects.project_value: ' + CAST(@@ROWCOUNT AS VARCHAR(12)) + ' rows';

-- Also every 2025-2026 expenditure entry of Mormugao Port Authority (organisation 7), whose
-- 2025-2026 entries were typed in lakhs too. One UPDATE, so no row is divided twice.
UPDATE e
SET csr_expenditure_cost = ROUND(e.csr_expenditure_cost / 100.0, 2)
FROM tbl_csr_expenditure e
INNER JOIN tbl_csr_projects p ON p.csr_project_id = e.csr_project_id
WHERE e.csr_expenditure_cost > 100000
   OR (e.year = '2025-2026' AND p.organisation_id = 7);
PRINT 'tbl_csr_expenditure.csr_expenditure_cost: ' + CAST(@@ROWCOUNT AS VARCHAR(12)) + ' rows';

-- Fund rows: only the CSR amounts (net profit can genuinely be above Rs 1,000 crore)
UPDATE tbl_csr_fund
SET opening_balance_csr = CASE WHEN opening_balance_csr > 100000 THEN ROUND(opening_balance_csr / 100.0, 2) ELSE opening_balance_csr END,
    csr_fund_alloted_year = CASE WHEN csr_fund_alloted_year > 100000 THEN ROUND(csr_fund_alloted_year / 100.0, 2) ELSE csr_fund_alloted_year END
WHERE opening_balance_csr > 100000 OR csr_fund_alloted_year > 100000;
PRINT 'tbl_csr_fund: ' + CAST(@@ROWCOUNT AS VARCHAR(12)) + ' rows';

COMMIT TRANSACTION;
