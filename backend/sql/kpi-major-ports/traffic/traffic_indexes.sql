/*
    KPI Major Ports · Traffic: speed-up indexes
    --------------------------------------------
    Run once on each database (local, test, live) after deploying the Traffic module.
    Safe to run again: every index is created only if it is missing. No data is changed.

    Why: the Actuals / Targets / Entry Access lists, the dashboard and the Save path all
    look rows up by organisation, financial year and month. Without these indexes SQL Server
    reads the whole table (about 107,000 rows in tbl_traffic_commodity_data) for every request.

    How to run: open this file in SSMS / Azure Data Studio on the Sagarmanthan database
    and execute it, or run it with sqlcmd -d <database> -i traffic_indexes.sql
*/

-- Organisation first: organisation users, the Save (MERGE) key and per-organisation lookups
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_traffic_commodity_org_fy_month'
               AND object_id = OBJECT_ID('dbo.tbl_traffic_commodity_data'))
  CREATE NONCLUSTERED INDEX IX_traffic_commodity_org_fy_month
    ON dbo.tbl_traffic_commodity_data
      (organisation_id, fiscal_year, month, commodity_id, category_id, direction_id, flag_type_id)
    INCLUDE (commodity_group_id, value, created_date, updated_date);

-- Year first: ministry lists and the dashboard, which filter by financial year
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_traffic_commodity_fy_month_org'
               AND object_id = OBJECT_ID('dbo.tbl_traffic_commodity_data'))
  CREATE NONCLUSTERED INDEX IX_traffic_commodity_fy_month_org
    ON dbo.tbl_traffic_commodity_data (fiscal_year, month, organisation_id)
    INCLUDE (commodity_group_id, commodity_id, category_id, direction_id, flag_type_id, value, created_date, updated_date);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_traffic_roro_org_fy_month'
               AND object_id = OBJECT_ID('dbo.tbl_traffic_ro_ro_pax_data'))
  CREATE NONCLUSTERED INDEX IX_traffic_roro_org_fy_month
    ON dbo.tbl_traffic_ro_ro_pax_data (organisation_id, fiscal_year, month)
    INCLUDE (ro_ro_traffic, ro_pax_traffic, created_date, updated_date);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_traffic_target_fy_org'
               AND object_id = OBJECT_ID('dbo.tbl_traffic_fiscal_target'))
  CREATE NONCLUSTERED INDEX IX_traffic_target_fy_org
    ON dbo.tbl_traffic_fiscal_target (financial_year, organisation_id);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_ministry_access_module_org'
               AND object_id = OBJECT_ID('dbo.ministry_access_module_audit_track'))
  CREATE NONCLUSTERED INDEX IX_ministry_access_module_org
    ON dbo.ministry_access_module_audit_track (module_id, organisation_id)
    INCLUDE (status, expiry_date, financial_year, month_to_unlock, created_at);
