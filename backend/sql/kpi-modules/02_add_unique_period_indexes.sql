-- KPI DGLL / CSL / IMU / SCI (QC KPI-05 / KPI-13): the database refuses a second entry for the same
-- period (financial year, or year + quarter / month) - and a second lighthouse with the same name -
-- even if a request gets past the API checks.
--
-- Each index is added only when the table has no repeats. A table that still has repeats is skipped
-- and named in the output: clean it (for CSL fabrication run 01_remove_csl_fabrication_duplicates.sql
-- first), then run this again. Rows with an empty period are not affected (filtered indexes).
-- Safe to run more than once. Take a backup first.

SET NOCOUNT ON;
DECLARE @added INT = 0, @skipped NVARCHAR(MAX) = N'';

IF OBJECT_ID('dbo.tbl_light_house_master', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_light_house_master_light_house_name' AND object_id = OBJECT_ID('dbo.tbl_light_house_master'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_light_house_master WHERE light_house_name IS NOT NULL GROUP BY light_house_name HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_light_house_master');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_light_house_master_light_house_name ON dbo.tbl_light_house_master (light_house_name) WHERE light_house_name IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_vtms_integration', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_vtms_integration_financial_year' AND object_id = OBJECT_ID('dbo.tbl_vtms_integration'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_vtms_integration WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_vtms_integration');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_vtms_integration_financial_year ON dbo.tbl_vtms_integration (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_nais_uptime', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_nais_uptime_financial_year' AND object_id = OBJECT_ID('dbo.tbl_nais_uptime'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_nais_uptime WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_nais_uptime');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_nais_uptime_financial_year ON dbo.tbl_nais_uptime (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_nais_integration', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_nais_integration_financial_year' AND object_id = OBJECT_ID('dbo.tbl_nais_integration'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_nais_integration WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_nais_integration');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_nais_integration_financial_year ON dbo.tbl_nais_integration (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_kpi_dgll_3_5_1', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_kpi_dgll_3_5_1_finacial_year' AND object_id = OBJECT_ID('dbo.tbl_kpi_dgll_3_5_1'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_kpi_dgll_3_5_1 WHERE finacial_year IS NOT NULL GROUP BY finacial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_kpi_dgll_3_5_1');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_kpi_dgll_3_5_1_finacial_year ON dbo.tbl_kpi_dgll_3_5_1 (finacial_year) WHERE finacial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_kpi_dgll_3_5_2', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_kpi_dgll_3_5_2_year' AND object_id = OBJECT_ID('dbo.tbl_kpi_dgll_3_5_2'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_kpi_dgll_3_5_2 WHERE year IS NOT NULL GROUP BY year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_kpi_dgll_3_5_2');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_kpi_dgll_3_5_2_year ON dbo.tbl_kpi_dgll_3_5_2 (year) WHERE year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_dgll_k_3_6', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_dgll_k_3_6_financialyear' AND object_id = OBJECT_ID('dbo.tbl_dgll_k_3_6'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_dgll_k_3_6 WHERE financialyear IS NOT NULL GROUP BY financialyear HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_dgll_k_3_6');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_dgll_k_3_6_financialyear ON dbo.tbl_dgll_k_3_6 (financialyear) WHERE financialyear IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_vessels_built', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_vessels_built_financial_year' AND object_id = OBJECT_ID('dbo.tbl_csl_vessels_built'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_vessels_built WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_vessels_built');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_vessels_built_financial_year ON dbo.tbl_csl_vessels_built (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_ship_building_orders', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_ship_building_orders_financial_year_financial_quater' AND object_id = OBJECT_ID('dbo.tbl_csl_ship_building_orders'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_ship_building_orders WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL GROUP BY financial_year, financial_quater HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_ship_building_orders');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_ship_building_orders_financial_year_financial_quater ON dbo.tbl_csl_ship_building_orders (financial_year, financial_quater) WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_ship_delivery_performance', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_ship_delivery_performance_financial_year_financial_quater' AND object_id = OBJECT_ID('dbo.tbl_csl_ship_delivery_performance'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_ship_delivery_performance WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL GROUP BY financial_year, financial_quater HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_ship_delivery_performance');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_ship_delivery_performance_financial_year_financial_quater ON dbo.tbl_csl_ship_delivery_performance (financial_year, financial_quater) WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_capacity_utilization', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_capacity_utilization_financial_year' AND object_id = OBJECT_ID('dbo.tbl_csl_capacity_utilization'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_capacity_utilization WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_capacity_utilization');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_capacity_utilization_financial_year ON dbo.tbl_csl_capacity_utilization (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_fabrication_of_steels', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_fabrication_of_steels_financial_year_month' AND object_id = OBJECT_ID('dbo.tbl_csl_fabrication_of_steels'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_fabrication_of_steels WHERE financial_year IS NOT NULL AND month IS NOT NULL GROUP BY financial_year, month HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_fabrication_of_steels');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_fabrication_of_steels_financial_year_month ON dbo.tbl_csl_fabrication_of_steels (financial_year, month) WHERE financial_year IS NOT NULL AND month IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_fabrication_of_steels_update', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_fabrication_of_steels_update_financial_year' AND object_id = OBJECT_ID('dbo.tbl_csl_fabrication_of_steels_update'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_fabrication_of_steels_update WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_fabrication_of_steels_update');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_fabrication_of_steels_update_financial_year ON dbo.tbl_csl_fabrication_of_steels_update (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_csl_ships_repaired', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_csl_ships_repaired_financial_year_financial_quater' AND object_id = OBJECT_ID('dbo.tbl_csl_ships_repaired'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_csl_ships_repaired WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL GROUP BY financial_year, financial_quater HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_csl_ships_repaired');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_csl_ships_repaired_financial_year_financial_quater ON dbo.tbl_csl_ships_repaired (financial_year, financial_quater) WHERE financial_year IS NOT NULL AND financial_quater IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_1', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_1_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_1'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_1 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_1');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_1_financial_year ON dbo.tbl_imu_k_5_1 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_2', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_2_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_2'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_2 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_2');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_2_financial_year ON dbo.tbl_imu_k_5_2 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_3', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_3_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_3'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_3 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_3');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_3_financial_year ON dbo.tbl_imu_k_5_3 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_4', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_4_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_4'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_4 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_4');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_4_financial_year ON dbo.tbl_imu_k_5_4 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_imu_k_5_5', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_imu_k_5_5_financial_year' AND object_id = OBJECT_ID('dbo.tbl_imu_k_5_5'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_imu_k_5_5 WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_imu_k_5_5');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_imu_k_5_5_financial_year ON dbo.tbl_imu_k_5_5 (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_vessel_availability', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_vessel_availability_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_vessel_availability'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_vessel_availability WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_vessel_availability');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_vessel_availability_financial_year ON dbo.tbl_sci_vessel_availability (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_time_voyage_bulk', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_time_voyage_bulk_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_time_voyage_bulk'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_time_voyage_bulk WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_time_voyage_bulk');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_time_voyage_bulk_financial_year ON dbo.tbl_sci_time_voyage_bulk (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_time_voyage_tanker', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_time_voyage_tanker_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_time_voyage_tanker'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_time_voyage_tanker WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_time_voyage_tanker');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_time_voyage_tanker_financial_year ON dbo.tbl_sci_time_voyage_tanker (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_time_voyage_offshore', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_time_voyage_offshore_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_time_voyage_offshore'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_time_voyage_offshore WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_time_voyage_offshore');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_time_voyage_offshore_financial_year ON dbo.tbl_sci_time_voyage_offshore (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_vessel_availability_linear', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_vessel_availability_linear_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_vessel_availability_linear'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_vessel_availability_linear WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_vessel_availability_linear');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_vessel_availability_linear_financial_year ON dbo.tbl_sci_vessel_availability_linear (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_vessel_procurement', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_vessel_procurement_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_vessel_procurement'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_vessel_procurement WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_vessel_procurement');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_vessel_procurement_financial_year ON dbo.tbl_sci_vessel_procurement (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_secondhand_vessel_procurement', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_secondhand_vessel_procurement_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_secondhand_vessel_procurement'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_secondhand_vessel_procurement WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_secondhand_vessel_procurement');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_secondhand_vessel_procurement_financial_year ON dbo.tbl_sci_secondhand_vessel_procurement (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_ship_dry_docking', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_ship_dry_docking_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_ship_dry_docking'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_ship_dry_docking WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_ship_dry_docking');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_ship_dry_docking_financial_year ON dbo.tbl_sci_ship_dry_docking (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_repair_and_maintanace', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_repair_and_maintanace_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_repair_and_maintanace'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_repair_and_maintanace WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_repair_and_maintanace');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_repair_and_maintanace_financial_year ON dbo.tbl_sci_repair_and_maintanace (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_sale_and_recycling_oldvessels_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_sale_and_recycling_oldvessels WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_sale_and_recycling_oldvessels');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_sale_and_recycling_oldvessels_financial_year ON dbo.tbl_sci_sale_and_recycling_oldvessels (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_sale_and_recycling_oldvessels_green_recycling_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_sale_and_recycling_oldvessels_green_recycling');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_sale_and_recycling_oldvessels_green_recycling_financial_year ON dbo.tbl_sci_sale_and_recycling_oldvessels_green_recycling (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_manning_of_owned_ships', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_manning_of_owned_ships_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_manning_of_owned_ships'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_manning_of_owned_ships WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_manning_of_owned_ships');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_manning_of_owned_ships_financial_year ON dbo.tbl_sci_manning_of_owned_ships (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

IF OBJECT_ID('dbo.tbl_sci_ship_management_business', 'U') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UX_tbl_sci_ship_management_business_financial_year' AND object_id = OBJECT_ID('dbo.tbl_sci_ship_management_business'))
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.tbl_sci_ship_management_business WHERE financial_year IS NOT NULL GROUP BY financial_year HAVING COUNT(*) > 1)
        SET @skipped = CONCAT(@skipped, N' tbl_sci_ship_management_business');
    ELSE
    BEGIN
        CREATE UNIQUE INDEX UX_tbl_sci_ship_management_business_financial_year ON dbo.tbl_sci_ship_management_business (financial_year) WHERE financial_year IS NOT NULL;
        SET @added += 1;
    END
END

PRINT CONCAT('Unique period indexes added: ', @added);
IF @skipped <> N'' PRINT CONCAT('Skipped (repeated periods - clean them first):', @skipped);
