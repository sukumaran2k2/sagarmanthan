-- CSR Projects (QC CSR-03): READ ONLY - lists amounts that look wrong, for each organisation to
-- confirm and correct in the portal. Changes nothing.
--
-- Amounts are stored in lakh. Some were typed in rupees (e.g. 25,00,000 for Rs 25 lakh), which
-- makes them 1,00,000 times too large. The right value can't be guessed safely, so no script
-- corrects them: the organisation has to confirm each one.
--
-- A row is listed when:
--   - the project's total spending is more than the project value, or
--   - the project value is Rs 100 crore (10,000 lakh) or more, or
--   - a fund entry's opening balance or allotment is Rs 100 crore or more.

-- 1. Projects
SELECT
    o.organisation_name                                  AS organisation,
    p.csr_project_id                                     AS project_id,
    p.project_name,
    p.financial_year,
    p.project_value                                      AS project_value_lakh,
    ISNULL(x.total_spent, 0)                             AS total_spent_lakh,
    CASE
        WHEN ISNULL(x.total_spent, 0) > p.project_value AND p.project_value >= 10000
            THEN 'Spending above project value; project value Rs 100 Cr or more'
        WHEN ISNULL(x.total_spent, 0) > p.project_value
            THEN 'Spending above project value'
        ELSE 'Project value Rs 100 Cr or more'
    END                                                  AS reason,
    x.spending_by_year
FROM tbl_csr_projects p
LEFT JOIN mmt_organisation o ON o.organisation_id = p.organisation_id
OUTER APPLY (
    SELECT SUM(e.csr_expenditure_cost) AS total_spent,
           STRING_AGG(CONCAT(e.year, ': ', e.csr_expenditure_cost), '; ') AS spending_by_year
    FROM tbl_csr_expenditure e
    WHERE e.csr_project_id = p.csr_project_id
) x
WHERE ISNULL(x.total_spent, 0) > p.project_value
   OR p.project_value >= 10000
ORDER BY o.organisation_name, p.csr_project_id;

-- 2. Fund entries
SELECT
    o.organisation_name          AS organisation,
    f.csr_fund_id                AS fund_id,
    f.financial_year,
    f.opening_balance_csr        AS opening_balance_lakh,
    f.csr_fund_alloted_year      AS allotted_lakh
FROM tbl_csr_fund f
LEFT JOIN mmt_organisation o ON o.organisation_id = f.organisation_id
WHERE f.opening_balance_csr >= 10000 OR f.csr_fund_alloted_year >= 10000
ORDER BY o.organisation_name, f.financial_year;
