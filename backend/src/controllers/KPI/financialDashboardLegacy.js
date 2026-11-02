/**
 * KPI Major Ports — Financial dashboard queries, copied verbatim from the earlier portal's
 * backend (sagarmanthanBackend src/controllers/KPI/financialParameter.js) so every number matches it.
 * Do not edit the SQL here; fix it in one place and re-copy if the earlier portal changes.
 *
 * These handlers expect the earlier portal's request shape (req.params / req.query).
 * They are only reached through financialDashboardAccess.js, which adds login,
 * KPI_MAJOR_PORTS read permission, input validation (including the KPI column whitelist)
 * and the organisation-scope rule before calling them.
 */
/* eslint-disable */
import { pool } from "../../db.js";

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

async function getKPIFinancialDashboard(req, res) {
    try {
        const organisationID = parseInt(req.params.organisationID) || 0;
        const fyParam = req.params.fy && req.params.fy !== "all" ? req.params.fy : null;
        const monthsParam = req.params.months && req.params.months !== "all" ? req.params.months.split(",").map(Number) : null;

        const conn = await pool;
        const request = conn.request();

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

        monthsList.forEach((m, i) => {
            request.input(`month${i}`, m);
        });

        const monthParamList = monthsList
            .map((_, i) => `@month${i}`)
            .join(",");


        const GROUP_ORG_MAP = { 4: [54, 55],};
    
        const allOrgs = [1,2,3,4,5,6,7,8,9,10,11,12,54,55];

        const orgFilter = GROUP_ORG_MAP[organisationID] ? GROUP_ORG_MAP[organisationID] : (organisationID ? [organisationID] : allOrgs);
        orgFilter.forEach((id, i) => request.input(`org${i}`, id));
        const orgParamList = orgFilter.map((_, i) => `@org${i}`).join(',');

        const query = `
        WITH finance_agg AS (
            SELECT
                f.organisation_id,

                CASE 
                    WHEN f.month >= 4 
                        THEN CONCAT(f.year, '-', f.year + 1)
                    ELSE CONCAT(f.year - 1, '-', f.year)
                END AS fiscal_year,

                SUM(f.operating_income) AS operating_income,
                SUM(f.operating_expenditure) AS operating_expenditure,
                SUM(f.total_income) AS total_income,
                SUM(f.total_expenditure) AS total_expenditure,
                SUM(f.operating_surplus) AS operating_surplus,
                SUM(f.net_surplus) AS net_surplus,
                AVG(f.operating_ratio) AS operating_ratio,
                SUM(f.per_tonne_handling_cost) AS per_tonne_handling_cost

            FROM tbl_financial_parameter f
            WHERE f.organisation_id IN (${orgParamList})
              AND f.month IN (${monthParamList})

              AND (
                  CASE 
                      WHEN f.month >= 4 
                          THEN CONCAT(f.year, '-', f.year + 1)
                      ELSE CONCAT(f.year - 1, '-', f.year)
                  END
              ) IN (@currentFY, @lastFY)

            GROUP BY 
                f.organisation_id,
                CASE 
                    WHEN f.month >= 4 
                        THEN CONCAT(f.year, '-', f.year + 1)
                    ELSE CONCAT(f.year - 1, '-', f.year)
                END
        )

        SELECT

        -- ================= OPERATING INCOME =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN operating_income ELSE 0 END) AS op_income_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN operating_income ELSE 0 END) AS op_income_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN operating_income ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN operating_income ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN operating_income ELSE 0 END), 0),
        0) AS op_income_yoy,

        -- ================= OPERATING EXPENDITURE =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN operating_expenditure ELSE 0 END) AS operating_expenditure_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN operating_expenditure ELSE 0 END) AS operating_expenditure_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN operating_expenditure ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN operating_expenditure ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN operating_expenditure ELSE 0 END), 0),
        0) AS operating_expenditure_yoy,

        -- ================= TOTAL INCOME =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN total_income ELSE 0 END) AS total_income_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN total_income ELSE 0 END) AS total_income_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_income ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN total_income ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN total_income ELSE 0 END), 0),
        0) AS total_income_yoy,

        -- ================= TOTAL EXPENDITURE =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN total_expenditure ELSE 0 END) AS total_expenditure_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN total_expenditure ELSE 0 END) AS total_expenditure_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN total_expenditure ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN total_expenditure ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN total_expenditure ELSE 0 END), 0),
        0) AS total_expenditure_yoy,

        -- ================= OPERATING SURPLUS =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN operating_surplus ELSE 0 END) AS operating_surplus_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN operating_surplus ELSE 0 END) AS operating_surplus_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN operating_surplus ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN operating_surplus ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN operating_surplus ELSE 0 END), 0),
        0) AS operating_surplus_yoy,

        -- ================= NET SURPLUS =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN net_surplus ELSE 0 END) AS net_surplus_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN net_surplus ELSE 0 END) AS net_surplus_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN net_surplus ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN net_surplus ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN net_surplus ELSE 0 END), 0),
        0) AS net_surplus_yoy,

        -- ================= OPERATING RATIO =================
        ROUND(AVG(CASE WHEN fiscal_year = @currentFY THEN operating_ratio END), 2) AS op_ratio_current,
        ROUND(AVG(CASE WHEN fiscal_year = @lastFY THEN operating_ratio END), 2) AS op_ratio_last,

        COALESCE(
            ROUND(
                (
                    AVG(CASE WHEN fiscal_year = @currentFY THEN operating_ratio END) -
                    AVG(CASE WHEN fiscal_year = @lastFY THEN operating_ratio END)
                ) * 100.0 /
                NULLIF(AVG(CASE WHEN fiscal_year = @lastFY THEN operating_ratio END), 0),
            2),
        0) AS op_ratio_yoy,

        -- ================= PER TONNE COST =================
        SUM(CASE WHEN fiscal_year = @currentFY THEN per_tonne_handling_cost ELSE 0 END) AS per_tonne_handling_cost_current,
        SUM(CASE WHEN fiscal_year = @lastFY THEN per_tonne_handling_cost ELSE 0 END) AS per_tonne_handling_cost_last,
        COALESCE(
            (
                SUM(CASE WHEN fiscal_year = @currentFY THEN per_tonne_handling_cost ELSE 0 END) -
                SUM(CASE WHEN fiscal_year = @lastFY THEN per_tonne_handling_cost ELSE 0 END)
            ) * 100.0 /
            NULLIF(SUM(CASE WHEN fiscal_year = @lastFY THEN per_tonne_handling_cost ELSE 0 END), 0),
        0) AS per_tonne_handling_cost_yoy

        FROM finance_agg;
        `;

        const result = await request.query(query);

        return res.status(200).json(result.recordset[0]);

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "Error fetching data." });
    }
}

async function detailedKPIFinancialCardDashboard(req, res) {
    try {
        const conn = await pool;
        const request = conn.request();

        const organisationID = parseInt(req.query.organisationID) || 0;
        const fyParam = req.query.fy && req.query.fy !== "all" ? req.query.fy : null;
        const monthsParam = req.query.months && req.query.months !== "all"
            ? req.query.months.split(",").map(Number)
            : null;
        const kpi = req.query.kpi || "operating_income";

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

        function getFYMonths() {
            if (monthsParam && monthsParam.length) return monthsParam;

            const today = new Date();
            let currentMonth = today.getMonth() + 1;

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

        const ytdMonths = getFYMonths();
        const fullMonths = [1,2,3,4,5,6,7,8,9,10,11,12];

        ytdMonths.forEach((m, i) => request.input(`ytd${i}`, m));
        fullMonths.forEach((m, i) => request.input(`full${i}`, m));

        const ytdParams = ytdMonths.map((_, i) => `@ytd${i}`).join(",");
        const fullParams = fullMonths.map((_, i) => `@full${i}`).join(",");

        // ---- Same organisation (includes org 4) ----
         const GROUP_ORG_MAP = { 4: [54, 55], };

        /* ================= ORGS ================= */
        const allOrgs = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12, 54, 55];

        const orgFilter = GROUP_ORG_MAP[organisationID]
            ? GROUP_ORG_MAP[organisationID]
            : (organisationID ? [organisationID] : allOrgs);

        orgFilter.forEach((id, i) => request.input(`org${i}`, id));

        const orgParams = orgFilter.map((_, i) => `@org${i}`).join(",");

        const kpiColumn = kpi;

        // operating_ratio is a percentage -> average it; everything else -> sum it
        const aggFn = kpiColumn === "operating_ratio" ? "AVG" : "SUM";

        const query = `
        WITH base AS (
            SELECT
                f.organisation_id,
                f.month,
                f.year,
                CASE
                    WHEN f.month >= 4 THEN CONCAT(f.year, '-', f.year + 1)
                    ELSE CONCAT(f.year - 1, '-', f.year)
                END AS fiscal_year,
                f.${kpiColumn} AS value
            FROM tbl_financial_parameter f
            WHERE f.organisation_id IN (${orgParams})
        ),

        last_full AS (
            SELECT organisation_id, ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${fullParams})
            GROUP BY organisation_id
        ),

        current_ytd AS (
            SELECT organisation_id, ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @currentFY AND month IN (${ytdParams})
            GROUP BY organisation_id
        ),

        last_ytd AS (
            SELECT organisation_id, ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${ytdParams})
            GROUP BY organisation_id
        ),

        smpa_full AS (
            SELECT ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${fullParams}) AND organisation_id IN (54,55)
        ),

        smpa_current AS (
            SELECT ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @currentFY AND month IN (${ytdParams}) AND organisation_id IN (54,55)
        ),

        smpa_last AS (
            SELECT ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${ytdParams}) AND organisation_id IN (54,55)
        ),

        overall_full AS (
            SELECT ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${fullParams}) AND organisation_id IN (${orgParams})
        ),

        overall_current AS (
            SELECT ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @currentFY AND month IN (${ytdParams}) AND organisation_id IN (${orgParams})
        ),

        overall_last AS (
            SELECT ${aggFn}(value) AS value
            FROM base
            WHERE fiscal_year = @lastFY AND month IN (${ytdParams}) AND organisation_id IN (${orgParams})
        )

        SELECT
            org.organisation_id,
            org.organisation_name,
            ROUND(lf.value,2) AS last_fy_full,
            ROUND(cy.value,2) AS current_fy_ytd,
            ROUND(ly.value,2) AS last_fy_ytd,
            COALESCE(ROUND((cy.value - ly.value) * 100.0 / NULLIF(ly.value,0),2),0) AS yoy_ytd
        FROM mmt_organisation org
        LEFT JOIN last_full lf ON org.organisation_id = lf.organisation_id
        LEFT JOIN current_ytd cy ON org.organisation_id = cy.organisation_id
        LEFT JOIN last_ytd ly ON org.organisation_id = ly.organisation_id
        WHERE org.organisation_id IN (${orgParams})

        UNION ALL

        SELECT
            '' AS organisation_id,
            'SMPA Total' AS organisation_name,
            ROUND(sf.value,2) AS last_fy_full,
            ROUND(sc.value,2) AS current_fy_ytd,
            ROUND(sl.value,2) AS last_fy_ytd,
            COALESCE(ROUND((sc.value - sl.value) * 100.0 / NULLIF(sl.value,0),2),0) AS yoy_ytd
        FROM smpa_current sc
        CROSS JOIN smpa_last sl
        CROSS JOIN smpa_full sf

        UNION ALL

        SELECT
            '' AS organisation_id,
            'Overall Total' AS organisation_name,
            ROUND(ofu.value,2) AS last_fy_full,
            ROUND(oc.value,2) AS current_fy_ytd,
            ROUND(ol.value,2) AS last_fy_ytd,
            COALESCE(ROUND((oc.value - ol.value) * 100.0 / NULLIF(ol.value,0),2),0) AS yoy_ytd
        FROM overall_current oc
        CROSS JOIN overall_last ol
        CROSS JOIN overall_full ofu

        ORDER BY organisation_name;
        `;

        const result = await request.query(query);
        res.json(result.recordset);

    } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching financial KPI data");
    }
}

const FinancialDashboardLegacy = {
    getKPIFinancialDashboard,
    detailedKPIFinancialCardDashboard,
};

export default FinancialDashboardLegacy;
