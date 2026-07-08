import { pool } from "../../db.js";

const getFinancialYear = (year, month) => {
    let financialYearStart;
    let financialYearEnd;

    year = Number(year);

    if (month >= 4) {
        financialYearStart = `${year}`;
        financialYearEnd = `${year + 1}`;
    } else {
        financialYearStart = `${year - 1}`;
        financialYearEnd = `${year}`;
    }

    // console.log(`Start: ${financialYearStart}, End: ${financialYearEnd}`);

    return `${financialYearStart} - ${financialYearEnd}`;
};

async function addMajorPortsData(req, res) {
    const data = req.body;
    // console.log("data",data);
    const conn = await pool;
    const request = conn.request();
    const annuallyFinancialYear = getFinancialYear(data.financialYear, data.month);

    request.input("financialYear", data.financialYear);
    request.input("month", data.month);
    request.input("annuallyFinancialYear", annuallyFinancialYear);
    

    request.input("avgContainerTrt", data.avgContainerTrt);
    request.input("AVGDryBulkMech", data.AVGDryBulkMech);
    request.input("AVGDryBulkConv", data.AVGDryBulkConv);
    request.input("AVGLiquidBulk", data.AVGLiquidBulk);
    request.input("AVGBreakBulk", data.AVGBreakBulk);
    request.input("AVGContainer", data.AVGContainer);
    //JNPA PORTS
    request.input("AvgOAContainer", data.AvgOAContainer);
    request.input("AvgJNPCTContainer", data.AvgJNPCTContainer);
    request.input("AvgNSFTContainer", data.AvgNSFTContainer);
    request.input("AvgNSICTContainer", data.AvgNSICTContainer);
    request.input("AvgAPMTContainer", data.AvgAPMTContainer);
    request.input("AvgNSIGTContainer", data.AvgNSIGTContainer);
    request.input("AvgBMCTContainer", data.AvgBMCTContainer);
    request.input("AvgNSDTContainer", data.AvgNSDTContainer);

    request.input("avgTotalTrt", data.avgTotalTrt);
    request.input("ATTUPDryBulkMech", data.ATTUPDryBulkMech);
    request.input("ATTUPDryBulkConv", data.ATTUPDryBulkConv);
    request.input("ATTUPLiquidBulk", data.ATTUPLiquidBulk);
    request.input("ATTUPBreakBulk", data.ATTUPBreakBulk);
    request.input("ATTUPContainer", data.ATTUPContainer);
    //JNPA PORTS
    request.input("AttupOAContainer", data.AttupOAContainer);
    request.input("AttupJNPCTContainer", data.AttupJNPCTContainer);
    request.input("AttupNSFTContainer", data.AttupNSFTContainer);
    request.input("AttupNSICTContainer", data.AttupNSICTContainer);
    request.input("AttupAPMTContainer", data.AttupAPMTContainer);
    request.input("AttupNSIGTContainer", data.AttupNSIGTContainer);
    request.input("AttupBMCTContainer", data.AttupBMCTContainer);
    request.input("AttupNSDTContainer", data.AttupNSDTContainer);

    request.input("avgOutputPerShipBerthday", data.avgOutputPerShipBerthday);
    request.input("AOPSBDDryBulkMech", data.AOPSBDDryBulkMech);
    request.input("AOPSBDDryBulkConv", data.AOPSBDDryBulkConv);
    request.input("AOPSBDLiquidBulk", data.AOPSBDLiquidBulk);
    request.input("AOPSBDBreakBulk", data.AOPSBDBreakBulk);
    request.input("AOPSBDContainer", data.AOPSBDContainer);
    //JNPA PORTS
    request.input("AopsbdOAContainer", data.AopsbdOAContainer);
    request.input("AopsbdJNPCTContainer", data.AopsbdJNPCTContainer);
    request.input("AopsbdNSFTContainer", data.AopsbdNSFTContainer);
    request.input("AopsbdNSICTContainer", data.AopsbdNSICTContainer);
    request.input("AopsbdAPMTContainer", data.AopsbdAPMTContainer);
    request.input("AopsbdNSIGTContainer", data.AopsbdNSIGTContainer);
    request.input("AopsbdBMCTContainer", data.AopsbdBMCTContainer);
    request.input("AopsbdNSDTContainer", data.AopsbdNSDTContainer);

    request.input("avgTotalTrtUnderTotalAC", data.avgTotalTrtUnderTotalAC);
    request.input("ATTUTDryBulkMech", data.ATTUTDryBulkMech);
    request.input("ATTUTDryBulkConv", data.ATTUTDryBulkConv);
    request.input("ATTUTLiquidBulk", data.ATTUTLiquidBulk);
    request.input("ATTUTBreakBulk", data.ATTUTBreakBulk);
    request.input("ATTUTContainer", data.ATTUTContainer);
    //JNPA PORTS
    request.input("AttutOAContainer", data.AttutOAContainer);
    request.input("AttutJNPCTContainer", data.AttutJNPCTContainer);
    request.input("AttutNSFTContainer", data.AttutNSFTContainer);
    request.input("AttutNSICTContainer", data.AttutNSICTContainer);
    request.input("AttutAPMTContainer", data.AttutAPMTContainer);
    request.input("AttutNSIGTContainer", data.AttutNSIGTContainer);
    request.input("AttutBMCTContainer", data.AttutBMCTContainer);
    request.input("AttutNSDTContainer", data.AttutNSDTContainer);

    request.input("exportPortDwellTime", data.exportPortDwellTime);
    request.input("importPortDwellTime", data.importPortDwellTime);

    request.input("VesselsHandled", data.VesselsHandled);
    request.input("VHDryBulkMech",data.VHDryBulkMech);
    request.input("VHDryBulkConv",data.VHDryBulkConv);
    request.input("VHLiquidBulk",data.VHLiquidBulk);
    request.input("VHBreakBulk",data.VHBreakBulk);
    request.input("VHContainer",data.VHContainer);
    //JNPA PORTS
    request.input("VhOAContainer", data.VhOAContainer);
    request.input("VhJNPCTContainer", data.VhJNPCTContainer);
    request.input("VhNSFTContainer", data.VhNSFTContainer);
    request.input("VhNSICTContainer", data.VhNSICTContainer);
    request.input("VhAPMTContainer", data.VhAPMTContainer);
    request.input("VhNSIGTContainer", data.VhNSIGTContainer);
    request.input("VhBMCTContainer", data.VhBMCTContainer);
    request.input("VhNSDTContainer", data.VhNSDTContainer);

    request.input("avgPreBerthingTimePort", data.avgPreBerthingTimePort);
    request.input("APBTDryBulkMech",data.APBTDryBulkMech);
    request.input("APBTDryBulkConv",data.APBTDryBulkConv);
    request.input("APBTLiquidBulk",data.APBTLiquidBulk);
    request.input("APBTBreakBulk",data.APBTBreakBulk);
    request.input("APBTContainer",data.APBTContainer);
    //JNPA PORTS
    request.input("ApbtOAContainer", data.ApbtOAContainer);
    request.input("ApbtJNPCTContainer", data.ApbtJNPCTContainer);
    request.input("ApbtNSFTContainer", data.ApbtNSFTContainer);
    request.input("ApbtNSICTContainer", data.ApbtNSICTContainer);
    request.input("ApbtAPMTContainer", data.ApbtAPMTContainer);
    request.input("ApbtNSIGTContainer", data.ApbtNSIGTContainer);
    request.input("ApbtBMCTContainer", data.ApbtBMCTContainer);
    request.input("ApbtNSDTContainer", data.ApbtNSDTContainer);

    request.input("percentageIdleTimeToTotalTimeAtBerth", data.percentageIdleTimeToTotalTimeAtBerth);
    request.input("PITDryBulkMech",data.PITDryBulkMech);
    request.input("PITDryBulkConv",data.PITDryBulkConv);
    request.input("PITLiquidBulk",data.PITLiquidBulk);
    request.input("PITBreakBulk",data.PITBreakBulk);
    request.input("PITContainer",data.PITContainer);
    //JNPA PORTS
    request.input("PitOAContainer", data.PitOAContainer);
    request.input("PitJNPCTContainer", data.PitJNPCTContainer);
    request.input("PitNSFTContainer", data.PitNSFTContainer);
    request.input("PitNSICTContainer", data.PitNSICTContainer);
    request.input("PitAPMTContainer", data.PitAPMTContainer);
    request.input("PitNSIGTContainer", data.PitNSIGTContainer);
    request.input("PitBMCTContainer", data.PitBMCTContainer);
    request.input("PitNSDTContainer", data.PitNSDTContainer);

    request.input("coastalTonnage", data.coastalTonnage);
    request.input("trafficHandledBySailedVessels", data.trafficHandledBySailedVessels);
    request.input("organisationId", data.organisationId);
    request.input("userID", data.userID);

    try {
        const result = await request.query(`
            INSERT INTO tbl_major_ports (
                financial_year,
                month,
                annually_Financial_Year,
                avg_container_trt,
                avg_dry_bulk_mech,
                avg_dry_bulk_conv,
                avg_liquid_bulk,
                avg_break_bulk,
                avg_container,

                avg_oa_container,
                avg_jnpct_container,
                avg_nsft_container, 
                avg_nsict_container,
                avg_apmt_container,
                avg_nsigt_container,
                avg_bmct_container,
                avg_nsdt_container,

                avg_total_trt,
                ATTUP_dry_bulk_mech,
                ATTUP_dry_bulk_conv,
                ATTUP_liquid_bulk,
                ATTUP_break_bulk,
                ATTUP_container,

                ATTUP_oa_container,
                ATTUP_jnpct_container,
                ATTUP_nsft_container,
                ATTUP_nsict_container,
                ATTUP_apmt_container,
                ATTUP_nsigt_container,
                ATTUP_bmct_container,
                ATTUP_nsdt_container,


                avg_total_trt_under_total_AC,
                ATTUT_dry_bulk_mech,
                ATTUT_dry_bulk_conv,
                ATTUT_liquid_bulk,
                ATTUT_break_bulk,
                ATTUT_container,

                ATTUT_oa_container,
                ATTUT_jnpct_container,
                ATTUT_nsft_container,
                ATTUT_nsict_container,
                ATTUT_apmt_container,
                ATTUT_nsigt_container,
                ATTUT_bmct_container,
                ATTUT_nsdt_container,

                avg_output_per_ship_berthday,
                AOPSBD_dry_bulk_mech,
                AOPSBD_dry_bulk_conv,
                AOPSBD_liquid_bulk,
                AOPSBD_break_bulk,
                AOPSBD_container,

                AOPSBD_oa_container,
                AOPSBD_jnpct_container,
                AOPSBD_nsft_container,
                AOPSBD_nsict_container,
                AOPSBD_apmt_container,
                AOPSBD_nsigt_container,
                AOPSBD_bmct_container,
                AOPSBD_nsdt_container,

                export_port_dwell_time,
                import_port_dwell_time,

                vessels_handled,
                VH_dry_bulk_mech,
                VH_dry_bulk_conv,
                VH_liquid_bulk,
                VH_break_bulk,
                VH_container,

                VH_oa_container,
                VH_jnpct_container,
                VH_nsft_container,
                VH_nsict_container,
                VH_apmt_container,
                VH_nsigt_container,
                VH_bmct_container,
                VH_nsdt_container,

                avg_pre_berthing_time_port,
                APBT_dry_bulk_mech,
                APBT_dry_bulk_conv,
                APBT_liquid_bulk,
                APBT_break_bulk,
                APBT_container,

                APBT_oa_container,
                APBT_jnpct_container,
                APBT_nsft_container,
                APBT_nsict_container,
                APBT_apmt_container,
                APBT_nsigt_container,
                APBT_bmct_container,
                APBT_nsdt_container,

                percentage_of_idle_time_to_total_time_at_berth,
                PIT_dry_bulk_mech,
                PIT_dry_bulk_conv,
                PIT_liquid_bulk,
                PIT_break_bulk,
                PIT_container,

                PIT_oa_container,
                PIT_jnpct_container,
                PIT_nsft_container,
                PIT_nsict_container,
                PIT_apmt_container,
                PIT_nsigt_container,
                PIT_bmct_container,
                PIT_nsdt_container,

                coastal_tonnage,
                traffic_handledby_sailed_vessels,
                organisation_id,
                created_by
            )
            VALUES (
                @financialYear, @month, @annuallyFinancialYear,
                @avgContainerTrt, @AVGDryBulkMech, @AVGDryBulkConv, @AVGLiquidBulk, @AVGBreakBulk, @AVGContainer,  @AvgOAContainer,@AvgJNPCTContainer,@AvgNSFTContainer,@AvgNSICTContainer,@AvgAPMTContainer,@AvgNSIGTContainer,@AvgBMCTContainer,@AvgNSDTContainer,
                @avgTotalTrt, @ATTUPDryBulkMech, @ATTUPDryBulkConv, @ATTUPLiquidBulk, @ATTUPBreakBulk, @ATTUPContainer,  @AttupOAContainer,@AttupJNPCTContainer,@AttupNSFTContainer,@AttupNSICTContainer,@AttupAPMTContainer,@AttupNSIGTContainer,@AttupBMCTContainer,@AttupNSDTContainer,
                @avgTotalTrtUnderTotalAC, @ATTUTDryBulkMech, @ATTUTDryBulkConv, @ATTUTLiquidBulk, @ATTUTBreakBulk, @ATTUTContainer,  @AttutOAContainer,@AttutJNPCTContainer,@AttutNSFTContainer,@AttutNSICTContainer,@AttutAPMTContainer,@AttutNSIGTContainer,@AttutBMCTContainer,@AttutNSDTContainer,
                @avgOutputPerShipBerthday, @AOPSBDDryBulkMech, @AOPSBDDryBulkConv, @AOPSBDLiquidBulk, @AOPSBDBreakBulk, @AOPSBDContainer,  @AopsbdOAContainer,@AopsbdJNPCTContainer,@AopsbdNSFTContainer,@AopsbdNSICTContainer,@AopsbdAPMTContainer,@AopsbdNSIGTContainer,@AopsbdBMCTContainer,@AopsbdNSDTContainer,
                @exportPortDwellTime, @importPortDwellTime,
                @VesselsHandled, @VHDryBulkMech, @VHDryBulkConv, @VHLiquidBulk, @VHBreakBulk, @VHContainer,  @VhOAContainer,@VhJNPCTContainer,@VhNSFTContainer,@VhNSICTContainer,@VhAPMTContainer,@VhNSIGTContainer,@VhBMCTContainer,@VhNSDTContainer,
                @avgPreBerthingTimePort, @APBTDryBulkMech,@APBTDryBulkConv,@APBTLiquidBulk,@APBTBreakBulk,@APBTContainer,  @ApbtOAContainer,@ApbtJNPCTContainer,@ApbtNSFTContainer,@ApbtNSICTContainer,@ApbtAPMTContainer,@ApbtNSIGTContainer,@ApbtBMCTContainer,@ApbtNSDTContainer,
                @percentageIdleTimeToTotalTimeAtBerth,@PITDryBulkMech,@PITDryBulkConv,@PITLiquidBulk,@PITBreakBulk,@PITContainer,  @PitOAContainer,@PitJNPCTContainer,@PitNSFTContainer,@PitNSICTContainer,@PitAPMTContainer,@PitNSIGTContainer,@PitBMCTContainer,@PitNSDTContainer,
                @coastalTonnage, @trafficHandledBySailedVessels, @organisationId, @userID
            )
        `);
        res.sendStatus(201);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


// Function to get cargo handling data
async function getMajorPortsData(req, res) {
    const conn = await pool;
    // console.log("Function worked");
    try {
        const result = await conn.query(`SELECT * FROM tbl_major_ports ORDER BY financial_year DESC;`);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get monthly cargo handling data
async function getMonthlyMajorPortsData(req, res) {
    const conn = await pool;
    const userID = req.params.userID;

    try {
        const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

        const { role_id } = userResult.recordset[0];

        let query;

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            query = `SELECT * FROM tbl_major_ports ORDER BY financial_year DESC;`;
        } else {
            const orgResult = await conn.query(`SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`);
            const organisationID = orgResult.recordset[0].organisation_id;

            const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            query = `SELECT * from tbl_major_ports WHERE created_by IN (${userIDs.join(',')}) ORDER BY financial_year DESC`;
        }

        const result = await conn.query(query);
        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get quarterly cargo handling data
async function getQuarterlyMajorPortsData(req, res) {
    const conn = await pool;
    const userID = req.params.userID;
    // console.log(userID);
    
    try {

        const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);

        const { role_id } = userResult.recordset[0];

        let query;

        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            query = `SELECT          
                organisation_id,
                annually_financial_year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                    SUM(avg_container_trt) AS quaterly_avg_container_trt,
                    SUM(avg_total_trt) AS quaterly_avg_total_trt,
                    SUM(avg_output_per_ship_berthday) AS quaterly_avg_output_per_ship_berthday,
                    SUM(export_port_dwell_time) AS quaterly_export_port_dwell_time,
                    SUM(import_port_dwell_time) AS quaterly_import_port_dwell_time,
                    SUM(vessels_handled) AS quaterly_vessels_handled,
                    SUM(avg_pre_berthing_time_port) AS quaterly_avg_pre_berthing_time_port,
                    SUM(percentage_of_idle_time_to_total_time_at_berth) AS quaterly_percentage_of_idle_time,
                    SUM(coastal_tonnage) AS quaterly_coastal_tonnage,
                    SUM(traffic_handledby_sailed_vessels) AS quaterly_traffic_handled_sailed_vessels
                FROM tbl_major_ports
            WHERE organisation_id IS NOT NULL
            GROUP BY
                organisation_id,
                annually_financial_year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END
            ORDER BY annually_financial_year DESC, quarter_number;`;
        } else {
            const orgResult = await conn.query(`SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`);
            const organisationID = orgResult.recordset[0].organisation_id;

            const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            query = `SELECT          
                organisation_id,
                annually_financial_year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END AS quarter_number,
                    SUM(avg_container_trt) AS quaterly_avg_container_trt,
                    SUM(avg_total_trt) AS quaterly_avg_total_trt,
                    SUM(avg_output_per_ship_berthday) AS quaterly_avg_output_per_ship_berthday,
                    SUM(export_port_dwell_time) AS quaterly_export_port_dwell_time,
                    SUM(import_port_dwell_time) AS quaterly_import_port_dwell_time,
                    SUM(vessels_handled) AS quaterly_vessels_handled,
                    SUM(avg_pre_berthing_time_port) AS quaterly_avg_pre_berthing_time_port,
                    SUM(percentage_of_idle_time_to_total_time_at_berth) AS quaterly_percentage_of_idle_time,
                    SUM(coastal_tonnage) AS quaterly_coastal_tonnage,
                    SUM(traffic_handledby_sailed_vessels) AS quaterly_traffic_handled_sailed_vessels
                FROM tbl_major_ports
            WHERE created_by IN (${userIDs.join(',')})
            GROUP BY
                organisation_id,
                annually_financial_year,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 4'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 1'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 2'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 3'
                END
            ORDER BY annually_financial_year DESC, quarter_number;`;
        }

        const result = await conn.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get annually cargo handling dataked
async function getAnnuallyMajorPortsData(req, res) {
    const conn = await pool;
    const userID = req.params.userID;

    try {

        const userResult = await conn.query(`
            SELECT role_id
            FROM tbl_user
            WHERE user_id = ${userID}
        `);
        const { role_id } = userResult.recordset[0];  
        let query;
        if (role_id == 2 || role_id == 3 || role_id == 4 || role_id == 5 || role_id == 8) {
            query = `
                SELECT
                    annually_financial_year,
                    organisation_id,
                    SUM(avg_container_trt) AS totally_avg_container_trt,
                    SUM(avg_total_trt) AS totally_avg_total_trt,
                    SUM(avg_output_per_ship_berthday) AS totally_avg_output_per_ship_berthday,
                    SUM(export_port_dwell_time) AS totally_export_port_dwell_time,
                    SUM(import_port_dwell_time) AS totally_import_port_dwell_time,
                    SUM(vessels_handled) AS totally_vessels_handled,
                    SUM(avg_pre_berthing_time_port) AS totally_avg_pre_berthing_time_port,
                    SUM(percentage_of_idle_time_to_total_time_at_berth) AS totally_percentage_of_idle_time,
                    SUM(coastal_tonnage) AS totally_coastal_tonnage,
                    SUM(traffic_handledby_sailed_vessels) AS totally_traffic_handled_sailed_vessels
                FROM 
                    tbl_major_ports
                    WHERE organisation_id IS NOT NULL
                GROUP BY
                    annually_financial_year,
                    organisation_id
                    
                ORDER BY
                    annually_financial_year DESC;
            `;
        } else {
            const orgResult = await conn.query(`SELECT organisation_id FROM tbl_user WHERE user_id = ${userID}`);
            const organisationID = orgResult.recordset[0].organisation_id;

            const usersResult = await conn.query(`SELECT user_id FROM tbl_user WHERE organisation_id = ${organisationID}`);
            const userIDs = usersResult.recordset.map(user => user.user_id);

            query = `
                SELECT
                    annually_financial_year,
                    organisation_id,
                    SUM(avg_container_trt) AS totally_avg_container_trt,
                    SUM(avg_total_trt) AS totally_avg_total_trt,
                    SUM(avg_output_per_ship_berthday) AS totally_avg_output_per_ship_berthday,
                    SUM(export_port_dwell_time) AS totally_export_port_dwell_time,
                    SUM(import_port_dwell_time) AS totally_import_port_dwell_time,
                    SUM(vessels_handled) AS totally_vessels_handled,
                    SUM(avg_pre_berthing_time_port) AS totally_avg_pre_berthing_time_port,
                    SUM(percentage_of_idle_time_to_total_time_at_berth) AS totally_percentage_of_idle_time,
                    SUM(coastal_tonnage) AS totally_coastal_tonnage,
                    SUM(traffic_handledby_sailed_vessels) AS totally_traffic_handled_sailed_vessels
                FROM 
                    tbl_major_ports
                    WHERE created_by IN (${userIDs.join(',')})
                GROUP BY
                    annually_financial_year,
                    organisation_id
                ORDER BY
                    annually_financial_year DESC;
            `;
        }

        const result = await conn.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

const MajorPortsController = {
    addMajorPortsData,
    getMajorPortsData,
    getMonthlyMajorPortsData,
    getQuarterlyMajorPortsData,
    getAnnuallyMajorPortsData,
};

export default MajorPortsController;
