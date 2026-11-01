-- CAPEX: add tbl_capex.created_date.
--
-- The add-target API (capex.js addCapex) inserts created_date, but tbl_capex
-- never had the column, so every "Add Capex Target" save failed with
-- "Invalid column name 'created_date'".
--
-- Existing rows get their updated_date as the best known creation date (the
-- real one was never recorded). New rows get the current date and time.
--
-- Safe to run more than once. Run on every environment before deploying the
-- Capex code.

IF COL_LENGTH(N'dbo.tbl_capex', N'created_date') IS NULL
BEGIN
  ALTER TABLE dbo.tbl_capex
    ADD created_date DATETIME NULL
    CONSTRAINT DF_tbl_capex_created_date DEFAULT (GETDATE());
END
GO

UPDATE dbo.tbl_capex
SET created_date = CAST(updated_date AS DATETIME)
WHERE created_date IS NULL
  AND updated_date IS NOT NULL;
GO
