import { pool } from "../../db.js";
import fs from 'fs';
import sql from 'mssql';

async function getFiscalYearTargetData(req, res) {
    const { financialYear, organisationId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("organisationId", organisationId);

        const result = await request.query(`
            SELECT * 
            FROM tbl_traffic_fiscal_target 
            WHERE financial_year = @financialYear 
            AND organisation_id = @organisationId
        `);

        return res.json(result.recordset);

    } catch (error) {
        console.error("Error fetching fiscal year target data:", error);
        return res.sendStatus(500);
    }
}

async function submitFiscalYearTargetData(req, res) {
    const { financialYear, organisationId, fiscalYearTarget, roRoTarget, roPaxTarget, containerTargetMteu, userId } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("organisationId", organisationId);
        request.input("fiscalYearTarget", fiscalYearTarget);
        request.input("roRoTarget", roRoTarget);
        request.input("roPaxTarget", roPaxTarget);
        request.input("containerTargetMteu", containerTargetMteu);
        request.input("userId", userId);

        const result = await request.query(`
            INSERT INTO tbl_traffic_fiscal_target 
            (financial_year, organisation_id, fiscal_year_target, ro_ro_target, ro_pax_target, container_target_mteu, created_by, created_date) 
            VALUES (@financialYear, @organisationId, @fiscalYearTarget, @roRoTarget, @roPaxTarget, @containerTargetMteu, @userId, getDate())
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(201).send("Fiscal year target data added successfully.");
        } else {
            return res.status(400).send("Error adding fiscal year target data.");
        }
    } catch (error) {
        console.error("Error submitting fiscal year target data:", error);
        return res.sendStatus(500);
    }
}

async function getFiscalYearTargetList(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const query = `
            SELECT 
                ttf.financial_year,
                ttf.organisation_id,
                mo.organisation_name,
                ttf.fiscal_year_target,
                COALESCE(ttf.updated_date, ttf.created_date) AS updated_date,
                COALESCE((
                    SELECT SUM(tcd.value)
                    FROM tbl_traffic_commodity_data tcd
                    WHERE tcd.organisation_id = ttf.organisation_id
                      AND tcd.fiscal_year = ttf.financial_year
                      AND tcd.commodity_id != 28
                ), 0) AS fiscal_year_actual,
                CASE 
                    WHEN ttf.fiscal_year_target > 0 THEN 
                        (COALESCE((
                            SELECT SUM(tcd.value)
                            FROM tbl_traffic_commodity_data tcd
                            WHERE tcd.organisation_id = ttf.organisation_id
                              AND tcd.fiscal_year = ttf.financial_year
                              AND tcd.commodity_id != 28
                        ), 0) * 100.0 / ttf.fiscal_year_target)
                    ELSE 0
                END AS achievement_percentage
            FROM 
                tbl_traffic_fiscal_target ttf
            JOIN 
                mmt_organisation mo ON ttf.organisation_id = mo.organisation_id
            ORDER BY 
                ttf.financial_year DESC,
                mo.organisation_name
        `;

        const result = await request.query(query);

        res.status(200).json(result.recordset);

    } catch (error) {
        console.error("Error fetching fiscal year target list:", error);
        res.status(500).json({
            error: "Error fetching fiscal year targets",
            details: error.message
        });
    }
}

async function updateFiscalYearTargetData(req, res) {
    const { financialYear, organisationId, fiscalYearTarget, roRoTarget, roPaxTarget, containerTargetMteu, userId } = req.body;

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("organisationId", organisationId);
        request.input("fiscalYearTarget", fiscalYearTarget);
        request.input("roRoTarget", roRoTarget);
        request.input("roPaxTarget", roPaxTarget);
        request.input("containerTargetMteu", containerTargetMteu);
        request.input("userId", userId);

        const result = await request.query(`
            UPDATE tbl_traffic_fiscal_target
            SET fiscal_year_target = @fiscalYearTarget,
            ro_ro_target = @roRoTarget,
            ro_pax_target = @roPaxTarget, container_target_mteu = @containerTargetMteu, 
            updated_by = @userId, updated_date = getDate()
            WHERE financial_year = @financialYear
            AND organisation_id = @organisationId
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: 'Fiscal year target updated successfully.' });
        } else {
            return res.status(404).json({ message: 'No record found to update.' });
        }
    } catch (error) {
        console.error("Error updating fiscal year target data:", error);
        return res.status(500).json({ message: 'Error updating fiscal year target data.' });
    }
}

async function getCommoditiesByGroup(req, res) {
    const { groupId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("groupId", groupId);

        const result = await request.query(`
            SELECT 
                id,
                commodity_id,
                commodity_group_id,
                commodity_name
            FROM 
                mmt_traffic_commodity
            WHERE 
                commodity_group_id = @groupId
            ORDER BY 
                commodity_name ASC
        `);

        if (result.recordset.length > 0) {
            return res.status(200).json(result.recordset);
        } else {
            return res.status(404).json({ message: 'No commodities found for the specified group.' });
        }
    } catch (error) {
        console.error("Error fetching commodities by group:", error);
        return res.status(500).json({ message: 'Error fetching commodities by group.' });
    }
}

async function submitCommodityData(req, res) {
    const {
        fiscalYear,
        month,
        organisationId,
        userId,
        commodityData,
        trafficData
    } = req.body;

    if (!Array.isArray(commodityData)) {
        return res.status(400).json({
            success: false,
            message: "Invalid commodity data format. Expected an array."
        });
    }

    const conn = await pool;
    const transaction = new sql.Transaction(conn);

    try {
        await transaction.begin();

        const mappingRequest = new sql.Request(transaction);
        const commodityIds = [...new Set(commodityData.map(d => d.commodity_id))];
        let mappings = { recordset: [] };
        if (commodityIds.length > 0) {
            mappings = await mappingRequest.query(`
                SELECT commodity_id, commodity_group_id 
                FROM mmt_traffic_commodity
                WHERE commodity_id IN (${commodityIds.map(id => `'${id}'`).join(',')})
            `);
        }

        const commodityGroupMap = {};
        mappings.recordset.forEach(row => {
            commodityGroupMap[row.commodity_id] = row.commodity_group_id;
        });

        for (const data of commodityData) {
            const commodityGroupId = commodityGroupMap[data.commodity_id];
            if (!commodityGroupId) {
                throw new Error(`No group found for commodity ID ${data.commodity_id}`);
            }

            const request = new sql.Request(transaction);

            request.input("fiscalYear", fiscalYear);
            request.input("month", month);
            request.input("organisationId", organisationId);
            request.input("categoryId", data.category_id);
            request.input("commodityId", data.commodity_id);
            request.input("directionId", data.direction_id);
            request.input("flagTypeId", data.flag_type_id);
            request.input("value", data.value);
            request.input("userId", userId);
            request.input("commodityGroupId", commodityGroupId);

            const existingRecord = await request.query(`
                SELECT id FROM tbl_traffic_commodity_data
                WHERE fiscal_year = @fiscalYear
                AND month = @month
                AND organisation_id = @organisationId
                AND commodity_id = @commodityId
                AND category_id = @categoryId
                AND direction_id = @directionId
                AND flag_type_id = @flagTypeId
            `);

            if (existingRecord.recordset.length > 0) {
                await request.query(`
                    UPDATE tbl_traffic_commodity_data
                    SET value = @value,
                        updated_by = @userId,
                        updated_date = GETDATE()
                    WHERE id = ${existingRecord.recordset[0].id}
                `);
            } else {
                await request.query(`
                    INSERT INTO tbl_traffic_commodity_data (
                        fiscal_year, month, organisation_id,
                        commodity_group_id, commodity_id, category_id,
                        direction_id, flag_type_id, value,
                        created_by, created_date
                    ) VALUES (
                        @fiscalYear, @month, @organisationId,
                        @commodityGroupId, @commodityId, @categoryId,
                        @directionId, @flagTypeId, @value,
                        @userId, GETDATE()
                    )
                `);
            }
        }

        const trafficRequest = new sql.Request(transaction);
        trafficRequest.input("fiscalYear", fiscalYear);
        trafficRequest.input("month", month);
        trafficRequest.input("organisationId", organisationId);
        trafficRequest.input("roRoTraffic", trafficData.ro_ro_traffic ?? null);
        trafficRequest.input("roPaxTraffic", trafficData.ro_pax_traffic ?? null);
        trafficRequest.input("userId", userId);

        const existingTraffic = await trafficRequest.query(`
            SELECT id FROM tbl_traffic_ro_ro_pax_data
            WHERE fiscal_year = @fiscalYear
            AND month = @month
            AND organisation_id = @organisationId
        `);

        if (existingTraffic.recordset.length > 0) {
            await trafficRequest.query(`
                UPDATE tbl_traffic_ro_ro_pax_data
                SET ro_ro_traffic = @roRoTraffic,
                    ro_pax_traffic = @roPaxTraffic,
                    updated_by = @userId,
                    updated_date = GETDATE()
                WHERE fiscal_year = @fiscalYear
                AND month = @month
                AND organisation_id = @organisationId
            `);
        } else {
            await trafficRequest.query(`
                INSERT INTO tbl_traffic_ro_ro_pax_data (
                    fiscal_year, month, organisation_id,
                    ro_ro_traffic, ro_pax_traffic,
                    created_by, created_date
                ) VALUES (
                    @fiscalYear, @month, @organisationId,
                    @roRoTraffic, @roPaxTraffic,
                    @userId, GETDATE()
                )
            `);
        }

        await transaction.commit();
        return res.status(200).json({
            success: true,
            message: "Data submitted successfully"
        });

    } catch (error) {
        await transaction.rollback();
        console.error("Error submitting traffic data:", error);
        return res.status(500).json({
            success: false,
            message: "Error submitting traffic data: " + error.message
        });
    }
}

async function getCommodityData(req, res) {
    const { fiscalYear, month, organisationId } = req.query;
    const conn = await pool;

    try {
        const commodityRequest = conn.request();
        commodityRequest.input("fiscalYear", fiscalYear);
        commodityRequest.input("month", month);
        commodityRequest.input("organisationId", organisationId);

        const commodityQuery = `
            SELECT 
                commodity_id,
                category_id,
                direction_id,
                flag_type_id,
                value
            FROM tbl_traffic_commodity_data
            WHERE fiscal_year = @fiscalYear
            AND month = @month
            AND organisation_id = @organisationId
            ORDER BY commodity_id, category_id, direction_id, flag_type_id
        `;

        const trafficRequest = conn.request();
        trafficRequest.input("fiscalYear", fiscalYear);
        trafficRequest.input("month", month);
        trafficRequest.input("organisationId", organisationId);

        const trafficQuery = `
            SELECT 
                ro_ro_traffic,
                ro_pax_traffic
            FROM tbl_traffic_ro_ro_pax_data
            WHERE fiscal_year = @fiscalYear
            AND month = @month
            AND organisation_id = @organisationId
        `;

        const [commodityResult, trafficResult] = await Promise.all([
            commodityRequest.query(commodityQuery),
            trafficRequest.query(trafficQuery)
        ]);

        return res.status(200).json({
            success: true,
            commodityData: commodityResult.recordset,
            trafficData: trafficResult.recordset.length > 0
                ? trafficResult.recordset[0]
                : { ro_ro_traffic: null, ro_pax_traffic: null }
        });

    } catch (error) {
        console.error("Error fetching commodity data:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching commodity data",
            error: error.message
        });
    }
}


async function getMonthTrafficTrendData(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4) ? `FY ${currentYear}-${currentYear + 1}` : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4) ? `FY ${currentYear - 1}-${currentYear}` : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    fiscal_year,
                    month,
                    SUM(inbound + outbound) AS total_traffic
                FROM tbl_traffic_commodity_data tc
                WHERE tc.commodity_subcategory_id != 28
                GROUP BY organisation_id, fiscal_year, month
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    m.fiscal_year,
                    SUM(CASE WHEN m.month = 4 THEN m.total_traffic END) AS April,
                    SUM(CASE WHEN m.month = 5 THEN m.total_traffic END) AS May,
                    SUM(CASE WHEN m.month = 6 THEN m.total_traffic END) AS June,
                    SUM(CASE WHEN m.month = 7 THEN m.total_traffic END) AS July,
                    SUM(CASE WHEN m.month = 8 THEN m.total_traffic END) AS August,
                    SUM(CASE WHEN m.month = 9 THEN m.total_traffic END) AS September,
                    SUM(CASE WHEN m.month = 10 THEN m.total_traffic END) AS October,
                    SUM(CASE WHEN m.month = 11 THEN m.total_traffic END) AS November,
                    SUM(CASE WHEN m.month = 12 THEN m.total_traffic END) AS December,
                    SUM(CASE WHEN m.month = 1 THEN m.total_traffic END) AS January,
                    SUM(CASE WHEN m.month = 2 THEN m.total_traffic END) AS February,
                    SUM(CASE WHEN m.month = 3 THEN m.total_traffic END) AS March
                FROM MonthlyData m
                JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, m.fiscal_year
            )
            SELECT * 
            FROM PivotedData
            WHERE 
                COALESCE(April, 0) 
                + COALESCE(May, 0) 
                + COALESCE(June, 0) 
                + COALESCE(July, 0) 
                + COALESCE(August, 0) 
                + COALESCE(September, 0) 
                + COALESCE(October, 0) 
                + COALESCE(November, 0) 
                + COALESCE(December, 0) 
                + COALESCE(January, 0) 
                + COALESCE(February, 0) 
                + COALESCE(March, 0) > 0
            ORDER BY majorPort, fiscal_year DESC;
        `;

        const request = conn.request();
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching month-wise traffic trend data:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getYearTrafficTrendData(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const startYear = 2014;
        const endYear = currentYear + (currentMonth >= 4 ? 1 : 0);

        const fiscalYears = [];
        for (let year = startYear; year < endYear; year++) {
            fiscalYears.push(`${year}-${year + 1}`);
        }

        const fiscalYearConditions = fiscalYears.map(year => {
            return `MAX(CASE WHEN fiscal_year = '${year}' THEN total_traffic END) AS "FY${year}"`;
        }).join(',\n');

        const fiscalYearSumCondition = fiscalYears.map(year => {
            return `COALESCE(MAX(CASE WHEN fiscal_year = '${year}' THEN total_traffic END), 0)`;
        }).join(' + ');

        const query = `
            WITH YearlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    c.fiscal_year,
                    SUM(c.inbound + c.outbound) AS total_traffic
                FROM tbl_traffic_commodity_data c
                JOIN mmt_organisation o ON c.organisation_id = o.organisation_id
                WHERE c.commodity_subcategory_id != 28
                GROUP BY o.organisation_id, o.organisation_name, c.fiscal_year
            )
            SELECT 
                organisation_id,
                majorPort,
                ${fiscalYearConditions}
            FROM YearlyData
            GROUP BY organisation_id, majorPort
            HAVING ${fiscalYearSumCondition} > 0
            ORDER BY majorPort;
        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise traffic trend data:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getTrafficActualData(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const result = await request.query(`
            SELECT
                data.id,
                data.fiscal_year,
                DATENAME(MONTH, DATEFROMPARTS(2000, data.month, 1)) AS month,
                data.organisation_id,      
                org.organisation_name,
                cat.category_name,
                cg.commodity_group_name,
                com.commodity_name,
                dir.direction_name,
                flag.flag_type_name,
                data.value,
                data.category_id,
                data.commodity_group_id,
                data.commodity_id,
                data.direction_id,
                data.flag_type_id
            FROM tbl_traffic_commodity_data data
            INNER JOIN mmt_organisation org ON data.organisation_id = org.organisation_id
            INNER JOIN mmt_traffic_category cat ON data.category_id = cat.category_id
            INNER JOIN mmt_traffic_commodity_group cg ON data.commodity_group_id = cg.commodity_group_id
            INNER JOIN mmt_traffic_commodity com ON data.commodity_id = com.commodity_id
            INNER JOIN mmt_traffic_direction dir ON data.direction_id = dir.direction_id
            INNER JOIN mmt_traffic_flag_type flag ON data.flag_type_id = flag.flag_type_id
            ORDER BY data.fiscal_year DESC, data.month, org.organisation_name, com.commodity_name
        `);

        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching traffic actual data:", error);
        return res.sendStatus(500);
    }
}

async function getTrafficCommodityGroup(req, res) {
    const conn = await pool;
    try {
        const result = await conn.request().query(`
        SELECT 
          commodity_group_id,
          commodity_group_name
        FROM mmt_traffic_commodity_group
        ORDER BY commodity_group_name ASC
      `);
        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching traffic commodity groups:", error);
        return res.status(500).json({ message: "Error fetching traffic commodity groups." });
    }
}

async function getTrafficCommodities(req, res) {
    const { groupId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("groupId", groupId);

        const result = await request.query(`
        SELECT 
          commodity_id,
          commodity_group_id,
          commodity_name
        FROM mmt_traffic_commodity
        WHERE commodity_group_id = @groupId
        ORDER BY commodity_name ASC
      `);

        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Error fetching traffic commodities:", error);
        return res.status(500).json({ message: "Error fetching traffic commodities." });
    }
}

function getFinancialYears() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    let startYear = month >= 4 ? year : year - 1;

    return {
        currentFY: `${startYear}-${startYear + 1}`,   
        lastFY: `${startYear - 1}-${startYear}`       
    };
}

async function getKPITrafficDashboard(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID) || 0;
        const fyParam = req.params.fy && req.params.fy !== "all" ? req.params.fy : null;
        const monthsParam = req.params.months && req.params.months !== "all" ? req.params.months.split(',').map(Number) : null;

        const conn = await pool;
        const request = conn.request();

        let currentFY, lastFY;
        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split('-').map(Number);
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        request.input("currentMonth", currentMonth);

        function getFYMonths() {
            if (monthsParam && monthsParam.length) return monthsParam;
            let endMonth = currentMonth - 1;
            if (endMonth === 0) endMonth = 12;
            let months = [];
            if (endMonth >= 4) {
                for (let m = 4; m <= endMonth; m++) months.push(m);
            } else {
                for (let m = 4; m <= 12; m++) months.push(m);
                for (let m = 1; m <= endMonth; m++) months.push(m);
            }
            return months;
        }

        const monthsList = getFYMonths();
        monthsList.forEach((m, i) => request.input(`month${i}`, m));
        const monthParamList = monthsList.map((_, i) => `@month${i}`).join(',');

        const allOrgs = [1,2,3,5,6,7,8,9,10,11,12,54,55];
        const orgFilter = organisationID ? [organisationID] : allOrgs;
        orgFilter.forEach((id, i) => request.input(`org${i}`, id));
        const orgParamList = orgFilter.map((_, i) => `@org${i}`).join(',');

        const query = `
        WITH base_filter AS (
            SELECT
                cd.organisation_id, cd.month, cd.fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id <> 28
                AND cd.organisation_id IN (${orgParamList})
                AND cd.month IN (${monthParamList})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''), REPLACE(@lastFY,' ','')
                )
            GROUP BY cd.organisation_id, cd.month, cd.fiscal_year
        ),

        kpi_base AS (
            SELECT ktp.*
            FROM tbl_kpi_time_performance ktp
            INNER JOIN base_filter bf
                ON bf.organisation_id = ktp.organisation_id
                AND bf.month = ktp.month
                AND bf.fiscal_year = ktp.fiscal_year
        ),

        /* =========================================================
           WEIGHTED MEDIAN (cumulative-vessel-count method)
           Same logic as detailedKPITrafficCardDashboard's
           median_weighted_* CTEs, but this endpoint returns a single
           aggregated card (no per-org / SMPA-vs-Overall split), so
           the weighted median is computed once per fiscal_year
           across whichever orgs are in the current filter
           (orgParamList).

           median_by_org        : per (org, fiscal_year) sum of
                                   total_sailed_vessel_handled across
                                   the filtered months - the "weight".
           median_trt_by_org     : per (org, fiscal_year) the last
                                   non-null ytd_median_trt_overall
                                   value (mirrors OUTER APPLY TOP 1
                                   ORDER BY month DESC used elsewhere).
           median_weighted_base  : joins both into one row per
                                   org/fiscal_year with trt_value +
                                   vessel_count.
           median_cumulative     : running cumulative vessel count
                                   ordered by trt_value ASC,
                                   partitioned by fiscal_year.
           median_weighted_result: smallest trt_value whose
                                   cumulative vessel count reaches
                                   50% of the total vessel count for
                                   that fiscal_year - the weighted
                                   median TRT.
        ========================================================= */
        median_by_org AS (
            SELECT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year,
                SUM(total_sailed_vessel_handled) AS total_sailed_vessel_handled
            FROM kpi_base
            GROUP BY organisation_id, REPLACE(fiscal_year,' ','')
        ),

        median_trt_by_org AS (
            SELECT
                base.organisation_id,
                base.fiscal_year,
                ov.median_trt_overall
            FROM (
                SELECT DISTINCT
                    organisation_id,
                    REPLACE(fiscal_year,' ','') AS fiscal_year
                FROM kpi_base
            ) base
            OUTER APPLY (
                SELECT TOP 1 k.ytd_median_trt_overall AS median_trt_overall
                FROM kpi_base k
                WHERE k.organisation_id = base.organisation_id
                  AND REPLACE(k.fiscal_year,' ','') = base.fiscal_year
                  AND k.ytd_median_trt_overall IS NOT NULL
                ORDER BY k.month DESC
            ) ov
        ),

        median_weighted_base AS (
            SELECT
                m.fiscal_year,
                m.organisation_id,
                t.median_trt_overall AS trt_value,
                m.total_sailed_vessel_handled AS vessel_count
            FROM median_by_org m
            JOIN median_trt_by_org t
                ON t.organisation_id = m.organisation_id
                AND t.fiscal_year = m.fiscal_year
            WHERE t.median_trt_overall > 0 AND m.total_sailed_vessel_handled > 0
        ),

        median_cumulative AS (
            SELECT
                fiscal_year, organisation_id, trt_value, vessel_count,
                SUM(vessel_count) OVER (
                    PARTITION BY fiscal_year
                    ORDER BY trt_value
                    ROWS UNBOUNDED PRECEDING
                ) AS cum_vessel_count,
                SUM(vessel_count) OVER (
                    PARTITION BY fiscal_year
                ) AS total_vessel_count
            FROM median_weighted_base
        ),

        median_weighted_result AS (
            SELECT
                fiscal_year,
                MIN(trt_value) AS weighted_median_trt
            FROM median_cumulative
            WHERE cum_vessel_count >= total_vessel_count * 0.5
            GROUP BY fiscal_year
        ),

        traffic_agg AS (
            SELECT bf.organisation_id, bf.fiscal_year, SUM(bf.qty) AS total_traffic
            FROM base_filter bf
            GROUP BY bf.organisation_id, bf.fiscal_year
        ),

        ro_ro_agg AS (
            SELECT ro.organisation_id, ro.fiscal_year, SUM(ro.ro_ro_traffic) AS ro_ro_traffic
            FROM tbl_traffic_ro_ro_pax_data ro
            WHERE ro.organisation_id IN (${orgParamList})
              AND ro.month IN (${monthParamList})
              AND REPLACE(ro.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''), REPLACE(@lastFY,' ','')
              )
            GROUP BY ro.organisation_id, ro.fiscal_year
        ),

        final_traffic AS (
            SELECT
                COALESCE(t.organisation_id, r.organisation_id) AS organisation_id,
                COALESCE(t.fiscal_year, r.fiscal_year) AS fiscal_year,
                (ISNULL(t.total_traffic, 0) / 1000.0)
                +
                (ISNULL(r.ro_ro_traffic, 0) / 1000.0) AS total_traffic
            FROM traffic_agg t
            FULL OUTER JOIN ro_ro_agg r
                ON t.organisation_id = r.organisation_id
            AND t.fiscal_year = r.fiscal_year
        ),

        traffic_summary AS (
            SELECT
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_traffic ELSE 0 END) AS total_traffic_current,
                SUM(CASE WHEN fiscal_year = @lastFY THEN total_traffic ELSE 0 END) AS total_traffic_last
            FROM final_traffic
        ),

      container_productivity_agg AS (
        SELECT
            cd.fiscal_year,
            SUM(ISNULL(cd.value,0) * ISNULL(ktp.gross_crane_productivity,0)) AS gross_crane_num,
            SUM(ISNULL(cd.value,0)) AS crane_den
        FROM tbl_traffic_commodity_data cd
        INNER JOIN tbl_kpi_time_performance ktp
            ON cd.organisation_id = ktp.organisation_id
            AND cd.fiscal_year = ktp.fiscal_year
            AND cd.month = ktp.month
        WHERE cd.commodity_id = 28
            AND cd.organisation_id IN (${orgParamList})
            AND cd.month IN (${monthParamList})
            AND cd.organisation_id NOT IN (7, 8)
            AND REPLACE(cd.fiscal_year,' ','') IN (
                REPLACE(@currentFY,' ',''),
                REPLACE(@lastFY,' ','')
            )
        GROUP BY cd.fiscal_year
    ),
    loading_dry_bulk_agg AS (
    SELECT
        tcd.fiscal_year,
        SUM(
            CASE
                WHEN tcd.direction_id = 2
                     AND tcd.commodity_group_id = 2
                THEN tcd.value * ktp.dry_bulk_efficiency
                ELSE 0
            END
        ) AS loading_dry_num,

        SUM(
            CASE
                WHEN tcd.direction_id = 2
                     AND tcd.commodity_group_id = 2
                THEN tcd.value
                ELSE 0
            END
        ) AS loading_dry_den

    FROM tbl_traffic_commodity_data tcd
    INNER JOIN tbl_kpi_time_performance ktp
        ON tcd.organisation_id = ktp.organisation_id
        AND tcd.fiscal_year = ktp.fiscal_year
        AND tcd.month = ktp.month

    WHERE tcd.organisation_id IN (${orgParamList})
      AND tcd.month IN (${monthParamList})
      AND REPLACE(tcd.fiscal_year,' ','') IN (
            REPLACE(@currentFY,' ',''),
            REPLACE(@lastFY,' ','')
      )

    GROUP BY tcd.fiscal_year
),
unloading_dry_bulk_agg AS (
    SELECT
        tcd.fiscal_year,
        SUM(
            CASE
                WHEN tcd.direction_id = 1
                     AND tcd.commodity_group_id = 2
                THEN tcd.value * ktp.unloading_dry_bulk_efficiency
                ELSE 0
            END
        ) AS unloading_dry_num,

        SUM(
            CASE
                WHEN tcd.direction_id = 1
                     AND tcd.commodity_group_id = 2
                THEN tcd.value
                ELSE 0
            END
        ) AS unloading_dry_den
    FROM tbl_traffic_commodity_data tcd
    INNER JOIN tbl_kpi_time_performance ktp
        ON tcd.organisation_id = ktp.organisation_id
        AND tcd.fiscal_year = ktp.fiscal_year
        AND tcd.month = ktp.month
    WHERE tcd.organisation_id IN (${orgParamList})
      AND tcd.month IN (${monthParamList})
      AND REPLACE(tcd.fiscal_year,' ','') IN (
            REPLACE(@currentFY,' ',''),
            REPLACE(@lastFY,' ','')
      )
    GROUP BY tcd.fiscal_year
),
loading_break_bulk_agg AS (
    SELECT
        tcd.fiscal_year,
        SUM(
            CASE
                WHEN tcd.direction_id = 2
                     AND tcd.commodity_group_id = 3
                THEN tcd.value * ktp.break_bulk_efficiency
                ELSE 0
            END
        ) AS loading_break_num,

        SUM(
            CASE
                WHEN tcd.direction_id = 2
                     AND tcd.commodity_group_id = 3
                THEN tcd.value
                ELSE 0
            END
        ) AS loading_break_den
    FROM tbl_traffic_commodity_data tcd
    INNER JOIN tbl_kpi_time_performance ktp
        ON tcd.organisation_id = ktp.organisation_id
        AND tcd.fiscal_year = ktp.fiscal_year
        AND tcd.month = ktp.month
    WHERE tcd.organisation_id IN (${orgParamList})
      AND tcd.month IN (${monthParamList})
      AND REPLACE(tcd.fiscal_year,' ','') IN (
            REPLACE(@currentFY,' ',''),
            REPLACE(@lastFY,' ','')
      )
    GROUP BY tcd.fiscal_year
),
unloading_break_bulk_agg AS (
    SELECT
        tcd.fiscal_year,

        SUM(
            CASE
                WHEN tcd.direction_id = 1
                     AND tcd.commodity_group_id = 3
                THEN tcd.value * ktp.unloading_break_bulk_efficiency
                ELSE 0
            END
        ) AS unloading_break_num,

        SUM(
            CASE
                WHEN tcd.direction_id = 1
                     AND tcd.commodity_group_id = 3
                THEN tcd.value
                ELSE 0
            END
        ) AS unloading_break_den

    FROM tbl_traffic_commodity_data tcd
    INNER JOIN tbl_kpi_time_performance ktp
        ON tcd.organisation_id = ktp.organisation_id
        AND tcd.fiscal_year = ktp.fiscal_year
        AND tcd.month = ktp.month
    WHERE tcd.organisation_id IN (${orgParamList})
      AND tcd.month IN (${monthParamList})
      AND REPLACE(tcd.fiscal_year,' ','') IN (
            REPLACE(@currentFY,' ',''),
            REPLACE(@lastFY,' ','')
      )
    GROUP BY tcd.fiscal_year
),
loading_liquid_bulk_agg AS (
    SELECT
        tcd.fiscal_year,

        SUM(
            CASE
                WHEN tcd.direction_id = 2
                     AND tcd.commodity_group_id = 1
                THEN ISNULL(tcd.value,0) * ISNULL(ktp.liquid_bulk_efficiency,0)
                ELSE 0
            END
        ) AS loading_liquid_num,

        SUM(
            CASE
                WHEN tcd.direction_id = 2
                     AND tcd.commodity_group_id = 1
                THEN ISNULL(tcd.value,0)
                ELSE 0
            END
        ) AS loading_liquid_den

    FROM tbl_traffic_commodity_data tcd
    INNER JOIN tbl_kpi_time_performance ktp
        ON tcd.organisation_id = ktp.organisation_id
        AND tcd.fiscal_year = ktp.fiscal_year
        AND tcd.month = ktp.month
    WHERE tcd.organisation_id IN (${orgParamList})
      AND tcd.month IN (${monthParamList})
      AND REPLACE(tcd.fiscal_year,' ','') IN (
            REPLACE(@currentFY,' ',''),
            REPLACE(@lastFY,' ','')
      )
    GROUP BY tcd.fiscal_year
),
unloading_liquid_bulk_agg AS (
    SELECT
        tcd.fiscal_year,

        SUM(
            CASE
                WHEN tcd.direction_id = 1
                     AND tcd.commodity_group_id = 1
                THEN ISNULL(tcd.value,0) * ISNULL(ktp.unloading_liquid_bulk_efficiency,0)
                ELSE 0
            END
        ) AS unloading_liquid_num,

        SUM(
            CASE
                WHEN tcd.direction_id = 1
                     AND tcd.commodity_group_id = 1
                THEN ISNULL(tcd.value,0)
                ELSE 0
            END
        ) AS unloading_liquid_den

    FROM tbl_traffic_commodity_data tcd
    INNER JOIN tbl_kpi_time_performance ktp
        ON tcd.organisation_id = ktp.organisation_id
        AND tcd.fiscal_year = ktp.fiscal_year
        AND tcd.month = ktp.month
    WHERE tcd.organisation_id IN (${orgParamList})
      AND tcd.month IN (${monthParamList})
      AND REPLACE(tcd.fiscal_year,' ','') IN (
            REPLACE(@currentFY,' ',''),
            REPLACE(@lastFY,' ','')
      )
    GROUP BY tcd.fiscal_year
),

        dwell_agg AS (
            SELECT
                tcd.organisation_id,
                tcd.fiscal_year,
                /* IMPORT DWELL */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                              AND tcd.organisation_id NOT IN (7, 8)
                         THEN tcd.value * ktp.import_dwell_time ELSE 0 END) AS import_dwell_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                              AND tcd.organisation_id NOT IN (7, 8)
                         THEN tcd.value ELSE 0 END) AS import_dwell_den,

                /* EXPORT DWELL */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                              AND tcd.organisation_id NOT IN (7, 8) 
                         THEN tcd.value * ktp.export_dwell_time ELSE 0 END) AS export_dwell_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                              AND tcd.organisation_id NOT IN (7, 8) 
                         THEN tcd.value ELSE 0 END) AS export_dwell_den,

                /* LOADING DRY BULK */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=2
                         THEN tcd.value * ktp.dry_bulk_efficiency ELSE 0 END) AS loading_dry_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=2
                         THEN tcd.value ELSE 0 END) AS loading_dry_den,

                /* UNLOADING DRY BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=2
                         THEN tcd.value * ktp.unloading_dry_bulk_efficiency ELSE 0 END) AS unloading_dry_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=2
                         THEN tcd.value ELSE 0 END)  AS unloading_dry_den,

                /* LOADING BREAK BULK */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=3
                         THEN tcd.value * ktp.break_bulk_efficiency ELSE 0 END) AS loading_break_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=3
                         THEN tcd.value ELSE 0 END) AS loading_break_den,

                /* UNLOADING BREAK BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=3
                         THEN tcd.value * ktp.unloading_break_bulk_efficiency ELSE 0 END) AS unloading_break_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=3
                         THEN tcd.value ELSE 0 END) AS unloading_break_den,

                /* LOADING LIQUID BULK */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=1
                         THEN tcd.value * ktp.liquid_bulk_efficiency ELSE 0 END) AS loading_liquid_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=1
                         THEN tcd.value ELSE 0 END) AS loading_liquid_den,

                /* UNLOADING LIQUID BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=1
                         THEN tcd.value * ktp.unloading_liquid_bulk_efficiency ELSE 0 END) AS unloading_liquid_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=1
                         THEN tcd.value ELSE 0 END) AS unloading_liquid_den
            FROM tbl_traffic_commodity_data tcd
            LEFT JOIN tbl_kpi_time_performance ktp
                ON tcd.organisation_id = ktp.organisation_id
                AND tcd.fiscal_year = ktp.fiscal_year
                AND tcd.month = ktp.month
            /* INNER JOIN base_filter controls months — no extra BETWEEN needed */
            INNER JOIN base_filter bf
                ON bf.organisation_id = tcd.organisation_id
                AND bf.month = tcd.month
                AND bf.fiscal_year = tcd.fiscal_year
            GROUP BY tcd.organisation_id, tcd.fiscal_year
        )

        SELECT
            MAX(ts.total_traffic_current) AS total_traffic_current,
            MAX(ts.total_traffic_last) AS total_traffic_last,

            CASE
                WHEN MAX(ts.total_traffic_last) = 0 THEN NULL
                ELSE (
                    (MAX(ts.total_traffic_current) - MAX(ts.total_traffic_last))
                    * 100.0
                    / MAX(ts.total_traffic_last)
                )
            END AS total_traffic_yoy,

            /* AVG TRT */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_trt_overall * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END),0) AS avg_trt_current,
            SUM(CASE WHEN k.fiscal_year=@lastFY    THEN k.average_trt_overall * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY    THEN k.total_sailed_vessel_handled END),0) AS avg_trt_last,
            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END)=0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_trt_overall*k.total_sailed_vessel_handled END)
                     /NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END),0)
                     -
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_trt_overall*k.total_sailed_vessel_handled END)
                     /NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END),0)
                 ) * 100.0
                 / (SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_trt_overall*k.total_sailed_vessel_handled END)
                    /NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END),0))
            END AS avg_trt_yoy,

            /* CONTAINER TRT */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_trt * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END),0) AS container_trt_current,
            SUM(CASE WHEN k.fiscal_year=@lastFY    THEN k.average_container_trt * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY    THEN k.container_vessel_handled END),0) AS container_trt_last,
            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END)=0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_trt*k.container_vessel_handled END)
                     /NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END),0)
                     -
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_trt*k.container_vessel_handled END)
                     /NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END),0)
                 ) * 100.0
                 / (SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_trt*k.container_vessel_handled END)
                    /NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END),0))
            END AS container_trt_yoy,

            /* MEDIAN TRT (weighted, cumulative-vessel-count method) */
            MAX(CASE WHEN mw.fiscal_year=REPLACE(@currentFY,' ','') THEN mw.weighted_median_trt END) AS median_trt_current,
            MAX(CASE WHEN mw.fiscal_year=REPLACE(@lastFY,' ','')    THEN mw.weighted_median_trt END) AS median_trt_last,
            (MAX(CASE WHEN mw.fiscal_year=REPLACE(@currentFY,' ','') THEN mw.weighted_median_trt END)
             - MAX(CASE WHEN mw.fiscal_year=REPLACE(@lastFY,' ','') THEN mw.weighted_median_trt END)
            ) * 100.0
            / NULLIF(MAX(CASE WHEN mw.fiscal_year=REPLACE(@lastFY,' ','') THEN mw.weighted_median_trt END),0) AS median_trt_yoy,

            /* OSBD */
            ROUND(NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_cargo_handled END),0)
                  /NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN NULLIF(k.total_cargo_handled,0)/NULLIF(k.osbd_overall,0) END),0),0) AS osbd_current,
            ROUND(NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY    THEN k.total_cargo_handled END),0)
                  /NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY    THEN NULLIF(k.total_cargo_handled,0)/NULLIF(k.osbd_overall,0) END),0),0) AS osbd_last,
            CASE WHEN NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN NULLIF(k.total_cargo_handled,0)/NULLIF(k.osbd_overall,0) END),0) IS NULL THEN NULL
                 ELSE (
                     NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_cargo_handled END),0)
                     /NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN NULLIF(k.total_cargo_handled,0)/NULLIF(k.osbd_overall,0) END),0)
                     -
                     NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_cargo_handled END),0)
                     /NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN NULLIF(k.total_cargo_handled,0)/NULLIF(k.osbd_overall,0) END),0)
                 ) * 100.0
                 / (NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_cargo_handled END),0)
                    /NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN NULLIF(k.total_cargo_handled,0)/NULLIF(k.osbd_overall,0) END),0))
            END AS osbd_yoy,

            /*use SUM(num)/SUM(den) instead of AVG — correct weighted average across orgs */
            /* IMPORT DWELL */
            SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.import_dwell_num END)
            / NULLIF(SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.import_dwell_den END),0) AS import_dwell_current,
            SUM(CASE WHEN d.fiscal_year=@lastFY    THEN d.import_dwell_num END)
            / NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY    THEN d.import_dwell_den END),0) AS import_dwell_last,
            (SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.import_dwell_num END)/NULLIF(SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.import_dwell_den END),0)
             -SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.import_dwell_num END)/NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.import_dwell_den END),0)
            ) * 100.0
            / NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.import_dwell_num END)/NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.import_dwell_den END),0),0) AS import_dwell_yoy,

            /* EXPORT DWELL */
            SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.export_dwell_num END)
            / NULLIF(SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.export_dwell_den END),0) AS export_dwell_current,
            SUM(CASE WHEN d.fiscal_year=@lastFY    THEN d.export_dwell_num END)
            / NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY    THEN d.export_dwell_den END),0) AS export_dwell_last,
            (SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.export_dwell_num END)/NULLIF(SUM(CASE WHEN d.fiscal_year=@currentFY THEN d.export_dwell_den END),0)
             -SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.export_dwell_num END)/NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.export_dwell_den END),0)
            ) * 100.0
            / NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.export_dwell_num END)/NULLIF(SUM(CASE WHEN d.fiscal_year=@lastFY THEN d.export_dwell_den END),0),0) AS export_dwell_yoy,

            /* LOADING DRY BULK */
            MAX(
    CASE
        WHEN ldb.fiscal_year = @currentFY
        THEN ldb.loading_dry_num / NULLIF(ldb.loading_dry_den,0)
    END
) AS loading_dry_bulk_efficiency_current,

MAX(
    CASE
        WHEN ldb.fiscal_year = @lastFY
        THEN ldb.loading_dry_num / NULLIF(ldb.loading_dry_den,0)
    END
    ) AS loading_dry_bulk_efficiency_last,

    (
        MAX(
            CASE
                WHEN ldb.fiscal_year = @currentFY
                THEN ldb.loading_dry_num / NULLIF(ldb.loading_dry_den,0)
            END
        )
        -
        MAX(
            CASE
                WHEN ldb.fiscal_year = @lastFY
                THEN ldb.loading_dry_num / NULLIF(ldb.loading_dry_den,0)
            END
        )
    )
    * 100.0
    /
    NULLIF(
        MAX(
            CASE
                WHEN ldb.fiscal_year = @lastFY
                THEN ldb.loading_dry_num / NULLIF(ldb.loading_dry_den,0)
            END
        ),
        0
    ) AS loading_dry_bulk_efficiency_yoy,

            /* UNLOADING DRY BULK */
            /* UNLOADING DRY BULK */

    MAX(
        CASE
            WHEN udb.fiscal_year = @currentFY
            THEN udb.unloading_dry_num / NULLIF(udb.unloading_dry_den,0)
        END
    ) AS unloading_dry_bulk_efficiency_current,

    MAX(
        CASE
            WHEN udb.fiscal_year = @lastFY
            THEN udb.unloading_dry_num / NULLIF(udb.unloading_dry_den,0)
        END
    ) AS unloading_dry_bulk_efficiency_last,

    (
        MAX(
            CASE
                WHEN udb.fiscal_year = @currentFY
                THEN udb.unloading_dry_num / NULLIF(udb.unloading_dry_den,0)
            END
        )
        -
        MAX(
            CASE
                WHEN udb.fiscal_year = @lastFY
                THEN udb.unloading_dry_num / NULLIF(udb.unloading_dry_den,0)
            END
        )
    )
    * 100.0
    /
    NULLIF(
        MAX(
            CASE
                WHEN udb.fiscal_year = @lastFY
                THEN udb.unloading_dry_num / NULLIF(udb.unloading_dry_den,0)
            END
        ),
        0
    ) AS unloading_dry_bulk_efficiency_yoy,

                /* LOADING BREAK BULK */
    /* LOADING BREAK BULK */

    MAX(
        CASE
            WHEN lbb.fiscal_year = @currentFY
            THEN lbb.loading_break_num / NULLIF(lbb.loading_break_den,0)
        END
    ) AS loading_break_bulk_efficiency_current,

    MAX(
        CASE
            WHEN lbb.fiscal_year = @lastFY
            THEN lbb.loading_break_num / NULLIF(lbb.loading_break_den,0)
        END
    ) AS loading_break_bulk_efficiency_last,

    (
        MAX(
            CASE
                WHEN lbb.fiscal_year = @currentFY
                THEN lbb.loading_break_num / NULLIF(lbb.loading_break_den,0)
            END
        )
        -
        MAX(
            CASE
                WHEN lbb.fiscal_year = @lastFY
                THEN lbb.loading_break_num / NULLIF(lbb.loading_break_den,0)
            END
        )
    )
    * 100.0
    /
    NULLIF(
        MAX(
            CASE
                WHEN lbb.fiscal_year = @lastFY
                THEN lbb.loading_break_num / NULLIF(lbb.loading_break_den,0)
            END
        ),
        0
    ) AS loading_break_bulk_efficiency_yoy,

            /* UNLOADING BREAK BULK */
            /* UNLOADING BREAK BULK */

    MAX(
        CASE
            WHEN ubb.fiscal_year = @currentFY
            THEN ubb.unloading_break_num / NULLIF(ubb.unloading_break_den,0)
        END
    ) AS unloading_break_bulk_efficiency_current,

    MAX(
        CASE
            WHEN ubb.fiscal_year = @lastFY
            THEN ubb.unloading_break_num / NULLIF(ubb.unloading_break_den,0)
        END
    ) AS unloading_break_bulk_efficiency_last,

    (
        MAX(
            CASE
                WHEN ubb.fiscal_year = @currentFY
                THEN ubb.unloading_break_num / NULLIF(ubb.unloading_break_den,0)
            END
        )
        -
        MAX(
            CASE
                WHEN ubb.fiscal_year = @lastFY
                THEN ubb.unloading_break_num / NULLIF(ubb.unloading_break_den,0)
            END
        )
    )
    * 100.0
    /
    NULLIF(
        MAX(
            CASE
                WHEN ubb.fiscal_year = @lastFY
                THEN ubb.unloading_break_num / NULLIF(ubb.unloading_break_den,0)
            END
        ),
        0
    ) AS unloading_break_bulk_efficiency_yoy,

            /* LOADING LIQUID BULK */

        MAX(CASE WHEN llb.fiscal_year = @currentFY
            THEN llb.loading_liquid_num / NULLIF(llb.loading_liquid_den, 0)
        END) AS loading_liquid_bulk_efficiency_current,

        MAX(CASE WHEN llb.fiscal_year = @lastFY
            THEN llb.loading_liquid_num / NULLIF(llb.loading_liquid_den, 0)
        END) AS loading_liquid_bulk_efficiency_last,

        (
            MAX(CASE WHEN llb.fiscal_year = @currentFY
                THEN llb.loading_liquid_num / NULLIF(llb.loading_liquid_den, 0)
            END)
            -
            MAX(CASE WHEN llb.fiscal_year = @lastFY
                THEN llb.loading_liquid_num / NULLIF(llb.loading_liquid_den, 0)
            END)
        ) * 100.0
        /
        NULLIF(
            MAX(CASE WHEN llb.fiscal_year = @lastFY
                THEN llb.loading_liquid_num / NULLIF(llb.loading_liquid_den, 0)
            END),
            0
        ) AS loading_liquid_bulk_efficiency_yoy,

           /* UNLOADING LIQUID BULK */

        MAX(CASE WHEN ulb.fiscal_year = @currentFY
            THEN ulb.unloading_liquid_num / NULLIF(ulb.unloading_liquid_den, 0)
        END) AS unloading_liquid_bulk_efficiency_current,

        MAX(CASE WHEN ulb.fiscal_year = @lastFY
            THEN ulb.unloading_liquid_num / NULLIF(ulb.unloading_liquid_den, 0)
        END) AS unloading_liquid_bulk_efficiency_last,

        (
            MAX(CASE WHEN ulb.fiscal_year = @currentFY
                THEN ulb.unloading_liquid_num / NULLIF(ulb.unloading_liquid_den, 0)
            END)
            -
            MAX(CASE WHEN ulb.fiscal_year = @lastFY
                THEN ulb.unloading_liquid_num / NULLIF(ulb.unloading_liquid_den, 0)
            END)
        ) * 100.0
        /
        NULLIF(
            MAX(CASE WHEN ulb.fiscal_year = @lastFY
                THEN ulb.unloading_liquid_num / NULLIF(ulb.unloading_liquid_den, 0)
            END),
            0
        ) AS unloading_liquid_bulk_efficiency_yoy,
                /* GROSS CRANE */
                /* GROSS CRANE PRODUCTIVITY */

            MAX(CASE WHEN cp.fiscal_year = @currentFY
                THEN cp.gross_crane_num / NULLIF(cp.crane_den,0)
            END) AS gross_crane_productivity_current,

            MAX(CASE WHEN cp.fiscal_year = @lastFY
                THEN cp.gross_crane_num / NULLIF(cp.crane_den,0)
            END) AS gross_crane_productivity_last,

            (
                MAX(CASE WHEN cp.fiscal_year = @currentFY
                    THEN cp.gross_crane_num / NULLIF(cp.crane_den,0)
                END)
                -
                MAX(CASE WHEN cp.fiscal_year = @lastFY
                    THEN cp.gross_crane_num / NULLIF(cp.crane_den,0)
                END)
            ) * 100.0
            /
            NULLIF(
                MAX(CASE WHEN cp.fiscal_year = @lastFY
                    THEN cp.gross_crane_num / NULLIF(cp.crane_den,0)
                END),
            0
            ) AS gross_crane_productivity_yoy

                FROM kpi_base k
                CROSS JOIN traffic_summary ts
                LEFT JOIN dwell_agg d
                    ON k.organisation_id = d.organisation_id
                    AND k.fiscal_year = d.fiscal_year
                LEFT JOIN container_productivity_agg cp
            ON k.fiscal_year = cp.fiscal_year

            LEFT JOIN loading_dry_bulk_agg ldb
            ON k.fiscal_year = ldb.fiscal_year

            LEFT JOIN unloading_dry_bulk_agg udb
            ON k.fiscal_year = udb.fiscal_year

            LEFT JOIN loading_break_bulk_agg lbb
            ON k.fiscal_year = lbb.fiscal_year
            LEFT JOIN unloading_break_bulk_agg ubb
            ON k.fiscal_year = ubb.fiscal_year

            LEFT JOIN loading_liquid_bulk_agg llb
            ON k.fiscal_year = llb.fiscal_year
            
            LEFT JOIN unloading_liquid_bulk_agg ulb
            ON k.fiscal_year = ulb.fiscal_year

            LEFT JOIN median_weighted_result mw ON 1=1
                `;

                const result = await request.query(query);
                return res.status(200).json(result.recordset[0]);

        } catch (error) {
            console.error("Error:", error);
            return res.status(500).json({ message: "Error fetching data." });
    }
}

function getKpiConfig(kpi) {
    if (!kpi) return "traffic";

    if (isNaN(kpi)) {
        return kpi;
    }

    switch (parseInt(kpi)) {
        case 4: return "container_trt";
        case 5: return "export_dwell";
        case 6: return "import_dwell";
        case 7: return "osbd";
        case 8: return "traffic";
        case 9: return "avg_trt";
        case 10: return "gross_crane";
        case 11: return "loading_dry";
        case 12: return "loading_break";
        case 13: return "loading_liquid";
        case 14: return "unloading_dry";
        case 15: return "unloading_break";
        case 16: return "unloading_liquid";
        default: return "traffic";
    }
}

async function getTopPerformingPorts(req, res) {
    try {

        const kpi = req.params.kpi? parseInt(req.params.kpi, 10) : null;
        const fyParam = req.params.fy && req.params.fy !== "all"? req.params.fy.replace(/\s/g, ""): null;

        const conn = await pool;
        const request = conn.request();

        const allOrgs = [1,2,3,5,6,7,8,9,10,11,12,54,55];

        let currentFY, lastFY;

        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split("-").map(Number);
            lastFY = `${start - 1}-${end - 1}`;

        } else {
            const today = new Date();
            const year = today.getMonth() >= 3 ? today.getFullYear(): today.getFullYear() - 1;

            currentFY = `${year}-${year + 1}`;
            lastFY = `${year - 1}-${year}`;
        }

        const currentMonth = new Date().getMonth() + 1;

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);
        request.input("currentMonth", currentMonth);
        request.input("kpi", kpi);

        const query = `
        WITH base AS (

            SELECT
                k.organisation_id,
                o.organisation_label,
                REPLACE(k.fiscal_year,' ','') AS fiscal_year,
                k.month,
                k.total_cargo_handled,
                k.total_sailed_vessel_handled,
                k.container_vessel_handled,
                k.average_trt_overall,
                k.average_container_trt,
                k.osbd_overall,
                k.export_dwell_time,
                k.import_dwell_time

            FROM tbl_kpi_time_performance k

            LEFT JOIN mmt_organisation o
                ON k.organisation_id = o.organisation_id

            WHERE k.organisation_id IN (${allOrgs.join(",")})
        ),

        ytd AS (

            SELECT *
            FROM base

            WHERE month BETWEEN 4 AND @currentMonth
            AND fiscal_year IN (
                REPLACE(@currentFY,' ',''),
                REPLACE(@lastFY,' ','')
            )
        ),

        traffic AS (

            SELECT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year,
                SUM(value) / 1000.0 AS traffic

            FROM tbl_traffic_commodity_data

            WHERE commodity_id <> 28

            GROUP BY
                organisation_id,
                REPLACE(fiscal_year,' ','')
        ),

        ro_ro AS (

            SELECT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year,
                SUM(ro_ro_traffic) AS ro_ro

            FROM tbl_traffic_ro_ro_pax_data

            GROUP BY
                organisation_id,
                REPLACE(fiscal_year,' ','')
        ),

        kpi_calc AS (

            SELECT

                y.organisation_id,
                y.organisation_label,
                y.fiscal_year,

                (
                    ISNULL(t.traffic, 0)
                    + ISNULL(r.ro_ro, 0)
                ) AS traffic_value,

                SUM(
                    y.average_trt_overall
                    * y.total_sailed_vessel_handled
                )
                /
                NULLIF(
                    SUM(y.total_sailed_vessel_handled),
                    0
                ) AS avg_trt,

                SUM(
                    y.average_container_trt
                    * y.container_vessel_handled
                )
                /
                NULLIF(
                    SUM(y.container_vessel_handled),
                    0
                ) AS container_trt,

                AVG(y.osbd_overall) AS osbd,

                AVG(y.export_dwell_time)
                    AS export_dwell,

                AVG(y.import_dwell_time)
                    AS import_dwell

            FROM ytd y
            LEFT JOIN traffic t ON y.organisation_id = t.organisation_id AND y.fiscal_year = t.fiscal_year
            LEFT JOIN ro_ro r ON y.organisation_id = r.organisation_id AND y.fiscal_year = r.fiscal_year
            GROUP BY
                y.organisation_id,
                y.organisation_label,
                y.fiscal_year,
                t.traffic,
                r.ro_ro
        ),

        ranked AS (

            SELECT
                *,

                ROW_NUMBER() OVER (
                    PARTITION BY organisation_id
                    ORDER BY
                        CAST(LEFT(fiscal_year,4) AS INT) DESC
                ) AS rn

            FROM kpi_calc
        ),

        pivot_data AS (

            SELECT

                organisation_id,
                organisation_label,

                MAX(
                    CASE WHEN rn = 1
                    THEN traffic_value END
                ) AS curr_traffic,

                MAX(
                    CASE WHEN rn = 2
                    THEN traffic_value END
                ) AS last_traffic,

                MAX(
                    CASE WHEN rn = 1
                    THEN avg_trt END
                ) AS curr_avg_trt,

                MAX(
                    CASE WHEN rn = 2
                    THEN avg_trt END
                ) AS last_avg_trt,

                MAX(
                    CASE WHEN rn = 1
                    THEN container_trt END
                ) AS curr_container_trt,

                MAX(
                    CASE WHEN rn = 2
                    THEN container_trt END
                ) AS last_container_trt,

                MAX(
                    CASE WHEN rn = 1
                    THEN osbd END
                ) AS curr_osbd,

                MAX(
                    CASE WHEN rn = 2
                    THEN osbd END
                ) AS last_osbd,

                MAX(
                    CASE WHEN rn = 1
                    THEN export_dwell END
                ) AS curr_export_dwell,

                MAX(
                    CASE WHEN rn = 2
                    THEN export_dwell END
                ) AS last_export_dwell,

                MAX(
                    CASE WHEN rn = 1
                    THEN import_dwell END
                ) AS curr_import_dwell,

                MAX(
                    CASE WHEN rn = 2
                    THEN import_dwell END
                ) AS last_import_dwell

            FROM ranked

            GROUP BY
                organisation_id,
                organisation_label
        )

        SELECT TOP 3

            organisation_id,
            organisation_label,

            CASE

                WHEN @kpi IS NULL
                    OR @kpi = 8 THEN

                    (
                        curr_traffic - last_traffic
                    ) * 100.0
                    /
                    NULLIF(last_traffic,0)

                WHEN @kpi = 9 THEN

                    (
                        curr_avg_trt - last_avg_trt
                    ) * 100.0
                    /
                    NULLIF(last_avg_trt,0)

                WHEN @kpi = 4 THEN

                    (
                        curr_container_trt
                        - last_container_trt
                    ) * 100.0
                    /
                    NULLIF(last_container_trt,0)

                WHEN @kpi = 7 THEN

                    (
                        curr_osbd - last_osbd
                    ) * 100.0
                    /
                    NULLIF(last_osbd,0)

                WHEN @kpi = 5 THEN

                    (
                        curr_export_dwell
                        - last_export_dwell
                    ) * 100.0
                    /
                    NULLIF(last_export_dwell,0)

                WHEN @kpi = 6 THEN

                    (
                        curr_import_dwell
                        - last_import_dwell
                    ) * 100.0
                    /
                    NULLIF(last_import_dwell,0)

            END AS yoy_growth

        FROM pivot_data

        ORDER BY yoy_growth DESC;
        `;

        const result = await request.query(query);

        return res.json(result.recordset);

    } catch (error) {
        console.error("Error in getTopPerformingPorts:", error);
        return res.status(500).json({error:"Error fetching top performing ports"});
    }
}

async function getLeastPerformingPorts(req, res) {
    try {

        const kpi = req.params.kpi? parseInt(req.params.kpi, 10) : null;
        const fyParam = req.params.fy && req.params.fy !== "all"? req.params.fy.replace(/\s/g, ""): null;

        const conn = await pool;
        const request = conn.request();

        const allOrgs = [1,2,3,5,6,7,8,9,10,11,12,54,55];

        let currentFY, lastFY;

        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split("-").map(Number);
            lastFY = `${start - 1}-${end - 1}`;

        } else {
            const today = new Date();
            const year = today.getMonth() >= 3 ? today.getFullYear(): today.getFullYear() - 1;

            currentFY = `${year}-${year + 1}`;
            lastFY = `${year - 1}-${year}`;
        }

        const currentMonth = new Date().getMonth() + 1;

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);
        request.input("currentMonth", currentMonth);
        request.input("kpi", kpi);

        const query = `
        WITH base AS (

            SELECT
                k.organisation_id,
                o.organisation_label,
                REPLACE(k.fiscal_year,' ','') AS fiscal_year,
                k.month,
                k.total_cargo_handled,
                k.total_sailed_vessel_handled,
                k.container_vessel_handled,
                k.average_trt_overall,
                k.average_container_trt,
                k.osbd_overall,
                k.export_dwell_time,
                k.import_dwell_time

            FROM tbl_kpi_time_performance k

            LEFT JOIN mmt_organisation o
                ON k.organisation_id = o.organisation_id

            WHERE k.organisation_id IN (${allOrgs.join(",")})
        ),

        ytd AS (

            SELECT *
            FROM base

            WHERE month BETWEEN 4 AND @currentMonth
            AND fiscal_year IN (
                REPLACE(@currentFY,' ',''),
                REPLACE(@lastFY,' ','')
            )
        ),

        traffic AS (

            SELECT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year,
                SUM(value) / 1000.0 AS traffic

            FROM tbl_traffic_commodity_data

            WHERE commodity_id <> 28

            GROUP BY
                organisation_id,
                REPLACE(fiscal_year,' ','')
        ),

        ro_ro AS (

            SELECT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year,
                SUM(ro_ro_traffic) AS ro_ro

            FROM tbl_traffic_ro_ro_pax_data

            GROUP BY
                organisation_id,
                REPLACE(fiscal_year,' ','')
        ),

        kpi_calc AS (

            SELECT

                y.organisation_id,
                y.organisation_label,
                y.fiscal_year,

                (
                    ISNULL(t.traffic, 0)
                    + ISNULL(r.ro_ro, 0)
                ) AS traffic_value,

                SUM(
                    y.average_trt_overall
                    * y.total_sailed_vessel_handled
                )
                /
                NULLIF(
                    SUM(y.total_sailed_vessel_handled),
                    0
                ) AS avg_trt,

                SUM(
                    y.average_container_trt
                    * y.container_vessel_handled
                )
                /
                NULLIF(
                    SUM(y.container_vessel_handled),
                    0
                ) AS container_trt,

                AVG(y.osbd_overall) AS osbd,

                AVG(y.export_dwell_time)
                    AS export_dwell,

                AVG(y.import_dwell_time)
                    AS import_dwell

            FROM ytd y
            LEFT JOIN traffic t ON y.organisation_id = t.organisation_id AND y.fiscal_year = t.fiscal_year
            LEFT JOIN ro_ro r ON y.organisation_id = r.organisation_id AND y.fiscal_year = r.fiscal_year
            GROUP BY
                y.organisation_id,
                y.organisation_label,
                y.fiscal_year,
                t.traffic,
                r.ro_ro
        ),

        ranked AS (

            SELECT
                *,

                ROW_NUMBER() OVER (
                    PARTITION BY organisation_id
                    ORDER BY
                        CAST(LEFT(fiscal_year,4) AS INT) DESC
                ) AS rn

            FROM kpi_calc
        ),

        pivot_data AS (

            SELECT

                organisation_id,
                organisation_label,

                MAX(
                    CASE WHEN rn = 1
                    THEN traffic_value END
                ) AS curr_traffic,

                MAX(
                    CASE WHEN rn = 2
                    THEN traffic_value END
                ) AS last_traffic,

                MAX(
                    CASE WHEN rn = 1
                    THEN avg_trt END
                ) AS curr_avg_trt,

                MAX(
                    CASE WHEN rn = 2
                    THEN avg_trt END
                ) AS last_avg_trt,

                MAX(
                    CASE WHEN rn = 1
                    THEN container_trt END
                ) AS curr_container_trt,

                MAX(
                    CASE WHEN rn = 2
                    THEN container_trt END
                ) AS last_container_trt,

                MAX(
                    CASE WHEN rn = 1
                    THEN osbd END
                ) AS curr_osbd,

                MAX(
                    CASE WHEN rn = 2
                    THEN osbd END
                ) AS last_osbd,

                MAX(
                    CASE WHEN rn = 1
                    THEN export_dwell END
                ) AS curr_export_dwell,

                MAX(
                    CASE WHEN rn = 2
                    THEN export_dwell END
                ) AS last_export_dwell,

                MAX(
                    CASE WHEN rn = 1
                    THEN import_dwell END
                ) AS curr_import_dwell,

                MAX(
                    CASE WHEN rn = 2
                    THEN import_dwell END
                ) AS last_import_dwell

            FROM ranked

            GROUP BY
                organisation_id,
                organisation_label
        )

        SELECT TOP 3

            organisation_id,
            organisation_label,

            CASE

                WHEN @kpi IS NULL
                    OR @kpi = 8 THEN

                    (
                        curr_traffic - last_traffic
                    ) * 100.0
                    /
                    NULLIF(last_traffic,0)

                WHEN @kpi = 9 THEN

                    (
                        curr_avg_trt - last_avg_trt
                    ) * 100.0
                    /
                    NULLIF(last_avg_trt,0)

                WHEN @kpi = 4 THEN

                    (
                        curr_container_trt
                        - last_container_trt
                    ) * 100.0
                    /
                    NULLIF(last_container_trt,0)

                WHEN @kpi = 7 THEN

                    (
                        curr_osbd - last_osbd
                    ) * 100.0
                    /
                    NULLIF(last_osbd,0)

                WHEN @kpi = 5 THEN

                    (
                        curr_export_dwell
                        - last_export_dwell
                    ) * 100.0
                    /
                    NULLIF(last_export_dwell,0)

                WHEN @kpi = 6 THEN

                    (
                        curr_import_dwell
                        - last_import_dwell
                    ) * 100.0
                    /
                    NULLIF(last_import_dwell,0)

            END AS yoy_growth

        FROM pivot_data

        ORDER BY yoy_growth ASC;
        `;

        const result = await request.query(query);

        return res.json(result.recordset);

    } catch (error) {
        console.error("Error in getLeastPerforming", error);
        return res.status(500).json({error:"Error fetching Least performing ports"});
    }
}

async function detailedKPITrafficCardDashboard(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const organisationID = parseInt(req.query.organisationID) || 0;
        const fyParam = req.query.fy && req.query.fy !== "all" ? req.query.fy : null;
        const monthsParam = req.query.months && req.query.months !== "all" ? req.query.months.split(",").map(Number) : null;
        const rawKpi = req.query.kpi;
        const kpi = getKpiConfig(rawKpi) || "traffic";

        const kpiTypeMap = {
            total_traffic:    0, 
            avg_trt:          1,
            median_trt:       2,
            osbd:             3, 
            import_dwell:     9,
            export_dwell:     10,
            container_trt:    12, 
            gross_crane:      13,
            loading_dry:      14,
            loading_break:    15,
            loading_liquid:   16,
            unloading_dry:    17,
            unloading_break:  18,
            unloading_liquid: 19,
        };

        const kpiTypeId = kpiTypeMap[kpi] ?? null;

        const isMedianKpi = kpi === "median_trt";

        let currentFY, lastFY;
        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split("-").map(Number);
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);

        if (kpiTypeId !== null && kpi !== "total_traffic" && kpi !== "traffic") {
            request.input("kpiTypeId", kpiTypeId);
        }
        /* ================ MONTHS ================= */
        const today = new Date();
        const currentMonth = today.getMonth() + 1;

        let ytdMonths = [];
        if (monthsParam?.length > 0) {
            ytdMonths = monthsParam;
        } else {
            let endMonth = currentMonth - 1;
            if (endMonth <= 0) endMonth = 12;
            if (endMonth >= 4) {
                for (let m = 4; m <= endMonth; m++) ytdMonths.push(m);
            } else {
                for (let m = 4; m <= 12; m++) ytdMonths.push(m);
                for (let m = 1; m <= endMonth; m++) ytdMonths.push(m);
            }
        }

        const fullMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

        ytdMonths.forEach((m, i) => request.input(`ytd${i}`, m));
        fullMonths.forEach((m, i) => request.input(`full${i}`, m));

        const ytdParams  = ytdMonths.map((_, i) => `@ytd${i}`).join(",");
        const fullParams = fullMonths.map((_, i) => `@full${i}`).join(",");

        /* ================= ORGS ================= */
        const allOrgs   = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 54, 55];
        const orgFilter = organisationID ? [organisationID] : allOrgs;
        orgFilter.forEach((id, i) => request.input(`org${i}`, id));
        const orgParams = orgFilter.map((_, i) => `@org${i}`).join(",");

        // target_value is always NULL for those KPIs.
        const targetJoin = (kpi === "total_traffic" || kpi === "traffic")
            ? `LEFT JOIN (
                    SELECT
                        organisation_id,
                        REPLACE(financial_year,' ','') AS financial_year,
                        CAST(fiscal_year_target AS FLOAT) AS target_value
                    FROM tbl_traffic_fiscal_target
            ) tar
                ON  tar.organisation_id = org.organisation_id
                AND tar.financial_year  = fy.fiscal_year`
            : kpiTypeId !== null
                ? `LEFT JOIN (
                        SELECT
                            organisation_id,
                            REPLACE(financial_year,' ','') AS financial_year,
                            MAX(target_value)              AS target_value
                        FROM tbl_kpi_time_performance_target
                        WHERE kpi_type_id = @kpiTypeId
                        GROUP BY organisation_id, REPLACE(financial_year,' ','')
                ) tar
                    ON  tar.organisation_id = org.organisation_id
                    AND tar.financial_year  = fy.fiscal_year`
                : `LEFT JOIN (
                        SELECT
                            CAST(NULL AS INT)         AS organisation_id,
                            CAST(NULL AS VARCHAR(20)) AS financial_year,
                            CAST(NULL AS FLOAT)       AS target_value
                        WHERE 1=0
                ) tar ON 1=0`;
        /* ================= KPI FORMULA ================= */
        let kpiFormula = "";
        switch (kpi) {
            case "traffic":
            case "total_traffic":
                kpiFormula = `SUM(ISNULL(total_traffic,0))`;
                break;
            case "avg_trt":
                kpiFormula = `SUM(avg_trt_num) / NULLIF(SUM(avg_trt_den),0)`;
                break;
            case "container_trt":
                kpiFormula = `SUM(container_trt_num) / NULLIF(SUM(container_trt_den),0)`;
                break;
            case "median_trt":
                kpiFormula = `AVG(median_trt)`;
                break;
            case "osbd":
                kpiFormula = `NULLIF(SUM(osbd_num),0) / NULLIF(SUM(osbd_den),0)`;
                break;
            case "import_dwell":
                kpiFormula = `SUM(import_dwell_num) / NULLIF(SUM(import_dwell_den),0)`;
                break;
            case "export_dwell":
                kpiFormula = `SUM(export_dwell_num) / NULLIF(SUM(export_dwell_den),0)`;
                break;
            case "gross_crane":
                kpiFormula = `SUM(gross_crane_num) / NULLIF(SUM(gross_crane_den),0)`;
                break;
            case "loading_dry":
                kpiFormula = `SUM(loading_dry_num) / NULLIF(SUM(loading_dry_den),0)`;
                break;
            case "unloading_dry":
                kpiFormula = `SUM(unloading_dry_num) / NULLIF(SUM(unloading_dry_den),0)`;
                break;
            case "loading_break":
                kpiFormula = `SUM(loading_break_num) / NULLIF(SUM(loading_break_den),0)`;
                break;
            case "unloading_break":
                kpiFormula = `SUM(unloading_break_num) / NULLIF(SUM(unloading_break_den),0)`;
                break;
            case "loading_liquid":
                kpiFormula = `SUM(loading_liquid_num) / NULLIF(SUM(loading_liquid_den),0)`;
                break;
            case "unloading_liquid":
                kpiFormula = `SUM(unloading_liquid_num) / NULLIF(SUM(unloading_liquid_den),0)`;
                break;
            default:
                kpiFormula = `SUM(ISNULL(total_traffic,0))`;
        }

        const query = `
        WITH
        /* ================= BASE FILTER YTD ================= */
        -- Normalise fiscal_year with REPLACE here so all downstream CTEs
        -- that group by fiscal_year produce space-consistent keys.
        base_filter_ytd AS (
            SELECT
                cd.organisation_id,
                cd.month,
                REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE
                cd.commodity_id <> 28
                AND cd.organisation_id IN (${orgParams})
                AND cd.month IN (${ytdParams})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
                )
            GROUP BY cd.organisation_id, cd.month, REPLACE(cd.fiscal_year,' ','')
        ),

        /* ================= BASE FILTER FULL ================= */
        base_filter_full AS (
            SELECT
                cd.organisation_id,
                cd.month,
                REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE
                cd.commodity_id <> 28
                AND cd.organisation_id IN (${orgParams})
                AND cd.month IN (${fullParams})
                AND REPLACE(cd.fiscal_year,' ','') = REPLACE(@lastFY,' ','')
            GROUP BY cd.organisation_id, cd.month, REPLACE(cd.fiscal_year,' ','')
        ),

        month_filter_ytd AS (
            SELECT DISTINCT organisation_id, month, fiscal_year
            FROM base_filter_ytd
        ),

        month_filter_full AS (
            SELECT DISTINCT organisation_id, month, fiscal_year
            FROM base_filter_full
        ),

        /* ================= TRAFFIC YTD ================= */
        traffic_ytd AS (
            SELECT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year,
                SUM(qty) / 1000.0 AS total_traffic
            FROM base_filter_ytd
            GROUP BY organisation_id, REPLACE(fiscal_year,' ','')
        ),

        /* ================= TRAFFIC FULL ================= */
        traffic_full AS (
            SELECT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year,
                SUM(qty) / 1000.0 AS total_traffic
            FROM base_filter_full
            GROUP BY
                organisation_id,
                REPLACE(fiscal_year,' ','')
        ),

        /* ================= RO-RO YTD ================= */
        ro_ro_ytd AS (
            SELECT
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','') AS fiscal_year,
                SUM(ro_ro_traffic) / 1000.0 AS ro_ro_traffic
            FROM tbl_traffic_ro_ro_pax_data ro
            WHERE ro.organisation_id IN (${orgParams})
            AND ro.month IN (${ytdParams})
            AND REPLACE(ro.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
            )
            GROUP BY
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','')
        ),

        /* ================= RO-RO FULL ================= */
        ro_ro_full AS (
            SELECT
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','') AS fiscal_year,
                SUM(ro_ro_traffic) / 1000.0 AS ro_ro_traffic
            FROM tbl_traffic_ro_ro_pax_data ro
            WHERE ro.organisation_id IN (${orgParams})
            AND ro.month IN (${fullParams})
            AND REPLACE(ro.fiscal_year,' ','') = REPLACE(@lastFY,' ','')
            GROUP BY
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','')
        ),

        final_traffic_ytd AS (
            SELECT
                COALESCE(t.organisation_id, r.organisation_id) AS organisation_id,
                COALESCE(t.fiscal_year, r.fiscal_year) AS fiscal_year,
                ISNULL(t.total_traffic,0)
                + ISNULL(r.ro_ro_traffic,0)
                AS total_traffic
            FROM traffic_ytd t
            FULL OUTER JOIN ro_ro_ytd r
                ON t.organisation_id = r.organisation_id
            AND t.fiscal_year = r.fiscal_year
        ),

        final_traffic_full AS (
            SELECT
                COALESCE(t.organisation_id, r.organisation_id) AS organisation_id,
                COALESCE(t.fiscal_year, r.fiscal_year) AS fiscal_year,
                ISNULL(t.total_traffic,0)
                + ISNULL(r.ro_ro_traffic,0)
                AS total_traffic
            FROM traffic_full t
            FULL OUTER JOIN ro_ro_full r
                ON t.organisation_id = r.organisation_id
            AND t.fiscal_year = r.fiscal_year
        ),

        /* =========================================================
           MEDIAN TRT — "latest available month" method
           ytd_median_trt_overall is itself a running/cumulative YTD
           figure stored on tbl_kpi_time_performance per month, so the
           correct per-org value for a period is whatever the LAST
           month in that period reported — NOT MAX() across all months
           in the period (median is not monotonic month over month,
           so MAX() can silently pick a higher, wrong month).

           This mirrors the OUTER APPLY ... ORDER BY month DESC logic
           used in getKPITrafficDashboard (the card query), so both
           endpoints now agree.
        ========================================================= */
        median_trt_ytd_by_org AS (
            SELECT
                base.organisation_id,
                base.fiscal_year,
                ov.median_trt_overall AS median_trt
            FROM (
                SELECT DISTINCT organisation_id, fiscal_year
                FROM base_filter_ytd
            ) base
            OUTER APPLY (
                SELECT TOP 1 k.ytd_median_trt_overall AS median_trt_overall
                FROM tbl_kpi_time_performance k
                WHERE k.organisation_id = base.organisation_id
                  AND REPLACE(k.fiscal_year,' ','') = base.fiscal_year
                  AND k.month IN (${ytdParams})
                  AND k.ytd_median_trt_overall IS NOT NULL
                ORDER BY k.month DESC
            ) ov
        ),

        median_trt_full_by_org AS (
            SELECT
                base.organisation_id,
                base.fiscal_year,
                ov.median_trt_overall AS median_trt
            FROM (
                SELECT DISTINCT organisation_id, fiscal_year
                FROM base_filter_full
            ) base
            OUTER APPLY (
                SELECT TOP 1 k.ytd_median_trt_overall AS median_trt_overall
                FROM tbl_kpi_time_performance k
                WHERE k.organisation_id = base.organisation_id
                  AND REPLACE(k.fiscal_year,' ','') = base.fiscal_year
                  AND k.month IN (${fullParams})
                  AND k.ytd_median_trt_overall IS NOT NULL
                ORDER BY k.month DESC
            ) ov
        ),

        /* ================= KPI BASE YTD ================= */
        -- it now comes from median_trt_ytd_by_org (see base_ytd join below)
        kpi_base_ytd AS (
            SELECT
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','') AS fiscal_year,
                SUM(ktp.average_trt_overall * ktp.total_sailed_vessel_handled)      AS avg_trt_num,
                SUM(ktp.total_sailed_vessel_handled)                                 AS avg_trt_den,
                SUM(ktp.average_container_trt * ktp.container_vessel_handled)        AS container_trt_num,
                SUM(ktp.container_vessel_handled)                                    AS container_trt_den,
                SUM(ktp.total_cargo_handled)                                         AS osbd_num,
                SUM(NULLIF(ktp.total_cargo_handled,0)/NULLIF(ktp.osbd_overall,0))   AS osbd_den
            FROM tbl_kpi_time_performance ktp
            INNER JOIN base_filter_ytd bf
                ON  bf.organisation_id = ktp.organisation_id
                AND bf.month           = ktp.month
                AND bf.fiscal_year     = REPLACE(ktp.fiscal_year,' ','')
            GROUP BY ktp.organisation_id, REPLACE(ktp.fiscal_year,' ','')
        ),

        /* ================= KPI BASE FULL ================= */
        -- median_trt_full_by_org (see base_full join below)
        kpi_base_full AS (
            SELECT
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','') AS fiscal_year,
                SUM(ktp.average_trt_overall * ktp.total_sailed_vessel_handled)      AS avg_trt_num,
                SUM(ktp.total_sailed_vessel_handled)                                 AS avg_trt_den,
                SUM(ktp.average_container_trt * ktp.container_vessel_handled)        AS container_trt_num,
                SUM(ktp.container_vessel_handled)                                    AS container_trt_den,
                SUM(ktp.total_cargo_handled)                                         AS osbd_num,
                SUM(NULLIF(ktp.total_cargo_handled,0)/NULLIF(ktp.osbd_overall,0))   AS osbd_den
            FROM tbl_kpi_time_performance ktp
            INNER JOIN month_filter_full bf
                ON  bf.organisation_id = ktp.organisation_id
                AND bf.month           = ktp.month
                AND bf.fiscal_year     = REPLACE(ktp.fiscal_year,' ','')
            GROUP BY ktp.organisation_id, REPLACE(ktp.fiscal_year,' ','')
        ),

        /* ================= DWELL + ALL EFFICIENCY YTD ================= */
        -- Group by REPLACE(fiscal_year,' ','') to match base_filter_ytd keys
        -- Remove flag_type_id filter from loading/unloading efficiency to match
        -- getKPITrafficDashboard's dwell_agg (which has no flag_type_id filter
        -- on dry/break/liquid bulk efficiency conditions)
        dwell_ytd AS (
            SELECT
                tcd.organisation_id,
                REPLACE(tcd.fiscal_year,' ','') AS fiscal_year,
                /* IMPORT DWELL */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value * ktp.import_dwell_time ELSE 0 END)          AS import_dwell_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value ELSE 0 END)                                  AS import_dwell_den,

                /* EXPORT DWELL */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value * ktp.export_dwell_time ELSE 0 END)          AS export_dwell_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_id=28
                              AND tcd.category_id = 2 AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value ELSE 0 END)                                  AS export_dwell_den,

                /* LOADING DRY BULK — no flag_type_id filter, matches getKPITrafficDashboard */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=2
                         THEN tcd.value * ktp.dry_bulk_efficiency ELSE 0 END)        AS loading_dry_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=2
                         THEN tcd.value ELSE 0 END)                                  AS loading_dry_den,

                /* UNLOADING DRY BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=2
                         THEN tcd.value * ktp.unloading_dry_bulk_efficiency ELSE 0 END) AS unloading_dry_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=2
                         THEN tcd.value ELSE 0 END)                                     AS unloading_dry_den,

                /* LOADING BREAK BULK */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=3
                         THEN tcd.value * ktp.break_bulk_efficiency ELSE 0 END)      AS loading_break_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=3
                         THEN tcd.value ELSE 0 END)                                  AS loading_break_den,

                /* UNLOADING BREAK BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=3
                         THEN tcd.value * ktp.unloading_break_bulk_efficiency ELSE 0 END) AS unloading_break_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=3
                         THEN tcd.value ELSE 0 END)                                       AS unloading_break_den,

                /* LOADING LIQUID BULK */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=1
                         THEN tcd.value * ktp.liquid_bulk_efficiency ELSE 0 END)     AS loading_liquid_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=1
                         THEN tcd.value ELSE 0 END)                                  AS loading_liquid_den,

                /* UNLOADING LIQUID BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=1
                         THEN tcd.value * ktp.unloading_liquid_bulk_efficiency ELSE 0 END) AS unloading_liquid_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=1
                         THEN tcd.value ELSE 0 END)                                        AS unloading_liquid_den

            FROM tbl_traffic_commodity_data tcd
            LEFT JOIN tbl_kpi_time_performance ktp
                ON  tcd.organisation_id = ktp.organisation_id
                AND REPLACE(tcd.fiscal_year,' ','') = REPLACE(ktp.fiscal_year,' ','')
                AND tcd.month           = ktp.month
            INNER JOIN base_filter_ytd bf
                ON  bf.organisation_id = tcd.organisation_id
                AND bf.month           = tcd.month
                AND bf.fiscal_year     = REPLACE(tcd.fiscal_year,' ','')
            GROUP BY tcd.organisation_id, REPLACE(tcd.fiscal_year,' ','')
        ),

        /* ================= DWELL + ALL EFFICIENCY FULL ================= */
        dwell_full AS (
            SELECT
                tcd.organisation_id,
                REPLACE(tcd.fiscal_year,' ','') AS fiscal_year,
                /* IMPORT DWELL */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_id=28
                              AND tcd.category_id IN (2,4,5) AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value * ktp.import_dwell_time ELSE 0 END)          AS import_dwell_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_id=28
                              AND tcd.category_id IN (2,4,5) AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value ELSE 0 END)                                  AS import_dwell_den,

                /* EXPORT DWELL */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_id=28
                              AND tcd.category_id IN (2,4,5) AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value * ktp.export_dwell_time ELSE 0 END)          AS export_dwell_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_id=28
                              AND tcd.category_id IN (2,4,5) AND tcd.flag_type_id IN (1,2)
                              AND tcd.commodity_group_id=4
                         THEN tcd.value ELSE 0 END)                                  AS export_dwell_den,

                /* LOADING DRY BULK — no flag_type_id filter */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=2
                         THEN tcd.value * ktp.dry_bulk_efficiency ELSE 0 END)        AS loading_dry_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=2
                         THEN tcd.value ELSE 0 END)                                  AS loading_dry_den,

                /* UNLOADING DRY BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=2
                         THEN tcd.value * ktp.unloading_dry_bulk_efficiency ELSE 0 END) AS unloading_dry_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=2
                         THEN tcd.value ELSE 0 END)                                     AS unloading_dry_den,

                /* LOADING BREAK BULK */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=3
                         THEN tcd.value * ktp.break_bulk_efficiency ELSE 0 END)      AS loading_break_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=3
                         THEN tcd.value ELSE 0 END)                                  AS loading_break_den,

                /* UNLOADING BREAK BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=3
                         THEN tcd.value * ktp.unloading_break_bulk_efficiency ELSE 0 END) AS unloading_break_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=3
                         THEN tcd.value ELSE 0 END)                                       AS unloading_break_den,

                /* LOADING LIQUID BULK */
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=1
                         THEN tcd.value * ktp.liquid_bulk_efficiency ELSE 0 END)     AS loading_liquid_num,
                SUM(CASE WHEN tcd.direction_id=2 AND tcd.commodity_group_id=1
                         THEN tcd.value ELSE 0 END)                                  AS loading_liquid_den,

                /* UNLOADING LIQUID BULK */
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=1
                         THEN tcd.value * ktp.unloading_liquid_bulk_efficiency ELSE 0 END) AS unloading_liquid_num,
                SUM(CASE WHEN tcd.direction_id=1 AND tcd.commodity_group_id=1
                         THEN tcd.value ELSE 0 END)                                        AS unloading_liquid_den

            FROM tbl_traffic_commodity_data tcd
            LEFT JOIN tbl_kpi_time_performance ktp
                ON  tcd.organisation_id = ktp.organisation_id
                AND REPLACE(tcd.fiscal_year,' ','') = REPLACE(ktp.fiscal_year,' ','')
                AND tcd.month           = ktp.month
            INNER JOIN month_filter_full bf
                ON  bf.organisation_id = tcd.organisation_id
                AND bf.month           = tcd.month
                AND bf.fiscal_year     = REPLACE(tcd.fiscal_year,' ','')
            GROUP BY tcd.organisation_id, REPLACE(tcd.fiscal_year,' ','')
        ),

        /* ================= GROSS CRANE YTD ================= */
        gross_crane_ytd AS (
            SELECT
                cd.organisation_id,
                REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                SUM(ISNULL(cd.value,0) * ISNULL(ktp.gross_crane_productivity,0)) AS gross_crane_num,
                SUM(ISNULL(cd.value,0))                                           AS gross_crane_den
            FROM tbl_traffic_commodity_data cd
            INNER JOIN tbl_kpi_time_performance ktp
                ON  cd.organisation_id = ktp.organisation_id
                AND REPLACE(cd.fiscal_year,' ','') = REPLACE(ktp.fiscal_year,' ','')
                AND cd.month           = ktp.month
            WHERE cd.commodity_id = 28
              AND cd.organisation_id IN (${orgParams})
              AND cd.month IN (${ytdParams})
              AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
              )
            GROUP BY cd.organisation_id, REPLACE(cd.fiscal_year,' ','')
        ),

        /* ================= GROSS CRANE FULL ================= */
        gross_crane_full AS (
            SELECT
                cd.organisation_id,
                REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                SUM(ISNULL(cd.value,0) * ISNULL(ktp.gross_crane_productivity,0)) AS gross_crane_num,
                SUM(ISNULL(cd.value,0))                                           AS gross_crane_den
            FROM tbl_traffic_commodity_data cd
            INNER JOIN tbl_kpi_time_performance ktp
                ON  cd.organisation_id = ktp.organisation_id
                AND REPLACE(cd.fiscal_year,' ','') = REPLACE(ktp.fiscal_year,' ','')
                AND cd.month           = ktp.month
            WHERE cd.commodity_id = 28
              AND cd.organisation_id IN (${orgParams})
              AND cd.month IN (${fullParams})
              AND REPLACE(cd.fiscal_year,' ','') = REPLACE(@lastFY,' ','')
            GROUP BY cd.organisation_id, REPLACE(cd.fiscal_year,' ','')
        ),

        base_ytd AS (
            SELECT
                org.organisation_id,
                fy.fiscal_year,
                ISNULL(t.total_traffic,0) AS total_traffic,     
                k.avg_trt_num,
                k.avg_trt_den,
                k.container_trt_num,
                k.container_trt_den,
                mt.median_trt,
                k.osbd_num,
                k.osbd_den,
                ISNULL(d.import_dwell_num,0)     AS import_dwell_num,
                ISNULL(d.import_dwell_den,0)     AS import_dwell_den,
                ISNULL(d.export_dwell_num,0)     AS export_dwell_num,
                ISNULL(d.export_dwell_den,0)     AS export_dwell_den,
                ISNULL(d.loading_dry_num,0)      AS loading_dry_num,
                ISNULL(d.loading_dry_den,0)      AS loading_dry_den,
                ISNULL(d.unloading_dry_num,0)    AS unloading_dry_num,
                ISNULL(d.unloading_dry_den,0)    AS unloading_dry_den,
                ISNULL(d.loading_break_num,0)    AS loading_break_num,
                ISNULL(d.loading_break_den,0)    AS loading_break_den,
                ISNULL(d.unloading_break_num,0)  AS unloading_break_num,
                ISNULL(d.unloading_break_den,0)  AS unloading_break_den,
                ISNULL(d.loading_liquid_num,0)   AS loading_liquid_num,
                ISNULL(d.loading_liquid_den,0)   AS loading_liquid_den,
                ISNULL(d.unloading_liquid_num,0) AS unloading_liquid_num,
                ISNULL(d.unloading_liquid_den,0) AS unloading_liquid_den,
                ISNULL(gc.gross_crane_num,0)     AS gross_crane_num,
                ISNULL(gc.gross_crane_den,0)     AS gross_crane_den,
                tar.target_value
            FROM (SELECT DISTINCT organisation_id FROM month_filter_ytd) org

            CROSS JOIN (
                SELECT REPLACE(@currentFY,' ','') AS fiscal_year
                UNION ALL
                SELECT REPLACE(@lastFY,' ','')
            ) fy
            LEFT JOIN final_traffic_ytd t
                ON  t.organisation_id = org.organisation_id
                AND t.fiscal_year     = fy.fiscal_year
            LEFT JOIN kpi_base_ytd k
                ON  k.organisation_id = org.organisation_id
                AND k.fiscal_year     = fy.fiscal_year
            LEFT JOIN median_trt_ytd_by_org mt
                ON  mt.organisation_id = org.organisation_id
                AND mt.fiscal_year     = fy.fiscal_year
            LEFT JOIN dwell_ytd d
                ON  d.organisation_id = org.organisation_id
                AND d.fiscal_year     = fy.fiscal_year
            LEFT JOIN gross_crane_ytd gc
                ON  gc.organisation_id = org.organisation_id
                AND gc.fiscal_year     = fy.fiscal_year
            ${targetJoin}
        ),

        /* ================= BASE FULL ================= */
        base_full AS (
            SELECT
                org.organisation_id,
                fy.fiscal_year,
                ISNULL(t.total_traffic,0)        AS total_traffic,
                k.avg_trt_num,
                k.avg_trt_den,
                k.container_trt_num,
                k.container_trt_den,
                mt.median_trt,
                k.osbd_num,
                k.osbd_den,
                ISNULL(d.import_dwell_num,0)     AS import_dwell_num,
                ISNULL(d.import_dwell_den,0)     AS import_dwell_den,
                ISNULL(d.export_dwell_num,0)     AS export_dwell_num,
                ISNULL(d.export_dwell_den,0)     AS export_dwell_den,
                ISNULL(d.loading_dry_num,0)      AS loading_dry_num,
                ISNULL(d.loading_dry_den,0)      AS loading_dry_den,
                ISNULL(d.unloading_dry_num,0)    AS unloading_dry_num,
                ISNULL(d.unloading_dry_den,0)    AS unloading_dry_den,
                ISNULL(d.loading_break_num,0)    AS loading_break_num,
                ISNULL(d.loading_break_den,0)    AS loading_break_den,
                ISNULL(d.unloading_break_num,0)  AS unloading_break_num,
                ISNULL(d.unloading_break_den,0)  AS unloading_break_den,
                ISNULL(d.loading_liquid_num,0)   AS loading_liquid_num,
                ISNULL(d.loading_liquid_den,0)   AS loading_liquid_den,
                ISNULL(d.unloading_liquid_num,0) AS unloading_liquid_num,
                ISNULL(d.unloading_liquid_den,0) AS unloading_liquid_den,
                ISNULL(gc.gross_crane_num,0)     AS gross_crane_num,
                ISNULL(gc.gross_crane_den,0)     AS gross_crane_den,
                tar.target_value
            FROM (SELECT DISTINCT organisation_id FROM month_filter_full) org
            CROSS JOIN (
                SELECT REPLACE(@lastFY,' ','') AS fiscal_year
            ) fy
            LEFT JOIN final_traffic_full t
                ON  t.organisation_id = org.organisation_id
                AND t.fiscal_year     = fy.fiscal_year
            LEFT JOIN kpi_base_full k
                ON  k.organisation_id = org.organisation_id
                AND k.fiscal_year     = fy.fiscal_year
            LEFT JOIN median_trt_full_by_org mt
                ON  mt.organisation_id = org.organisation_id
                AND mt.fiscal_year     = fy.fiscal_year
            LEFT JOIN dwell_full d
                ON  d.organisation_id = org.organisation_id
                AND d.fiscal_year     = fy.fiscal_year
            LEFT JOIN gross_crane_full gc
                ON  gc.organisation_id = org.organisation_id
                AND gc.fiscal_year     = fy.fiscal_year
            ${targetJoin}
        ),

        /* =========================================================
           WEIGHTED MEDIAN (cumulative-vessel-count method)
           Used ONLY for the SMPA Total / Overall Total rows of the
           median_trt KPI. Per-org rows keep using the direct
           "latest month" value already sitting in
           base_ytd.median_trt / base_full.median_trt (via kpiFormula).

           median_weighted_base : one row per (org, period) with
              trt_value = that org's median_trt (from median_trt_*_by_org)
              and vessel_count = total_sailed_vessel_handled (the
              "weight", already summed as avg_trt_den in base_ytd/base_full).

           median_scoped : duplicates the rows into scope='overall'
              (all orgs in the current filter) and scope='smpa'
              (orgs 54,55 only) so each scope gets its own ranking.

           median_cumulative : sorts by trt_value ASC within each
              scope/period/fiscal_year group and builds the running
              cumulative vessel count - mirrors the "Cumulative Vessel
              Count" column in the reference table.

           median_weighted_result : picks the smallest trt_value whose
              cumulative vessel count has reached 50% of the total
              vessel count for that group - the weighted median TRT.
        ========================================================= */
        median_weighted_base AS (
            SELECT 'ytd' AS period, fiscal_year, organisation_id,
                median_trt AS trt_value,
                avg_trt_den AS vessel_count
            FROM base_ytd
            WHERE median_trt > 0 AND avg_trt_den > 0

            UNION ALL

            SELECT 'full', fiscal_year, organisation_id,
                median_trt,
                avg_trt_den
            FROM base_full
            WHERE median_trt > 0 AND avg_trt_den > 0
        ),

        median_scoped AS (
            SELECT 'overall' AS scope, mb.*
            FROM median_weighted_base mb

            UNION ALL

            SELECT 'smpa' AS scope, mb.*
            FROM median_weighted_base mb
            WHERE mb.organisation_id IN (54,55)
        ),

        median_cumulative AS (
            SELECT
                scope, period, fiscal_year, organisation_id, trt_value, vessel_count,
                SUM(vessel_count) OVER (
                    PARTITION BY scope, period, fiscal_year
                    ORDER BY trt_value
                    ROWS UNBOUNDED PRECEDING
                ) AS cum_vessel_count,
                SUM(vessel_count) OVER (
                    PARTITION BY scope, period, fiscal_year
                ) AS total_vessel_count
            FROM median_scoped
        ),

        median_weighted_result AS (
            SELECT
                scope, period, fiscal_year,
                MIN(trt_value) AS weighted_median_trt
            FROM median_cumulative
            WHERE cum_vessel_count >= total_vessel_count * 0.5
            GROUP BY scope, period, fiscal_year
        ),

        /* ================= CURRENT YTD ================= */
        current_ytd AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value,
                MAX(target_value) AS target_value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','')
            GROUP BY organisation_id
        ),

        /* ================= LAST YTD ================= */
        last_ytd AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            GROUP BY organisation_id
        ),

        /* ================= LAST FULL ================= */
        last_full AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            GROUP BY organisation_id
        ),

        /* ================= SMPA ================= */
        smpa_current AS (
            ${isMedianKpi ? `
            SELECT
                (SELECT weighted_median_trt FROM median_weighted_result
                 WHERE scope='smpa' AND period='ytd' AND fiscal_year=REPLACE(@currentFY,' ','')) AS value,
                (SELECT MAX(target_value) FROM base_ytd
                 WHERE fiscal_year=REPLACE(@currentFY,' ','') AND organisation_id IN (54,55)) AS target_value
            ` : `
            SELECT ${kpiFormula} AS value, MAX(target_value) AS target_value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','') AND organisation_id IN (54,55)
            `}
        ),
        smpa_last AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope='smpa' AND period='ytd' AND fiscal_year=REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','') AND organisation_id IN (54,55)
            `}
        ),
        smpa_full AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope='smpa' AND period='full' AND fiscal_year=REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','') AND organisation_id IN (54,55)
            `}
        ),

        /* ================= OVERALL ================= */
        overall_current AS (
            ${isMedianKpi ? `
            SELECT
                (SELECT weighted_median_trt FROM median_weighted_result
                 WHERE scope='overall' AND period='ytd' AND fiscal_year=REPLACE(@currentFY,' ','')) AS value,
                (SELECT MAX(target_value) FROM base_ytd
                 WHERE fiscal_year=REPLACE(@currentFY,' ','')) AS target_value
            ` : `
            SELECT ${kpiFormula} AS value, MAX(target_value) AS target_value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','')
            `}
        ),
        overall_last AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope='overall' AND period='ytd' AND fiscal_year=REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            `}
        ),
        overall_full AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope='overall' AND period='full' AND fiscal_year=REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            `}
        )

        /* ================= FINAL RESULT ================= */
        SELECT
            org.organisation_id,
            org.organisation_name,
            CASE
                WHEN '${kpi}' = 'osbd' THEN CAST(ISNULL(cy.target_value,0) AS INT)
                ELSE ROUND(ISNULL(cy.target_value,0),2)
            END AS target_value,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(lf.value,0) AS INT)
                 ELSE ROUND(ISNULL(lf.value,0),2) END AS achievement_for_last_FY,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(cy.value,0) AS INT)
                 ELSE ROUND(ISNULL(cy.value,0),2) END AS current_fy_ytd,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(ly.value,0) AS INT)
                 ELSE ROUND(ISNULL(ly.value,0),2) END AS last_fy_ytd,
            ROUND((ISNULL(cy.value,0) - ISNULL(ly.value,0)) * 100.0
                  / NULLIF(ly.value,0), 2) AS yoy
        FROM mmt_organisation org
        LEFT JOIN current_ytd cy ON cy.organisation_id = org.organisation_id
        LEFT JOIN last_ytd    ly ON ly.organisation_id = org.organisation_id
        LEFT JOIN last_full   lf ON lf.organisation_id = org.organisation_id
        WHERE org.organisation_id IN (${orgParams})

        UNION ALL

        SELECT
            NULL, 'SMPA Total',
            CASE
                WHEN '${kpi}'='osbd' THEN CAST(ISNULL(sc.target_value,0) AS INT)
                ELSE ROUND(ISNULL(sc.target_value,0),2)
            END,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(sf.value,0) AS INT)
                 ELSE ROUND(ISNULL(sf.value,0),2) END,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(sc.value,0) AS INT)
                 ELSE ROUND(ISNULL(sc.value,0),2) END,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(sl.value,0) AS INT)
                 ELSE ROUND(ISNULL(sl.value,0),2) END,
            ROUND((ISNULL(sc.value,0) - ISNULL(sl.value,0)) * 100.0 / NULLIF(sl.value,0), 2)
        FROM smpa_current sc CROSS JOIN smpa_last sl CROSS JOIN smpa_full sf

        UNION ALL

        SELECT
            NULL, 'Overall Total',
            CASE
                WHEN '${kpi}'='osbd' THEN CAST(ISNULL(oc.target_value,0) AS INT)
                ELSE ROUND(ISNULL(oc.target_value,0),2)
            END,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(ofu.value,0) AS INT)
                 ELSE ROUND(ISNULL(ofu.value,0),2) END,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(oc.value,0) AS INT)
                 ELSE ROUND(ISNULL(oc.value,0),2) END,
            CASE WHEN '${kpi}'='osbd' THEN CAST(ISNULL(ol.value,0) AS INT)
                 ELSE ROUND(ISNULL(ol.value,0),2) END,
            ROUND((ISNULL(oc.value,0) - ISNULL(ol.value,0)) * 100.0 / NULLIF(ol.value,0), 2)
        FROM overall_current oc CROSS JOIN overall_last ol CROSS JOIN overall_full ofu
        ORDER BY organisation_name;
        `;

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching KPI dashboard data");
    }
}

async function getrorotrafficData(req, res) {
    const conn = await pool;

    try {
        const { organisationId } = req.query;

        let query = `
            SELECT
                data.id,
                data.fiscal_year,
                DATENAME(MONTH, DATEFROMPARTS(2000, data.month, 1)) AS month,
                data.organisation_id,
                org.organisation_name,
                data.ro_ro_traffic,
                data.ro_pax_traffic
            FROM tbl_traffic_ro_ro_pax_data data
            INNER JOIN mmt_organisation org 
                ON data.organisation_id = org.organisation_id
            WHERE 1=1
        `;

        const request = conn.request();

        if (organisationId) {
            query += ` AND data.organisation_id = @organisationId`;
            request.input("organisationId", organisationId);
        }

        query += `
            ORDER BY 
                data.fiscal_year DESC, 
                data.month, 
                org.organisation_name
        `;

        const result = await request.query(query);

        return res.status(200).json(result.recordset);

    } catch (error) {
        console.error("Error fetching RORO traffic data:", error);
        return res.sendStatus(500);
    }
}

async function getKPICargoDashboard(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID) || 0;
        const fyParam = req.params.fy && req.params.fy !== "all" ? req.params.fy : null;
        const monthsParam = req.params.months && req.params.months !== "all" ? req.params.months.split(',').map(Number) : null;

        const conn = await pool;
        const request = conn.request();

        let currentFY, lastFY;
        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split('-').map(Number);
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        request.input("currentMonth", currentMonth);

        function getFYMonths() {
            if (monthsParam && monthsParam.length) return monthsParam;
            let endMonth = currentMonth - 1;
            if (endMonth === 0) endMonth = 12;
            let months = [];
            if (endMonth >= 4) {
                for (let m = 4; m <= endMonth; m++) months.push(m);
            } else {
                for (let m = 4; m <= 12; m++) months.push(m);
                for (let m = 1; m <= endMonth; m++) months.push(m);
            }
            return months;
        }

        const monthsList = getFYMonths();
        monthsList.forEach((m, i) => request.input(`month${i}`, m));
        const monthParamList = monthsList.map((_, i) => `@month${i}`).join(',');

        const allOrgs = [1,2,3,5,6,7,8,9,10,11,12,54,55];
        const orgFilter = organisationID ? [organisationID] : allOrgs;
        orgFilter.forEach((id, i) => request.input(`org${i}`, id));
        const orgParamList = orgFilter.map((_, i) => `@org${i}`).join(',');

        const query = `
        WITH base_filter_liquid AS (
            SELECT
                cd.organisation_id,
                cd.month,
                cd.fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id <> 28
                AND commodity_group_id = 1
                AND cd.organisation_id IN (${orgParamList})
                AND cd.month IN (${monthParamList})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
                )
            GROUP BY
                cd.organisation_id,
                cd.month,
                cd.fiscal_year
        ),
           kpi_base AS (
    SELECT *
    FROM tbl_kpi_time_performance
    WHERE organisation_id IN (${orgParamList})
        AND month IN (${monthParamList})
        AND REPLACE(fiscal_year,' ','') IN (
        REPLACE(@currentFY,' ',''),
        REPLACE(@lastFY, ' ','')
    )
    ),

    /* =========================================================
       WEIGHTED MEDIAN (cumulative-vessel-count method)
       Same logic as detailedKPICargoCardDashboard, but there is
       no per-org / SMPA-vs-Overall split here - this endpoint
       returns a single aggregated card, so the weighted median
       is computed once per commodity/fiscal_year across whichever
       orgs are in the current filter (orgParamList).

       median_by_org        : per (org, fiscal_year) sum of vessel
                               counts per commodity across the
                               filtered months - the "weight".
       median_trt_by_org     : per (org, fiscal_year) the last
                               non-null ytd_median_*_trt value per
                               commodity (mirrors OUTER APPLY TOP 1
                               ORDER BY month DESC used elsewhere).
       median_weighted_base  : unions both above into one row per
                               org/commodity/fiscal_year with
                               trt_value + vessel_count.
       median_cumulative     : running cumulative vessel count
                               ordered by trt_value ASC, partitioned
                               by commodity/fiscal_year.
       median_weighted_result: smallest trt_value whose cumulative
                               vessel count reaches 50% of the total
                               vessel count for that commodity/FY -
                               i.e. the weighted median TRT.
    ========================================================= */
    median_by_org AS (
        SELECT
            organisation_id,
            REPLACE(fiscal_year,' ','') AS fiscal_year,
            SUM(dry_bulk_vessel_handled) AS dry_bulk_vessel_handled,
            SUM(break_bulk_vessel_handled) AS break_bulk_vessel_handled,
            SUM(liquid_bulk_vessel_handled) AS liquid_bulk_vessel_handled,
            SUM(container_vessel_handled) AS container_vessel_handled
        FROM kpi_base
        GROUP BY organisation_id, REPLACE(fiscal_year,' ','')
    ),

    median_trt_by_org AS (
        SELECT
            base.organisation_id,
            base.fiscal_year,
            dry.median_trt_dry,
            brk.median_trt_break,
            liq.median_trt_liquid,
            con.median_trt_container
        FROM (
            SELECT DISTINCT
                organisation_id,
                REPLACE(fiscal_year,' ','') AS fiscal_year
            FROM kpi_base
        ) base
        OUTER APPLY (
            SELECT TOP 1 k.ytd_median_dry_bulk_trt AS median_trt_dry
            FROM kpi_base k
            WHERE k.organisation_id = base.organisation_id
              AND REPLACE(k.fiscal_year,' ','') = base.fiscal_year
              AND k.ytd_median_dry_bulk_trt IS NOT NULL
            ORDER BY k.month DESC
        ) dry
        OUTER APPLY (
            SELECT TOP 1 k.ytd_median_break_bulk_trt AS median_trt_break
            FROM kpi_base k
            WHERE k.organisation_id = base.organisation_id
              AND REPLACE(k.fiscal_year,' ','') = base.fiscal_year
              AND k.ytd_median_break_bulk_trt IS NOT NULL
            ORDER BY k.month DESC
        ) brk
        OUTER APPLY (
            SELECT TOP 1 k.ytd_median_liquid_bulk_trt AS median_trt_liquid
            FROM kpi_base k
            WHERE k.organisation_id = base.organisation_id
              AND REPLACE(k.fiscal_year,' ','') = base.fiscal_year
              AND k.ytd_median_liquid_bulk_trt IS NOT NULL
            ORDER BY k.month DESC
        ) liq
        OUTER APPLY (
            SELECT TOP 1 k.ytd_median_container_trt AS median_trt_container
            FROM kpi_base k
            WHERE k.organisation_id = base.organisation_id
              AND REPLACE(k.fiscal_year,' ','') = base.fiscal_year
              AND k.ytd_median_container_trt IS NOT NULL
            ORDER BY k.month DESC
        ) con
    ),

    median_weighted_base AS (
        SELECT 'dry' AS commodity, m.fiscal_year, m.organisation_id,
            t.median_trt_dry AS trt_value,
            m.dry_bulk_vessel_handled AS vessel_count
        FROM median_by_org m
        JOIN median_trt_by_org t
            ON t.organisation_id = m.organisation_id
            AND t.fiscal_year = m.fiscal_year
        WHERE t.median_trt_dry > 0 AND m.dry_bulk_vessel_handled > 0

        UNION ALL
        SELECT 'break', m.fiscal_year, m.organisation_id,
            t.median_trt_break,
            m.break_bulk_vessel_handled
        FROM median_by_org m
        JOIN median_trt_by_org t
            ON t.organisation_id = m.organisation_id
            AND t.fiscal_year = m.fiscal_year
        WHERE t.median_trt_break > 0 AND m.break_bulk_vessel_handled > 0

        UNION ALL
        SELECT 'liquid', m.fiscal_year, m.organisation_id,
            t.median_trt_liquid,
            m.liquid_bulk_vessel_handled
        FROM median_by_org m
        JOIN median_trt_by_org t
            ON t.organisation_id = m.organisation_id
            AND t.fiscal_year = m.fiscal_year
        WHERE t.median_trt_liquid > 0 AND m.liquid_bulk_vessel_handled > 0

        UNION ALL
        SELECT 'container', m.fiscal_year, m.organisation_id,
            t.median_trt_container,
            m.container_vessel_handled
        FROM median_by_org m
        JOIN median_trt_by_org t
            ON t.organisation_id = m.organisation_id
            AND t.fiscal_year = m.fiscal_year
        WHERE t.median_trt_container > 0 AND m.container_vessel_handled > 0
    ),

    median_cumulative AS (
        SELECT
            commodity, fiscal_year, organisation_id, trt_value, vessel_count,
            SUM(vessel_count) OVER (
                PARTITION BY commodity, fiscal_year
                ORDER BY trt_value
                ROWS UNBOUNDED PRECEDING
            ) AS cum_vessel_count,
            SUM(vessel_count) OVER (
                PARTITION BY commodity, fiscal_year
            ) AS total_vessel_count
        FROM median_weighted_base
    ),

    median_weighted_result AS (
        SELECT
            commodity, fiscal_year,
            MIN(trt_value) AS weighted_median_trt
        FROM median_cumulative
        WHERE cum_vessel_count >= total_vessel_count * 0.5
        GROUP BY commodity, fiscal_year
    ),

    liquid_bulk_trt_agg AS (
            SELECT
                ktp.fiscal_year,
                SUM(COALESCE(ktp.average_liquid_bulk_trt, 0) * COALESCE(ktp.liquid_bulk_vessel_handled, 0)) AS trt_num,
                SUM(COALESCE(ktp.liquid_bulk_vessel_handled, 0)) AS trt_den
            FROM tbl_kpi_time_performance ktp
            WHERE ktp.organisation_id IN (${orgParamList})
                AND ktp.month IN (${monthParamList})
                AND REPLACE(ktp.fiscal_year,' ','') IN (
                REPLACE(@currentFY,' ',''),
                REPLACE(@lastFY, ' ','')
            )
            GROUP BY ktp.fiscal_year
        ),

        dry_bulk_trt_agg AS (
            SELECT
                ktp.fiscal_year,
                SUM(COALESCE(ktp.average_dry_bulk_trt, 0) * COALESCE(ktp.dry_bulk_vessel_handled, 0)) AS trt_num,
                SUM(COALESCE(ktp.dry_bulk_vessel_handled, 0)) AS trt_den
            FROM tbl_kpi_time_performance ktp
            WHERE ktp.organisation_id IN (${orgParamList})
                AND ktp.month IN (${monthParamList})
                AND REPLACE(ktp.fiscal_year,' ','') IN (
                REPLACE(@currentFY,' ',''),
                REPLACE(@lastFY, ' ','')
            )
            GROUP BY ktp.fiscal_year
        ),

        break_bulk_trt_agg AS (
            SELECT
                ktp.fiscal_year,
                SUM(COALESCE(ktp.average_break_bulk_trt, 0) * COALESCE(ktp.break_bulk_vessel_handled, 0)) AS trt_num,
                SUM(COALESCE(ktp.break_bulk_vessel_handled, 0)) AS trt_den
            FROM tbl_kpi_time_performance ktp
            WHERE ktp.organisation_id IN (${orgParamList})
                AND ktp.month IN (${monthParamList})
                AND REPLACE(ktp.fiscal_year,' ','') IN (
                REPLACE(@currentFY,' ',''),
                REPLACE(@lastFY, ' ','')
            )
            GROUP BY ktp.fiscal_year
        ),

        container_trt_agg AS (
            SELECT
                ktp.fiscal_year,
                SUM(COALESCE(ktp.average_container_trt, 0) * COALESCE(ktp.container_vessel_handled, 0)) AS trt_num,
                SUM(COALESCE(ktp.container_vessel_handled, 0)) AS trt_den
            FROM tbl_kpi_time_performance ktp
            WHERE ktp.organisation_id IN (${orgParamList})
                AND ktp.month IN (${monthParamList})
                AND REPLACE(ktp.fiscal_year,' ','') IN (
                REPLACE(@currentFY,' ',''),
                REPLACE(@lastFY, ' ','')
            )
            GROUP BY ktp.fiscal_year
        ),

        base_filter_dry AS (
            SELECT
                cd.organisation_id,
                cd.month,
                cd.fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id <> 28
                AND commodity_group_id = 2
                AND cd.organisation_id IN (${orgParamList})
                AND cd.month IN (${monthParamList})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
                )
            GROUP BY
                cd.organisation_id,
                cd.month,
                cd.fiscal_year
        ),

        base_filter_breakbulk AS (
            SELECT
                cd.organisation_id,
                cd.month,
                cd.fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id <> 28
                AND commodity_group_id = 3
                AND cd.organisation_id IN (${orgParamList})
                AND cd.month IN (${monthParamList})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
                )
            GROUP BY
                cd.organisation_id,
                cd.month,
                cd.fiscal_year
        ),


        base_filter_container AS (
            SELECT
                cd.organisation_id,
                cd.month,
                cd.fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id <> 28
                AND commodity_group_id = 4
                AND cd.organisation_id IN (${orgParamList})
                AND cd.month IN (${monthParamList})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
                )
            GROUP BY
                cd.organisation_id,
                cd.month,
                cd.fiscal_year
        ),


        base_filter_container_teus AS (
            SELECT
                cd.organisation_id,
                cd.month,
                cd.fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id = 28
                AND commodity_group_id = 4
                AND cd.organisation_id IN (${orgParamList})
                AND cd.month IN (${monthParamList})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
                )
            GROUP BY
                cd.organisation_id,
                cd.month,
                cd.fiscal_year
        ),



        /* ================= TRAFFIC AGG ================= */

        traffic_agg_liquid AS (
            SELECT
                bf.organisation_id,
                bf.fiscal_year,
                SUM(bf.qty) AS total_traffic_liquid
            FROM base_filter_liquid bf
            GROUP BY
                bf.organisation_id,
                bf.fiscal_year
        ),

        traffic_agg_dry AS (
            SELECT
                bf.organisation_id,
                bf.fiscal_year,
                SUM(bf.qty) AS total_traffic_dry
            FROM base_filter_dry bf
            GROUP BY
                bf.organisation_id,
                bf.fiscal_year
        ),

        traffic_agg_breakbulk AS (
            SELECT
                bf.organisation_id,
                bf.fiscal_year,
                SUM(bf.qty) AS total_traffic_break
            FROM base_filter_breakbulk bf
            GROUP BY
                bf.organisation_id,
                bf.fiscal_year
        ),

        traffic_agg_container AS (
            SELECT
                bf.organisation_id,
                bf.fiscal_year,
                SUM(bf.qty) AS total_traffic_container
            FROM base_filter_container bf
            GROUP BY
                bf.organisation_id,
                bf.fiscal_year
        ),

         traffic_agg_container_teus AS (
            SELECT
                bf.organisation_id,
                bf.fiscal_year,
                SUM(bf.qty) AS total_traffic_container_teus
            FROM base_filter_container_teus bf
            GROUP BY
                bf.organisation_id,
                bf.fiscal_year
        ),
        /* ================= FINAL TRAFFIC ================= */

        final_traffic_liquid AS (
            SELECT
                t.organisation_id,
                t.fiscal_year,
                ISNULL(t.total_traffic_liquid, 0) / 1000.0 AS total_traffic_liquid
            FROM traffic_agg_liquid t
        ),

        final_traffic_dry AS (
            SELECT
                t.organisation_id,
                t.fiscal_year,
                ISNULL(t.total_traffic_dry, 0) / 1000.0 AS total_traffic_dry
            FROM traffic_agg_dry t
        ),

        ro_ro_agg AS (
            SELECT
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','') AS fiscal_year,
                SUM(ISNULL(ro.ro_ro_traffic,0)) AS ro_ro_traffic
            FROM tbl_traffic_ro_ro_pax_data ro
            WHERE ro.organisation_id IN (${orgParamList})
            AND ro.month IN (${monthParamList})
            AND REPLACE(ro.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
            )
            GROUP BY
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','')
        ),

        final_traffic_break AS (
            SELECT
                t.organisation_id,
                t.fiscal_year,
                (ISNULL(t.total_traffic_break, 0) / 1000.0)
                +
                (ISNULL(r.ro_ro_traffic, 0) / 1000.0) AS total_traffic_break
            FROM traffic_agg_breakbulk t
            LEFT JOIN ro_ro_agg r
                ON r.organisation_id = t.organisation_id
                AND REPLACE(r.fiscal_year,' ','') = REPLACE(t.fiscal_year,' ','')
        ),

        final_traffic_container AS (
            SELECT
                t.organisation_id,
                t.fiscal_year,
                ISNULL(t.total_traffic_container, 0) / 1000.0 AS total_traffic_container
            FROM traffic_agg_container t
        ),

         final_traffic_container_teus AS (
            SELECT
                t.organisation_id,
                t.fiscal_year,
                ISNULL(t.total_traffic_container_teus, 0)  AS total_traffic_container_teus
            FROM traffic_agg_container_teus t
        ),

        /* ================= SUMMARY ================= */

        traffic_summary_liquid AS (
            SELECT
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_traffic_liquid ELSE 0 END)
                    AS total_traffic_liquid_current,

                SUM(CASE WHEN fiscal_year = @lastFY THEN total_traffic_liquid ELSE 0 END)
                    AS total_traffic_liquid_last
            FROM final_traffic_liquid
        ),

        traffic_summary_dry AS (
            SELECT
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_traffic_dry ELSE 0 END)
                    AS total_traffic_current_dry,

                SUM(CASE WHEN fiscal_year = @lastFY THEN total_traffic_dry ELSE 0 END)
                    AS total_traffic_last_dry
            FROM final_traffic_dry
        ),

        traffic_summary_break AS (
            SELECT
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_traffic_break ELSE 0 END)
                    AS total_traffic_break_current,

                SUM(CASE WHEN fiscal_year = @lastFY THEN total_traffic_break ELSE 0 END)
                    AS total_traffic_break_last
            FROM final_traffic_break
        ),

        traffic_summary_container AS (
            SELECT
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_traffic_container ELSE 0 END)
                    AS total_traffic_container_current,

                SUM(CASE WHEN fiscal_year = @lastFY THEN total_traffic_container ELSE 0 END)
                    AS total_traffic_container_last
            FROM final_traffic_container
        ),

        traffic_summary_container_teus AS (
            SELECT
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_traffic_container_teus ELSE 0 END)
                    AS total_traffic_container_teus_current,

                SUM(CASE WHEN fiscal_year = @lastFY THEN total_traffic_container_teus ELSE 0 END)
                    AS total_traffic_container_teus_last
            FROM final_traffic_container_teus
        )

        /* ================= FINAL SELECT ================= */
        SELECT

            /* LIQUID */
            MAX(tsl.total_traffic_liquid_current) AS total_traffic_liquid_current,
            MAX(tsl.total_traffic_liquid_last) AS total_traffic_liquid_last,

            CASE
                WHEN MAX(tsl.total_traffic_liquid_last) = 0
                    OR MAX(tsl.total_traffic_liquid_last) IS NULL
                THEN NULL
                ELSE (
                    MAX(tsl.total_traffic_liquid_current)
                    - MAX(tsl.total_traffic_liquid_last)
                ) * 100.0
                / MAX(tsl.total_traffic_liquid_last)
            END AS total_traffic_yoy_liquid,

            /* DRY */
            MAX(tsd.total_traffic_current_dry) AS total_traffic_current_dry,
            MAX(tsd.total_traffic_last_dry) AS total_traffic_last_dry,

            CASE
                WHEN MAX(tsd.total_traffic_last_dry) = 0
                    OR MAX(tsd.total_traffic_last_dry) IS NULL
                THEN NULL
                ELSE (
                    MAX(tsd.total_traffic_current_dry)
                    - MAX(tsd.total_traffic_last_dry)
                ) * 100.0
                / MAX(tsd.total_traffic_last_dry)
            END AS total_traffic_yoy_dry,

            /* BREAK BULK */
            MAX(tsb.total_traffic_break_current) AS total_traffic_break_current,
            MAX(tsb.total_traffic_break_last) AS total_traffic_break_last,

            CASE
                WHEN MAX(tsb.total_traffic_break_last) = 0
                    OR MAX(tsb.total_traffic_break_last) IS NULL
                THEN NULL
                ELSE (
                    MAX(tsb.total_traffic_break_current)
                    - MAX(tsb.total_traffic_break_last)
                ) * 100.0
                / MAX(tsb.total_traffic_break_last)
            END AS total_traffic_yoy_break,

            /* CONTAINER */
            MAX(tsc.total_traffic_container_current) AS total_traffic_container_current,
            MAX(tsc.total_traffic_container_last) AS total_traffic_container_last,

            CASE
                WHEN MAX(tsc.total_traffic_container_last) = 0
                    OR MAX(tsc.total_traffic_container_last) IS NULL
                THEN NULL
                ELSE (
                    MAX(tsc.total_traffic_container_current)
                    - MAX(tsc.total_traffic_container_last)
                ) * 100.0
                / MAX(tsc.total_traffic_container_last)
            END AS total_traffic_yoy_container,

            /* CONTAINER teus */
            MAX(tsp.total_traffic_container_teus_current) AS total_traffic_container_teus_current,
            MAX(tsp.total_traffic_container_teus_last) AS total_traffic_container_teus_last,

            CASE
                WHEN MAX(tsp.total_traffic_container_teus_last) = 0
                    OR MAX(tsp.total_traffic_container_teus_last) IS NULL
                THEN NULL
                ELSE (
                    MAX(tsp.total_traffic_container_teus_current)
                    - MAX(tsp.total_traffic_container_teus_last)
                ) * 100.0
                / MAX(tsp.total_traffic_container_teus_last)
            END AS total_traffic_yoy_container_teus,

            /* ── AVERAGE TRT ── */
            MAX(CASE WHEN l.fiscal_year = @currentFY THEN l.trt_num / NULLIF(l.trt_den, 0) END) AS avg_liquid_bulk_trt_current,
            MAX(CASE WHEN l.fiscal_year = @lastFY THEN l.trt_num / NULLIF(l.trt_den, 0) END) AS avg_liquid_bulk_trt_last,
            CASE
            WHEN MAX(CASE WHEN l.fiscal_year = @lastFY THEN l.trt_num / NULLIF(l.trt_den, 0) END) IS NULL
            OR MAX(CASE WHEN l.fiscal_year = @lastFY THEN l.trt_num / NULLIF(l.trt_den, 0) END) = 0
            THEN NULL
            ELSE (
            MAX(CASE WHEN l.fiscal_year = @currentFY THEN l.trt_num / NULLIF(l.trt_den, 0) END)
            - MAX(CASE WHEN l.fiscal_year = @lastFY THEN l.trt_num / NULLIF(l.trt_den, 0) END)
            ) * 100.0
            / MAX(CASE WHEN l.fiscal_year = @lastFY THEN l.trt_num / NULLIF(l.trt_den, 0) END)
            END AS avg_liquid_bulk_trt_yoy,

            MAX(CASE WHEN d.fiscal_year = @currentFY THEN d.trt_num / NULLIF(d.trt_den, 0) END) AS avg_dry_bulk_trt_current,
            MAX(CASE WHEN d.fiscal_year = @lastFY THEN d.trt_num / NULLIF(d.trt_den, 0) END) AS avg_dry_bulk_trt_last,
            CASE
            WHEN MAX(CASE WHEN d.fiscal_year = @lastFY THEN d.trt_num / NULLIF(d.trt_den, 0) END) IS NULL
            OR MAX(CASE WHEN d.fiscal_year = @lastFY THEN d.trt_num / NULLIF(d.trt_den, 0) END) = 0
            THEN NULL
            ELSE (
            MAX(CASE WHEN d.fiscal_year = @currentFY THEN d.trt_num / NULLIF(d.trt_den, 0) END)
            - MAX(CASE WHEN d.fiscal_year = @lastFY THEN d.trt_num / NULLIF(d.trt_den, 0) END)
            ) * 100.0
            / MAX(CASE WHEN d.fiscal_year = @lastFY THEN d.trt_num / NULLIF(d.trt_den, 0) END)
            END AS avg_dry_bulk_trt_yoy,

            MAX(CASE WHEN b.fiscal_year = @currentFY THEN b.trt_num / NULLIF(b.trt_den, 0) END) AS avg_break_bulk_trt_current,
            MAX(CASE WHEN b.fiscal_year = @lastFY THEN b.trt_num / NULLIF(b.trt_den, 0) END) AS avg_break_bulk_trt_last,
            CASE
            WHEN MAX(CASE WHEN b.fiscal_year = @lastFY THEN b.trt_num / NULLIF(b.trt_den, 0) END) IS NULL
            OR MAX(CASE WHEN b.fiscal_year = @lastFY THEN b.trt_num / NULLIF(b.trt_den, 0) END) = 0
            THEN NULL
            ELSE (
            MAX(CASE WHEN b.fiscal_year = @currentFY THEN b.trt_num / NULLIF(b.trt_den, 0) END)
            - MAX(CASE WHEN b.fiscal_year = @lastFY THEN b.trt_num / NULLIF(b.trt_den, 0) END)
            ) * 100.0
            / MAX(CASE WHEN b.fiscal_year = @lastFY THEN b.trt_num / NULLIF(b.trt_den, 0) END)
            END AS avg_break_bulk_trt_yoy,

            MAX(CASE WHEN c.fiscal_year = @currentFY THEN c.trt_num / NULLIF(c.trt_den, 0) END) AS avg_container_trt_current,
            MAX(CASE WHEN c.fiscal_year = @lastFY THEN c.trt_num / NULLIF(c.trt_den, 0) END) AS avg_container_trt_last,
            CASE
            WHEN MAX(CASE WHEN c.fiscal_year = @lastFY THEN c.trt_num / NULLIF(c.trt_den, 0) END) IS NULL
            OR MAX(CASE WHEN c.fiscal_year = @lastFY THEN c.trt_num / NULLIF(c.trt_den, 0) END) = 0
            THEN NULL
            ELSE (
            MAX(CASE WHEN c.fiscal_year = @currentFY THEN c.trt_num / NULLIF(c.trt_den, 0) END)
            - MAX(CASE WHEN c.fiscal_year = @lastFY THEN c.trt_num / NULLIF(c.trt_den, 0) END)
            ) * 100.0
            / MAX(CASE WHEN c.fiscal_year = @lastFY THEN c.trt_num / NULLIF(c.trt_den, 0) END)
            END AS avg_container_trt_yoy,

        /* ── MEDIAN TRT (weighted, cumulative-vessel-count method) ── */
        MAX(CASE WHEN mwl.fiscal_year = REPLACE(@currentFY,' ','') THEN mwl.weighted_median_trt END) AS median_liquid_bulk_trt_current,
        MAX(CASE WHEN mwl.fiscal_year = REPLACE(@lastFY,' ','') THEN mwl.weighted_median_trt END) AS median_liquid_bulk_trt_last,
        CASE
        WHEN MAX(CASE WHEN mwl.fiscal_year = REPLACE(@lastFY,' ','') THEN mwl.weighted_median_trt END) IS NULL
        OR MAX(CASE WHEN mwl.fiscal_year = REPLACE(@lastFY,' ','') THEN mwl.weighted_median_trt END) = 0
        THEN NULL
        ELSE (
        MAX(CASE WHEN mwl.fiscal_year = REPLACE(@currentFY,' ','') THEN mwl.weighted_median_trt END)
        - MAX(CASE WHEN mwl.fiscal_year = REPLACE(@lastFY,' ','') THEN mwl.weighted_median_trt END)
        ) * 100.0
        / MAX(CASE WHEN mwl.fiscal_year = REPLACE(@lastFY,' ','') THEN mwl.weighted_median_trt END)
        END AS median_liquid_bulk_trt_yoy,

        MAX(CASE WHEN mwd.fiscal_year = REPLACE(@currentFY,' ','') THEN mwd.weighted_median_trt END) AS median_dry_bulk_trt_current,
        MAX(CASE WHEN mwd.fiscal_year = REPLACE(@lastFY,' ','') THEN mwd.weighted_median_trt END) AS median_dry_bulk_trt_last,
        CASE
        WHEN MAX(CASE WHEN mwd.fiscal_year = REPLACE(@lastFY,' ','') THEN mwd.weighted_median_trt END) IS NULL
        OR MAX(CASE WHEN mwd.fiscal_year = REPLACE(@lastFY,' ','') THEN mwd.weighted_median_trt END) = 0
        THEN NULL
        ELSE (
        MAX(CASE WHEN mwd.fiscal_year = REPLACE(@currentFY,' ','') THEN mwd.weighted_median_trt END)
        - MAX(CASE WHEN mwd.fiscal_year = REPLACE(@lastFY,' ','') THEN mwd.weighted_median_trt END)
        ) * 100.0
        / MAX(CASE WHEN mwd.fiscal_year = REPLACE(@lastFY,' ','') THEN mwd.weighted_median_trt END)
        END AS median_dry_bulk_trt_yoy,

        MAX(CASE WHEN mwb.fiscal_year = REPLACE(@currentFY,' ','') THEN mwb.weighted_median_trt END) AS median_break_bulk_trt_current,
        MAX(CASE WHEN mwb.fiscal_year = REPLACE(@lastFY,' ','') THEN mwb.weighted_median_trt END) AS median_break_bulk_trt_last,
        CASE
        WHEN MAX(CASE WHEN mwb.fiscal_year = REPLACE(@lastFY,' ','') THEN mwb.weighted_median_trt END) IS NULL
        OR MAX(CASE WHEN mwb.fiscal_year = REPLACE(@lastFY,' ','') THEN mwb.weighted_median_trt END) = 0
        THEN NULL
        ELSE (
        MAX(CASE WHEN mwb.fiscal_year = REPLACE(@currentFY,' ','') THEN mwb.weighted_median_trt END)
        - MAX(CASE WHEN mwb.fiscal_year = REPLACE(@lastFY,' ','') THEN mwb.weighted_median_trt END)
        ) * 100.0
        / MAX(CASE WHEN mwb.fiscal_year = REPLACE(@lastFY,' ','') THEN mwb.weighted_median_trt END)
        END AS median_break_bulk_trt_yoy,

        MAX(CASE WHEN mwc.fiscal_year = REPLACE(@currentFY,' ','') THEN mwc.weighted_median_trt END) AS median_container_trt_current,
        MAX(CASE WHEN mwc.fiscal_year = REPLACE(@lastFY,' ','') THEN mwc.weighted_median_trt END) AS median_container_trt_last,
        CASE
        WHEN MAX(CASE WHEN mwc.fiscal_year = REPLACE(@lastFY,' ','') THEN mwc.weighted_median_trt END) IS NULL
        OR MAX(CASE WHEN mwc.fiscal_year = REPLACE(@lastFY,' ','') THEN mwc.weighted_median_trt END) = 0
        THEN NULL
        ELSE (
        MAX(CASE WHEN mwc.fiscal_year = REPLACE(@currentFY,' ','') THEN mwc.weighted_median_trt END)
        - MAX(CASE WHEN mwc.fiscal_year = REPLACE(@lastFY,' ','') THEN mwc.weighted_median_trt END)
        ) * 100.0
        / MAX(CASE WHEN mwc.fiscal_year = REPLACE(@lastFY,' ','') THEN mwc.weighted_median_trt END)
        END AS median_container_trt_yoy,

        /* ── OSBD – DRY BULK ── */
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.dry_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.dry_bulk_cargo_handled, 0) / NULLIF(k.dry_bulk_osbd, 0) END), 0)
        , 0) AS dry_bulk_osbd_current,
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.dry_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.dry_bulk_cargo_handled, 0) / NULLIF(k.dry_bulk_osbd, 0) END), 0)
        , 0) AS dry_bulk_osbd_last,
        CASE
        WHEN NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.dry_bulk_cargo_handled, 0) / NULLIF(k.dry_bulk_osbd, 0) END), 0) IS NULL
        THEN NULL
        ELSE (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.dry_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.dry_bulk_cargo_handled, 0) / NULLIF(k.dry_bulk_osbd, 0) END), 0)
        -
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.dry_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.dry_bulk_cargo_handled, 0) / NULLIF(k.dry_bulk_osbd, 0) END), 0)
        ) * 100.0
        / (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.dry_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.dry_bulk_cargo_handled, 0) / NULLIF(k.dry_bulk_osbd, 0) END), 0)
        )
        END AS dry_bulk_osbd_yoy,

        /* ── OSBD – LIQUID BULK ── */
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.liquid_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.liquid_bulk_cargo_handled, 0) / NULLIF(k.liquid_bulk_osbd, 0) END), 0)
        , 0) AS liquid_bulk_osbd_current,
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.liquid_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.liquid_bulk_cargo_handled, 0) / NULLIF(k.liquid_bulk_osbd, 0) END), 0)
        , 0) AS liquid_bulk_osbd_last,
        CASE
        WHEN NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.liquid_bulk_cargo_handled, 0) / NULLIF(k.liquid_bulk_osbd, 0) END), 0) IS NULL
        THEN NULL
        ELSE (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.liquid_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.liquid_bulk_cargo_handled, 0) / NULLIF(k.liquid_bulk_osbd, 0) END), 0)
        -
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.liquid_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.liquid_bulk_cargo_handled, 0) / NULLIF(k.liquid_bulk_osbd, 0) END), 0)
        ) * 100.0
        / (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.liquid_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.liquid_bulk_cargo_handled, 0) / NULLIF(k.liquid_bulk_osbd, 0) END), 0)
        )
        END AS liquid_bulk_osbd_yoy,

        /* ── OSBD – BREAK BULK ── */
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.break_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.break_bulk_cargo_handled, 0) / NULLIF(k.break_bulk_osbd, 0) END), 0)
        , 0) AS break_bulk_osbd_current,
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.break_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.break_bulk_cargo_handled, 0) / NULLIF(k.break_bulk_osbd, 0) END), 0)
        , 0) AS break_bulk_osbd_last,
        CASE
        WHEN NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.break_bulk_cargo_handled, 0) / NULLIF(k.break_bulk_osbd, 0) END), 0) IS NULL
        THEN NULL
        ELSE (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.break_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.break_bulk_cargo_handled, 0) / NULLIF(k.break_bulk_osbd, 0) END), 0)
        -
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.break_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.break_bulk_cargo_handled, 0) / NULLIF(k.break_bulk_osbd, 0) END), 0)
        ) * 100.0
        / (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.break_bulk_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.break_bulk_cargo_handled, 0) / NULLIF(k.break_bulk_osbd, 0) END), 0)
        )
        END AS break_bulk_osbd_yoy,

        /* ── OSBD – CONTAINER ── */
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.container_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.container_cargo_handled, 0) / NULLIF(k.container_osbd, 0) END), 0)
        , 0) AS container_osbd_current,
        ROUND(
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.container_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.container_cargo_handled, 0) / NULLIF(k.container_osbd, 0) END), 0)
        , 0) AS container_osbd_last,
        CASE
        WHEN NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.container_cargo_handled, 0) / NULLIF(k.container_osbd, 0) END), 0) IS NULL
        THEN NULL
        ELSE (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.container_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @currentFY THEN NULLIF(k.container_cargo_handled, 0) / NULLIF(k.container_osbd, 0) END), 0)
        -
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.container_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.container_cargo_handled, 0) / NULLIF(k.container_osbd, 0) END), 0)
        ) * 100.0
        / (
        NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.container_cargo_handled END), 0)
        / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN NULLIF(k.container_cargo_handled, 0) / NULLIF(k.container_osbd, 0) END), 0)
        )
        END AS container_osbd_yoy


        FROM traffic_summary_liquid tsl

        CROSS JOIN traffic_summary_dry tsd
        CROSS JOIN traffic_summary_break tsb
        CROSS JOIN traffic_summary_container tsc
        CROSS JOIN traffic_summary_container_teus tsp

        LEFT JOIN liquid_bulk_trt_agg l ON 1=1
        LEFT JOIN dry_bulk_trt_agg d ON 1=1
        LEFT JOIN break_bulk_trt_agg b ON 1=1
        LEFT JOIN container_trt_agg c ON 1=1

        LEFT JOIN kpi_base k ON 1=1

        LEFT JOIN median_weighted_result mwl ON mwl.commodity = 'liquid'
        LEFT JOIN median_weighted_result mwd ON mwd.commodity = 'dry'
        LEFT JOIN median_weighted_result mwb ON mwb.commodity = 'break'
        LEFT JOIN median_weighted_result mwc ON mwc.commodity = 'container'

                `;

                const result = await request.query(query);
                return res.status(200).json(result.recordset[0]);

        } catch (error) {
            console.error("Error:", error);
            return res.status(500).json({ message: "Error fetching data." });
    }
}

function getKpiCargoConfig(kpi) {
    if (!kpi) return null;

    if (isNaN(kpi)) {
        const valid = [
            "traffic", "total_traffic_liquid", "total_traffic_dry",
            "total_traffic_break", "total_traffic_container", "total_traffic_container_teus",
            "avg_dry", "avg_break", "avg_liquid", "avg_container",
            "median_dry", "median_break", "median_liquid", "median_container",
            "osbd_dry", "osbd_break", "osbd_liquid", "osbd_container"
        ];
        return valid.includes(kpi) ? kpi : null;
    }

    switch (parseInt(kpi)) {
        case 1:  return "total_traffic_liquid";
        case 2:  return "total_traffic_dry";
        case 3:  return "total_traffic_break";
        case 4:  return "total_traffic_container";
        case 5:  return "avg_dry";
        case 6:  return "avg_break";
        case 7:  return "avg_liquid";
        case 8:  return "avg_container";
        case 9:  return "median_dry";
        case 10: return "median_break";
        case 11: return "median_liquid";
        case 12: return "median_container";
        case 13: return "osbd_dry";
        case 14: return "osbd_break";
        case 15: return "osbd_liquid";
        case 16: return "osbd_container";
        case 17:  return "total_traffic_container_teus";
        default: return null; 
    }
}
async function detailedKPICargoCardDashboard(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const organisationID = parseInt(req.query.organisationID) || 0;
        const fyParam = req.query.fy && req.query.fy !== "all" ? req.query.fy : null;
        const monthsParam = req.query.months && req.query.months !== "all" ? req.query.months.split(",").map(Number) : null;

        const rawKpi = req.query.kpi;
        const kpi = getKpiCargoConfig(rawKpi) || "traffic";

        const kpiTypeMap = {
            total_traffic_liquid: 34,
            total_traffic_dry: 32,
            total_traffic_break: 33,
            total_traffic_container: 35,

            avg_dry: 24,
            avg_break: 25,
            avg_liquid: 26,
            avg_container: 27,

            median_dry: 20,
            median_break: 21,
            median_liquid: 22,
            median_container: 23,

            osbd_dry: 28,
            osbd_break: 29,
            osbd_liquid: 30,
            osbd_container: 31,
        };

        const kpiTypeId = kpiTypeMap[kpi] ?? null;

        const medianCommodityMap = {
            median_dry: "dry",
            median_break: "break",
            median_liquid: "liquid",
            median_container: "container",
        };
        const isMedianKpi = medianCommodityMap[kpi] !== undefined;
        const medianCommodity = medianCommodityMap[kpi] || null;

        let currentFY, lastFY;

        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split("-").map(Number);
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);

        if (kpiTypeId !== null) {
            request.input("kpiTypeId", kpiTypeId);
        }

        if (isMedianKpi) {
            request.input("medianCommodity", medianCommodity);
        }

        /* ================= MONTHS ================= */
        const today = new Date();
        const currentMonth = today.getMonth() + 1;

        let ytdMonths = [];

        if (monthsParam?.length > 0) {
            ytdMonths = monthsParam;
        } else {
            let endMonth = currentMonth - 1;

            if (endMonth <= 0) endMonth = 12;

            if (endMonth >= 4) {
                for (let m = 4; m <= endMonth; m++) {
                    ytdMonths.push(m);
                }
            } else {
                for (let m = 4; m <= 12; m++) {
                    ytdMonths.push(m);
                }

                for (let m = 1; m <= endMonth; m++) {
                    ytdMonths.push(m);
                }
            }
        }

        const fullMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

        ytdMonths.forEach((m, i) => request.input(`ytd${i}`, m));
        fullMonths.forEach((m, i) => request.input(`full${i}`, m));

        const ytdParams = ytdMonths.map((_, i) => `@ytd${i}`).join(",");
        const fullParams = fullMonths.map((_, i) => `@full${i}`).join(",");

        // Track the last month in ytdMonths for correct median pickup
        const lastYtdMonth = ytdMonths[ytdMonths.length - 1];
        request.input("lastYtdMonth", lastYtdMonth);

        /* ================= ORGS ================= */
        const allOrgs = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 54, 55];

        const orgFilter = organisationID ? [organisationID] : allOrgs;
        orgFilter.forEach((id, i) => request.input(`org${i}`, id));

        const orgParams = orgFilter.map((_, i) => `@org${i}`).join(",");

        /* ================= KPI FORMULA ================= */
         // target_value is always NULL for those KPIs.
        const targetJoin = kpiTypeId !== null
        ? `LEFT JOIN (
                SELECT
                    organisation_id,
                    REPLACE(financial_year,' ','') AS financial_year,
                    MAX(target_value) AS target_value
                FROM tbl_kpi_time_performance_target
                WHERE kpi_type_id = @kpiTypeId
                GROUP BY organisation_id, REPLACE(financial_year,' ','')
        ) tar
            ON tar.organisation_id = org.organisation_id
            AND tar.financial_year = fy.fiscal_year`
        : `LEFT JOIN (
                SELECT
                    CAST(NULL AS INT) AS organisation_id,
                    CAST(NULL AS VARCHAR(20)) AS financial_year,
                    CAST(NULL AS FLOAT) AS target_value
                WHERE 1=0
        ) tar ON 1=0`;

        let kpiFormula = "";

        switch (kpi) {
            case "total_traffic_liquid":
                kpiFormula = `SUM(ISNULL(total_traffic_liquid,0))`;
                break;

            case "total_traffic_dry":
                kpiFormula = `SUM(ISNULL(total_traffic_dry,0))`;
                break;

            case "total_traffic_break":
                kpiFormula = `SUM(ISNULL(total_traffic_break,0))`;
                break;

            case "total_traffic_container":
                kpiFormula = `SUM(ISNULL(total_traffic_container,0))`;
                break;

            case "total_traffic_container_teus":
                kpiFormula = `SUM(ISNULL(total_traffic_container_teus,0))`;
                break;

            case "avg_dry":
                kpiFormula = `
                    SUM(avg_trt_num_dry) /
                    NULLIF(SUM(avg_trt_den_dry),0)
                `;
                break;

            case "avg_break":
                kpiFormula = `
                    SUM(avg_trt_num_break) /
                    NULLIF(SUM(avg_trt_den_break),0)
                `;
                break;

            case "avg_liquid":
                kpiFormula = `
                    SUM(avg_trt_num_liquid) /
                    NULLIF(SUM(avg_trt_den_liquid),0)
                `;
                break;

            case "avg_container":
                kpiFormula = `
                    SUM(avg_trt_num_container) /
                    NULLIF(SUM(avg_trt_den_container),0)
                `;
                break;

            case "median_dry":
                kpiFormula = `MAX(median_trt_dry)`;
                break;

            case "median_break":
                kpiFormula = `MAX(median_trt_break)`;
                break;

            case "median_liquid":
                kpiFormula = `MAX(median_trt_liquid)`;
                break;

            case "median_container":
                kpiFormula = `MAX(median_trt_container)`;
                break;

            case "osbd_dry":
                kpiFormula = `
                    NULLIF(SUM(osbd_dry_num),0) /
                    NULLIF(SUM(osbd_dry_den),0)
                `;
                break;

            case "osbd_break":
                kpiFormula = `
                    NULLIF(SUM(osbd_break_num),0) /
                    NULLIF(SUM(osbd_break_den),0)
                `;
                break;

            case "osbd_liquid":
                kpiFormula = `
                    NULLIF(SUM(osbd_liquid_num),0) /
                    NULLIF(SUM(osbd_liquid_den),0)
                `;
                break;

            case "osbd_container":
                kpiFormula = `
                    NULLIF(SUM(osbd_container_num),0) /
                    NULLIF(SUM(osbd_container_den),0)
                `;
                break;

            default:
                kpiFormula = `SUM(ISNULL(total_traffic,0))`;
        }

        const query = `
        WITH base_filter_ytd AS (
            SELECT
                cd.organisation_id,
                cd.month,
                REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id <> 28
                AND cd.organisation_id IN (${orgParams})
                AND cd.month IN (${ytdParams})
                AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
                )
            GROUP BY
                cd.organisation_id,
                cd.month,
                REPLACE(cd.fiscal_year,' ','')
        ),

        base_filter_full AS (
            SELECT
                cd.organisation_id,
                cd.month,
                REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id <> 28
                AND cd.organisation_id IN (${orgParams})
                AND cd.month IN (${fullParams})
                AND REPLACE(cd.fiscal_year,' ','') =
                    REPLACE(@lastFY,' ','')
            GROUP BY
                cd.organisation_id,
                cd.month,
                REPLACE(cd.fiscal_year,' ','')
        ),


        ro_ro_ytd AS (
            SELECT
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','') AS fiscal_year,
                SUM(ISNULL(ro.ro_ro_traffic,0)) AS ro_ro_traffic
            FROM tbl_traffic_ro_ro_pax_data ro
            WHERE ro.organisation_id IN (${orgParams})
            AND ro.month IN (${ytdParams})
            AND REPLACE(ro.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
            )
            GROUP BY
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','')
        ),

        ro_ro_full AS (
            SELECT
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','') AS fiscal_year,
                SUM(ISNULL(ro.ro_ro_traffic,0)) AS ro_ro_traffic
            FROM tbl_traffic_ro_ro_pax_data ro
            WHERE ro.organisation_id IN (${orgParams})
            AND ro.month IN (${fullParams})
            AND REPLACE(ro.fiscal_year,' ','') =
                    REPLACE(@lastFY,' ','')
            GROUP BY
                ro.organisation_id,
                REPLACE(ro.fiscal_year,' ','')
        ),

        traffic_ytd AS (
            SELECT
                x.organisation_id,
                x.fiscal_year,

                SUM(x.qty) / 1000.0 AS total_traffic,

                SUM(CASE WHEN x.commodity_group_id = 1 THEN x.qty ELSE 0 END) / 1000.0
                    AS total_traffic_liquid,

                SUM(CASE WHEN x.commodity_group_id = 2 THEN x.qty ELSE 0 END) / 1000.0
                    AS total_traffic_dry,

                (
                    SUM(CASE WHEN x.commodity_group_id = 3 THEN x.qty ELSE 0 END)
                    + ISNULL(MAX(r.ro_ro_traffic),0)
                ) / 1000.0 AS total_traffic_break,

                SUM(CASE WHEN x.commodity_group_id = 4 THEN x.qty ELSE 0 END) / 1000.0
                    AS total_traffic_container

            FROM (
                SELECT
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                    cd.commodity_group_id,
                    SUM(cd.value) AS qty
                FROM tbl_traffic_commodity_data cd
                WHERE cd.commodity_id <> 28
                    AND cd.organisation_id IN (${orgParams})
                    AND cd.month IN (${ytdParams})
                    AND REPLACE(cd.fiscal_year,' ','') IN (
                        REPLACE(@currentFY,' ',''),
                        REPLACE(@lastFY,' ','')
                    )
                GROUP BY
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ',''),
                    cd.commodity_group_id
            ) x
            LEFT JOIN ro_ro_ytd r
                ON r.organisation_id = x.organisation_id
                AND r.fiscal_year = x.fiscal_year
            GROUP BY 
            x.organisation_id, x.fiscal_year
        ),
         traffic_ytd_teus AS (
            SELECT
                x.organisation_id,
                x.fiscal_year,
                SUM(CASE WHEN x.commodity_group_id = 4 THEN x.qty ELSE 0 END) 
                    AS total_traffic_container_teus

            FROM (
                SELECT
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                    cd.commodity_group_id,
                    SUM(cd.value) AS qty
                FROM tbl_traffic_commodity_data cd
                WHERE cd.commodity_id = 28
                    AND cd.organisation_id IN (${orgParams})
                    AND cd.month IN (${ytdParams})
                    AND REPLACE(cd.fiscal_year,' ','') IN (
                        REPLACE(@currentFY,' ',''),
                        REPLACE(@lastFY,' ','')
                    )
                GROUP BY
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ',''),
                    cd.commodity_group_id
            ) x
             GROUP BY 
            x.organisation_id, x.fiscal_year
        ),

        traffic_full AS (
            SELECT
                x.organisation_id,
                x.fiscal_year,

                SUM(x.qty) / 1000.0 AS total_traffic,

                SUM(CASE WHEN x.commodity_group_id = 1 THEN x.qty ELSE 0 END) / 1000.0
                    AS total_traffic_liquid,

                SUM(CASE WHEN x.commodity_group_id = 2 THEN x.qty ELSE 0 END) / 1000.0
                    AS total_traffic_dry,

                (
                    SUM(CASE WHEN x.commodity_group_id = 3 THEN x.qty ELSE 0 END)
                    + ISNULL(MAX(r.ro_ro_traffic),0)
                ) / 1000.0 AS total_traffic_break,

                SUM(CASE WHEN x.commodity_group_id = 4 THEN x.qty ELSE 0 END) / 1000.0
                    AS total_traffic_container

            FROM (
                SELECT
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                    cd.commodity_group_id,
                    SUM(cd.value) AS qty
                FROM tbl_traffic_commodity_data cd
                WHERE cd.commodity_id <> 28
                    AND cd.organisation_id IN (${orgParams})
                    AND cd.month IN (${fullParams})
                    AND REPLACE(cd.fiscal_year,' ','') =
                        REPLACE(@lastFY,' ','')
                GROUP BY
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ',''),
                    cd.commodity_group_id
            ) x
            LEFT JOIN ro_ro_full r
                ON r.organisation_id = x.organisation_id
                AND r.fiscal_year = x.fiscal_year
            GROUP BY x.organisation_id, x.fiscal_year
        ),

         traffic_full_teus AS (
            SELECT
                x.organisation_id,
                x.fiscal_year,

  

                SUM(CASE WHEN x.commodity_group_id = 4 THEN x.qty ELSE 0 END)
                    AS total_traffic_container_teus

            FROM (
                SELECT
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                    cd.commodity_group_id,
                    SUM(cd.value) AS qty
                FROM tbl_traffic_commodity_data cd
                WHERE cd.commodity_id = 28
                    AND cd.organisation_id IN (${orgParams})
                    AND cd.month IN (${fullParams})
                    AND REPLACE(cd.fiscal_year,' ','') =
                        REPLACE(@lastFY,' ','')
                GROUP BY
                    cd.organisation_id,
                    cd.month,
                    REPLACE(cd.fiscal_year,' ',''),
                    cd.commodity_group_id
            ) x
             GROUP BY
              x.organisation_id,
              x.fiscal_year
        ),
         median_ytd AS (
            SELECT
                base.organisation_id,
                base.fiscal_year,
                dry.median_trt_dry,
                brk.median_trt_break,
                liq.median_trt_liquid,
                con.median_trt_container
            FROM (
                SELECT DISTINCT
                    organisation_id,
                    REPLACE(fiscal_year,' ','') AS fiscal_year
                FROM tbl_kpi_time_performance
                WHERE organisation_id IN (${orgParams})
                  AND month IN (${ytdParams})
                  AND REPLACE(fiscal_year,' ','') IN (
                        REPLACE(@currentFY,' ',''),
                        REPLACE(@lastFY,' ','')
                  )
            ) base
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_dry_bulk_trt AS median_trt_dry
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${ytdParams})
                  AND ktp.ytd_median_dry_bulk_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) dry
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_break_bulk_trt AS median_trt_break
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${ytdParams})
                  AND ktp.ytd_median_break_bulk_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) brk
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_liquid_bulk_trt AS median_trt_liquid
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${ytdParams})
                  AND ktp.ytd_median_liquid_bulk_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) liq
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_container_trt AS median_trt_container
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${ytdParams})
                  AND ktp.ytd_median_container_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) con
        ),

        median_full AS (
            SELECT
                base.organisation_id,
                base.fiscal_year,
                dry.median_trt_dry,
                brk.median_trt_break,
                liq.median_trt_liquid,
                con.median_trt_container
            FROM (
                SELECT DISTINCT
                    organisation_id,
                    REPLACE(fiscal_year,' ','') AS fiscal_year
                FROM tbl_kpi_time_performance
                WHERE organisation_id IN (${orgParams})
                  AND month IN (${fullParams})
                  AND REPLACE(fiscal_year,' ','') = REPLACE(@lastFY,' ','')
            ) base
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_dry_bulk_trt AS median_trt_dry
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${fullParams})
                  AND ktp.ytd_median_dry_bulk_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) dry
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_break_bulk_trt AS median_trt_break
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${fullParams})
                  AND ktp.ytd_median_break_bulk_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) brk
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_liquid_bulk_trt AS median_trt_liquid
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${fullParams})
                  AND ktp.ytd_median_liquid_bulk_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) liq
            OUTER APPLY (
                SELECT TOP 1 ktp.ytd_median_container_trt AS median_trt_container
                FROM tbl_kpi_time_performance ktp
                WHERE ktp.organisation_id = base.organisation_id
                  AND REPLACE(ktp.fiscal_year,' ','') = base.fiscal_year
                  AND ktp.month IN (${fullParams})
                  AND ktp.ytd_median_container_trt IS NOT NULL
                ORDER BY ktp.month DESC
            ) con
        ),

        kpi_base_ytd AS (
            SELECT
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','') AS fiscal_year,

                SUM(ktp.average_dry_bulk_trt * ktp.dry_bulk_vessel_handled)
                    AS avg_trt_num_dry,

                SUM(ktp.average_break_bulk_trt * ktp.break_bulk_vessel_handled)
                    AS avg_trt_num_break,

                SUM(ktp.average_liquid_bulk_trt * ktp.liquid_bulk_vessel_handled)
                    AS avg_trt_num_liquid,

                SUM(ktp.average_container_trt * ktp.container_vessel_handled)
                    AS avg_trt_num_container,

                SUM(ktp.dry_bulk_vessel_handled)
                    AS avg_trt_den_dry,

                SUM(ktp.break_bulk_vessel_handled)
                    AS avg_trt_den_break,

                SUM(ktp.liquid_bulk_vessel_handled)
                    AS avg_trt_den_liquid,

                SUM(ktp.container_vessel_handled)
                    AS avg_trt_den_container,

                SUM(ktp.dry_bulk_cargo_handled)
                    AS osbd_dry_num,

                SUM(
                    NULLIF(ktp.dry_bulk_cargo_handled,0) /
                    NULLIF(ktp.dry_bulk_osbd,0)
                ) AS osbd_dry_den,

                SUM(ktp.break_bulk_cargo_handled)
                    AS osbd_break_num,

                SUM(
                    NULLIF(ktp.break_bulk_cargo_handled,0) /
                    NULLIF(ktp.break_bulk_osbd,0)
                ) AS osbd_break_den,

                SUM(ktp.liquid_bulk_cargo_handled)
                    AS osbd_liquid_num,

                SUM(
                    NULLIF(ktp.liquid_bulk_cargo_handled,0) /
                    NULLIF(ktp.liquid_bulk_osbd,0)
                ) AS osbd_liquid_den,

                SUM(ktp.container_cargo_handled)
                    AS osbd_container_num,

                SUM(
                    NULLIF(ktp.container_cargo_handled,0) /
                    NULLIF(ktp.container_osbd,0)
                ) AS osbd_container_den

            FROM tbl_kpi_time_performance ktp
            INNER JOIN base_filter_ytd bf
                ON bf.organisation_id = ktp.organisation_id
                AND bf.month = ktp.month
                AND bf.fiscal_year =
                    REPLACE(ktp.fiscal_year,' ','')

            GROUP BY
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','')
        ),

        kpi_base_full AS (
            SELECT
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','') AS fiscal_year,

                SUM(ktp.average_dry_bulk_trt * ktp.dry_bulk_vessel_handled)
                    AS avg_trt_num_dry,

                SUM(ktp.average_break_bulk_trt * ktp.break_bulk_vessel_handled)
                    AS avg_trt_num_break,

                SUM(ktp.average_liquid_bulk_trt * ktp.liquid_bulk_vessel_handled)
                    AS avg_trt_num_liquid,

                SUM(ktp.average_container_trt * ktp.container_vessel_handled)
                    AS avg_trt_num_container,

                SUM(ktp.dry_bulk_vessel_handled)
                    AS avg_trt_den_dry,

                SUM(ktp.break_bulk_vessel_handled)
                    AS avg_trt_den_break,

                SUM(ktp.liquid_bulk_vessel_handled)
                    AS avg_trt_den_liquid,

                SUM(ktp.container_vessel_handled)
                    AS avg_trt_den_container,

                SUM(ktp.dry_bulk_cargo_handled)
                    AS osbd_dry_num,

                SUM(
                    NULLIF(ktp.dry_bulk_cargo_handled,0) /
                    NULLIF(ktp.dry_bulk_osbd,0)
                ) AS osbd_dry_den,

                SUM(ktp.break_bulk_cargo_handled)
                    AS osbd_break_num,

                SUM(
                    NULLIF(ktp.break_bulk_cargo_handled,0) /
                    NULLIF(ktp.break_bulk_osbd,0)
                ) AS osbd_break_den,

                SUM(ktp.liquid_bulk_cargo_handled)
                    AS osbd_liquid_num,

                SUM(
                    NULLIF(ktp.liquid_bulk_cargo_handled,0) /
                    NULLIF(ktp.liquid_bulk_osbd,0)
                ) AS osbd_liquid_den,

                SUM(ktp.container_cargo_handled)
                    AS osbd_container_num,

                SUM(
                    NULLIF(ktp.container_cargo_handled,0) /
                    NULLIF(ktp.container_osbd,0)
                ) AS osbd_container_den

            FROM tbl_kpi_time_performance ktp
            INNER JOIN base_filter_full bf
                ON bf.organisation_id = ktp.organisation_id
                AND bf.fiscal_year =  REPLACE(ktp.fiscal_year,' ','')
                AND (bf.month = ktp.month OR ktp.month = 3)
            GROUP BY
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','')
        ),

        base_ytd AS (
            SELECT
                org.organisation_id,
                fy.fiscal_year,
                tar.target_value,

            ISNULL(t.total_traffic,0) AS total_traffic,
            ISNULL(t.total_traffic_liquid,0) AS total_traffic_liquid,
            ISNULL(t.total_traffic_dry,0) AS total_traffic_dry,
            ISNULL(t.total_traffic_break,0) AS total_traffic_break,
            ISNULL(t.total_traffic_container,0) AS total_traffic_container,
            ISNULL(tt.total_traffic_container_teus,0) AS total_traffic_container_teus,

            k.avg_trt_num_dry,
            k.avg_trt_num_break,
            k.avg_trt_num_liquid,
            k.avg_trt_num_container,

            k.avg_trt_den_dry,
            k.avg_trt_den_break,
            k.avg_trt_den_liquid,
            k.avg_trt_den_container,

            med.median_trt_dry,
            med.median_trt_break,
            med.median_trt_liquid,
            med.median_trt_container,

            k.osbd_dry_num,
            k.osbd_dry_den,

            k.osbd_break_num,
            k.osbd_break_den,

            k.osbd_liquid_num,
            k.osbd_liquid_den,

            k.osbd_container_num,
            k.osbd_container_den

            FROM (
                SELECT DISTINCT organisation_id
                FROM base_filter_ytd
            ) org

            CROSS JOIN (
                SELECT REPLACE(@currentFY,' ','') AS fiscal_year
                UNION ALL
                SELECT REPLACE(@lastFY,' ','')
            ) fy

            LEFT JOIN traffic_ytd t
                ON t.organisation_id = org.organisation_id
                AND t.fiscal_year = fy.fiscal_year

            LEFT JOIN traffic_ytd_teus tt
              ON tt.organisation_id = org.organisation_id
              AND tt.fiscal_year = fy.fiscal_year

            LEFT JOIN kpi_base_ytd k
                ON k.organisation_id = org.organisation_id
                AND k.fiscal_year = fy.fiscal_year

            LEFT JOIN median_ytd med
                ON med.organisation_id = org.organisation_id
                AND med.fiscal_year = fy.fiscal_year
            
            ${targetJoin}
        ),

        base_full AS (
            SELECT
                org.organisation_id,
                fy.fiscal_year,
                tar.target_value,

                ISNULL(t.total_traffic,0) AS total_traffic,
                ISNULL(t.total_traffic_liquid,0) AS total_traffic_liquid,
                ISNULL(t.total_traffic_dry,0) AS total_traffic_dry,
                ISNULL(t.total_traffic_break,0) AS total_traffic_break,
                ISNULL(t.total_traffic_container,0) AS total_traffic_container,
                ISNULL(tt.total_traffic_container_teus,0) AS total_traffic_container_teus,

                k.avg_trt_num_dry,
                k.avg_trt_num_break,
                k.avg_trt_num_liquid,
                k.avg_trt_num_container,

                k.avg_trt_den_dry,
                k.avg_trt_den_break,
                k.avg_trt_den_liquid,
                k.avg_trt_den_container,

                med.median_trt_dry,
                med.median_trt_break,
                med.median_trt_liquid,
                med.median_trt_container,

                k.osbd_dry_num,
                k.osbd_dry_den,

                k.osbd_break_num,
                k.osbd_break_den,

                k.osbd_liquid_num,
                k.osbd_liquid_den,

                k.osbd_container_num,
                k.osbd_container_den

            FROM (
                SELECT DISTINCT organisation_id
                FROM base_filter_full
            ) org

            CROSS JOIN (
                SELECT REPLACE(@lastFY,' ','') AS fiscal_year
            ) fy

            LEFT JOIN traffic_full t
                ON t.organisation_id = org.organisation_id
                AND t.fiscal_year = fy.fiscal_year
            
            LEFT JOIN traffic_full_teus tt
                ON tt.organisation_id = org.organisation_id
                AND tt.fiscal_year = fy.fiscal_year

            LEFT JOIN kpi_base_full k
                ON k.organisation_id = org.organisation_id
                AND k.fiscal_year = fy.fiscal_year

            LEFT JOIN median_full med
                ON med.organisation_id = org.organisation_id
                AND med.fiscal_year = fy.fiscal_year
            ${targetJoin}
        ),

        /* =========================================================
           WEIGHTED MEDIAN (cumulative-vessel-count method)
           Used ONLY for the SMPA Total / Overall Total rows of the
           median_* KPIs. Per-org rows keep using the direct
           ytd_median_*_trt columns fetched above (median_ytd/median_full).

           median_weighted_base : one row per (org, period, commodity)
              with trt_value = avg TRT for that org/commodity/period
              and vessel_count = vessels handled (the "weight").

           median_scoped : duplicates the rows into scope='overall'
              (all orgs in the current filter) and scope='smpa'
              (orgs 54,55 only) so each scope gets its own ranking.

           median_cumulative : sorts by trt_value ASC within each
              scope/period/fiscal_year/commodity group and builds the
              running cumulative vessel count - this mirrors the
              "Cumulative Vessel Count" column in the reference table.

           median_weighted_result : picks the smallest trt_value whose
              cumulative vessel count has reached 50% of the total
              vessel count for that group - this is the weighted
              median TRT.
        ========================================================= */
        median_weighted_base AS (
            -- trt_value = the org's stored ytd/full median TRT for that
            -- commodity (median_trt_dry/break/liquid/container, sourced
            -- from ytd_median_*_trt via median_ytd/median_full).
            -- vessel_count = vessels handled for that commodity in the
            -- same period (the "weight" for the cumulative ranking).
            SELECT 'ytd' AS period, fiscal_year, organisation_id, 'dry' AS commodity,
                median_trt_dry AS trt_value,
                avg_trt_den_dry AS vessel_count
            FROM base_ytd
            WHERE median_trt_dry > 0 AND avg_trt_den_dry > 0

            UNION ALL
            SELECT 'ytd', fiscal_year, organisation_id, 'break',
                median_trt_break,
                avg_trt_den_break
            FROM base_ytd
            WHERE median_trt_break > 0 AND avg_trt_den_break > 0

            UNION ALL
            SELECT 'ytd', fiscal_year, organisation_id, 'liquid',
                median_trt_liquid,
                avg_trt_den_liquid
            FROM base_ytd
            WHERE median_trt_liquid > 0 AND avg_trt_den_liquid > 0

            UNION ALL
            SELECT 'ytd', fiscal_year, organisation_id, 'container',
                median_trt_container,
                avg_trt_den_container
            FROM base_ytd
            WHERE median_trt_container > 0 AND avg_trt_den_container > 0

            UNION ALL
            SELECT 'full', fiscal_year, organisation_id, 'dry',
                median_trt_dry,
                avg_trt_den_dry
            FROM base_full
            WHERE median_trt_dry > 0 AND avg_trt_den_dry > 0

            UNION ALL
            SELECT 'full', fiscal_year, organisation_id, 'break',
                median_trt_break,
                avg_trt_den_break
            FROM base_full
            WHERE median_trt_break > 0 AND avg_trt_den_break > 0

            UNION ALL
            SELECT 'full', fiscal_year, organisation_id, 'liquid',
                median_trt_liquid,
                avg_trt_den_liquid
            FROM base_full
            WHERE median_trt_liquid > 0 AND avg_trt_den_liquid > 0

            UNION ALL
            SELECT 'full', fiscal_year, organisation_id, 'container',
                median_trt_container,
                avg_trt_den_container
            FROM base_full
            WHERE median_trt_container > 0 AND avg_trt_den_container > 0
        ),

        median_scoped AS (
            SELECT 'overall' AS scope, mb.*
            FROM median_weighted_base mb

            UNION ALL

            SELECT 'smpa' AS scope, mb.*
            FROM median_weighted_base mb
            WHERE mb.organisation_id IN (54,55)
        ),

        median_cumulative AS (
            SELECT
                scope, period, fiscal_year, commodity, organisation_id, trt_value, vessel_count,
                SUM(vessel_count) OVER (
                    PARTITION BY scope, period, fiscal_year, commodity
                    ORDER BY trt_value
                    ROWS UNBOUNDED PRECEDING
                ) AS cum_vessel_count,
                SUM(vessel_count) OVER (
                    PARTITION BY scope, period, fiscal_year, commodity
                ) AS total_vessel_count
            FROM median_scoped
        ),

        median_weighted_result AS (
            SELECT
                scope, period, fiscal_year, commodity,
                MIN(trt_value) AS weighted_median_trt
            FROM median_cumulative
            WHERE cum_vessel_count >= total_vessel_count * 0.5
            GROUP BY scope, period, fiscal_year, commodity
        ),

        current_ytd AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value,
                MAX(target_value) AS target_value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','')
            GROUP BY organisation_id
        ),

        last_ytd AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            GROUP BY organisation_id
        ),

        last_full AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            GROUP BY organisation_id
        ),
          /* ================= SMPA ================= */
        smpa_current AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope = 'smpa' AND period = 'ytd'
              AND commodity = @medianCommodity
              AND fiscal_year = REPLACE(@currentFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','') AND organisation_id IN (54,55)
            `}
        ),
        smpa_last AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope = 'smpa' AND period = 'ytd'
              AND commodity = @medianCommodity
              AND fiscal_year = REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','') AND organisation_id IN (54,55)
            `}
        ),
        smpa_full AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope = 'smpa' AND period = 'full'
              AND commodity = @medianCommodity
              AND fiscal_year = REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','') AND organisation_id IN (54,55)
            `}
        ),

        /* ================= OVERALL ================= */
        overall_current AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope = 'overall' AND period = 'ytd'
              AND commodity = @medianCommodity
              AND fiscal_year = REPLACE(@currentFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','')
            `}
        ),
        overall_last AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope = 'overall' AND period = 'ytd'
              AND commodity = @medianCommodity
              AND fiscal_year = REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            `}
        ),
        overall_full AS (
            ${isMedianKpi ? `
            SELECT weighted_median_trt AS value
            FROM median_weighted_result
            WHERE scope = 'overall' AND period = 'full'
              AND commodity = @medianCommodity
              AND fiscal_year = REPLACE(@lastFY,' ','')
            ` : `
            SELECT ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            `}
        )

        SELECT
            org.organisation_id,
            org.organisation_name,
            cy.target_value,    
            CASE
                WHEN '${kpi}' LIKE 'osbd%'
                THEN CAST(ROUND(ISNULL(lf.value,0),0) AS INT)
                ELSE ROUND(ISNULL(lf.value,0),2)
            END AS achievement_for_last_FY,

            CASE
                WHEN '${kpi}' LIKE 'osbd%'
                THEN CAST(ROUND(ISNULL(cy.value,0),0) AS INT)
                ELSE ROUND(ISNULL(cy.value,0),2)
            END AS current_fy_ytd,

            CASE
                WHEN '${kpi}' LIKE 'osbd%'
                THEN CAST(ROUND(ISNULL(ly.value,0),0) AS INT)
                ELSE ROUND(ISNULL(ly.value,0),2)
            END AS last_fy_ytd,

            ROUND(
                (ISNULL(cy.value,0) - ISNULL(ly.value,0))
                * 100.0 /
                NULLIF(ly.value,0),
                2
            ) AS yoy

        FROM mmt_organisation org

        LEFT JOIN current_ytd cy
            ON cy.organisation_id = org.organisation_id

        LEFT JOIN last_ytd ly
            ON ly.organisation_id = org.organisation_id

        LEFT JOIN last_full lf
            ON lf.organisation_id = org.organisation_id

        WHERE org.organisation_id IN (${orgParams})

         UNION ALL

        SELECT
            NULL, 'SMPA Total',NULL,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ISNULL(sf.value,0) AS INT)
                 ELSE ROUND(ISNULL(sf.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ISNULL(sc.value,0) AS INT)
                 ELSE ROUND(ISNULL(sc.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ISNULL(sl.value,0) AS INT)
                 ELSE ROUND(ISNULL(sl.value,0),2) END,
            ROUND((ISNULL(sc.value,0) - ISNULL(sl.value,0)) * 100.0 / NULLIF(sl.value,0), 2)
        FROM smpa_current sc CROSS JOIN smpa_last sl CROSS JOIN smpa_full sf

        UNION ALL

        SELECT
            NULL, 'Overall Total',NULL,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ROUND(ISNULL(ofu.value,0),0) AS INT)
                ELSE ROUND(ISNULL(ofu.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ROUND(ISNULL(oc.value,0),0) AS INT)
                ELSE ROUND(ISNULL(oc.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ROUND(ISNULL(ol.value,0),0) AS INT)
                ELSE ROUND(ISNULL(ol.value,0),2) END,
            ROUND((ISNULL(oc.value,0) - ISNULL(ol.value,0)) * 100.0 / NULLIF(ol.value,0), 2)
        FROM overall_current oc CROSS JOIN overall_last ol CROSS JOIN overall_full ofu
                ORDER BY organisation_name;


        `;

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching KPI dashboard data");
    }
}


async function getAllTrafficDashboardKPIs(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID) || 0;
        const fyParam = req.params.fy && req.params.fy !== "all" ? req.params.fy : null;
        const monthsParam = req.params.months && req.params.months !== "all" ? req.params.months.split(',').map(Number) : null;

        const conn = await pool;
        const request = conn.request();

        let currentFY, lastFY;
        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split('-').map(Number);
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);

        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        request.input("currentMonth", currentMonth);

        function getFYMonths() {
            if (monthsParam && monthsParam.length) return monthsParam;
            let endMonth = currentMonth - 1;
            if (endMonth === 0) endMonth = 12;
            let months = [];
            if (endMonth >= 4) {
                for (let m = 4; m <= endMonth; m++) months.push(m);
            } else {
                for (let m = 4; m <= 12; m++) months.push(m);
                for (let m = 1; m <= endMonth; m++) months.push(m);
            }
            return months;
        }

        const monthsList = getFYMonths();
        monthsList.forEach((m, i) => request.input(`month${i}`, m));
        const monthParamList = monthsList.map((_, i) => `@month${i}`).join(',');

        const allOrgs = [1,2,3,5,6,7,8,9,10,11,12,54,55];
        const orgFilter = organisationID ? [organisationID] : allOrgs;
        orgFilter.forEach((id, i) => request.input(`org${i}`, id));
        const orgParamList = orgFilter.map((_, i) => `@org${i}`).join(',');

        const query = `
        SET ARITHABORT OFF;
        SET ANSI_WARNINGS OFF;

        WITH base_filter AS (
            SELECT
                organisation_id,
                month,
                fiscal_year
            FROM tbl_kpi_time_performance
            WHERE organisation_id IN (${orgParamList})
            AND month IN (${monthParamList})
            AND fiscal_year IN (@currentFY, @lastFY)
        ),

        kpi_base AS (
            SELECT ktp.*
            FROM tbl_kpi_time_performance ktp
            INNER JOIN base_filter bf
                ON bf.organisation_id = ktp.organisation_id
                AND bf.month = ktp.month
                AND bf.fiscal_year = ktp.fiscal_year
        ),

        commodity_base AS (
            SELECT
                cd.organisation_id,
                cd.month,
                cd.fiscal_year,
                SUM(cd.value) AS qty
            FROM tbl_traffic_commodity_data cd
            WHERE cd.commodity_id = 28
            AND cd.organisation_id IN (${orgParamList})
            AND cd.month IN (${monthParamList})
            AND REPLACE(cd.fiscal_year,' ','') IN (
                    REPLACE(@currentFY,' ',''),
                    REPLACE(@lastFY,' ','')
            )
            GROUP BY
                cd.organisation_id,
                cd.month,
                cd.fiscal_year
        )

        SELECT

            /* ── Total vessels handled ── */
            SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.total_sailed_vessel_handled ELSE 0 END) AS total_sailed_vessel_handled_current,
            SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.total_sailed_vessel_handled ELSE 0 END) AS total_sailed_vessel_handled_last,
            (
                SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.total_sailed_vessel_handled ELSE 0 END)
              - SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.total_sailed_vessel_handled ELSE 0 END)
            ) * 100.0
            / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.total_sailed_vessel_handled ELSE 0 END), 0)
            AS total_sailed_vessel_handled_yoy,

            /* ── Break Bulk vessels ── */
            SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.break_bulk_vessel_handled ELSE 0 END) AS break_bulk_vessel_handled_current,
            SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.break_bulk_vessel_handled ELSE 0 END) AS break_bulk_vessel_handled_last,
            (
                SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.break_bulk_vessel_handled ELSE 0 END)
              - SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.break_bulk_vessel_handled ELSE 0 END)
            ) * 100.0
            / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.break_bulk_vessel_handled ELSE 0 END), 0)
            AS break_bulk_vessel_handled_yoy,

            /* ── Container vessels ── */
            SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.container_vessel_handled ELSE 0 END) AS container_vessel_handled_current,
            SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.container_vessel_handled ELSE 0 END) AS container_vessel_handled_last,
            (
                SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.container_vessel_handled ELSE 0 END)
              - SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.container_vessel_handled ELSE 0 END)
            ) * 100.0
            / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.container_vessel_handled ELSE 0 END), 0)
            AS container_vessel_handled_yoy,

            /* ── Dry Bulk vessels ── */
            SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.dry_bulk_vessel_handled ELSE 0 END) AS dry_bulk_vessel_handled_current,
            SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.dry_bulk_vessel_handled ELSE 0 END) AS dry_bulk_vessel_handled_last,
            (
                SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.dry_bulk_vessel_handled ELSE 0 END)
              - SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.dry_bulk_vessel_handled ELSE 0 END)
            ) * 100.0
            / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.dry_bulk_vessel_handled ELSE 0 END), 0)
            AS dry_bulk_vessel_handled_yoy,

            /* ── Liquid Bulk vessels ── */
            SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.liquid_bulk_vessel_handled ELSE 0 END) AS liquid_bulk_vessel_handled_current,
            SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.liquid_bulk_vessel_handled ELSE 0 END) AS liquid_bulk_vessel_handled_last,
            (
                SUM(CASE WHEN k.fiscal_year = @currentFY THEN k.liquid_bulk_vessel_handled ELSE 0 END)
              - SUM(CASE WHEN k.fiscal_year = @lastFY    THEN k.liquid_bulk_vessel_handled ELSE 0 END)
            ) * 100.0
            / NULLIF(SUM(CASE WHEN k.fiscal_year = @lastFY THEN k.liquid_bulk_vessel_handled ELSE 0 END), 0)
            AS liquid_bulk_vessel_handled_yoy,

            /* ── average_break_bulk_idle_time ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_break_bulk_idle_time * k.break_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_idle_time_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_idle_time * k.break_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_idle_time_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_break_bulk_idle_time * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_idle_time * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_idle_time * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_break_bulk_idle_time_yoy,

            /* ── average_container_idle_time ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_idle_time * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
            AS average_container_idle_time_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_idle_time * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
            AS average_container_idle_time_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_idle_time * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_idle_time * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_idle_time * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 , 0)
            END AS average_container_idle_time_yoy,

            /* ── average_dry_bulk_idle_time ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_dry_bulk_idle_time * k.dry_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_idle_time_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_idle_time * k.dry_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_idle_time_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_dry_bulk_idle_time * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_idle_time * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_idle_time * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_dry_bulk_idle_time_yoy,

            /* ── average_liquid_bulk_idle_time ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_liquid_bulk_idle_time * k.liquid_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_idle_time_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_idle_time * k.liquid_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_idle_time_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_liquid_bulk_idle_time * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_idle_time * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_idle_time * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_liquid_bulk_idle_time_yoy,

            /* ── overall_average_idle_time ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.overall_average_idle_time * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
            AS overall_average_idle_time_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_average_idle_time * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
            AS overall_average_idle_time_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.overall_average_idle_time * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_average_idle_time * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_average_idle_time * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 , 0)
            END AS overall_average_idle_time_yoy,

            /* ── avg_container_trt_less_than_251 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_less_than_251 * k.vessel_container_less_than_251 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_less_than_251 END), 0)
            AS avg_container_trt_less_than_251_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_less_than_251 * k.vessel_container_less_than_251 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_less_than_251 END), 0)
            AS avg_container_trt_less_than_251_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_less_than_251 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_less_than_251 * k.vessel_container_less_than_251 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_less_than_251 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_less_than_251 * k.vessel_container_less_than_251 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_less_than_251 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_less_than_251 * k.vessel_container_less_than_251 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_less_than_251 END), 0)
                 , 0)
            END AS avg_container_trt_less_than_251_yoy,

            /* ── avg_container_trt_251_to_500 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_251_to_500 * k.vessel_container_251_to_500 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_251_to_500 END), 0)
            AS avg_container_trt_251_to_500_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_251_to_500 * k.vessel_container_251_to_500 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_251_to_500 END), 0)
            AS avg_container_trt_251_to_500_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_251_to_500 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_251_to_500 * k.vessel_container_251_to_500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_251_to_500 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_251_to_500 * k.vessel_container_251_to_500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_251_to_500 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_251_to_500 * k.vessel_container_251_to_500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_251_to_500 END), 0)
                 , 0)
            END AS avg_container_trt_251_to_500_yoy,

            /* ── avg_container_trt_501_to_1000 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_501_to_1000 * k.vessel_container_501_to_1000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_501_to_1000 END), 0)
            AS avg_container_trt_501_to_1000_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_501_to_1000 * k.vessel_container_501_to_1000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_501_to_1000 END), 0)
            AS avg_container_trt_501_to_1000_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_501_to_1000 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_501_to_1000 * k.vessel_container_501_to_1000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_501_to_1000 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_501_to_1000 * k.vessel_container_501_to_1000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_501_to_1000 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_501_to_1000 * k.vessel_container_501_to_1000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_501_to_1000 END), 0)
                 , 0)
            END AS avg_container_trt_501_to_1000_yoy,

            /* ── avg_container_trt_1001_to_1500 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_1001_to_1500 * k.vessel_container_1001_to_1500 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_1001_to_1500 END), 0)
            AS avg_container_trt_1001_to_1500_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_1001_to_1500 * k.vessel_container_1001_to_1500 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1001_to_1500 END), 0)
            AS avg_container_trt_1001_to_1500_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1001_to_1500 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_1001_to_1500 * k.vessel_container_1001_to_1500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_1001_to_1500 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_1001_to_1500 * k.vessel_container_1001_to_1500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1001_to_1500 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_1001_to_1500 * k.vessel_container_1001_to_1500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1001_to_1500 END), 0)
                 , 0)
            END AS avg_container_trt_1001_to_1500_yoy,

            /* ── avg_container_trt_1501_to_2000 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_1501_to_2000 * k.vessel_container_1501_to_2000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_1501_to_2000 END), 0)
            AS avg_container_trt_1501_to_2000_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_1501_to_2000 * k.vessel_container_1501_to_2000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1501_to_2000 END), 0)
            AS avg_container_trt_1501_to_2000_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1501_to_2000 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_1501_to_2000 * k.vessel_container_1501_to_2000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_1501_to_2000 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_1501_to_2000 * k.vessel_container_1501_to_2000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1501_to_2000 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_1501_to_2000 * k.vessel_container_1501_to_2000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_1501_to_2000 END), 0)
                 , 0)
            END AS avg_container_trt_1501_to_2000_yoy,

            /* ── avg_container_trt_2001_to_2500 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_2001_to_2500 * k.vessel_container_2001_to_2500 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_2001_to_2500 END), 0)
            AS avg_container_trt_2001_to_2500_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_2001_to_2500 * k.vessel_container_2001_to_2500 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2001_to_2500 END), 0)
            AS avg_container_trt_2001_to_2500_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2001_to_2500 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_2001_to_2500 * k.vessel_container_2001_to_2500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_2001_to_2500 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_2001_to_2500 * k.vessel_container_2001_to_2500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2001_to_2500 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_2001_to_2500 * k.vessel_container_2001_to_2500 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2001_to_2500 END), 0)
                 , 0)
            END AS avg_container_trt_2001_to_2500_yoy,

            /* ── avg_container_trt_2501_to_3000 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_2501_to_3000 * k.vessel_container_2501_to_3000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_2501_to_3000 END), 0)
            AS avg_container_trt_2501_to_3000_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_2501_to_3000 * k.vessel_container_2501_to_3000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2501_to_3000 END), 0)
            AS avg_container_trt_2501_to_3000_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2501_to_3000 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_2501_to_3000 * k.vessel_container_2501_to_3000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_2501_to_3000 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_2501_to_3000 * k.vessel_container_2501_to_3000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2501_to_3000 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_2501_to_3000 * k.vessel_container_2501_to_3000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_2501_to_3000 END), 0)
                 , 0)
            END AS avg_container_trt_2501_to_3000_yoy,

            /* ── avg_container_trt_3001_to_4000 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_3001_to_4000 * k.vessel_container_3001_to_4000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_3001_to_4000 END), 0)
            AS avg_container_trt_3001_to_4000_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_3001_to_4000 * k.vessel_container_3001_to_4000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_3001_to_4000 END), 0)
            AS avg_container_trt_3001_to_4000_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_3001_to_4000 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_3001_to_4000 * k.vessel_container_3001_to_4000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_3001_to_4000 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_3001_to_4000 * k.vessel_container_3001_to_4000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_3001_to_4000 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_3001_to_4000 * k.vessel_container_3001_to_4000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_3001_to_4000 END), 0)
                 , 0)
            END AS avg_container_trt_3001_to_4000_yoy,

            /* ── avg_container_trt_4001_to_6000 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_4001_to_6000 * k.vessel_container_4001_to_6000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_4001_to_6000 END), 0)
            AS avg_container_trt_4001_to_6000_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_4001_to_6000 * k.vessel_container_4001_to_6000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_4001_to_6000 END), 0)
            AS avg_container_trt_4001_to_6000_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_4001_to_6000 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_4001_to_6000 * k.vessel_container_4001_to_6000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_4001_to_6000 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_4001_to_6000 * k.vessel_container_4001_to_6000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_4001_to_6000 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_4001_to_6000 * k.vessel_container_4001_to_6000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_4001_to_6000 END), 0)
                 , 0)
            END AS avg_container_trt_4001_to_6000_yoy,

            /* ── avg_container_trt_greater_than_6000 ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_greater_than_6000 * k.vessel_container_greater_than_6000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_greater_than_6000 END), 0)
            AS avg_container_trt_greater_than_6000_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_greater_than_6000 * k.vessel_container_greater_than_6000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_greater_than_6000 END), 0)
            AS avg_container_trt_greater_than_6000_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_greater_than_6000 END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.avg_container_trt_greater_than_6000 * k.vessel_container_greater_than_6000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.vessel_container_greater_than_6000 END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_greater_than_6000 * k.vessel_container_greater_than_6000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_greater_than_6000 END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.avg_container_trt_greater_than_6000 * k.vessel_container_greater_than_6000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.vessel_container_greater_than_6000 END), 0)
                 , 0)
            END AS avg_container_trt_greater_than_6000_yoy,

            /* ── dry_bulk_parcel_size ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_parcel_size_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_parcel_size_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_dry_bulk_parcel_size_yoy,

            /* ── break_bulk_parcel_size ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_parcel_size_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_parcel_size_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_break_bulk_parcel_size_yoy,

            /* ── liquid_bulk_parcel_size ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_parcel_size_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_parcel_size_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_liquid_bulk_parcel_size_yoy,

            /* ── container_parcel_size ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
            AS average_container_parcel_size_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
            AS average_container_parcel_size_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 , 0)
            END AS average_container_parcel_size_yoy,

            /* ── total_parcel_size ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
            AS total_parcel_time_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_cargo_handled * 1000000 END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
            AS total_parcel_time_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_cargo_handled * 1000000 END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 , 0)
            END AS total_parcel_time_yoy,

            /* ── dry_bulk_waiting_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_dry_bulk_waiting_time_port * k.dry_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_waiting_time_port * k.dry_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_dry_bulk_waiting_time_port * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_waiting_time_port * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_waiting_time_port * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_dry_bulk_port_yoy,

            /* ── break_bulk_waiting_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_break_bulk_waiting_time_port * k.break_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_waiting_time_port * k.break_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_break_bulk_waiting_time_port * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_waiting_time_port * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_waiting_time_port * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_break_bulk_port_yoy,

            /* ── liquid_bulk_waiting_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_liquid_bulk_waiting_time_port * k.liquid_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_waiting_time_port * k.liquid_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_liquid_bulk_waiting_time_port * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_waiting_time_port * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_waiting_time_port * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_liquid_bulk_port_yoy,

            /* ── container_waiting_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_waiting_time_port * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
            AS average_container_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_waiting_time_port * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
            AS average_container_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_waiting_time_port * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_waiting_time_port * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_waiting_time_port * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 , 0)
            END AS average_container_port_yoy,

            /* ── total_waiting_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.overall_waiting_time_port * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
            AS total_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_waiting_time_port * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
            AS total_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.overall_waiting_time_port * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_waiting_time_port * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_waiting_time_port * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 , 0)
            END AS total_port_yoy,

            /* ── dry_bulk_waiting_non_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_dry_bulk_waiting_time_non_port * k.dry_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_non_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_waiting_time_non_port * k.dry_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
            AS average_dry_bulk_non_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_dry_bulk_waiting_time_non_port * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.dry_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_waiting_time_non_port * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_dry_bulk_waiting_time_non_port * k.dry_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.dry_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_dry_bulk_non_port_yoy,

            /* ── break_bulk_waiting_non_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_break_bulk_waiting_time_non_port * k.break_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_non_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_waiting_time_non_port * k.break_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
            AS average_break_bulk_non_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_break_bulk_waiting_time_non_port * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.break_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_waiting_time_non_port * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_break_bulk_waiting_time_non_port * k.break_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.break_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_break_bulk_non_port_yoy,

            /* ── liquid_bulk_waiting_non_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_liquid_bulk_waiting_time_non_port * k.liquid_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_non_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_waiting_time_non_port * k.liquid_bulk_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
            AS average_liquid_bulk_non_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_liquid_bulk_waiting_time_non_port * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.liquid_bulk_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_waiting_time_non_port * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_liquid_bulk_waiting_time_non_port * k.liquid_bulk_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.liquid_bulk_vessel_handled END), 0)
                 , 0)
            END AS average_liquid_bulk_non_port_yoy,

            /* ── container_waiting_non_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_waiting_time_non_port * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
            AS average_container_non_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_waiting_time_non_port * k.container_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
            AS average_container_non_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.average_container_waiting_time_non_port * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.container_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_waiting_time_non_port * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.average_container_waiting_time_non_port * k.container_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.container_vessel_handled END), 0)
                 , 0)
            END AS average_container_non_port_yoy,

            /* ── total_waiting_non_port ── */
            SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.overall_waiting_time_non_port * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
            AS total_non_port_current,

            SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_waiting_time_non_port * k.total_sailed_vessel_handled END)
            / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
            AS total_non_port_last,

            CASE WHEN SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END) = 0 THEN NULL
                 ELSE (
                     SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.overall_waiting_time_non_port * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@currentFY THEN k.total_sailed_vessel_handled END), 0)
                   - SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_waiting_time_non_port * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 ) * 100.0
                 / NULLIF(
                     SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.overall_waiting_time_non_port * k.total_sailed_vessel_handled END)
                     / NULLIF(SUM(CASE WHEN k.fiscal_year=@lastFY THEN k.total_sailed_vessel_handled END), 0)
                 , 0)
            END AS total_non_port_yoy,

            /* ── osbd_container_teus_current ── */
            CASE
                WHEN SUM(
                    CASE
                        WHEN k.fiscal_year = @currentFY
                            AND ISNULL(k.container_osbd_teus,0) <> 0
                        THEN ISNULL(cd.qty,0) * 1.0 / k.container_osbd_teus
                        ELSE 0
                    END
                ) = 0
            THEN NULL
            ELSE
                SUM(
                    CASE
                        WHEN k.fiscal_year = @currentFY
                        THEN ISNULL(cd.qty,0)
                        ELSE 0
                    END
                )
                /
                SUM(
                    CASE
                        WHEN k.fiscal_year = @currentFY
                            AND ISNULL(k.container_osbd_teus,0) <> 0
                        THEN ISNULL(cd.qty,0) * 1.0 / k.container_osbd_teus
                        ELSE 0
                    END
                )
        END AS osbd_container_teus_current,

            /* ── osbd_container_teus_last ── */
           CASE
    WHEN SUM(
        CASE
            WHEN k.fiscal_year = @lastFY
                 AND ISNULL(k.container_osbd_teus, 0) <> 0
            THEN ISNULL(cd.qty, 0) * 1.0 / k.container_osbd_teus
            ELSE 0
        END
    ) = 0
    THEN NULL
    ELSE
        SUM(
            CASE
                WHEN k.fiscal_year = @lastFY
                THEN ISNULL(cd.qty, 0)
                ELSE 0
            END
        )
        /
        SUM(
            CASE
                WHEN k.fiscal_year = @lastFY
                     AND ISNULL(k.container_osbd_teus, 0) <> 0
                THEN ISNULL(cd.qty, 0) * 1.0 / k.container_osbd_teus
                ELSE 0
            END
        )
END AS osbd_container_teus_last,

            /* ── osbd_container_teus_yoy ── */
            CASE
    WHEN
        (
            SUM(
                CASE
                    WHEN k.fiscal_year = @lastFY
                         AND ISNULL(k.container_osbd_teus,0) <> 0
                    THEN ISNULL(cd.qty,0) * 1.0 / k.container_osbd_teus
                    ELSE 0
                END
            )
        ) = 0
    THEN NULL
    ELSE
        (
            (
                SUM(
                    CASE
                        WHEN k.fiscal_year = @currentFY
                        THEN ISNULL(cd.qty,0)
                        ELSE 0
                    END
                )
                /
                NULLIF(
                    SUM(
                        CASE
                            WHEN k.fiscal_year = @currentFY
                                 AND ISNULL(k.container_osbd_teus,0) <> 0
                            THEN ISNULL(cd.qty,0) * 1.0 / k.container_osbd_teus
                            ELSE 0
                        END
                    )
                ,0)
            )
            -
            (
                SUM(
                    CASE
                        WHEN k.fiscal_year = @lastFY
                        THEN ISNULL(cd.qty,0)
                        ELSE 0
                    END
                )
                /
                NULLIF(
                    SUM(
                        CASE
                            WHEN k.fiscal_year = @lastFY
                                 AND ISNULL(k.container_osbd_teus,0) <> 0
                            THEN ISNULL(cd.qty,0) * 1.0 / k.container_osbd_teus
                            ELSE 0
                        END
                    )
                ,0)
            )
        ) * 100.0
        /
        NULLIF(
            (
                SUM(
                    CASE
                        WHEN k.fiscal_year = @lastFY
                        THEN ISNULL(cd.qty,0)
                        ELSE 0
                    END
                )
                /
                NULLIF(
                    SUM(
                        CASE
                            WHEN k.fiscal_year = @lastFY
                                 AND ISNULL(k.container_osbd_teus,0) <> 0
                            THEN ISNULL(cd.qty,0) * 1.0 / k.container_osbd_teus
                            ELSE 0
                        END
                    )
                ,0)
            )
        ,0)
END AS osbd_container_teus_yoy

        FROM kpi_base k
        LEFT JOIN commodity_base cd
            ON cd.organisation_id = k.organisation_id
            AND cd.month = k.month
            AND cd.fiscal_year = k.fiscal_year;
        `;

        const result = await request.query(query);
        return res.status(200).json(result.recordset[0]);

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Error fetching data." });
    }
}


function getKpiConfigcargo(kpi) {
    if (!kpi) return null;

    if (isNaN(kpi)) {
        const valid = [
            "osbd_container_teus", "dry_bulk_vessel_handled",
            "break_bulk_vessel_handled", "liquid_bulk_vessel_handled",
            "total_sailed_vessel_handled", "container_vessel_handled", , "average_dry_bulk_idle_time",
            "average_break_bulk_idle_time", "average_liquid_bulk_idle_time", "average_container_idle_time", "overall_average_idle_time",
            "avg_container_trt_less_than_251", "avg_container_trt_251_to_500", "avg_container_trt_501_to_1000", "avg_container_trt_1001_to_1500",
            "avg_container_trt_1501_to_2000","avg_container_trt_2001_to_2500","avg_container_trt_2501_to_3000",
            "avg_container_trt_3001_to_4000","avg_container_trt_4001_to_6000","avg_container_trt_greater_than_6000",
            "dry_bulk_parcel_size","break_bulk_parcel_size","liquid_bulk_parcel_size","container_parcel_size",
            "total_parcel_time","dry_bulk_port","break_bulk_port","liquid_bulk_port","container_port","total_port",
            "dry_bulk_non_port","break_bulk_non_port","liquid_bulk_non_port","container_non_port","total_non_port",

        ];
        return valid.includes(kpi) ? kpi : null;
    }

    switch (parseInt(kpi)) {
        case 1:  return "osbd_container_teus";
        case 2:  return "dry_bulk_vessel_handled";
        case 3:  return "break_bulk_vessel_handled";
        case 4:  return "liquid_bulk_vessel_handled";
        case 5:  return "total_sailed_vessel_handled";
        case 6:  return "container_vessel_handled";
        case 7:  return "average_dry_bulk_idle_time";
        case 8:  return "average_break_bulk_idle_time";
        case 9:  return "average_liquid_bulk_idle_time";
        case 10: return "average_container_idle_time";
        case 11: return "overall_average_idle_time";
        case 12: return "avg_container_trt_less_than_251";
        case 13: return "avg_container_trt_251_to_500";
        case 14: return "avg_container_trt_501_to_1000";
        case 15: return "avg_container_trt_1001_to_1500";
        case 16: return "avg_container_trt_1501_to_2000";
        case 17:  return "avg_container_trt_2001_to_2500";
        case 18:  return "avg_container_trt_2501_to_3000";
        case 19:  return "avg_container_trt_3001_to_4000";
        case 20:  return "avg_container_trt_3501_to_4000";
        case 21:  return "avg_container_trt_4001_to_6000";
        case 22:  return "avg_container_trt_greater_than_6000";
        case 23:  return "dry_bulk_parcel_size";
        case 24:  return "break_bulk_parcel_size";
        case 25:  return "liquid_bulk_parcel_size";
        case 26: return "container_parcel_size";
        case 27: return "total_parcel_time";
        case 28: return "dry_bulk_port";
        case 29: return "break_bulk_port";
        case 30: return "liquid_bulk_port";
        case 31: return "container_port";
        case 32: return "total_port";
        case 33: return "dry_bulk_non_port";
        case 34: return "break_bulk_non_port";
        case 35: return "liquid_bulk_non_port";
        case 36: return "container_non_port";
        case 37: return "total_non_port";

        default: return null; 
    }
}

async function detailedAllTrafficDashboardKPIs(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();
        const organisationID = parseInt(req.query.organisationID) || 0;
        const fyParam = req.query.fy && req.query.fy !== "all" ? req.query.fy : null;
        const monthsParam = req.query.months && req.query.months !== "all" ? req.query.months.split(",").map(Number) : null;

        const rawKpi = req.query.kpi;
        const kpi = getKpiConfigcargo(rawKpi) || "traffic";


        let currentFY, lastFY;

        if (fyParam) {
            currentFY = fyParam;
            const [start, end] = fyParam.split("-").map(Number);
            lastFY = `${start - 1}-${end - 1}`;
        } else {
            const fyData = getFinancialYears();
            currentFY = fyData.currentFY;
            lastFY = fyData.lastFY;
        }

        request.input("currentFY", currentFY);
        request.input("lastFY", lastFY);

        /* ================= MONTHS ================= */
        const today = new Date();
        const currentMonth = today.getMonth() + 1;

        let ytdMonths = [];

        if (monthsParam?.length > 0) {
            ytdMonths = monthsParam;
        } else {
            let endMonth = currentMonth - 1;

            if (endMonth <= 0) endMonth = 12;

            if (endMonth >= 4) {
                for (let m = 4; m <= endMonth; m++) {
                    ytdMonths.push(m);
                }
            } else {
                for (let m = 4; m <= 12; m++) {
                    ytdMonths.push(m);
                }

                for (let m = 1; m <= endMonth; m++) {
                    ytdMonths.push(m);
                }
            }
        }

        const fullMonths = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

        ytdMonths.forEach((m, i) => request.input(`ytd${i}`, m));
        fullMonths.forEach((m, i) => request.input(`full${i}`, m));

        const ytdParams = ytdMonths.map((_, i) => `@ytd${i}`).join(",");
        const fullParams = fullMonths.map((_, i) => `@full${i}`).join(",");

        // Track the last month in ytdMonths for correct median pickup
        const lastYtdMonth = ytdMonths[ytdMonths.length - 1];
        request.input("lastYtdMonth", lastYtdMonth);

        /* ================= ORGS ================= */
        const allOrgs = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 54, 55];

        const orgFilter = organisationID ? [organisationID] : allOrgs;
        orgFilter.forEach((id, i) => request.input(`org${i}`, id));

        const orgParams = orgFilter.map((_, i) => `@org${i}`).join(",");

        /* ================= KPI FORMULA ================= */

        let kpiFormula = "";

        switch (kpi) {

            case "osbd_container_teus":
            kpiFormula = `
                SUM(osbd_num)
                /
                NULLIF(SUM(osbd_den),0)
            `;
            break;

            case "total_sailed_vessel_handled":
                kpiFormula = `SUM(ISNULL(total_sailed_vessel_handled,0))`;
                break;

            case "break_bulk_vessel_handled":
                kpiFormula = `SUM(ISNULL(break_bulk_vessel_handled,0))`;
                break;

           case "container_vessel_handled":
                kpiFormula = `SUM(ISNULL(container_vessel_handled,0))`;
                break;

            case "dry_bulk_vessel_handled":
                kpiFormula = `SUM(ISNULL(dry_bulk_vessel_handled,0))`;
                break;

            case "liquid_bulk_vessel_handled":
                kpiFormula = `SUM(ISNULL(liquid_bulk_vessel_handled,0))`;
                break;

            case "average_dry_bulk_idle_time":
                kpiFormula = `
                    SUM(avg_idle_num_dry) /
                    NULLIF(SUM(avg_idle_den_dry),0)
                `;
                break;

            case "average_container_idle_time":
                kpiFormula = `
                    SUM(avg_idle_num_container) /
                    NULLIF(SUM(avg_idle_den_container),0)
                `;
                break;


            case "average_liquid_bulk_idle_time":
                kpiFormula = `
                    SUM(avg_idle_num_liquid) /
                    NULLIF(SUM(avg_idle_den_liquid),0)
                `;
                break;

            case "overall_average_idle_time":
                kpiFormula = `
                    SUM(avg_idle_num_total) /
                    NULLIF(SUM(avg_idle_den_total),0)
                `;
                break;

            case "average_break_bulk_idle_time":
                kpiFormula = `
                    SUM(avg_idle_num_break) /
                    NULLIF(SUM(avg_idle_den_break),0)
                `;
                break;

                
            case "avg_container_trt_less_than_251":
                kpiFormula = `
                    SUM(avg_trt_callsize_less_than_251_num) /
                    NULLIF(SUM(avg_trt_callsize_less_than_251_den),0)
                `;
                break;


            case "avg_container_trt_251_to_500":
                kpiFormula = `
                    SUM(avg_trt_callsize_51_to_500_num) /
                    NULLIF(SUM(avg_trt_callsize_51_to_500_den),0)
                `;
                break;


            case "avg_container_trt_501_to_1000":
                kpiFormula = `
                    SUM(avg_trt_callsize_501_to_1000_num) /
                    NULLIF(SUM(avg_trt_callsize_501_to_1000_den),0)
                `;
                break;

            case "avg_container_trt_1001_to_1500":
                kpiFormula = `
                    SUM(avg_trt_callsize_1001_to_1500_num) /
                    NULLIF(SUM(avg_trt_callsize_1001_to_1500_den),0)
                `;
                break;

            case "avg_container_trt_1501_to_2000":
                kpiFormula = `
                    SUM(avg_trt_callsize_1501_to_2000_num) /
                    NULLIF(SUM(avg_trt_callsize_1501_to_2000_den),0)
                `;
                break;

            case "avg_container_trt_2001_to_2500":
                kpiFormula = `
                    SUM(avg_trt_callsize_2001_to_2500_num) /
                    NULLIF(SUM(avg_trt_callsize_2001_to_2500_den),0)
                `;
                break;

            case "avg_container_trt_2501_to_3000":
                kpiFormula = `
                    SUM(avg_trt_callsize_2501_to_3000_num) /
                    NULLIF(SUM(avg_trt_callsize_2501_to_3000_den),0)
                `;
                break;

            case "avg_container_trt_3001_to_4000":
                kpiFormula = `
                    SUM(avg_trt_callsize_3001_to_4000_num) /
                    NULLIF(SUM(avg_trt_callsize_3001_to_4000_den),0)
                `;
                break;

        
            case "avg_container_trt_4001_to_6000":
                kpiFormula = `
                    SUM(avg_trt_callsize_4001_to_6000_num) /
                    NULLIF(SUM(avg_trt_callsize_4001_to_6000_den),0)
                `;
                break;

            case "avg_container_trt_greater_than_6000":
                kpiFormula = `
                    SUM(avg_trt_callsize_greater_than_6000_num) /
                    NULLIF(SUM(avg_trt_callsize_greater_than_6000_den),0)
                `;
                break;

            case "dry_bulk_parcel_size":
                kpiFormula = `
                    NULLIF(SUM(avg_parcel_size_dry_num),0) /
                    NULLIF(SUM(avg_idle_den_dry),0)
                `;
                break;

            case "break_bulk_parcel_size":
                kpiFormula = `
                    NULLIF(SUM(avg_parcel_size_break_num),0) /
                    NULLIF(SUM(avg_idle_den_break),0)
                `;
                break;

            case "liquid_bulk_parcel_size":
                kpiFormula = `
                    NULLIF(SUM(avg_parcel_size_liquid_num),0) /
                    NULLIF(SUM(avg_idle_den_liquid),0)
                `;
                break;

            case "container_parcel_size":
                kpiFormula = `
                    NULLIF(SUM(avg_parcel_size_container_num),0) /
                    NULLIF(SUM(avg_idle_den_container),0)
                `;
                break;

            case "total_parcel_time":
                kpiFormula = `
                    NULLIF(SUM(avg_parcel_size_total_num),0) /
                    NULLIF(SUM(avg_idle_den_total),0)
                `;
                break;
            
            case "dry_bulk_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_port_dry),0) /
                    NULLIF(SUM(avg_idle_den_dry),0)
                `;
                break;

            case "break_bulk_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_port_break),0) /
                    NULLIF(SUM(avg_idle_den_break),0)
                `;
                break;

            case "liquid_bulk_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_port_liquid),0) /
                    NULLIF(SUM(avg_idle_den_liquid),0)
                `;
                break;

            case "container_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_port_container),0) /
                    NULLIF(SUM(avg_idle_den_container),0)
                `;
                break;

            case "total_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_port_total),0) /
                    NULLIF(SUM(avg_idle_den_total),0)
                `;
                break;

            case "dry_bulk_non_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_non_port_dry),0) /
                    NULLIF(SUM(avg_idle_den_dry),0)
                `;
                break;

            case "break_bulk_non_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_non_port_break),0) /
                    NULLIF(SUM(avg_idle_den_break),0)
                `;
                break;

            case "liquid_bulk_non_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_non_port_liquid),0) /
                    NULLIF(SUM(avg_idle_den_liquid),0)
                `;
                break;

            case "container_non_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_non_port_container),0) /
                    NULLIF(SUM(avg_idle_den_container),0)
                `;
                break;

            case "total_non_port":
                kpiFormula = `
                    NULLIF(SUM(avg_pre_birth_waiting_non_port_total),0) /
                    NULLIF(SUM(avg_idle_den_total),0)
                `;
                break;

            default:
                kpiFormula = `SUM(ISNULL(osbd_container_teu,0))`;
        }

        const query = `
          WITH base_filter_ytd AS (
              SELECT
                  cd.organisation_id,
                  cd.month,
                  REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                  SUM(cd.value) AS qty
              FROM tbl_traffic_commodity_data cd
              WHERE cd.commodity_id = 28
                  AND cd.organisation_id IN (${orgParams})
                  AND cd.month IN (${ytdParams})
                  AND REPLACE(cd.fiscal_year,' ','') IN (
                      REPLACE(@currentFY,' ',''),
                      REPLACE(@lastFY,' ','')
                  )
              GROUP BY
                  cd.organisation_id,
                  cd.month,
                  REPLACE(cd.fiscal_year,' ','')
          ),

          base_filter_full AS (
              SELECT
                  cd.organisation_id,
                  cd.month,
                  REPLACE(cd.fiscal_year,' ','') AS fiscal_year,
                  SUM(cd.value) AS qty
              FROM tbl_traffic_commodity_data cd
              WHERE cd.commodity_id = 28
                  AND cd.organisation_id IN (${orgParams})
                  AND cd.month IN (${fullParams})
                  AND REPLACE(cd.fiscal_year,' ','') =
                      REPLACE(@lastFY,' ','')
              GROUP BY
                  cd.organisation_id,
                  cd.month,
                  REPLACE(cd.fiscal_year,' ','')
          ),

   
          month_filter_ytd AS (
              SELECT DISTINCT organisation_id, month, fiscal_year
              FROM base_filter_ytd
          ),

          month_filter_full AS (
              SELECT DISTINCT organisation_id, month, fiscal_year
              FROM base_filter_full
          ),

          /* ================= TRAFFIC YTD ================= */
      traffic_ytd AS
     (
    SELECT
        bf.organisation_id,
        REPLACE(bf.fiscal_year,' ','') AS fiscal_year,

        SUM(bf.qty) AS osbd_num,

        SUM(
            CASE
                WHEN ISNULL(ktp.container_osbd_teus,0) <> 0
                THEN bf.qty * 1.0 / ktp.container_osbd_teus
                ELSE 0
            END
        ) AS osbd_den,

        CASE
            WHEN SUM(
                CASE
                    WHEN ISNULL(ktp.container_osbd_teus,0) <> 0
                    THEN bf.qty * 1.0 / ktp.container_osbd_teus
                    ELSE 0
                END
            ) = 0
            THEN NULL
            ELSE
                SUM(bf.qty)
                /
                SUM(
                    CASE
                        WHEN ISNULL(ktp.container_osbd_teus,0) <> 0
                        THEN bf.qty * 1.0 / ktp.container_osbd_teus
                        ELSE 0
                    END
                )
        END AS osbd_container_teu

        FROM base_filter_ytd bf
        INNER JOIN tbl_kpi_time_performance ktp
            ON ktp.organisation_id = bf.organisation_id
            AND ktp.month = bf.month
            AND REPLACE(ktp.fiscal_year,' ','') = bf.fiscal_year
        GROUP BY
            bf.organisation_id,
            REPLACE(bf.fiscal_year,' ','')
    ),

          /* ================= TRAFFIC FULL ================= */
traffic_full AS
(
    SELECT
        bf.organisation_id,
        REPLACE(bf.fiscal_year,' ','') AS fiscal_year,

        SUM(bf.qty) AS osbd_num,

        SUM(
            CASE
                WHEN ISNULL(ktp.container_osbd_teus,0) = 0
                THEN 0
                ELSE bf.qty * 1.0 / ktp.container_osbd_teus
            END
        ) AS osbd_den,

        CASE
            WHEN SUM(
                CASE
                    WHEN ISNULL(ktp.container_osbd_teus,0) = 0
                    THEN 0
                    ELSE bf.qty * 1.0 / ktp.container_osbd_teus
                END
            ) = 0
            THEN NULL
            ELSE
                SUM(bf.qty)
                /
                SUM(
                    CASE
                        WHEN ISNULL(ktp.container_osbd_teus,0) = 0
                        THEN 0
                        ELSE bf.qty * 1.0 / ktp.container_osbd_teus
                    END
                )
        END AS osbd_container_teu

    FROM base_filter_full bf
    INNER JOIN tbl_kpi_time_performance ktp
        ON ktp.organisation_id = bf.organisation_id
        AND ktp.month = bf.month
        AND REPLACE(ktp.fiscal_year,' ','') = bf.fiscal_year
    GROUP BY
        bf.organisation_id,
        REPLACE(bf.fiscal_year,' ','')
),


        
        kpi_base_ytd AS (
            SELECT
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','') AS fiscal_year,

                SUM(total_sailed_vessel_handled) AS total_sailed_vessel_handled,
                SUM(break_bulk_vessel_handled) AS break_bulk_vessel_handled,
                SUM(container_vessel_handled) AS container_vessel_handled,
                SUM(dry_bulk_vessel_handled) AS dry_bulk_vessel_handled,
                SUM(liquid_bulk_vessel_handled) AS liquid_bulk_vessel_handled,


                   /* average_idle_time */

                SUM(ktp.average_dry_bulk_idle_time * ktp.dry_bulk_vessel_handled)
                    AS avg_idle_num_dry,

                SUM(ktp.average_break_bulk_idle_time * ktp.break_bulk_vessel_handled)
                    AS avg_idle_num_break,

                SUM(ktp.average_liquid_bulk_idle_time * ktp.liquid_bulk_vessel_handled)
                AS avg_idle_num_liquid,

                SUM(ktp.overall_average_idle_time * ktp.total_sailed_vessel_handled)
                    AS avg_idle_num_total,

                SUM(ktp.average_container_idle_time * ktp.container_vessel_handled)
                    AS avg_idle_num_container,


                SUM(ktp.dry_bulk_vessel_handled)
                    AS avg_idle_den_dry,

                SUM(ktp.break_bulk_vessel_handled)
                    AS avg_idle_den_break,

                SUM(ktp.liquid_bulk_vessel_handled)
                    AS avg_idle_den_liquid,

                SUM(ktp.container_vessel_handled)
                    AS avg_idle_den_container,

                SUM(ktp.total_sailed_vessel_handled)
                   AS avg_idle_den_total,

                  /* Average Container TRT - Call Size   */
         
                SUM(ktp.avg_container_trt_less_than_251 * ktp.vessel_container_less_than_251)
                    AS avg_trt_callsize_less_than_251_num,

                SUM(ktp.avg_container_trt_251_to_500 * ktp.vessel_container_251_to_500)
                    AS avg_trt_callsize_51_to_500_num,

                SUM(ktp.avg_container_trt_501_to_1000 * ktp.vessel_container_501_to_1000)
                AS avg_trt_callsize_501_to_1000_num,

                SUM(ktp.avg_container_trt_1001_to_1500 * ktp.vessel_container_1001_to_1500)
                    AS avg_trt_callsize_1001_to_1500_num,

                SUM(ktp.avg_container_trt_1501_to_2000 * ktp.vessel_container_1501_to_2000)
                    AS avg_trt_callsize_1501_to_2000_num,
                    
                SUM(ktp.avg_container_trt_2001_to_2500 * ktp.vessel_container_2001_to_2500)
                    AS avg_trt_callsize_2001_to_2500_num,

                 SUM(ktp.avg_container_trt_2501_to_3000 * ktp.vessel_container_2501_to_3000)
                    AS avg_trt_callsize_2501_to_3000_num,

                 SUM(ktp.avg_container_trt_3001_to_4000 * ktp.vessel_container_3001_to_4000)
                    AS avg_trt_callsize_3001_to_4000_num,

                 SUM(ktp.avg_container_trt_4001_to_6000 * ktp.vessel_container_4001_to_6000)
                    AS avg_trt_callsize_4001_to_6000_num,

                 SUM(ktp.avg_container_trt_greater_than_6000 * ktp.vessel_container_greater_than_6000)
                    AS avg_trt_callsize_greater_than_6000_num,


                SUM(ktp.vessel_container_less_than_251)
                    AS avg_trt_callsize_less_than_251_den,

                SUM(ktp.vessel_container_251_to_500)
                    AS avg_trt_callsize_51_to_500_den,

                SUM(ktp.vessel_container_501_to_1000)
                    AS avg_trt_callsize_501_to_1000_den,

                SUM(ktp.vessel_container_1001_to_1500)
                   AS avg_trt_callsize_1001_to_1500_den,

                SUM(ktp.vessel_container_1501_to_2000)
                    AS avg_trt_callsize_1501_to_2000_den,

                SUM(ktp.vessel_container_2001_to_2500)
                    AS avg_trt_callsize_2001_to_2500_den,

                SUM(ktp.vessel_container_2501_to_3000)
                    AS avg_trt_callsize_2501_to_3000_den,

                SUM(ktp.vessel_container_3001_to_4000)
                    AS avg_trt_callsize_3001_to_4000_den,

                SUM(ktp.vessel_container_4001_to_6000)
                    AS avg_trt_callsize_4001_to_6000_den,

                SUM(ktp.vessel_container_greater_than_6000)
                AS avg_trt_callsize_greater_than_6000_den,


                 /* pre_birth_waiting_port */

                SUM(ktp.average_dry_bulk_waiting_time_port * ktp.dry_bulk_vessel_handled)
                    AS avg_pre_birth_waiting_port_dry,

                SUM(ktp.average_break_bulk_waiting_time_port * ktp.break_bulk_vessel_handled)
                    AS avg_pre_birth_waiting_port_break,

                SUM(ktp.average_liquid_bulk_waiting_time_port * ktp.liquid_bulk_vessel_handled)
                AS avg_pre_birth_waiting_port_liquid,

                SUM(ktp.overall_waiting_time_port * ktp.total_sailed_vessel_handled)
                    AS avg_pre_birth_waiting_port_total,

                SUM(ktp.average_container_waiting_time_port * ktp.container_vessel_handled)
                    AS avg_pre_birth_waiting_port_container,

                     /* pre_birth_waiting_non-port */
                

                SUM(ktp.average_dry_bulk_waiting_time_non_port * ktp.dry_bulk_vessel_handled)
                AS avg_pre_birth_waiting_non_port_dry,

                SUM(ktp.average_break_bulk_waiting_time_non_port * ktp.break_bulk_vessel_handled)
                    AS avg_pre_birth_waiting_non_port_break,

                SUM(ktp.average_liquid_bulk_waiting_time_non_port * ktp.liquid_bulk_vessel_handled)
                AS avg_pre_birth_waiting_non_port_liquid,

                SUM(ktp.overall_waiting_time_non_port * ktp.total_sailed_vessel_handled)
                    AS avg_pre_birth_waiting_non_port_total,

                SUM(ktp.average_container_waiting_time_non_port * ktp.container_vessel_handled)
                    AS avg_pre_birth_waiting_non_port_container,


                   /* parcel_size */     
          
                SUM(ktp.dry_bulk_cargo_handled * 1000000)
                    AS avg_parcel_size_dry_num,

                SUM(ktp.break_bulk_cargo_handled * 1000000)
                    AS avg_parcel_size_break_num,

                SUM(ktp.liquid_bulk_cargo_handled * 1000000)
                    AS avg_parcel_size_liquid_num,

                SUM(ktp.total_cargo_handled * 1000000)
                    AS avg_parcel_size_total_num,

                SUM(ktp.container_cargo_handled * 1000000)
                    AS avg_parcel_size_container_num,

                SUM(ktp.dry_bulk_cargo_handled)
                    AS osbd_dry_num,

                SUM(
                    NULLIF(ktp.dry_bulk_cargo_handled,0) /
                    NULLIF(ktp.dry_bulk_osbd,0)
                ) AS osbd_dry_den,

                SUM(ktp.break_bulk_cargo_handled)
                    AS osbd_break_num,

                SUM(
                    NULLIF(ktp.break_bulk_cargo_handled,0) /
                    NULLIF(ktp.break_bulk_osbd,0)
                ) AS osbd_break_den,

                SUM(ktp.liquid_bulk_cargo_handled)
                    AS osbd_liquid_num,

                SUM(
                    NULLIF(ktp.liquid_bulk_cargo_handled,0) /
                    NULLIF(ktp.liquid_bulk_osbd,0)
                ) AS osbd_liquid_den,

                SUM(ktp.container_cargo_handled)
                    AS osbd_container_num,

                SUM(
                    NULLIF(ktp.container_cargo_handled,0) /
                    NULLIF(ktp.container_osbd,0)
                ) AS osbd_container_den

            FROM tbl_kpi_time_performance ktp
            INNER JOIN base_filter_ytd bf
                ON bf.organisation_id = ktp.organisation_id
                AND bf.month = ktp.month
                AND bf.fiscal_year =
                    REPLACE(ktp.fiscal_year,' ','')

            GROUP BY
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','')
        ),

        kpi_base_full AS (
        SELECT
              ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','') AS fiscal_year,
                SUM(total_sailed_vessel_handled) AS total_sailed_vessel_handled,
                SUM(break_bulk_vessel_handled) AS break_bulk_vessel_handled,
                SUM(container_vessel_handled) AS container_vessel_handled,
                SUM(dry_bulk_vessel_handled) AS dry_bulk_vessel_handled,
                SUM(liquid_bulk_vessel_handled) AS liquid_bulk_vessel_handled,


                   /* average_idle_time */

                SUM(ktp.average_dry_bulk_idle_time * ktp.dry_bulk_vessel_handled)
                    AS avg_idle_num_dry,

                SUM(ktp.average_break_bulk_idle_time * ktp.break_bulk_vessel_handled)
                    AS avg_idle_num_break,

                SUM(ktp.average_liquid_bulk_idle_time * ktp.liquid_bulk_vessel_handled)
                AS avg_idle_num_liquid,

                SUM(ktp.overall_average_idle_time * ktp.total_sailed_vessel_handled)
                    AS avg_idle_num_total,

                SUM(ktp.average_container_idle_time * ktp.container_vessel_handled)
                    AS avg_idle_num_container,


                SUM(ktp.dry_bulk_vessel_handled)
                    AS avg_idle_den_dry,

                SUM(ktp.break_bulk_vessel_handled)
                    AS avg_idle_den_break,

                SUM(ktp.liquid_bulk_vessel_handled)
                    AS avg_idle_den_liquid,

                SUM(ktp.container_vessel_handled)
                    AS avg_idle_den_container,

                SUM(ktp.total_sailed_vessel_handled)
                   AS avg_idle_den_total,



                  /* Average Container TRT - Call Size   */

                   
                SUM(ktp.avg_container_trt_less_than_251 * ktp.vessel_container_less_than_251)
                    AS avg_trt_callsize_less_than_251_num,

                SUM(ktp.avg_container_trt_251_to_500 * ktp.vessel_container_251_to_500)
                    AS avg_trt_callsize_51_to_500_num,

                SUM(ktp.avg_container_trt_501_to_1000 * ktp.vessel_container_501_to_1000)
                AS avg_trt_callsize_501_to_1000_num,

                SUM(ktp.avg_container_trt_1001_to_1500 * ktp.vessel_container_1001_to_1500)
                    AS avg_trt_callsize_1001_to_1500_num,

                SUM(ktp.avg_container_trt_1501_to_2000 * ktp.vessel_container_1501_to_2000)
                    AS avg_trt_callsize_1501_to_2000_num,
                    
                SUM(ktp.avg_container_trt_2001_to_2500 * ktp.vessel_container_2001_to_2500)
                    AS avg_trt_callsize_2001_to_2500_num,

                 SUM(ktp.avg_container_trt_2501_to_3000 * ktp.vessel_container_2501_to_3000)
                    AS avg_trt_callsize_2501_to_3000_num,

                 SUM(ktp.avg_container_trt_3001_to_4000 * ktp.vessel_container_3001_to_4000)
                    AS avg_trt_callsize_3001_to_4000_num,

                 SUM(ktp.avg_container_trt_4001_to_6000 * ktp.vessel_container_4001_to_6000)
                    AS avg_trt_callsize_4001_to_6000_num,

                 SUM(ktp.avg_container_trt_greater_than_6000 * ktp.vessel_container_greater_than_6000)
                    AS avg_trt_callsize_greater_than_6000_num,


                SUM(ktp.vessel_container_less_than_251)
                    AS avg_trt_callsize_less_than_251_den,

                SUM(ktp.vessel_container_251_to_500)
                    AS avg_trt_callsize_51_to_500_den,

                SUM(ktp.vessel_container_501_to_1000)
                    AS avg_trt_callsize_501_to_1000_den,

                SUM(ktp.vessel_container_1001_to_1500)
                   AS avg_trt_callsize_1001_to_1500_den,

                SUM(ktp.vessel_container_1501_to_2000)
                    AS avg_trt_callsize_1501_to_2000_den,

                SUM(ktp.vessel_container_2001_to_2500)
                    AS avg_trt_callsize_2001_to_2500_den,

                SUM(ktp.vessel_container_2501_to_3000)
                    AS avg_trt_callsize_2501_to_3000_den,

                SUM(ktp.vessel_container_3001_to_4000)
                    AS avg_trt_callsize_3001_to_4000_den,

                SUM(ktp.vessel_container_4001_to_6000)
                    AS avg_trt_callsize_4001_to_6000_den,

                SUM(ktp.vessel_container_greater_than_6000)
                AS avg_trt_callsize_greater_than_6000_den,


                 /* pre_birth_waiting_port */

                SUM(ktp.average_dry_bulk_waiting_time_port * ktp.dry_bulk_vessel_handled)
                    AS avg_pre_birth_waiting_port_dry,

                SUM(ktp.average_break_bulk_waiting_time_port * ktp.break_bulk_vessel_handled)
                    AS avg_pre_birth_waiting_port_break,

                SUM(ktp.average_liquid_bulk_waiting_time_port * ktp.liquid_bulk_vessel_handled)
                AS avg_pre_birth_waiting_port_liquid,

                SUM(ktp.overall_waiting_time_port * ktp.total_sailed_vessel_handled)
                    AS avg_pre_birth_waiting_port_total,

                SUM(ktp.average_container_waiting_time_port * ktp.container_vessel_handled)
                    AS avg_pre_birth_waiting_port_container,

                     /* pre_birth_waiting_non-port */
                

                SUM(ktp.average_dry_bulk_waiting_time_non_port * ktp.dry_bulk_vessel_handled)
                AS avg_pre_birth_waiting_non_port_dry,

                SUM(ktp.average_break_bulk_waiting_time_non_port * ktp.break_bulk_vessel_handled)
                    AS avg_pre_birth_waiting_non_port_break,

                SUM(ktp.average_liquid_bulk_waiting_time_non_port * ktp.liquid_bulk_vessel_handled)
                AS avg_pre_birth_waiting_non_port_liquid,

                SUM(ktp.overall_waiting_time_non_port * ktp.total_sailed_vessel_handled)
                    AS avg_pre_birth_waiting_non_port_total,

                SUM(ktp.average_container_waiting_time_non_port * ktp.container_vessel_handled)
                    AS avg_pre_birth_waiting_non_port_container,


                   /* parcel_size */     
          
                SUM(ktp.dry_bulk_cargo_handled * 1000000)
                    AS avg_parcel_size_dry_num,

                SUM(ktp.break_bulk_cargo_handled * 1000000)
                    AS avg_parcel_size_break_num,

                SUM(ktp.liquid_bulk_cargo_handled * 1000000)
                    AS avg_parcel_size_liquid_num,

                SUM(ktp.total_cargo_handled * 1000000)
                    AS avg_parcel_size_total_num,

                SUM(ktp.container_cargo_handled * 1000000)
                    AS avg_parcel_size_container_num


            FROM tbl_kpi_time_performance ktp
            INNER JOIN base_filter_full bf
                ON bf.organisation_id = ktp.organisation_id
                AND bf.fiscal_year =  REPLACE(ktp.fiscal_year,' ','')
                AND (bf.month = ktp.month OR ktp.month = 3)
            GROUP BY
                ktp.organisation_id,
                REPLACE(ktp.fiscal_year,' ','')
        ),

        base_ytd AS (
            SELECT

            org.organisation_id,
            fy.fiscal_year,
            t.osbd_container_teu,
            t.osbd_num,
            t.osbd_den,
            k.total_sailed_vessel_handled,
            k.break_bulk_vessel_handled,
            k.container_vessel_handled,
            k.liquid_bulk_vessel_handled,
            k.dry_bulk_vessel_handled,

            k.avg_idle_num_dry,
            k.avg_idle_num_break,
            k.avg_idle_num_liquid,
            k.avg_idle_num_total,
            K.avg_idle_num_container,

            k.avg_idle_den_dry,
            k.avg_idle_den_break,
            k.avg_idle_den_liquid,
            k.avg_idle_den_container,
            K.avg_idle_den_total,

            k.avg_trt_callsize_less_than_251_num,
            k.avg_trt_callsize_51_to_500_num,

         k.avg_trt_callsize_501_to_1000_num,
            k.avg_trt_callsize_1001_to_1500_num,
            k.avg_trt_callsize_1501_to_2000_num,
            k.avg_trt_callsize_2001_to_2500_num,
            k.avg_trt_callsize_2501_to_3000_num,
            k.avg_trt_callsize_3001_to_4000_num,
            K.avg_trt_callsize_4001_to_6000_num,
            K.avg_trt_callsize_greater_than_6000_num,
            K.avg_trt_callsize_less_than_251_den,
            K.avg_trt_callsize_51_to_500_den,
            k.avg_trt_callsize_501_to_1000_den,
            k.avg_trt_callsize_1001_to_1500_den,
            k.avg_trt_callsize_1501_to_2000_den,
            k.avg_trt_callsize_2001_to_2500_den,
            k.avg_trt_callsize_2501_to_3000_den,
            k.avg_trt_callsize_3001_to_4000_den,
            k.avg_trt_callsize_4001_to_6000_den,
            k.avg_trt_callsize_greater_than_6000_den,

            k.avg_pre_birth_waiting_port_dry,
            k.avg_pre_birth_waiting_port_break,
            k.avg_pre_birth_waiting_port_liquid,
            k.avg_pre_birth_waiting_port_total,
            k.avg_pre_birth_waiting_port_container,

            k.avg_pre_birth_waiting_non_port_dry,
            k.avg_pre_birth_waiting_non_port_break,
            k.avg_pre_birth_waiting_non_port_liquid,
            k.avg_pre_birth_waiting_non_port_total,
            k.avg_pre_birth_waiting_non_port_container,


            k.avg_parcel_size_dry_num,
            k.avg_parcel_size_break_num,
            k.avg_parcel_size_liquid_num,
            k.avg_parcel_size_total_num,
            k.avg_parcel_size_container_num



            FROM (
                SELECT DISTINCT organisation_id
                FROM base_filter_ytd
            ) org

            CROSS JOIN (
                SELECT REPLACE(@currentFY,' ','') AS fiscal_year
                UNION ALL
                SELECT REPLACE(@lastFY,' ','')
            ) fy

            LEFT JOIN traffic_ytd t
                ON t.organisation_id = org.organisation_id
                AND t.fiscal_year = fy.fiscal_year

            LEFT JOIN kpi_base_ytd k
                ON k.organisation_id = org.organisation_id
                AND k.fiscal_year = fy.fiscal_year
        ),

        base_full AS (
            SELECT
                org.organisation_id,
                fy.fiscal_year,

            t.osbd_container_teu,   
            t.osbd_num,
            t.osbd_den, 
            k.total_sailed_vessel_handled,
            k.break_bulk_vessel_handled,
            k.container_vessel_handled,
            k.liquid_bulk_vessel_handled,
            k.dry_bulk_vessel_handled,
            
            k.avg_idle_num_dry,
            k.avg_idle_num_break,
            k.avg_idle_num_liquid,
            k.avg_idle_num_total,
            K.avg_idle_num_container,

            k.avg_idle_den_dry,
            k.avg_idle_den_break,
            k.avg_idle_den_liquid,
            k.avg_idle_den_container,
            K.avg_idle_den_total,

            k.avg_trt_callsize_less_than_251_num,
            k.avg_trt_callsize_51_to_500_num,

            k.avg_trt_callsize_501_to_1000_num,
            k.avg_trt_callsize_1001_to_1500_num,

            k.avg_trt_callsize_1501_to_2000_num,
            k.avg_trt_callsize_2001_to_2500_num,

            k.avg_trt_callsize_2501_to_3000_num,
            k.avg_trt_callsize_3001_to_4000_num,

            K.avg_trt_callsize_4001_to_6000_num,
            K.avg_trt_callsize_greater_than_6000_num,


            K.avg_trt_callsize_less_than_251_den,
            K.avg_trt_callsize_51_to_500_den,
            k.avg_trt_callsize_501_to_1000_den,
            k.avg_trt_callsize_1001_to_1500_den,
            k.avg_trt_callsize_1501_to_2000_den,
            k.avg_trt_callsize_2001_to_2500_den,
            k.avg_trt_callsize_2501_to_3000_den,
            k.avg_trt_callsize_3001_to_4000_den,
            k.avg_trt_callsize_4001_to_6000_den,
            k.avg_trt_callsize_greater_than_6000_den,

            k.avg_pre_birth_waiting_port_dry,
            k.avg_pre_birth_waiting_port_break,
            k.avg_pre_birth_waiting_port_liquid,
            k.avg_pre_birth_waiting_port_total,
            k.avg_pre_birth_waiting_port_container,

            k.avg_pre_birth_waiting_non_port_dry,
            k.avg_pre_birth_waiting_non_port_break,
            k.avg_pre_birth_waiting_non_port_liquid,
            k.avg_pre_birth_waiting_non_port_total,
            k.avg_pre_birth_waiting_non_port_container,


            k.avg_parcel_size_dry_num,
            k.avg_parcel_size_break_num,
            k.avg_parcel_size_liquid_num,
            k.avg_parcel_size_total_num,
            k.avg_parcel_size_container_num


            FROM (
                SELECT DISTINCT organisation_id
                FROM base_filter_full
            ) org

            CROSS JOIN (
                SELECT REPLACE(@lastFY,' ','') AS fiscal_year
            ) fy

            LEFT JOIN traffic_full t
                ON t.organisation_id = org.organisation_id
                AND t.fiscal_year = fy.fiscal_year

            LEFT JOIN kpi_base_full k
                ON k.organisation_id = org.organisation_id
                AND k.fiscal_year = fy.fiscal_year
        ),

        current_ytd AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','')
            GROUP BY organisation_id
        ),

        last_ytd AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            GROUP BY organisation_id
        ),

        last_full AS (
            SELECT
                organisation_id,
                ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
            GROUP BY organisation_id
        ),
          /* ================= SMPA ================= */
        smpa_current AS (
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','') AND organisation_id IN (54,55)
        ),
        smpa_last AS (
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','') AND organisation_id IN (54,55)
        ),
        smpa_full AS (
            SELECT ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','') AND organisation_id IN (54,55)
        ),

        /* ================= OVERALL ================= */
        overall_current AS (
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@currentFY,' ','')
        ),
        overall_last AS (
            SELECT ${kpiFormula} AS value
            FROM base_ytd
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
        ),
        overall_full AS (
            SELECT ${kpiFormula} AS value
            FROM base_full
            WHERE fiscal_year = REPLACE(@lastFY,' ','')
        )

        SELECT
            org.organisation_id,
            org.organisation_name,  
            CASE
                WHEN '${kpi}' LIKE 'osbd%'
                THEN CAST(ROUND(ISNULL(lf.value,0),0) AS INT)
                ELSE ROUND(ISNULL(lf.value,0),2)
            END AS achievement_for_last_FY,

            CASE
                WHEN '${kpi}' LIKE 'osbd%'
                THEN CAST(ROUND(ISNULL(cy.value,0),0) AS INT)
                ELSE ROUND(ISNULL(cy.value,0),2)
            END AS current_fy_ytd,

            CASE
                WHEN '${kpi}' LIKE 'osbd%'
                THEN CAST(ROUND(ISNULL(ly.value,0),0) AS INT)
                ELSE ROUND(ISNULL(ly.value,0),2)
            END AS last_fy_ytd,

            ROUND(
                (ISNULL(cy.value,0) - ISNULL(ly.value,0))
                * 100.0 /
                NULLIF(ly.value,0),
                2
            ) AS yoy

        FROM mmt_organisation org

        LEFT JOIN current_ytd cy
            ON cy.organisation_id = org.organisation_id

        LEFT JOIN last_ytd ly
            ON ly.organisation_id = org.organisation_id

        LEFT JOIN last_full lf
            ON lf.organisation_id = org.organisation_id

        WHERE org.organisation_id IN (${orgParams})

         UNION ALL

        SELECT
            NULL, 'SMPA Total',
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ISNULL(sf.value,0) AS INT)
                 ELSE ROUND(ISNULL(sf.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ISNULL(sc.value,0) AS INT)
                 ELSE ROUND(ISNULL(sc.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ISNULL(sl.value,0) AS INT)
                 ELSE ROUND(ISNULL(sl.value,0),2) END,
            ROUND((ISNULL(sc.value,0) - ISNULL(sl.value,0)) * 100.0 / NULLIF(sl.value,0), 2)
        FROM smpa_current sc CROSS JOIN smpa_last sl CROSS JOIN smpa_full sf

        UNION ALL

        SELECT
            NULL, 'Overall Total',
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ROUND(ISNULL(ofu.value,0),0) AS INT)
                ELSE ROUND(ISNULL(ofu.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ROUND(ISNULL(oc.value,0),0) AS INT)
                ELSE ROUND(ISNULL(oc.value,0),2) END,
            CASE WHEN '${kpi}' LIKE 'osbd%' THEN CAST(ROUND(ISNULL(ol.value,0),0) AS INT)
                ELSE ROUND(ISNULL(ol.value,0),2) END,
            ROUND((ISNULL(oc.value,0) - ISNULL(ol.value,0)) * 100.0 / NULLIF(ol.value,0), 2)
        FROM overall_current oc CROSS JOIN overall_last ol CROSS JOIN overall_full ofu
                ORDER BY organisation_name;


        `;

        const result = await request.query(query);

        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching KPI dashboard data");
    }
}

const TrafficTab = {
    getFiscalYearTargetData, submitFiscalYearTargetData, getFiscalYearTargetList, updateFiscalYearTargetData, getCommoditiesByGroup, submitCommodityData, getCommodityData,
    getMonthTrafficTrendData, getYearTrafficTrendData, getTrafficActualData, getTrafficCommodityGroup, getTrafficCommodities,
    getKPITrafficDashboard,getTopPerformingPorts,getLeastPerformingPorts,detailedKPITrafficCardDashboard,getrorotrafficData,
    detailedKPICargoCardDashboard,getKPICargoDashboard,getAllTrafficDashboardKPIs,detailedAllTrafficDashboardKPIs
};

export default TrafficTab;

