-- Adds the call-size CPPI columns that the Traffic dashboard reads from tbl_kpi_time_performance.
-- Safe to re-run: each column is added only if it does not exist yet.
DECLARE @cols TABLE (name SYSNAME);
INSERT INTO @cols VALUES
 ('avg_less_than_251_cppi'), ('avg_251_to_500_cppi'), ('avg_501_to_1000_cppi'),
 ('avg_1001_to_1500_cppi'), ('avg_1501_to_2000_cppi'), ('avg_2001_to_2500_cppi'),
 ('avg_2501_to_3000_cppi'), ('avg_3001_to_4000_cppi'), ('avg_4001_to_6000_cppi'),
 ('avg_greater_than_6000_cppi');

DECLARE @sql NVARCHAR(MAX) = N'';
SELECT @sql += N'ALTER TABLE dbo.tbl_kpi_time_performance ADD ' + QUOTENAME(name) + N' DECIMAL(18,2) NULL;' + CHAR(10)
FROM @cols
WHERE COL_LENGTH('dbo.tbl_kpi_time_performance', name) IS NULL;

EXEC sp_executesql @sql;

-- total_moves is read by the gross crane productivity query in the Traffic dashboard.
IF COL_LENGTH('dbo.tbl_kpi_time_performance', 'total_moves') IS NULL
    ALTER TABLE dbo.tbl_kpi_time_performance ADD total_moves DECIMAL(18,2) NULL;

-- Loading / unloading cargo volumes read by the loading-unloading efficiency queries.
DECLARE @sql2 NVARCHAR(MAX) = N'';
SELECT @sql2 += N'ALTER TABLE dbo.tbl_kpi_time_performance ADD ' + QUOTENAME(v.name) + N' DECIMAL(18,2) NULL;' + CHAR(10)
FROM (VALUES ('dry_bulk_cargo_loaded'), ('dry_bulk_cargo_unloaded'),
             ('break_bulk_cargo_loaded'), ('break_bulk_cargo_unloaded'),
             ('liquid_bulk_cargo_loaded'), ('liquid_bulk_cargo_unloaded')) v(name)
WHERE COL_LENGTH('dbo.tbl_kpi_time_performance', v.name) IS NULL;
EXEC sp_executesql @sql2;
