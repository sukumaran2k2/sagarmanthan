import { pool } from "../../db.js";
import fs from 'fs';

async function getKpiTimePerformanceData(req, res) {
    const { fiscalYear, month, organisationId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("month", month);
        request.input("organisationId", organisationId);

        const result = await request.query(`
            SELECT * 
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @fiscalYear 
            AND month = @month AND organisation_id = @organisationId
        `);

        return res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching KPI time performance data:", error);
        return res.sendStatus(500);
    }
}

async function submitKpiTimePerformanceData(req, res) {
    const {
        fiscalYear, month,
        avgDryBulkTRT, avgBreakBulkTRT, avgLiquidBulkTRT, avgContainerTRT, avgOverallTRT,
        medianDryBulkTRT, medianBreakBulkTRT, medianLiquidBulkTRT, medianContainerTRT, medianOverallTRT,
        ytdmedianDryBulkTRT, ytdmedianBreakBulkTRT, ytdmedianLiquidBulkTRT, ytdmedianContainerTRT, ytdmedianOverallTRT,
        dryBulkOSBD, breakBulkOSBD, liquidBulkOSBD, containerOSBD, overallOSBD, containerOsbdTeus,
        effectiveDryBulkOSBD, effectiveBreakBulkOSBD, effectiveLiquidBulkOSBD,
        effectiveContainerOSBD, effectiveOverallOSBD, effectiveContainerOsbdTeus,
        avgDryBulkIdleTime, avgBreakBulkIdleTime, avgLiquidBulkIdleTime, avgContainerIdleTime, avgOverallIdleTime,
        avgDryBulkWaitingTimePort, avgBreakBulkWaitingTimePort, avgLiquidBulkWaitingTimePort,
        avgContainerWaitingTimePort, avgOverallWaitingTimePort,
        avgDryBulkWaitingTimeNonPort, avgBreakBulkWaitingTimeNonPort, avgLiquidBulkWaitingTimeNonPort,
        avgContainerWaitingTimeNonPort, avgOverallWaitingTimeNonPort,
        dryBulkVesselHandled, breakBulkVesselHandled, liquidBulkVesselHandled, containerVesselHandled, totalSailedVesselHandled,
        dryBulkCargoHandled, breakBulkCargoHandled, liquidBulkCargoHandled, containerCargoHandled, totalCargoHandled,
        exportDwellTime, importDwellTime,
        dryBulkEfficiency, breakBulkEfficiency, liquidBulkEfficiency,unloadingdryBulkEfficiency,
        unloadingbreakBulkEfficiency,unloadingliquidBulkEfficiency,
        grossCraneProductivity,
        avgContainerTRT1,avgContainerTRT2,avgContainerTRT3,avgContainerTRT4,avgContainerTRT5,avgContainerTRT6,avgContainerTRT7,avgContainerTRT8,
        avgContainerTRT9,avgContainerTRT10,medianContainerTRT1,medianContainerTRT2,medianContainerTRT3,medianContainerTRT4,medianContainerTRT5,medianContainerTRT6,
        medianContainerTRT7,medianContainerTRT8,medianContainerTRT9,medianContainerTRT10,ytdmedianContainerTRT1,ytdmedianContainerTRT2,ytdmedianContainerTRT3,
        ytdmedianContainerTRT4,ytdmedianContainerTRT5,ytdmedianContainerTRT6,ytdmedianContainerTRT7,ytdmedianContainerTRT8,ytdmedianContainerTRT9,ytdmedianContainerTRT10,
        containerVesselTRT1,containerVesselTRT2,containerVesselTRT3,containerVesselTRT4,containerVesselTRT5,containerVesselTRT6,containerVesselTRT7,
        containerVesselTRT8,containerVesselTRT9,containerVesselTRT10,
        organisationId, userId
    } = req.body;

    const conn = await pool;

    try {
        const request = conn.request();

        request.input("fiscalYear", fiscalYear);
        request.input("month", month);
        request.input("averageDryBulkTRT", avgDryBulkTRT);
        request.input("averageBreakBulkTRT", avgBreakBulkTRT);
        request.input("averageLiquidBulkTRT", avgLiquidBulkTRT);
        request.input("averageContainerTRT", avgContainerTRT);
        request.input("averageTRTOverall", avgOverallTRT);

        request.input("medianDryBulkTRT", medianDryBulkTRT);
        request.input("medianBreakBulkTRT", medianBreakBulkTRT);
        request.input("medianLiquidBulkTRT", medianLiquidBulkTRT);
        request.input("medianContainerTRT", medianContainerTRT);
        request.input("medianOverallTRT", medianOverallTRT);

        request.input("ytdmedianDryBulkTRT", ytdmedianDryBulkTRT);
        request.input("ytdmedianBreakBulkTRT", ytdmedianBreakBulkTRT);
        request.input("ytdmedianLiquidBulkTRT", ytdmedianLiquidBulkTRT);
        request.input("ytdmedianContainerTRT", ytdmedianContainerTRT);
        request.input("ytdmedianOverallTRT", ytdmedianOverallTRT);

        request.input("dryBulkOSBD", dryBulkOSBD);
        request.input("breakBulkOSBD", breakBulkOSBD);
        request.input("liquidBulkOSBD", liquidBulkOSBD);
        request.input("containerOSBD", containerOSBD);
        request.input("overallOSBD", overallOSBD);
        request.input("containerOsbdTeus", containerOsbdTeus);

        request.input("effectiveDryBulkOSBD", effectiveDryBulkOSBD);
        request.input("effectiveBreakBulkOSBD", effectiveBreakBulkOSBD);
        request.input("effectiveLiquidBulkOSBD", effectiveLiquidBulkOSBD);
        request.input("effectiveContainerOSBD", effectiveContainerOSBD);
        request.input("effectiveOverallOSBD", effectiveOverallOSBD);
        request.input("effectiveContainerOsbdTeus", effectiveContainerOsbdTeus);

        request.input("averageDryBulkIdleTime", avgDryBulkIdleTime);
        request.input("averageBreakBulkIdleTime", avgBreakBulkIdleTime);
        request.input("averageLiquidBulkIdleTime", avgLiquidBulkIdleTime);
        request.input("averageContainerIdleTime", avgContainerIdleTime);
        request.input("overallAverageIdleTime", avgOverallIdleTime);

        request.input("averageDryBulkWaitingTimePort", avgDryBulkWaitingTimePort);
        request.input("averageBreakBulkWaitingTimePort", avgBreakBulkWaitingTimePort);
        request.input("averageLiquidBulkWaitingTimePort", avgLiquidBulkWaitingTimePort);
        request.input("averageContainerWaitingTimePort", avgContainerWaitingTimePort);
        request.input("overallWaitingTimePort", avgOverallWaitingTimePort);

        request.input("averageDryBulkWaitingTimeNonPort", avgDryBulkWaitingTimeNonPort);
        request.input("averageBreakBulkWaitingTimeNonPort", avgBreakBulkWaitingTimeNonPort);
        request.input("averageLiquidBulkWaitingTimeNonPort", avgLiquidBulkWaitingTimeNonPort);
        request.input("averageContainerWaitingTimeNonPort", avgContainerWaitingTimeNonPort);
        request.input("overallWaitingTimeNonPort", avgOverallWaitingTimeNonPort);

        request.input("dryBulkVesselHandled", dryBulkVesselHandled);
        request.input("breakBulkVesselHandled", breakBulkVesselHandled);
        request.input("liquidBulkVesselHandled", liquidBulkVesselHandled);
        request.input("containerVesselHandled", containerVesselHandled);
        request.input("totalSailedVesselHandled", totalSailedVesselHandled);
      

        request.input("dryBulkCargoHandled", dryBulkCargoHandled);
        request.input("breakBulkCargoHandled", breakBulkCargoHandled);
        request.input("liquidBulkCargoHandled", liquidBulkCargoHandled);
        request.input("containerCargoHandled", containerCargoHandled);
        request.input("totalCargoHandled", totalCargoHandled);

        request.input("exportDwellTime", exportDwellTime);
        request.input("importDwellTime", importDwellTime);

        request.input("dryBulkEfficiency", dryBulkEfficiency);
        request.input("breakBulkEfficiency", breakBulkEfficiency);
        request.input("liquidBulkEfficiency", liquidBulkEfficiency);
        request.input("unloadingdryBulkEfficiency", unloadingdryBulkEfficiency);
        request.input("unloadingbreakBulkEfficiency", unloadingbreakBulkEfficiency);
        request.input("unloadingliquidBulkEfficiency", unloadingliquidBulkEfficiency);

        request.input("grossCraneProductivity", grossCraneProductivity);

        request.input("avgContainerTRT1", avgContainerTRT1);
        request.input("avgContainerTRT2", avgContainerTRT2);
        request.input("avgContainerTRT3", avgContainerTRT3);
        request.input("avgContainerTRT4", avgContainerTRT4);
        request.input("avgContainerTRT5", avgContainerTRT5);
        request.input("avgContainerTRT6", avgContainerTRT6);
        request.input("avgContainerTRT7", avgContainerTRT7);
        request.input("avgContainerTRT8", avgContainerTRT8);
        request.input("avgContainerTRT9", avgContainerTRT9);
        request.input("avgContainerTRT10", avgContainerTRT10);

        request.input("medianContainerTRT1", medianContainerTRT1);
        request.input("medianContainerTRT2", medianContainerTRT2);
        request.input("medianContainerTRT3", medianContainerTRT3);
        request.input("medianContainerTRT4", medianContainerTRT4);
        request.input("medianContainerTRT5", medianContainerTRT5);
        request.input("medianContainerTRT6", medianContainerTRT6);
        request.input("medianContainerTRT7", medianContainerTRT7);
        request.input("medianContainerTRT8", medianContainerTRT8);
        request.input("medianContainerTRT9", medianContainerTRT9);
        request.input("medianContainerTRT10", medianContainerTRT10);

        request.input("ytdmedianContainerTRT1", ytdmedianContainerTRT1);
        request.input("ytdmedianContainerTRT2", ytdmedianContainerTRT2);
        request.input("ytdmedianContainerTRT3", ytdmedianContainerTRT3);
        request.input("ytdmedianContainerTRT4", ytdmedianContainerTRT4);
        request.input("ytdmedianContainerTRT5", ytdmedianContainerTRT5);
        request.input("ytdmedianContainerTRT6", ytdmedianContainerTRT6);
        request.input("ytdmedianContainerTRT7", ytdmedianContainerTRT7);
        request.input("ytdmedianContainerTRT8", ytdmedianContainerTRT8);
        request.input("ytdmedianContainerTRT9", ytdmedianContainerTRT9);
        request.input("ytdmedianContainerTRT10", ytdmedianContainerTRT10);

        request.input("containerVesselTRT1", containerVesselTRT1);
        request.input("containerVesselTRT2", containerVesselTRT2);
        request.input("containerVesselTRT3", containerVesselTRT3);
        request.input("containerVesselTRT4", containerVesselTRT4);
        request.input("containerVesselTRT5", containerVesselTRT5);
        request.input("containerVesselTRT6", containerVesselTRT6);
        request.input("containerVesselTRT7", containerVesselTRT7);
        request.input("containerVesselTRT8", containerVesselTRT8);
        request.input("containerVesselTRT9", containerVesselTRT9);
        request.input("containerVesselTRT10", containerVesselTRT10);

        request.input("organisationId", organisationId);
        request.input("userId", userId);

        const result = await request.query(`
            IF EXISTS (
                SELECT 1
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @fiscalYear AND month = @month AND organisation_id = @organisationId
            )
            BEGIN
                SELECT 0 AS rowsAffected;
            END
            ELSE
            BEGIN
            INSERT INTO tbl_kpi_time_performance (
                fiscal_year, month, average_dry_bulk_trt, average_break_bulk_trt, average_liquid_bulk_trt,
                average_container_trt, average_trt_overall,
                median_dry_bulk_trt, median_break_bulk_trt, median_liquid_bulk_trt,
                median_container_trt, median_trt_overall,
                ytd_median_dry_bulk_trt, ytd_median_break_bulk_trt, ytd_median_liquid_bulk_trt,
                ytd_median_container_trt, ytd_median_trt_overall,
                dry_bulk_osbd, break_bulk_osbd, liquid_bulk_osbd, container_osbd,
                osbd_overall, container_osbd_teus,
                effective_dry_bulk_osbd, effective_break_bulk_osbd, effective_liquid_bulk_osbd,
                effective_container_osbd, effective_osbd_overall, effective_container_osbd_teus,
                average_dry_bulk_idle_time, average_break_bulk_idle_time, average_liquid_bulk_idle_time,
                average_container_idle_time, overall_average_idle_time,
                average_dry_bulk_waiting_time_port, average_break_bulk_waiting_time_port, average_liquid_bulk_waiting_time_port,
                average_container_waiting_time_port, overall_waiting_time_port,
                average_dry_bulk_waiting_time_non_port, average_break_bulk_waiting_time_non_port, average_liquid_bulk_waiting_time_non_port,
                average_container_waiting_time_non_port, overall_waiting_time_non_port,
                dry_bulk_vessel_handled, break_bulk_vessel_handled,liquid_bulk_cargo_handled,unloading_dry_bulk_efficiency,unloading_break_bulk_efficiency,unloading_liquid_bulk_efficiency,
                container_vessel_handled, total_sailed_vessel_handled,
                dry_bulk_cargo_handled, break_bulk_cargo_handled,liquid_bulk_vessel_handled ,
                container_cargo_handled, total_cargo_handled,
                export_dwell_time, import_dwell_time,
                dry_bulk_efficiency, break_bulk_efficiency, liquid_bulk_efficiency,
                gross_crane_productivity,
                avg_container_trt_less_than_251,
                avg_container_trt_251_to_500,
                avg_container_trt_501_to_1000,
                avg_container_trt_1001_to_1500,
                avg_container_trt_1501_to_2000,
                avg_container_trt_2001_to_2500,
                avg_container_trt_2501_to_3000,
                avg_container_trt_3001_to_4000,
                avg_container_trt_4001_to_6000,
                avg_container_trt_greater_than_6000,
                median_container_trt_less_than_251,
                median_container_trt_251_to_500,
                median_container_trt_501_to_1000,
                median_container_trt_1001_to_1500,
                median_container_trt_1501_to_2000,
                median_container_trt_2001_to_2500,
                median_container_trt_2501_to_3000,
                median_container_trt_3001_to_4000,
                median_container_trt_4001_to_6000,
                median_container_trt_greater_than_6000,
                ytd_median_container_trt_less_than_251,
                ytd_median_container_trt_251_to_500,
                ytd_median_container_trt_501_to_1000,
                ytd_median_container_trt_1001_to_1500,
                ytd_median_container_trt_1501_to_2000,
                ytd_median_container_trt_2001_to_2500,
                ytd_median_container_trt_2501_to_3000,
                ytd_median_container_trt_3001_to_4000,
                ytd_median_container_trt_4001_to_6000,
                ytd_median_container_trt_greater_than_6000,
                vessel_container_less_than_251 ,
                vessel_container_251_to_500 ,
                vessel_container_501_to_1000 ,
                vessel_container_1001_to_1500 ,
                vessel_container_1501_to_2000 ,
                vessel_container_2001_to_2500 ,
                vessel_container_2501_to_3000 ,
                vessel_container_3001_to_4000 ,
                vessel_container_4001_to_6000 ,
                vessel_container_greater_than_6000,
                organisation_id, created_by, created_date
            )
            VALUES (
                @fiscalYear, @month, @averageDryBulkTRT, @averageBreakBulkTRT, @averageLiquidBulkTRT,
                @averageContainerTRT, @averageTRTOverall,
                @medianDryBulkTRT, @medianBreakBulkTRT, @medianLiquidBulkTRT,
                @medianContainerTRT, @medianOverallTRT,
                @ytdmedianDryBulkTRT, @ytdmedianBreakBulkTRT, @ytdmedianLiquidBulkTRT, @ytdmedianContainerTRT, @ytdmedianOverallTRT,
                @dryBulkOSBD, @breakBulkOSBD, @liquidBulkOSBD, @containerOSBD,
                @overallOSBD, @containerOsbdTeus,
                @effectiveDryBulkOSBD, @effectiveBreakBulkOSBD, @effectiveLiquidBulkOSBD,
                @effectiveContainerOSBD, @effectiveOverallOSBD, @effectiveContainerOsbdTeus,
                @averageDryBulkIdleTime, @averageBreakBulkIdleTime, @averageLiquidBulkIdleTime,
                @averageContainerIdleTime, @overallAverageIdleTime,
                @averageDryBulkWaitingTimePort, @averageBreakBulkWaitingTimePort, @averageLiquidBulkWaitingTimePort,
                @averageContainerWaitingTimePort, @overallWaitingTimePort,
                @averageDryBulkWaitingTimeNonPort, @averageBreakBulkWaitingTimeNonPort, @averageLiquidBulkWaitingTimeNonPort,
                @averageContainerWaitingTimeNonPort, @overallWaitingTimeNonPort,
                @dryBulkVesselHandled, @breakBulkVesselHandled,@liquidBulkCargoHandled,
                @unloadingdryBulkEfficiency, @unloadingbreakBulkEfficiency,@unloadingliquidBulkEfficiency,
                @containerVesselHandled, @totalSailedVesselHandled,
                @dryBulkCargoHandled, @breakBulkCargoHandled, @liquidBulkVesselHandled,
                @containerCargoHandled, @totalCargoHandled,
                @exportDwellTime, @importDwellTime,
                @dryBulkEfficiency, @breakBulkEfficiency, @liquidBulkEfficiency,
                @grossCraneProductivity,

                @avgContainerTRT1,@avgContainerTRT2,@avgContainerTRT3,@avgContainerTRT4,@avgContainerTRT5,
                @avgContainerTRT6,@avgContainerTRT7,@avgContainerTRT8,@avgContainerTRT9,@avgContainerTRT10,
                
                @medianContainerTRT1,@medianContainerTRT2,@medianContainerTRT3,@medianContainerTRT4,@medianContainerTRT5,
                @medianContainerTRT6,@medianContainerTRT7,@medianContainerTRT8,@medianContainerTRT9,@medianContainerTRT10,
                
                @ytdmedianContainerTRT1,@ytdmedianContainerTRT2,@ytdmedianContainerTRT3,@ytdmedianContainerTRT4,@ytdmedianContainerTRT5,
                @ytdmedianContainerTRT6,@ytdmedianContainerTRT7,@ytdmedianContainerTRT8,@ytdmedianContainerTRT9,@ytdmedianContainerTRT10,

                @containerVesselTRT1,@containerVesselTRT2,@containerVesselTRT3,@containerVesselTRT4,@containerVesselTRT5,@containerVesselTRT6,@containerVesselTRT7,
                @containerVesselTRT8,@containerVesselTRT9,@containerVesselTRT10,
                
                @organisationId, @userId, getDate()
            )
            SELECT 1 AS rowsAffected;
            END
        `);

        const inserted = result.recordset?.[0]?.rowsAffected === 1;
        if (inserted) {
            return res.status(201).send("KPI time performance data added successfully.");
        } else {
            return res.status(409).send("Data for this Financial Year and Month already exists.");
        }
    } catch (error) {
        console.error("Error submitting KPI time performance data:", error);
        return res.sendStatus(500);
    }
}


async function getKpiTimePerformanceList(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const query = `
        SELECT 
          tbl_kpi_time_performance.*,
          mmt_organisation.organisation_name
        FROM 
          tbl_kpi_time_performance
        INNER JOIN 
          mmt_organisation ON tbl_kpi_time_performance.organisation_id = mmt_organisation.organisation_id
        ORDER BY fiscal_year DESC, month DESC
      `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching KPI time performance list:", error);
        res.sendStatus(500);
    }
}


async function updateKpiTimePerformanceData(req, res) {
    const {
        fiscalYear, month,
        avgDryBulkTRT, avgBreakBulkTRT, avgLiquidBulkTRT, avgContainerTRT, avgOverallTRT,
        medianDryBulkTRT, medianBreakBulkTRT, medianLiquidBulkTRT, medianContainerTRT, medianOverallTRT,
         ytdmedianDryBulkTRT, ytdmedianBreakBulkTRT, ytdmedianLiquidBulkTRT, ytdmedianContainerTRT, ytdmedianOverallTRT,
        dryBulkOSBD, breakBulkOSBD, liquidBulkOSBD, containerOSBD, overallOSBD, containerOsbdTeus,
        effectiveDryBulkOSBD, effectiveBreakBulkOSBD, effectiveLiquidBulkOSBD,
        effectiveContainerOSBD, effectiveOverallOSBD, effectiveContainerOsbdTeus,
        avgDryBulkIdleTime, avgBreakBulkIdleTime, avgLiquidBulkIdleTime, avgContainerIdleTime, avgOverallIdleTime,
        avgDryBulkWaitingTimePort, avgBreakBulkWaitingTimePort, avgLiquidBulkWaitingTimePort,
        avgContainerWaitingTimePort, avgOverallWaitingTimePort,
        avgDryBulkWaitingTimeNonPort, avgBreakBulkWaitingTimeNonPort, avgLiquidBulkWaitingTimeNonPort,
        avgContainerWaitingTimeNonPort, avgOverallWaitingTimeNonPort,
        dryBulkVesselHandled, breakBulkVesselHandled, liquidBulkVesselHandled, containerVesselHandled, totalSailedVesselHandled,
        dryBulkCargoHandled, breakBulkCargoHandled, liquidBulkCargoHandled, containerCargoHandled, totalCargoHandled,
        exportDwellTime, importDwellTime,
        dryBulkEfficiency, breakBulkEfficiency, liquidBulkEfficiency, unloadingdryBulkEfficiency,
        unloadingbreakBulkEfficiency,unloadingliquidBulkEfficiency,
        grossCraneProductivity,avgContainerTRT1,avgContainerTRT2,avgContainerTRT3,avgContainerTRT4,avgContainerTRT5,avgContainerTRT6,avgContainerTRT7,avgContainerTRT8,
        avgContainerTRT9,avgContainerTRT10,medianContainerTRT1,medianContainerTRT2,medianContainerTRT3,medianContainerTRT4,medianContainerTRT5,medianContainerTRT6,
        medianContainerTRT7,medianContainerTRT8,medianContainerTRT9,medianContainerTRT10,ytdmedianContainerTRT1,ytdmedianContainerTRT2,ytdmedianContainerTRT3,
        ytdmedianContainerTRT4,ytdmedianContainerTRT5,ytdmedianContainerTRT6,ytdmedianContainerTRT7,ytdmedianContainerTRT8,ytdmedianContainerTRT9,ytdmedianContainerTRT10,
        containerVesselTRT1,containerVesselTRT2,containerVesselTRT3,containerVesselTRT4,containerVesselTRT5,containerVesselTRT6,containerVesselTRT7,
        containerVesselTRT8,containerVesselTRT9,containerVesselTRT10,
        organisationId, userId
    } = req.body;

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("month", month);
        request.input("averageDryBulkTRT", avgDryBulkTRT);
        request.input("averageBreakBulkTRT", avgBreakBulkTRT);
        request.input("averageLiquidBulkTRT", avgLiquidBulkTRT);
        request.input("averageContainerTRT", avgContainerTRT);
        request.input("averageTRTOverall", avgOverallTRT);

        request.input("medianDryBulkTRT", medianDryBulkTRT);
        request.input("medianBreakBulkTRT", medianBreakBulkTRT);
        request.input("medianLiquidBulkTRT", medianLiquidBulkTRT);
        request.input("medianContainerTRT", medianContainerTRT);
        request.input("medianOverallTRT", medianOverallTRT);

        request.input("ytdmedianDryBulkTRT", ytdmedianDryBulkTRT);
        request.input("ytdmedianBreakBulkTRT", ytdmedianBreakBulkTRT);
        request.input("ytdmedianLiquidBulkTRT", ytdmedianLiquidBulkTRT);
        request.input("ytdmedianContainerTRT", ytdmedianContainerTRT);
        request.input("ytdmedianOverallTRT", ytdmedianOverallTRT);

        request.input("dryBulkOSBD", dryBulkOSBD);
        request.input("breakBulkOSBD", breakBulkOSBD);
        request.input("liquidBulkOSBD", liquidBulkOSBD);
        request.input("containerOSBD", containerOSBD);
        request.input("overallOSBD", overallOSBD);
        request.input("containerOsbdTeus", containerOsbdTeus);

        request.input("effectiveDryBulkOSBD", effectiveDryBulkOSBD);
        request.input("effectiveBreakBulkOSBD", effectiveBreakBulkOSBD);
        request.input("effectiveLiquidBulkOSBD", effectiveLiquidBulkOSBD);
        request.input("effectiveContainerOSBD", effectiveContainerOSBD);
        request.input("effectiveOverallOSBD", effectiveOverallOSBD);
        request.input("effectiveContainerOsbdTeus", effectiveContainerOsbdTeus);

        request.input("averageDryBulkIdleTime", avgDryBulkIdleTime);
        request.input("averageBreakBulkIdleTime", avgBreakBulkIdleTime);
        request.input("averageLiquidBulkIdleTime", avgLiquidBulkIdleTime);
        request.input("averageContainerIdleTime", avgContainerIdleTime);
        request.input("overallAverageIdleTime", avgOverallIdleTime);

        request.input("averageDryBulkWaitingTimePort", avgDryBulkWaitingTimePort);
        request.input("averageBreakBulkWaitingTimePort", avgBreakBulkWaitingTimePort);
        request.input("averageLiquidBulkWaitingTimePort", avgLiquidBulkWaitingTimePort);
        request.input("averageContainerWaitingTimePort", avgContainerWaitingTimePort);
        request.input("overallWaitingTimePort", avgOverallWaitingTimePort);

        request.input("averageDryBulkWaitingTimeNonPort", avgDryBulkWaitingTimeNonPort);
        request.input("averageBreakBulkWaitingTimeNonPort", avgBreakBulkWaitingTimeNonPort);
        request.input("averageLiquidBulkWaitingTimeNonPort", avgLiquidBulkWaitingTimeNonPort);
        request.input("averageContainerWaitingTimeNonPort", avgContainerWaitingTimeNonPort);
        request.input("overallWaitingTimeNonPort", avgOverallWaitingTimeNonPort);

        request.input("dryBulkVesselHandled", dryBulkVesselHandled);
        request.input("breakBulkVesselHandled", breakBulkVesselHandled);
        request.input("liquidBulkVesselHandled", liquidBulkVesselHandled);
        request.input("containerVesselHandled", containerVesselHandled);
        request.input("totalSailedVesselHandled", totalSailedVesselHandled);

        request.input("dryBulkCargoHandled", dryBulkCargoHandled);
        request.input("breakBulkCargoHandled", breakBulkCargoHandled);
        request.input("liquidBulkCargoHandled", liquidBulkCargoHandled);
        request.input("containerCargoHandled", containerCargoHandled);
        request.input("totalCargoHandled", totalCargoHandled);

        request.input("exportDwellTime", exportDwellTime);
        request.input("importDwellTime", importDwellTime);

        request.input("dryBulkEfficiency", dryBulkEfficiency);
        request.input("breakBulkEfficiency", breakBulkEfficiency);
        request.input("liquidBulkEfficiency", liquidBulkEfficiency);
        request.input("unloadingdryBulkEfficiency", unloadingdryBulkEfficiency);
        request.input("unloadingbreakBulkEfficiency", unloadingbreakBulkEfficiency);
        request.input("unloadingliquidBulkEfficiency", unloadingliquidBulkEfficiency);

        request.input("grossCraneProductivity", grossCraneProductivity);

        request.input("avgContainerTRT1", avgContainerTRT1);
        request.input("avgContainerTRT2", avgContainerTRT2);
        request.input("avgContainerTRT3", avgContainerTRT3);
        request.input("avgContainerTRT4", avgContainerTRT4);
        request.input("avgContainerTRT5", avgContainerTRT5);
        request.input("avgContainerTRT6", avgContainerTRT6);
        request.input("avgContainerTRT7", avgContainerTRT7);
        request.input("avgContainerTRT8", avgContainerTRT8);
        request.input("avgContainerTRT9", avgContainerTRT9);
        request.input("avgContainerTRT10", avgContainerTRT10);

        request.input("medianContainerTRT1", medianContainerTRT1);
        request.input("medianContainerTRT2", medianContainerTRT2);
        request.input("medianContainerTRT3", medianContainerTRT3);
        request.input("medianContainerTRT4", medianContainerTRT4);
        request.input("medianContainerTRT5", medianContainerTRT5);
        request.input("medianContainerTRT6", medianContainerTRT6);
        request.input("medianContainerTRT7", medianContainerTRT7);
        request.input("medianContainerTRT8", medianContainerTRT8);
        request.input("medianContainerTRT9", medianContainerTRT9);
        request.input("medianContainerTRT10", medianContainerTRT10);

        request.input("ytdmedianContainerTRT1", ytdmedianContainerTRT1);
        request.input("ytdmedianContainerTRT2", ytdmedianContainerTRT2);
        request.input("ytdmedianContainerTRT3", ytdmedianContainerTRT3);
        request.input("ytdmedianContainerTRT4", ytdmedianContainerTRT4);
        request.input("ytdmedianContainerTRT5", ytdmedianContainerTRT5);
        request.input("ytdmedianContainerTRT6", ytdmedianContainerTRT6);
        request.input("ytdmedianContainerTRT7", ytdmedianContainerTRT7);
        request.input("ytdmedianContainerTRT8", ytdmedianContainerTRT8);
        request.input("ytdmedianContainerTRT9", ytdmedianContainerTRT9);
        request.input("ytdmedianContainerTRT10", ytdmedianContainerTRT10);

        request.input("containerVesselTRT1", containerVesselTRT1);
        request.input("containerVesselTRT2", containerVesselTRT2);
        request.input("containerVesselTRT3", containerVesselTRT3);
        request.input("containerVesselTRT4", containerVesselTRT4);
        request.input("containerVesselTRT5", containerVesselTRT5);
        request.input("containerVesselTRT6", containerVesselTRT6);
        request.input("containerVesselTRT7", containerVesselTRT7);
        request.input("containerVesselTRT8", containerVesselTRT8);
        request.input("containerVesselTRT9", containerVesselTRT9);
        request.input("containerVesselTRT10", containerVesselTRT10);


        request.input("organisationId", organisationId);
        request.input("userId", userId);

        const result = await request.query(`
            UPDATE tbl_kpi_time_performance
            SET 
                average_dry_bulk_trt = @averageDryBulkTRT,
                average_break_bulk_trt = @averageBreakBulkTRT,
                average_liquid_bulk_trt = @averageLiquidBulkTRT,
                average_container_trt = @averageContainerTRT,
                average_trt_overall = @averageTRTOverall,
                median_dry_bulk_trt = @medianDryBulkTRT,
                median_break_bulk_trt = @medianBreakBulkTRT,
                median_liquid_bulk_trt = @medianLiquidBulkTRT,
                median_container_trt = @medianContainerTRT,
                median_trt_overall = @medianOverallTRT,

                ytd_median_dry_bulk_trt = @ytdmedianDryBulkTRT,
                ytd_median_break_bulk_trt = @ytdmedianBreakBulkTRT,
                ytd_median_liquid_bulk_trt = @ytdmedianLiquidBulkTRT,
                ytd_median_container_trt = @ytdmedianContainerTRT,
                ytd_median_trt_overall = @ytdmedianOverallTRT,

                dry_bulk_osbd = @dryBulkOSBD,
                break_bulk_osbd = @breakBulkOSBD,
                liquid_bulk_osbd = @liquidBulkOSBD,
                container_osbd = @containerOSBD,
                osbd_overall = @overallOSBD,
                container_osbd_teus = @containerOsbdTeus,
                effective_dry_bulk_osbd = @effectiveDryBulkOSBD,
                effective_break_bulk_osbd = @effectiveBreakBulkOSBD,
                effective_liquid_bulk_osbd = @effectiveLiquidBulkOSBD,
                effective_container_osbd = @effectiveContainerOSBD,
                effective_osbd_overall = @effectiveOverallOSBD,
                effective_container_osbd_teus = @effectiveContainerOsbdTeus,
                average_dry_bulk_idle_time = @averageDryBulkIdleTime,
                average_break_bulk_idle_time = @averageBreakBulkIdleTime,
                average_liquid_bulk_idle_time = @averageLiquidBulkIdleTime,
                average_container_idle_time = @averageContainerIdleTime,
                overall_average_idle_time = @overallAverageIdleTime,
                average_dry_bulk_waiting_time_port = @averageDryBulkWaitingTimePort,
                average_break_bulk_waiting_time_port = @averageBreakBulkWaitingTimePort,
                average_liquid_bulk_waiting_time_port = @averageLiquidBulkWaitingTimePort,
                average_container_waiting_time_port = @averageContainerWaitingTimePort,
                overall_waiting_time_port = @overallWaitingTimePort,
                average_dry_bulk_waiting_time_non_port = @averageDryBulkWaitingTimeNonPort,
                average_break_bulk_waiting_time_non_port = @averageBreakBulkWaitingTimeNonPort,
                average_liquid_bulk_waiting_time_non_port = @averageLiquidBulkWaitingTimeNonPort,
                average_container_waiting_time_non_port = @averageContainerWaitingTimeNonPort,
                overall_waiting_time_non_port = @overallWaitingTimeNonPort,
                dry_bulk_vessel_handled = @dryBulkVesselHandled,
                break_bulk_vessel_handled = @breakBulkVesselHandled,
                liquid_bulk_vessel_handled = @liquidBulkVesselHandled,
                container_vessel_handled = @containerVesselHandled,
                total_sailed_vessel_handled = @totalSailedVesselHandled,
                dry_bulk_cargo_handled = @dryBulkCargoHandled,
                break_bulk_cargo_handled = @breakBulkCargoHandled,
                liquid_bulk_cargo_handled = @liquidBulkCargoHandled,
                container_cargo_handled = @containerCargoHandled,
                total_cargo_handled = @totalCargoHandled,
                export_dwell_time = @exportDwellTime,
                import_dwell_time = @importDwellTime,
                dry_bulk_efficiency = @dryBulkEfficiency,
                break_bulk_efficiency = @breakBulkEfficiency,
                liquid_bulk_efficiency = @liquidBulkEfficiency,
                unloading_dry_bulk_efficiency = @unloadingdryBulkEfficiency,
                unloading_break_bulk_efficiency = @unloadingbreakBulkEfficiency,
                unloading_liquid_bulk_efficiency = @unloadingliquidBulkEfficiency,
                gross_crane_productivity = @grossCraneProductivity,

                avg_container_trt_less_than_251 = @avgContainerTRT1,
                avg_container_trt_251_to_500 = @avgContainerTRT2,
                avg_container_trt_501_to_1000 = @avgContainerTRT3,
                avg_container_trt_1001_to_1500 = @avgContainerTRT4,
                avg_container_trt_1501_to_2000 = @avgContainerTRT5,
                avg_container_trt_2001_to_2500 = @avgContainerTRT6,
                avg_container_trt_2501_to_3000 = @avgContainerTRT7,
                avg_container_trt_3001_to_4000 = @avgContainerTRT8,
                avg_container_trt_4001_to_6000 = @avgContainerTRT9,
                avg_container_trt_greater_than_6000 = @avgContainerTRT10,

                median_container_trt_less_than_251 = @medianContainerTRT1,
                median_container_trt_251_to_500 = @medianContainerTRT2,
                median_container_trt_501_to_1000 = @medianContainerTRT3,
                median_container_trt_1001_to_1500 = @medianContainerTRT4,
                median_container_trt_1501_to_2000 = @medianContainerTRT5,
                median_container_trt_2001_to_2500 = @medianContainerTRT6,
                median_container_trt_2501_to_3000 = @medianContainerTRT7,
                median_container_trt_3001_to_4000 = @medianContainerTRT8,
                median_container_trt_4001_to_6000 = @medianContainerTRT9,
                median_container_trt_greater_than_6000 = @medianContainerTRT10,

                ytd_median_container_trt_less_than_251 = @ytdmedianContainerTRT1,
                ytd_median_container_trt_251_to_500 = @ytdmedianContainerTRT2,
                ytd_median_container_trt_501_to_1000 = @ytdmedianContainerTRT3,
                ytd_median_container_trt_1001_to_1500 = @ytdmedianContainerTRT4,
                ytd_median_container_trt_1501_to_2000 = @ytdmedianContainerTRT5,
                ytd_median_container_trt_2001_to_2500 = @ytdmedianContainerTRT6,
                ytd_median_container_trt_2501_to_3000 = @ytdmedianContainerTRT7,
                ytd_median_container_trt_3001_to_4000 = @ytdmedianContainerTRT8,
                ytd_median_container_trt_4001_to_6000 = @ytdmedianContainerTRT9,
                ytd_median_container_trt_greater_than_6000 = @ytdmedianContainerTRT10,

                vessel_container_less_than_251 = @containerVesselTRT1,
                vessel_container_251_to_500 = @containerVesselTRT2,
                vessel_container_501_to_1000 = @containerVesselTRT3,
                vessel_container_1001_to_1500 = @containerVesselTRT4,
                vessel_container_1501_to_2000 = @containerVesselTRT5,
                vessel_container_2001_to_2500 = @containerVesselTRT6,
                vessel_container_2501_to_3000 = @containerVesselTRT7,
                vessel_container_3001_to_4000 = @containerVesselTRT8,
                vessel_container_4001_to_6000 = @containerVesselTRT9,
                vessel_container_greater_than_6000 = @containerVesselTRT10,

                updated_by = @userId,
                updated_date = getDate()
            WHERE fiscal_year = @fiscalYear AND month = @month AND organisation_id = @organisationId
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: 'KPI time performance data updated successfully.' });
        } else {
            return res.status(404).json({ message: 'No record found to update.' });
        }
    } catch (error) {
        console.error("Error updating KPI time performance data:", error);
        return res.status(500).json({ message: 'Error updating KPI time performance data.' });
    }
}


async function submitKpiTimePerformanceTargetData(req, res) {
    const { financialYear, kpiTypeId, targets, userId } = req.body;

    try {
        const conn = await pool;

        for (let item of targets) {
            const request = conn.request();

            request.input("financialYear", financialYear);
            request.input("kpiTypeId", kpiTypeId);
            request.input("organisationId", item.organisationId);
            request.input("targetValue", item.targetValue);
            request.input("isOverall", item.isOverall ? 1 : 0);
            request.input("totalSmpa", item.totalSmpa ? 1 : 0);
            request.input("userId", userId);

            const updateResult = await request.query(`
                UPDATE tbl_kpi_time_performance_target
                SET target_value = @targetValue,
                    updated_by = @userId,
                    updated_date = GETDATE()
                WHERE financial_year = @financialYear
                  AND kpi_type_id = @kpiTypeId
                  AND is_overall = @isOverall
                  AND (
                        (@organisationId IS NULL AND organisation_id IS NULL)
                        OR organisation_id = @organisationId
                  )
            `);

            if (updateResult.rowsAffected[0] === 0) {
                await request.query(`
                    INSERT INTO tbl_kpi_time_performance_target
                    (financial_year, kpi_type_id, organisation_id, target_value,is_totalSmpa, is_overall, created_by, created_date)
                    VALUES
                    (@financialYear, @kpiTypeId, @organisationId, @targetValue,@totalSmpa, @isOverall, @userId, GETDATE())
                `);
            }
        }

        return res.status(201).send("KPI target data submitted or updated successfully.");
    } catch (error) {
        console.error("Error submitting or updating KPI target data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function getKpiTimePerformanceTargetData(req, res) {
    const { financialYear, kpiTypeId } = req.query;

    if (!financialYear || !kpiTypeId) {
        return res.status(400).json({ message: "Missing required query parameters." });
    }

    try {
        const conn = await pool;
        const request = conn.request();

        request.input("financialYear", financialYear);
        request.input("kpiTypeId", parseInt(kpiTypeId));

        const result = await request.query(`
            SELECT 
                organisation_id,
                is_overall,
                is_totalSmpa,
                target_value
            FROM tbl_kpi_time_performance_target
            WHERE financial_year = @financialYear AND kpi_type_id = @kpiTypeId
        `);

        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching KPI target data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function getMajorPorts(req, res) {
    try {
        const conn = await pool;
        const result = await conn.request().query(`
            SELECT organisation_id, organisation_name
            FROM mmt_organisation
            WHERE organisation_usermatrix_category_id = 2 AND status = 1
        `);
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error("Error fetching major ports:", err);
        res.sendStatus(500);
    }
}


async function getKpiTypes(req, res) {
    try {
        const conn = await pool;
        const result = await conn.request().query(`
            SELECT kpi_type_id, kpi_name
            FROM mmt_kpi_time_performance_type
        `);

        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching KPI types:", error);
        res.sendStatus(500);
    }
}

async function getTargetKpiTimePerformanceList(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const query = `
            -- organization targets
            SELECT 
                t.financial_year,
                o.organisation_name,
                o.organisation_id,
                
                MAX(CASE WHEN t.kpi_type_id = 1 THEN t.target_value END) AS target_avg_vessel_trt,
                MAX(CASE WHEN t.kpi_type_id = 2 THEN t.target_value END) AS target_median_vessel_trt,
                MAX(CASE WHEN t.kpi_type_id = 3 THEN t.target_value END) AS target_osbd,
                MAX(CASE WHEN t.kpi_type_id = 4 THEN t.target_value END) AS target_container_osbd,
                MAX(CASE WHEN t.kpi_type_id = 5 THEN t.target_value END) AS target_effective_osbd,
                MAX(CASE WHEN t.kpi_type_id = 6 THEN t.target_value END) AS target_effective_container_osbd,
                MAX(CASE WHEN t.kpi_type_id = 7 THEN t.target_value END) AS target_avg_pbd_port,
                MAX(CASE WHEN t.kpi_type_id = 8 THEN t.target_value END) AS target_avg_pbd_non_port,
                MAX(CASE WHEN t.kpi_type_id = 9 THEN t.target_value END) AS target_dwell_time_import,
                MAX(CASE WHEN t.kpi_type_id = 10 THEN t.target_value END) AS target_dwell_time_export,
                MAX(CASE WHEN t.kpi_type_id = 11 THEN t.target_value END) AS target_idle_time_percent,
                MAX(COALESCE(t.updated_date, t.created_date)) AS updated_date,

                0 AS is_overall,
                0 AS is_totalSmpa

            FROM 
                tbl_kpi_time_performance_target t
            INNER JOIN 
                mmt_organisation o ON t.organisation_id = o.organisation_id
            WHERE
                t.is_overall = 0 AND t.is_totalSmpa = 0
            GROUP BY 
                t.financial_year, o.organisation_id, o.organisation_name

            UNION ALL

            -- Overall targets
            SELECT 
                t.financial_year,
                'Overall' AS organisation_name,
                NULL AS organisation_id,
                
                MAX(CASE WHEN t.kpi_type_id = 1 THEN t.target_value END) AS target_avg_vessel_trt,
                MAX(CASE WHEN t.kpi_type_id = 2 THEN t.target_value END) AS target_median_vessel_trt,
                MAX(CASE WHEN t.kpi_type_id = 3 THEN t.target_value END) AS target_osbd,
                MAX(CASE WHEN t.kpi_type_id = 4 THEN t.target_value END) AS target_container_osbd,
                MAX(CASE WHEN t.kpi_type_id = 5 THEN t.target_value END) AS target_effective_osbd,
                MAX(CASE WHEN t.kpi_type_id = 6 THEN t.target_value END) AS target_effective_container_osbd,
                MAX(CASE WHEN t.kpi_type_id = 7 THEN t.target_value END) AS target_avg_pbd_port,
                MAX(CASE WHEN t.kpi_type_id = 8 THEN t.target_value END) AS target_avg_pbd_non_port,
                MAX(CASE WHEN t.kpi_type_id = 9 THEN t.target_value END) AS target_dwell_time_import,
                MAX(CASE WHEN t.kpi_type_id = 10 THEN t.target_value END) AS target_dwell_time_export,
                MAX(CASE WHEN t.kpi_type_id = 11 THEN t.target_value END) AS target_idle_time_percent,
                MAX(COALESCE(t.updated_date, t.created_date)) AS updated_date,

                1 AS is_overall,
                0 AS is_totalSmpa

            FROM 
                tbl_kpi_time_performance_target t
            WHERE
                t.is_overall = 1
            GROUP BY 
                t.financial_year

            UNION ALL

            -- Total SMPA targets
            SELECT 
                t.financial_year,
                'Total SMPA' AS organisation_name,
                NULL AS organisation_id,
                
                MAX(CASE WHEN t.kpi_type_id = 1 THEN t.target_value END) AS target_avg_vessel_trt,
                MAX(CASE WHEN t.kpi_type_id = 2 THEN t.target_value END) AS target_median_vessel_trt,
                MAX(CASE WHEN t.kpi_type_id = 3 THEN t.target_value END) AS target_osbd,
                MAX(CASE WHEN t.kpi_type_id = 4 THEN t.target_value END) AS target_container_osbd,
                MAX(CASE WHEN t.kpi_type_id = 5 THEN t.target_value END) AS target_effective_osbd,
                MAX(CASE WHEN t.kpi_type_id = 6 THEN t.target_value END) AS target_effective_container_osbd,
                MAX(CASE WHEN t.kpi_type_id = 7 THEN t.target_value END) AS target_avg_pbd_port,
                MAX(CASE WHEN t.kpi_type_id = 8 THEN t.target_value END) AS target_avg_pbd_non_port,
                MAX(CASE WHEN t.kpi_type_id = 9 THEN t.target_value END) AS target_dwell_time_import,
                MAX(CASE WHEN t.kpi_type_id = 10 THEN t.target_value END) AS target_dwell_time_export,
                MAX(CASE WHEN t.kpi_type_id = 11 THEN t.target_value END) AS target_idle_time_percent,
                MAX(COALESCE(t.updated_date, t.created_date)) AS updated_date,
                0 AS is_overall,
                1 AS is_totalSmpa

            FROM 
                tbl_kpi_time_performance_target t
            WHERE
                t.is_totalSmpa = 1
            GROUP BY 
                t.financial_year

            ORDER BY 
                financial_year DESC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching KPI target time performance list:", error);
        res.sendStatus(500);
    }
}

export default {
    submitKpiTimePerformanceData, getKpiTimePerformanceData, getKpiTimePerformanceList, updateKpiTimePerformanceData,
    submitKpiTimePerformanceTargetData, getKpiTimePerformanceTargetData, getMajorPorts, getKpiTypes, getTargetKpiTimePerformanceList
};
