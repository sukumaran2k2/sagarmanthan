-- CAPEX dashboard: index tbl_capex_monthly by capex_id.
--
-- The table's only index is its primary key on id, so every dashboard query
-- (summary, financial year summary, year-on-year) read the whole table to total
-- the actuals per capex record. This index covers those queries: they seek by
-- capex_id and read funding_type / amount / month_number / updated_date from the
-- index alone.
--
-- Safe to run more than once.

IF NOT EXISTS (
  SELECT 1 FROM sys.indexes
  WHERE name = N'IX_tbl_capex_monthly_capex_id'
    AND object_id = OBJECT_ID(N'dbo.tbl_capex_monthly')
)
BEGIN
  CREATE NONCLUSTERED INDEX IX_tbl_capex_monthly_capex_id
    ON dbo.tbl_capex_monthly (capex_id)
    INCLUDE (funding_type, amount, month_number, updated_date);
END
GO
