import { pool } from "../../db.js";

async function getDwellTimeImportCycle_k_1_3_1_Report(req, res) {
    const conn = await pool;
    try {
 
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() is 0-indexed (Jan = 0)
        let prevMonth = currentMonth === 1 ? 12 : currentMonth - 1; // Month number for previous month

        const expectedMonthCount = currentMonth - 4;

        // Determine current fiscal year 
        let currentFiscalYear = currentMonth > 4
            ? `${currentYear}-${currentYear + 1}`
            : `${currentYear - 1}-${currentYear}`;
       
        // Determine last fiscal year
        let lastFiscalYear = currentMonth > 4
            ? `${currentYear - 1}-${currentYear}`
            : `${currentYear - 2}-${currentYear - 1}`;

        const selectedFiscalYear = req.query.financialYear;
        const selectedMonth = parseInt(req.query.month);

        if (selectedFiscalYear && !isNaN(selectedMonth)) {
            const [fyStart] = selectedFiscalYear.split('-').map(Number);
            prevMonth = selectedMonth;
            currentFiscalYear = selectedFiscalYear;
            lastFiscalYear = `${fyStart - 1}-${fyStart}`;
        }
        // --- Define the comprehensive SQL Query with Multiple CTEs ---
        const query = `
        WITH InboundPerMonth AS (
            SELECT
                organisation_id,
                month,
                fiscal_year,
                SUM(value) AS total_loaded
            FROM tbl_traffic_commodity_data
        WHERE direction_id = 2 AND commodity_group_id = 2
        GROUP BY organisation_id, month, fiscal_year
        ),
        LastFiscalYearData AS (
            SELECT
                kpi.organisation_id,
                ROUND(
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
						THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0) /
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
						THEN ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0),
				2) AS lastFiscalZ1,
                ROUND(
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
						THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0) /
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
						THEN ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0),
				2) AS lastFiscalX1,
                ROUND(
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth
						THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0) /
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth
						THEN ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0),
				2) AS lastFiscalY1

            FROM sagarmanthan_revamp.dbo.tbl_kpi_time_performance AS kpi
            INNER JOIN sagarmanthan_revamp.dbo.tbl_traffic_commodity_data AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            JOIN InboundPerMonth ipm
                ON kpi.organisation_id = ipm.organisation_id
                AND kpi.month = ipm.month
                AND kpi.fiscal_year = ipm.fiscal_year
            WHERE kpi.fiscal_year = @lastFiscalYear
            GROUP BY kpi.organisation_id
        ),
        CurrentFiscalYearData AS (
            SELECT
                kpi.organisation_id,
                ROUND(
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
                        THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0) /
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
                        THEN ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0),
                2) AS currentFiscalX2,

                ROUND(
                    NULLIF(SUM(CASE WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth
                        THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
                        ELSE 0 END), 0) /
                    NULLIF(SUM(CASE WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth
                        THEN ISNULL(ipm.total_loaded, 0)
                        ELSE 0 END), 0), 2) AS currentFiscalY2,

                ROUND(
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
                        THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0) /
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
                        THEN ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0),
                2) AS currentFiscalZ2
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] AS kpi
            INNER JOIN
                [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            JOIN InboundPerMonth ipm
                ON kpi.organisation_id = ipm.organisation_id
                AND kpi.month = ipm.month
                AND kpi.fiscal_year = ipm.fiscal_year
            WHERE kpi.fiscal_year = @currentFiscalYear
            GROUP BY kpi.organisation_id
        ),
        MonthlyData AS (
            SELECT
                kpi.organisation_id,
                ROUND(NULLIF(SUM(CASE
                    WHEN kpi.month = @prevMonth AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.month = @prevMonth AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2) AS prevMonthData,

                ROUND(NULLIF(SUM(CASE
                    WHEN kpi.month = 4 AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.month = 4 AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2) AS prevPrevMonthData
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] AS kpi
            INNER JOIN
                [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            WHERE kpi.fiscal_year = @currentFiscalYear
            GROUP BY kpi.organisation_id
        ),
        LastFiscalYearTarget AS (
            SELECT
                kpi.organisation_id,
                ROUND(
                    NULLIF(SUM(ISNULL(kpi.import_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)), 0) /
                    NULLIF(SUM(ISNULL(ipm.total_loaded, 0)), 0),
                2) AS lastFiscalYearTarget
            FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] AS kpi
            INNER JOIN [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.organisation_id = comm.organisation_id
                AND kpi.month = comm.month
            JOIN InboundPerMonth ipm
                ON kpi.organisation_id = ipm.organisation_id
                AND kpi.month = ipm.month
                AND kpi.fiscal_year = ipm.fiscal_year
            WHERE 
                kpi.fiscal_year = @lastFiscalYear 
            GROUP BY kpi.organisation_id
        ),
        CurrentFiscalYearTarget AS (
            SELECT
                tpt.organisation_id,
                ROUND(NULLIF(SUM(tpt.target_value), 0), 2) AS currentFiscalYearTarget
            FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target] tpt
            WHERE tpt.financial_year = @currentFiscalYear
                AND tpt.kpi_type_id = 9
                AND tpt.is_overall = 0
                AND tpt.organisation_id IS NOT NULL
            GROUP BY tpt.organisation_id
        ),
        FinalData AS (
            SELECT
                o.organisation_id,
                o.organisation_name AS port,
                fd_lfy_target.lastFiscalYearTarget,
                fd_cfy_target.currentFiscalYearTarget,
                lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,
                @lastFiscalYear AS lastFiscalYear_header,
                ROUND(CASE
                    WHEN m.prevPrevMonthData > 0
                    THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                    ELSE NULL
                END, 2) AS momGrowth,
                ROUND(CASE
                            WHEN lfy.lastFiscalZ1 > 0
                            THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                            ELSE NULL
                        END, 0) AS yoyGrowth,
                CASE
                    WHEN m.prevPrevMonthData > 0 AND m.prevMonthData IS NOT NULL
                    THEN DENSE_RANK() OVER (
                        ORDER BY ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) DESC
                    )
                    ELSE NULL
                END AS momRanking,
                CASE
                    WHEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) IS NOT NULL
                    THEN DENSE_RANK() OVER (
                        ORDER BY ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) DESC
                    )
                        ELSE NULL
                END AS yoyRanking
            FROM (
                SELECT DISTINCT organisation_id
                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance]
                WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
                UNION
                SELECT DISTINCT organisation_id
                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target]
                WHERE financial_year IN (@lastFiscalYear, @currentFiscalYear)
                    AND kpi_type_id = 9
                    AND organisation_id IS NOT NULL
            ) t
            LEFT JOIN LastFiscalYearData lfy ON t.organisation_id = lfy.organisation_id
            LEFT JOIN CurrentFiscalYearData cfy ON t.organisation_id = cfy.organisation_id
            LEFT JOIN MonthlyData m ON t.organisation_id = m.organisation_id
            LEFT JOIN LastFiscalYearTarget fd_lfy_target ON t.organisation_id = fd_lfy_target.organisation_id
            LEFT JOIN CurrentFiscalYearTarget fd_cfy_target ON t.organisation_id = fd_cfy_target.organisation_id
            LEFT JOIN [sagarmanthan_revamp].[dbo].[mmt_organisation] o ON t.organisation_id = o.organisation_id
            
        ),
        EligibleOrgForLastFiscalZ1 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            AND (
                (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                OR 
                (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
            )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 9
                    ELSE @prevMonth - 3
                END
        ),
        EligibleOrgForLastFiscalX1 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            AND (
                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                OR 
                (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
            )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 8
                    ELSE @prevMonth - 4
                END
        ),
        EligibleOrgForLastFiscalY1 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            AND month = @prevMonth
        ),
        EligibleOrgForCurrentFiscalZ2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
                AND (
                (@prevMonth <= 3 AND month <= @prevMonth)
                OR (@prevMonth > 3 AND month >= 4 AND month <= @prevMonth)
                )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) =
                CASE WHEN @prevMonth <= 3 THEN @prevMonth + 9
                    ELSE @prevMonth - 3 END
        ),
        EligibleOrgForCurrentFiscalX2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND (
                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                OR 
                (@prevMonth > 3 AND month < @prevMonth)
            )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 8
                    ELSE @prevMonth - 4
                END
        ),
        EligibleOrgForCurrentFiscalY2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth
        ),
        EligibleOrgForCurrentFiscalY3 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth - 1
        ),
        EligibleOrgForLastFiscalTarget AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 12
        ),
        TotalData AS (
            SELECT
                'Total' AS port_overall, -- Renamed to avoid ambiguity in final SELECT
                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalX1,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth AND ey.organisation_id IS NOT NULL
                    THEN NULLIF(kpi.import_dwell_time, 0) * NULLIF(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth AND ey.organisation_id IS NOT NULL
                    THEN NULLIF(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalY1,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalZ1,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex2.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex2.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2), 0)AS totalCurrentFiscalX2,
                
                COALESCE(ROUND(NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth AND ey2.organisation_id IS NOT NULL
                THEN NULLIF(kpi.import_dwell_time, 0) * NULLIF(comm.value, 0)
                ELSE 0
            END), 0) / NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth AND ey2.organisation_id IS NOT NULL
                THEN NULLIF(comm.value, 0)
                ELSE 0
            END), 0), 2),0) AS totalCurrentFiscalY2,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez2.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez2.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalCurrentFiscalZ2,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND et.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.import_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND et.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalYearTarget,

                COALESCE(ROUND(NULLIF((SELECT SUM(ISNULL(target_value, 0))
                    FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target] t5
                    WHERE t5.financial_year = @currentFiscalYear
                    AND t5.kpi_type_id = 9
                    AND t5.organisation_id IS NULL
                    AND t5.is_overall = 1), 0), 2),0) AS totalCurrentFiscalYearTarget,

                COALESCE(ROUND(NULLIF((SELECT SUM(ISNULL(target_value, 0))
                    FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target] t5
                    WHERE t5.financial_year = @currentFiscalYear
                    AND t5.kpi_type_id = 9
                    AND t5.organisation_id IS NULL
                    AND t5.is_totalSmpa = 1), 0), 2),0) AS totalsmpaCurrFiscalYearTarget,
            
            ROUND(NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth - 1
                AND ey3.organisation_id IS NOT NULL
                THEN NULLIF(kpi.import_dwell_time, 0) * NULLIF(comm.value, 0)
                ELSE 0
            END), 0) / NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth - 1
                AND ey3.organisation_id IS NOT NULL
                THEN NULLIF(comm.value, 0)
                ELSE 0
            END), 0), 2) AS totalCurrentFiscalY3

            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] kpi
            INNER JOIN
                [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalX1 ex ON kpi.organisation_id = ex.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalY1 ey ON kpi.organisation_id = ey.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalZ1 ez ON kpi.organisation_id = ez.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalX2 ex2 ON kpi.organisation_id = ex2.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalY2 ey2 ON kpi.organisation_id = ey2.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalZ2 ez2 ON kpi.organisation_id = ez2.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalTarget et ON kpi.organisation_id = et.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalY3 ey3 ON kpi.organisation_id = ey3.organisation_id  
            --WHERE kpi.fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
        ),
        -- New CTE to calculate the specific total_smpa row
        SMPA_Total_Row AS (
            SELECT
                ---99 AS organisation_id_sort_key, -- Use a distinct sort key for this row, smaller than any real ID
                NULL AS organisation_id, -- Actual NULL for display
                'Total SMPA' AS port,
                SUM(fd.lastFiscalYearTarget) AS lastFiscalYearTarget,
                SUM(fd.currentFiscalYearTarget) AS currentFiscalYearTarget,
                SUM(fd.lastFiscalX1) AS lastFiscalX1,
                SUM(fd.lastFiscalY1) AS lastFiscalY1,
                SUM(fd.lastFiscalZ1) AS lastFiscalZ1,
                SUM(fd.currentFiscalX2) AS currentFiscalX2,
                SUM(fd.currentFiscalY2) AS currentFiscalY2,
                SUM(fd.currentFiscalZ2) AS currentFiscalZ2,
                NULL AS momGrowth,
                NULL AS yoyGrowth,
                NULL AS momRanking,
                NULL AS yoyRanking,
                NULL AS totalLastFiscalZ1,
                NULL AS totalLastFiscalX1,
                NULL AS totalCurrentFiscalX2,
                NULL AS totalLastFiscalY1,
                NULL AS totalCurrentFiscalY2,
                NULL AS totalCurrentFiscalZ2,
                NULL AS totalLastFiscalYearTarget,
                NULL AS totalCurrentFiscalYearTarget,
                NULL AS totalsmpaCurrFiscalYearTarget,
                NULL AS momGrowthTotal,
                NULL AS yoyGrowthTotal
            FROM FinalData fd
            WHERE fd.organisation_id IN (54, 55)
        ),
        MainReportData AS ( -- Renamed from MainReport for clarity in the final UNION
            SELECT
                --fd.organisation_id AS organisation_id_sort_key, -- Use actual ID for sorting
                fd.organisation_id,
                fd.port,
                fd.lastFiscalYearTarget,
                fd.currentFiscalYearTarget,
                fd.lastFiscalX1,
                fd.lastFiscalY1,
                fd.lastFiscalZ1,
                fd.currentFiscalX2,
                fd.currentFiscalY2,
                fd.currentFiscalZ2,
                fd.momGrowth,
                fd.yoyGrowth,
                fd.momRanking,
                fd.yoyRanking,
                td.totalLastFiscalZ1,
                td.totalLastFiscalX1,
                td.totalCurrentFiscalX2,
                td.totalLastFiscalY1,
                td.totalCurrentFiscalY2,
                td.totalCurrentFiscalZ2,
                td.totalLastFiscalYearTarget,
                td.totalCurrentFiscalYearTarget,
                td.totalsmpaCurrFiscalYearTarget,
                ROUND(CASE
                        WHEN td.totalCurrentFiscalY3 > 0
                        THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100
                        ELSE NULL
                    END, 0) AS momGrowthTotal,
                ROUND(CASE
                        WHEN td.totalLastFiscalZ1 > 0
                        THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END, 0) AS yoyGrowthTotal
            FROM FinalData fd
            CROSS JOIN TotalData td
            WHERE
                fd.lastFiscalZ1 IS NOT NULL
                OR fd.currentFiscalZ2 IS NOT NULL
                OR fd.lastFiscalYearTarget IS NOT NULL
                OR fd.currentFiscalYearTarget IS NOT NULL
        )
        -- Final combined result
        SELECT
            organisation_id,
            port,
            lastFiscalYearTarget,
            currentFiscalYearTarget,
            lastFiscalX1,
            lastFiscalY1,
            lastFiscalZ1,
            currentFiscalX2,
            currentFiscalY2,
            currentFiscalZ2,
            momGrowth,
            yoyGrowth,
            momRanking,
            yoyRanking,
            totalLastFiscalZ1,
            totalLastFiscalX1,
            totalCurrentFiscalX2,
            totalLastFiscalY1,
            totalCurrentFiscalY2,
            totalCurrentFiscalZ2,
            totalLastFiscalYearTarget,
            totalCurrentFiscalYearTarget,
            totalsmpaCurrFiscalYearTarget,
            momGrowthTotal,
            yoyGrowthTotal
        FROM MainReportData

        UNION ALL

        SELECT
            organisation_id,
            port,
            lastFiscalYearTarget,
            currentFiscalYearTarget,
            lastFiscalX1,
            lastFiscalY1,
            lastFiscalZ1,
            currentFiscalX2,
            currentFiscalY2,
            currentFiscalZ2,
            momGrowth,
            yoyGrowth,
            momRanking,
            yoyRanking,
            totalLastFiscalZ1,
            totalLastFiscalX1,
            totalCurrentFiscalX2,
            totalLastFiscalY1,
            totalCurrentFiscalY2,
            totalCurrentFiscalZ2,
            totalLastFiscalYearTarget,
            totalCurrentFiscalYearTarget,
            totalsmpaCurrFiscalYearTarget,
            momGrowthTotal,
            yoyGrowthTotal
        FROM SMPA_Total_Row
        `;
 
        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);
        request.input("currentMonth", currentMonth);
        request.input("expectedMonthCount", expectedMonthCount); 

        const result = await request.query(query);

        // Define column definitions for AG-Grid
        let columnDefs = [
            
            {
                headerName: 'Port',
                field: 'port',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "B", field: "port" }
                ]
            },
            {
                headerName: 'Last Fiscal Year Target', 
                field: 'lastFiscalYearTarget',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "C", field: "lastFiscalYearTarget" }
                ]
            },
            {
                headerName: 'Current Fiscal Year Target',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "D", field: "currentFiscalYearTarget"}
                ]
            },
            {
                headerName: `Last Fiscal Year Break Up (${lastFiscalYear})`, // Dynamic header
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Till The Beginning of the Month',
                        children: [{ headerName: "E", field: "lastFiscalX1" }]
                    },
                    {
                        headerName: 'During the Month',
                        children: [{ headerName: "F", field: "lastFiscalY1" }]
                    },
                    {
                        headerName: 'YTD',
                        children: [{ headerName: "G", field: "lastFiscalZ1" }]
                    }
                ]
            },
            {
                headerName: `Current Fiscal Year Break Up (${currentFiscalYear})`, // Dynamic header
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Till The Beginning of the Month',
                        children: [{ headerName: "H", field: "currentFiscalX2"}]
                    },
                    {
                        headerName: 'During the Month',
                        children: [{ headerName: "I", field: "currentFiscalY2" }]
                    },
                    {
                        headerName: 'YTD',
                        children: [{ headerName: "J", field: "currentFiscalZ2" }]
                    }
                ]
            },
            {
                headerName: `% Growth`,
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'MOM Growth',
                        field: 'momGrowth',
                        children: [{ headerName: "K", field: "momGrowth" }]
                    },
                    {
                        headerName: 'YOY Growth',
                        field: 'yoyGrowth',
                        children: [{ headerName: "L", field: "yoyGrowth" }]
                    },
                ]
            },
            {
                headerName: 'Ranking w.r.t. K', 
                field: 'momRanking', 
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "M", field: "momRanking" }
                ]
            },
            {
                headerName: 'Ranking w.r.t. L',
                field: 'yoyRanking',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "N", field: "yoyRanking" } 
                ]
            },
        ];
 
        // Append 'Total' row to rowData if TotalData has results
        let rowData = result.recordset;
        if (rowData.length > 0 && rowData[0].port !== 'Total') { 
            const smpaRow = rowData.find(row => row.port === 'Total SMPA');

            if (smpaRow) {
                smpaRow.currentFiscalYearTarget = rowData[0].totalsmpaCurrFiscalYearTarget;
            }

            const totalRow = {
                port: 'Total',
                lastFiscalYearTarget: rowData[0].totalLastFiscalYearTarget,
                currentFiscalYearTarget: rowData[0].totalCurrentFiscalYearTarget,
                lastFiscalX1: rowData[0].totalLastFiscalX1,
                lastFiscalY1: rowData[0].totalLastFiscalY1,
                lastFiscalZ1: rowData[0].totalLastFiscalZ1,
                currentFiscalX2: rowData[0].totalCurrentFiscalX2,
                currentFiscalY2: rowData[0].totalCurrentFiscalY2,
                currentFiscalZ2: rowData[0].totalCurrentFiscalZ2,
                momGrowth: rowData[0].momGrowthTotal,
                yoyGrowth: rowData[0].yoyGrowthTotal,  
                momRanking: null, 
                yoyRanking: null
            };
            rowData.push(totalRow);
        }
       
        // Return the column definitions and row data for the AG-Grid
        return res.json({ columnDefs, rowData: rowData });
 
    } catch (error) {
        console.error("Error fetching dwell import report 1.3.1:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getDwellTimeCalMonthWise_k_1_3_2_Report(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const currentFiscalYear = (currentMonth > 3) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

        const lastFiscalYear = (currentMonth > 3) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    fiscal_year,
                    month,
                    SUM(import_dwell_time) AS total_import_dwell_time
                FROM tbl_kpi_time_performance
                WHERE fiscal_year IN (@currentFiscalYear, @lastFiscalYear)
                GROUP BY organisation_id, fiscal_year, month
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    'FY' + CAST(m.fiscal_year AS VARCHAR) AS fiscal_year,
                    SUM(CASE WHEN m.month = 4 THEN m.total_import_dwell_time END) AS April,
                    SUM(CASE WHEN m.month = 5 THEN m.total_import_dwell_time END) AS May,
                    SUM(CASE WHEN m.month = 6 THEN m.total_import_dwell_time END) AS June,
                    SUM(CASE WHEN m.month = 7 THEN m.total_import_dwell_time END) AS July,
                    SUM(CASE WHEN m.month = 8 THEN m.total_import_dwell_time END) AS August,
                    SUM(CASE WHEN m.month = 9 THEN m.total_import_dwell_time END) AS September,
                    SUM(CASE WHEN m.month = 10 THEN m.total_import_dwell_time END) AS October,
                    SUM(CASE WHEN m.month = 11 THEN m.total_import_dwell_time END) AS November,
                    SUM(CASE WHEN m.month = 12 THEN m.total_import_dwell_time END) AS December,
                    SUM(CASE WHEN m.month = 1 THEN m.total_import_dwell_time END) AS January,
                    SUM(CASE WHEN m.month = 2 THEN m.total_import_dwell_time END) AS February,
                    SUM(CASE WHEN m.month = 3 THEN m.total_import_dwell_time END) AS March
                FROM MonthlyData m
                JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, m.fiscal_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, fiscal_year DESC;
        `;

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching Dwell Time - Calendar Month Wise", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}



async function getDwellTimeCalYearWise_k_1_3_3_Report(req, res) {
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
            return `MAX(CASE WHEN fiscal_year = '${year}' THEN total_import_dwell_time END) AS "FY${year}"`;
        }).join(',\n');

        const fiscalYearSumCondition = fiscalYears.map(year => {
            return `COALESCE(MAX(CASE WHEN fiscal_year = '${year}' THEN total_import_dwell_time END), 0)`;
        }).join(' + ');

        // final SQL query
        const query = `
            WITH YearlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    c.fiscal_year,
                    SUM(c.import_dwell_time) AS total_import_dwell_time
                FROM tbl_kpi_time_performance c
                JOIN mmt_organisation o ON c.organisation_id = o.organisation_id
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
        return res.json({   
            fiscalYears: fiscalYears, 
            rowData: result.recordset  });

    } catch (error) {
        console.error("Error fetching year-wise import dwell time report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}
async function getPortPerformance_k_1_4_1_Report(req, res) {
    const conn = await pool;
    try {
 
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // getMonth() is 0-indexed (Jan = 0)
        let prevMonth = currentMonth === 1 ? 12 : currentMonth - 1; // Month number for previous month

        const expectedMonthCount = currentMonth - 4;
 
        let currentFiscalYear = currentMonth > 4
            ? `${currentYear}-${currentYear + 1}`
            : `${currentYear - 1}-${currentYear}`;
       
        let lastFiscalYear = currentMonth > 4
            ? `${currentYear - 1}-${currentYear}`
            : `${currentYear - 2}-${currentYear - 1}`;

        const selectedFiscalYear = req.query.financialYear;
        const selectedMonth = parseInt(req.query.month);

        if (selectedFiscalYear && !isNaN(selectedMonth)) {
            const [fyStart] = selectedFiscalYear.split('-').map(Number);
            prevMonth = selectedMonth;
            currentFiscalYear = selectedFiscalYear;
            lastFiscalYear = `${fyStart - 1}-${fyStart}`;
        }
 
        // --- Define the comprehensive SQL Query with Multiple CTEs ---
        const query = `
        WITH InboundPerMonth AS (
            SELECT
                organisation_id,
                month,
                fiscal_year,
                SUM(value) AS total_loaded
            FROM tbl_traffic_commodity_data
        WHERE direction_id = 2 AND commodity_group_id = 2
        GROUP BY organisation_id, month, fiscal_year
        ),
        LastFiscalYearData AS (
            SELECT
                kpi.organisation_id,
                ROUND(
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
						THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0) /
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
						THEN ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0),
				2) AS lastFiscalZ1,
                ROUND(
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
						THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0) /
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
						THEN ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0),
				2) AS lastFiscalX1,
                ROUND(
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth
						THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0) /
					NULLIF(SUM(CASE
						WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth
						THEN ISNULL(ipm.total_loaded, 0)
						ELSE 0
					END), 0),
				2) AS lastFiscalY1

            FROM sagarmanthan_revamp.dbo.tbl_kpi_time_performance AS kpi
            INNER JOIN sagarmanthan_revamp.dbo.tbl_traffic_commodity_data AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            JOIN InboundPerMonth ipm
                ON kpi.organisation_id = ipm.organisation_id
                AND kpi.month = ipm.month
                AND kpi.fiscal_year = ipm.fiscal_year
            WHERE kpi.fiscal_year = @lastFiscalYear
            GROUP BY kpi.organisation_id
        ),
        CurrentFiscalYearData AS (
            SELECT
                kpi.organisation_id,
                ROUND(
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
                        THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0) /
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth
                        THEN ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0),
                2) AS currentFiscalX2,

                ROUND(
                    NULLIF(SUM(CASE WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth
                        THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
                        ELSE 0 END), 0) /
                    NULLIF(SUM(CASE WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth
                        THEN ISNULL(ipm.total_loaded, 0)
                        ELSE 0 END), 0), 2) AS currentFiscalY2,

                ROUND(
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
                        THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0) /
                    NULLIF(SUM(CASE
                        WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth
                        THEN ISNULL(ipm.total_loaded, 0)
                        ELSE 0
                    END), 0),
                2) AS currentFiscalZ2
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] AS kpi
            INNER JOIN
                [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            JOIN InboundPerMonth ipm
                ON kpi.organisation_id = ipm.organisation_id
                AND kpi.month = ipm.month
                AND kpi.fiscal_year = ipm.fiscal_year
            WHERE kpi.fiscal_year = @currentFiscalYear
            GROUP BY kpi.organisation_id
        ),
        MonthlyData AS (
            SELECT
                kpi.organisation_id,
                ROUND(NULLIF(SUM(CASE
                    WHEN kpi.month = @prevMonth AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.month = @prevMonth AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2) AS prevMonthData,

                ROUND(NULLIF(SUM(CASE
                    WHEN kpi.month = 4 AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.month = 4 AND kpi.fiscal_year = @currentFiscalYear
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2) AS prevPrevMonthData
            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] AS kpi
            INNER JOIN
                [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            WHERE kpi.fiscal_year = @currentFiscalYear
            GROUP BY kpi.organisation_id
        ),
        LastFiscalYearTarget AS (
            SELECT
                kpi.organisation_id,
                ROUND(
                    NULLIF(SUM(ISNULL(kpi.export_dwell_time, 0) * ISNULL(ipm.total_loaded, 0)), 0) /
                    NULLIF(SUM(ISNULL(ipm.total_loaded, 0)), 0),
                2) AS lastFiscalYearTarget
            FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] AS kpi
            INNER JOIN [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] AS comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.organisation_id = comm.organisation_id
                AND kpi.month = comm.month
            JOIN InboundPerMonth ipm
                ON kpi.organisation_id = ipm.organisation_id
                AND kpi.month = ipm.month
                AND kpi.fiscal_year = ipm.fiscal_year
            WHERE 
                kpi.fiscal_year = @lastFiscalYear 
            GROUP BY kpi.organisation_id
        ),
        CurrentFiscalYearTarget AS (
            SELECT
                tpt.organisation_id,
                ROUND(NULLIF(SUM(tpt.target_value), 0), 2) AS currentFiscalYearTarget
            FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target] tpt
            WHERE tpt.financial_year = @currentFiscalYear
                AND tpt.kpi_type_id = 10
                AND tpt.is_overall = 0
                AND tpt.organisation_id IS NOT NULL
            GROUP BY tpt.organisation_id
        ),
        FinalData AS (
            SELECT
                o.organisation_id,
                o.organisation_name AS port,
                fd_lfy_target.lastFiscalYearTarget,
                fd_cfy_target.currentFiscalYearTarget,
                lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
                cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,
                @lastFiscalYear AS lastFiscalYear_header,
                ROUND(CASE
                    WHEN m.prevPrevMonthData > 0
                    THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
                    ELSE NULL
                END, 2) AS momGrowth,
                ROUND(CASE
                            WHEN lfy.lastFiscalZ1 > 0
                            THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
                            ELSE NULL
                        END, 0) AS yoyGrowth,
                CASE
                    WHEN m.prevPrevMonthData > 0 AND m.prevMonthData IS NOT NULL
                    THEN DENSE_RANK() OVER (
                        ORDER BY ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) DESC
                    )
                    ELSE NULL
                END AS momRanking,
                CASE
                    WHEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) IS NOT NULL
                    THEN DENSE_RANK() OVER (
                        ORDER BY ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) DESC
                    )
                        ELSE NULL
                END AS yoyRanking
            FROM (
                SELECT DISTINCT organisation_id
                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance]
                WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
                UNION
                SELECT DISTINCT organisation_id
                FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target]
                WHERE financial_year IN (@lastFiscalYear, @currentFiscalYear)
                    AND kpi_type_id = 10
                    AND organisation_id IS NOT NULL
            ) t
            LEFT JOIN LastFiscalYearData lfy ON t.organisation_id = lfy.organisation_id
            LEFT JOIN CurrentFiscalYearData cfy ON t.organisation_id = cfy.organisation_id
            LEFT JOIN MonthlyData m ON t.organisation_id = m.organisation_id
            LEFT JOIN LastFiscalYearTarget fd_lfy_target ON t.organisation_id = fd_lfy_target.organisation_id
            LEFT JOIN CurrentFiscalYearTarget fd_cfy_target ON t.organisation_id = fd_cfy_target.organisation_id
            LEFT JOIN [sagarmanthan_revamp].[dbo].[mmt_organisation] o ON t.organisation_id = o.organisation_id
            
        ),
        EligibleOrgForLastFiscalZ1 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            AND (
                (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                OR 
                (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
            )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 9
                    ELSE @prevMonth - 3
                END
        ),
        EligibleOrgForLastFiscalX1 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            AND (
                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                OR 
                (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
            )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 8
                    ELSE @prevMonth - 4
                END
        ),
        EligibleOrgForLastFiscalY1 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            AND month = @prevMonth
        ),
        EligibleOrgForCurrentFiscalZ2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
                AND (
                (@prevMonth <= 3 AND month <= @prevMonth)
                OR (@prevMonth > 3 AND month >= 4 AND month <= @prevMonth)
                )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) =
                CASE WHEN @prevMonth <= 3 THEN @prevMonth + 9
                    ELSE @prevMonth - 3 END
        ),
        EligibleOrgForCurrentFiscalX2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND (
                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                OR 
                (@prevMonth > 3 AND month < @prevMonth)
            )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 8
                    ELSE @prevMonth - 4
                END
        ),
        EligibleOrgForCurrentFiscalY2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth
        ),
        EligibleOrgForCurrentFiscalY3 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth - 1
        ),
        EligibleOrgForLastFiscalTarget AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 12
        ),
        TotalData AS (
            SELECT
                'Total' AS port_overall, -- Renamed to avoid ambiguity in final SELECT
                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalX1,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth AND ey.organisation_id IS NOT NULL
                    THEN NULLIF(kpi.export_dwell_time, 0) * NULLIF(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month = @prevMonth AND ey.organisation_id IS NOT NULL
                    THEN NULLIF(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalY1,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalZ1,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex2.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month < @prevMonth AND ex2.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2), 0)AS totalCurrentFiscalX2,
                
                COALESCE(ROUND(NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth AND ey2.organisation_id IS NOT NULL
                THEN NULLIF(kpi.export_dwell_time, 0) * NULLIF(comm.value, 0)
                ELSE 0
            END), 0) / NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth AND ey2.organisation_id IS NOT NULL
                THEN NULLIF(comm.value, 0)
                ELSE 0
            END), 0), 2),0) AS totalCurrentFiscalY2,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez2.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month >= 4 AND kpi.month <= @prevMonth AND ez2.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalCurrentFiscalZ2,

                COALESCE(ROUND(NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND et.organisation_id IS NOT NULL
                    THEN ISNULL(kpi.export_dwell_time, 0) * ISNULL(comm.value, 0)
                    ELSE 0
                END), 0) / NULLIF(SUM(CASE
                    WHEN kpi.fiscal_year = @lastFiscalYear AND et.organisation_id IS NOT NULL
                    THEN ISNULL(comm.value, 0)
                    ELSE 0
                END), 0), 2),0) AS totalLastFiscalYearTarget,

                COALESCE(ROUND(NULLIF((SELECT SUM(ISNULL(target_value, 0))
                    FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target] t5
                    WHERE t5.financial_year = @currentFiscalYear
                    AND t5.kpi_type_id = 10
                    AND t5.organisation_id IS NULL
                    AND t5.is_overall = 1), 0), 2),0) AS totalCurrentFiscalYearTarget,

                COALESCE(ROUND(NULLIF((SELECT SUM(ISNULL(target_value, 0))
                    FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance_target] t5
                    WHERE t5.financial_year = @currentFiscalYear
                    AND t5.kpi_type_id = 10
                    AND t5.organisation_id IS NULL
                    AND t5.is_totalSmpa = 1), 0), 2),0) AS totalsmpaCurrFiscalYearTarget,
            
            ROUND(NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth - 1
                AND ey3.organisation_id IS NOT NULL
                THEN NULLIF(kpi.export_dwell_time, 0) * NULLIF(comm.value, 0)
                ELSE 0
            END), 0) / NULLIF(SUM(CASE
                WHEN kpi.fiscal_year = @currentFiscalYear AND kpi.month = @prevMonth - 1
                AND ey3.organisation_id IS NOT NULL
                THEN NULLIF(comm.value, 0)
                ELSE 0
            END), 0), 2) AS totalCurrentFiscalY3

            FROM
                [sagarmanthan_revamp].[dbo].[tbl_kpi_time_performance] kpi
            INNER JOIN
                [sagarmanthan_revamp].[dbo].[tbl_traffic_commodity_data] comm
                ON kpi.fiscal_year = comm.fiscal_year
                AND kpi.month = comm.month
                AND kpi.organisation_id = comm.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalX1 ex ON kpi.organisation_id = ex.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalY1 ey ON kpi.organisation_id = ey.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalZ1 ez ON kpi.organisation_id = ez.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalX2 ex2 ON kpi.organisation_id = ex2.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalY2 ey2 ON kpi.organisation_id = ey2.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalZ2 ez2 ON kpi.organisation_id = ez2.organisation_id
            LEFT JOIN EligibleOrgForLastFiscalTarget et ON kpi.organisation_id = et.organisation_id
            LEFT JOIN EligibleOrgForCurrentFiscalY3 ey3 ON kpi.organisation_id = ey3.organisation_id  
            --WHERE kpi.fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
        ),
        -- New CTE to calculate the specific total_smpa row
        SMPA_Total_Row AS (
            SELECT
                ---99 AS organisation_id_sort_key, -- Use a distinct sort key for this row, smaller than any real ID
                NULL AS organisation_id, -- Actual NULL for display
                'Total SMPA' AS port,
                SUM(fd.lastFiscalYearTarget) AS lastFiscalYearTarget,
                SUM(fd.currentFiscalYearTarget) AS currentFiscalYearTarget,
                SUM(fd.lastFiscalX1) AS lastFiscalX1,
                SUM(fd.lastFiscalY1) AS lastFiscalY1,
                SUM(fd.lastFiscalZ1) AS lastFiscalZ1,
                SUM(fd.currentFiscalX2) AS currentFiscalX2,
                SUM(fd.currentFiscalY2) AS currentFiscalY2,
                SUM(fd.currentFiscalZ2) AS currentFiscalZ2,
                NULL AS momGrowth,
                NULL AS yoyGrowth,
                NULL AS momRanking,
                NULL AS yoyRanking,
                NULL AS totalLastFiscalZ1,
                NULL AS totalLastFiscalX1,
                NULL AS totalCurrentFiscalX2,
                NULL AS totalLastFiscalY1,
                NULL AS totalCurrentFiscalY2,
                NULL AS totalCurrentFiscalZ2,
                NULL AS totalLastFiscalYearTarget,
                NULL AS totalCurrentFiscalYearTarget,
                NULL AS totalsmpaCurrFiscalYearTarget,
                NULL AS momGrowthTotal,
                NULL AS yoyGrowthTotal
            FROM FinalData fd
            WHERE fd.organisation_id IN (54, 55)
        ),
        MainReportData AS ( -- Renamed from MainReport for clarity in the final UNION
            SELECT
                --fd.organisation_id AS organisation_id_sort_key, -- Use actual ID for sorting
                fd.organisation_id,
                fd.port,
                fd.lastFiscalYearTarget,
                fd.currentFiscalYearTarget,
                fd.lastFiscalX1,
                fd.lastFiscalY1,
                fd.lastFiscalZ1,
                fd.currentFiscalX2,
                fd.currentFiscalY2,
                fd.currentFiscalZ2,
                fd.momGrowth,
                fd.yoyGrowth,
                fd.momRanking,
                fd.yoyRanking,
                td.totalLastFiscalZ1,
                td.totalLastFiscalX1,
                td.totalCurrentFiscalX2,
                td.totalLastFiscalY1,
                td.totalCurrentFiscalY2,
                td.totalCurrentFiscalZ2,
                td.totalLastFiscalYearTarget,
                td.totalCurrentFiscalYearTarget,
                td.totalsmpaCurrFiscalYearTarget,
                ROUND(CASE
                        WHEN td.totalCurrentFiscalY3 > 0
                        THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100
                        ELSE NULL
                    END, 0) AS momGrowthTotal,
                ROUND(CASE
                        WHEN td.totalLastFiscalZ1 > 0
                        THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100
                        ELSE NULL
                    END, 0) AS yoyGrowthTotal
            FROM FinalData fd
            CROSS JOIN TotalData td
            WHERE
                fd.lastFiscalZ1 IS NOT NULL
                OR fd.currentFiscalZ2 IS NOT NULL
                OR fd.lastFiscalYearTarget IS NOT NULL
                OR fd.currentFiscalYearTarget IS NOT NULL
        )
        -- Final combined result
        SELECT
            organisation_id,
            port,
            lastFiscalYearTarget,
            currentFiscalYearTarget,
            lastFiscalX1,
            lastFiscalY1,
            lastFiscalZ1,
            currentFiscalX2,
            currentFiscalY2,
            currentFiscalZ2,
            momGrowth,
            yoyGrowth,
            momRanking,
            yoyRanking,
            totalLastFiscalZ1,
            totalLastFiscalX1,
            totalCurrentFiscalX2,
            totalLastFiscalY1,
            totalCurrentFiscalY2,
            totalCurrentFiscalZ2,
            totalLastFiscalYearTarget,
            totalCurrentFiscalYearTarget,
            totalsmpaCurrFiscalYearTarget,
            momGrowthTotal,
            yoyGrowthTotal
        FROM MainReportData

        UNION ALL

        SELECT
            organisation_id,
            port,
            lastFiscalYearTarget,
            currentFiscalYearTarget,
            lastFiscalX1,
            lastFiscalY1,
            lastFiscalZ1,
            currentFiscalX2,
            currentFiscalY2,
            currentFiscalZ2,
            momGrowth,
            yoyGrowth,
            momRanking,
            yoyRanking,
            totalLastFiscalZ1,
            totalLastFiscalX1,
            totalCurrentFiscalX2,
            totalLastFiscalY1,
            totalCurrentFiscalY2,
            totalCurrentFiscalZ2,
            totalLastFiscalYearTarget,
            totalCurrentFiscalYearTarget,
            totalsmpaCurrFiscalYearTarget,
            momGrowthTotal,
            yoyGrowthTotal
        FROM SMPA_Total_Row
        `;
 
        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);
        request.input("prevMonth", prevMonth);
        request.input("currentMonth", currentMonth); 
        request.input("expectedMonthCount", expectedMonthCount); 
       
        const result = await request.query(query);
        // Define column definitions for AG-Grid
        let columnDefs = [
            {
                headerName: 'Port',
                field: 'port',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "B", field: "port" ,width : 500}
                ]
            },
            {
                headerName: 'Last Fiscal Year Target', 
                field: 'lastFiscalYearTarget',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "C", field: "lastFiscalYearTarget" }
                ]
            },
            {
                headerName: 'Current Fiscal Year Target', 
                field: 'currentFiscalYearTarget',
                headerClass: "headercenter",
                pinned: true,
                
                children: [
                    { headerName: "D", field: "currentFiscalYearTarget"}
                ]
            },
            {
                headerName: `Last Fiscal Year Break Up (${lastFiscalYear})`, // Dynamic header
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Till The Beginning of the Month',
                        field: 'lastFiscalX1',
                        children: [{ headerName: "E", field: "lastFiscalX1" }]
                    },
                    {
                        headerName: 'During the Month',
                        field: 'lastFiscalY1',
                        children: [{ headerName: "F", field: "lastFiscalY1" }]
                    },
                    {
                        headerName: 'YTD',
                        field: 'lastFiscalZ1',
                        children: [{ headerName: "G", field: "lastFiscalZ1" }]
                    }
                ]
            },
            {
                headerName: `Current Fiscal Year Break Up (${currentFiscalYear})`, // Dynamic header
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'Till The Beginning of the Month',
                        field: 'currentFiscalX2',
                        children: [{ headerName: "H", field: "currentFiscalX2" }]
                    },
                    {
                        headerName: 'During the Month',
                        field: 'currentFiscalY2',
                        children: [{ headerName: "I", field: "currentFiscalY2" }]
                    },
                    {
                        headerName: 'YTD',
                        field: 'currentFiscalZ2',
                        children: [{ headerName: "J", field: "currentFiscalZ2" }]
                    }
                ]
            },
            {
                headerName: `% Growth`,
                headerClass: "headercenter",
                children: [
                    {
                        headerName: 'MOM Growth',
                        field: 'momGrowth',
                        children: [{ headerName: "K", field: "momGrowth" }]
                    },
                    {
                        headerName: 'YOY Growth',
                        field: 'yoyGrowth',
                        children: [{ headerName: "L", field: "yoyGrowth" }]
                    },
                ]
            },
            {
                headerName: 'Ranking w.r.t. K', 
                field: 'momRanking', 
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "M", field: "momRanking" } 
                ]
            },
            {
                headerName: 'Ranking w.r.t. L',
                field: 'yoyRanking',
                headerClass: "headercenter",
                pinned: true,
                children: [
                    { headerName: "N", field: "yoyRanking" } 
                ]
            },
        ];
 
        // Append 'Total' row to rowData if TotalData has results
        let rowData = result.recordset;
        if (rowData.length > 0 && rowData[0].port !== 'Total') { 

            const smpaRow = rowData.find(row => row.port === 'Total SMPA');

            if (smpaRow) {
                smpaRow.currentFiscalYearTarget = rowData[0].totalsmpaCurrFiscalYearTarget;
            }

            const totalRow = {
                port: 'Total',
                lastFiscalYearTarget: rowData[0].totalLastFiscalYearTarget,
                currentFiscalYearTarget: rowData[0].totalCurrentFiscalYearTarget,
                lastFiscalX1: rowData[0].totalLastFiscalX1,
                lastFiscalY1: rowData[0].totalLastFiscalY1,
                lastFiscalZ1: rowData[0].totalLastFiscalZ1,
                currentFiscalX2: rowData[0].totalCurrentFiscalX2,
                currentFiscalY2: rowData[0].totalCurrentFiscalY2,
                currentFiscalZ2: rowData[0].totalCurrentFiscalZ2,
                momGrowth: rowData[0].momGrowthTotal, 
                yoyGrowth: rowData[0].yoyGrowthTotal,   
                momRanking: null, 
                yoyRanking: null
            };
            rowData.push(totalRow);
        }
       
        // Return the column definitions and row data for the AG-Grid
        return res.json({ columnDefs, rowData: rowData });
 
    } catch (error) {
        console.error("Error fetching dwell export report 1.4.1:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getPortPerformance_k_1_4_2_Report(req,res) {
     const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        const currentFiscalYear = (currentMonth > 3) ? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

        const lastFiscalYear = (currentMonth > 3) ? `${currentYear - 1}-${currentYear}` : `${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    fiscal_year,
                    month,
                    SUM(export_dwell_time) AS total_export_dwell_time
                FROM tbl_kpi_time_performance
                WHERE fiscal_year IN (@currentFiscalYear, @lastFiscalYear)
                GROUP BY organisation_id, fiscal_year, month
            ),
            PivotedData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    'FY' + CAST(m.fiscal_year AS VARCHAR) AS fiscal_year,
                    SUM(CASE WHEN m.month = 4 THEN m.total_export_dwell_time END) AS April,
                    SUM(CASE WHEN m.month = 5 THEN m.total_export_dwell_time END) AS May,
                    SUM(CASE WHEN m.month = 6 THEN m.total_export_dwell_time END) AS June,
                    SUM(CASE WHEN m.month = 7 THEN m.total_export_dwell_time END) AS July,
                    SUM(CASE WHEN m.month = 8 THEN m.total_export_dwell_time END) AS August,
                    SUM(CASE WHEN m.month = 9 THEN m.total_export_dwell_time END) AS September,
                    SUM(CASE WHEN m.month = 10 THEN m.total_export_dwell_time END) AS October,
                    SUM(CASE WHEN m.month = 11 THEN m.total_export_dwell_time END) AS November,
                    SUM(CASE WHEN m.month = 12 THEN m.total_export_dwell_time END) AS December,
                    SUM(CASE WHEN m.month = 1 THEN m.total_export_dwell_time END) AS January,
                    SUM(CASE WHEN m.month = 2 THEN m.total_export_dwell_time END) AS February,
                    SUM(CASE WHEN m.month = 3 THEN m.total_export_dwell_time END) AS March
                FROM MonthlyData m
                JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, m.fiscal_year
            )
            SELECT * FROM PivotedData
            ORDER BY majorPort, fiscal_year DESC;
        `;

        const request = conn.request();
        request.input("currentFiscalYear", currentFiscalYear);
        request.input("lastFiscalYear", lastFiscalYear);

        const result = await request.query(query);
        const rowData = result.recordset;

        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching Dwell Time - Calendar Month Wise", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}



async function getPortPerformance_k_1_4_3_Report(req, res) {
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
            return `MAX(CASE WHEN fiscal_year = '${year}' THEN total_export_dwell_time END) AS "FY${year}"`;
        }).join(',\n');

        const fiscalYearSumCondition = fiscalYears.map(year => {
            return `COALESCE(MAX(CASE WHEN fiscal_year = '${year}' THEN total_export_dwell_time END), 0)`;
        }).join(' + ');

        // final SQL query
        const query = `
            WITH YearlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    c.fiscal_year,
                    SUM(c.export_dwell_time) AS total_export_dwell_time
                FROM tbl_kpi_time_performance c
                JOIN mmt_organisation o ON c.organisation_id = o.organisation_id
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
        return res.json({   
            fiscalYears: fiscalYears, 
            rowData: result.recordset  });

    } catch (error) {
        console.error("Error fetching year-wise import dwell time report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getObsd_5_1_1_Report(req, res) {
  const conn = await pool;
  try {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    let prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const zMonthCount = prevMonth >= 4 ? prevMonth - 4 + 1 : prevMonth + 9;
    const endMonth = prevMonth - 1;
    const monthCount = endMonth >= 4 ? endMonth - 4 + 1 : endMonth + 9;
 
   
    const xMonthCount = endMonth >= 4 ? endMonth - 4 + 1 : endMonth + 9;
    let currentFiscalYear = currentMonth > 4
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
    let lastFiscalYear = currentMonth > 4
      ? `${currentYear - 1}-${currentYear}`
      : `${currentYear - 2}-${currentYear - 1}`;
 
    const selectedFiscalYear = req.query.financialYear;
    const selectedMonth = parseInt(req.query.month);
 
    if (selectedFiscalYear && !isNaN(selectedMonth)) {
        const [fyStart] = selectedFiscalYear.split('-').map(Number);
        prevMonth = selectedMonth;
        currentFiscalYear = selectedFiscalYear;
        lastFiscalYear = `${fyStart - 1}-${fyStart}`;
    }
 
    const query = `
    WITH
 
    OrganisationNames AS (
        SELECT
            organisation_id,
            organisation_name
        FROM mmt_organisation
    ),
 
    CurrentFiscalYearTarget AS (
        SELECT
          organisation_id,
          ROUND(NULLIF(SUM(target_value), 0), 0) AS currentFiscalYearTarget
        FROM tbl_kpi_time_performance_target
        WHERE financial_year = @currentFiscalYear
          AND kpi_type_id = 3
          AND is_overall = 0
          AND organisation_id IS NOT NULL
        GROUP BY organisation_id
    ),
    LastFiscalYearTarget AS (
        SELECT
          organisation_id,
          ROUND(
              NULLIF(SUM(total_cargo_handled), 0) /
              NULLIF(SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)), 0),
          0) AS lastFiscalYearTarget
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 12
          )
        GROUP BY organisation_id
    ),
    lastFiscalX1 AS (
        SELECT
            organisation_id,
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS lastFiscalX1
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
        AND (
            -- Normal case: prevMonth >= April
            (@endMonth >= 4 AND month BETWEEN 4 AND @endMonth)
            -- Wrap-around case: prevMonth < April (e.g., Jan-Mar)
            OR (@endMonth < 4 AND (month BETWEEN 4 AND 12 OR month BETWEEN 1 AND @endMonth))
        )
        GROUP BY organisation_id
        HAVING COUNT(DISTINCT month) = @monthCount
    ),
    lastFiscalY1 AS (
        SELECT
            organisation_id,
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS lastFiscalY1
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
          AND month = @prevMonth
        GROUP BY organisation_id
        HAVING COUNT(DISTINCT month) = 1
    ),
    lastFiscalZ1 AS (
        SELECT
            organisation_id,
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS lastFiscalZ1
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
            AND (
            -- Normal case: prevMonth >= April
            (@prevMonth >= 4 AND month BETWEEN 4 AND @prevMonth)
            -- Wrap-around case: prevMonth < April (e.g., Jan-Mar)
            OR (@prevMonth < 4 AND (month BETWEEN 4 AND 12 OR month BETWEEN 1 AND @prevMonth))
        )
        GROUP BY organisation_id
        HAVING COUNT(DISTINCT month) = @zMonthCount
    ),
    currentFiscalX2 AS (
        SELECT
            organisation_id,
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS currentFiscalX2
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
           AND (
            -- Normal case: prevMonth >= April
            (@endMonth >= 4 AND month BETWEEN 4 AND @endMonth)
            -- Wrap-around case: prevMonth < April (e.g., Jan-Mar)
            OR (@endMonth < 4 AND (month BETWEEN 4 AND 12 OR month BETWEEN 1 AND @endMonth))
        )
        GROUP BY organisation_id
        HAVING COUNT(DISTINCT month) = @xMonthCount
    ),
    currentFiscalY2 AS (
        SELECT
            organisation_id,
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS currentFiscalY2
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
          AND month = @prevMonth
        GROUP BY organisation_id
        HAVING COUNT(DISTINCT month) = 1
    ),
    currentFiscalZ2 AS (
        SELECT
            organisation_id,
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS currentFiscalZ2
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
           AND (
            -- Normal case: prevMonth >= April
            (@prevMonth >= 4 AND month BETWEEN 4 AND @prevMonth)
            -- Wrap-around case: prevMonth < April (e.g., Jan-Mar)
            OR (@prevMonth < 4 AND (month BETWEEN 4 AND 12 OR month BETWEEN 1 AND @prevMonth))
        )
        GROUP BY organisation_id
        HAVING COUNT(DISTINCT month) = @zMonthCount
    ),
    MonthlyData AS (
        SELECT
            organisation_id,
            ROUND(NULLIF(SUM(CASE WHEN month = @prevMonth THEN total_cargo_handled ELSE 0 END), 0) /
                  NULLIF(SUM(CASE WHEN month = @prevMonth THEN NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0) ELSE 0 END), 0), 0) AS prevMonthData,
            ROUND(NULLIF(SUM(CASE WHEN month = (@prevMonth - 1) THEN total_cargo_handled ELSE 0 END), 0) /
                  NULLIF(SUM(CASE WHEN month = (@prevMonth - 1) THEN NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0) ELSE 0 END), 0), 0) AS prevPrevMonthData
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
        GROUP BY organisation_id
    ),
 
    TotalLastFiscalYearTargetAgg AS (
        SELECT
            ROUND(
                NULLIF(SUM(total_cargo_handled), 0) /
                NULLIF(SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)), 0),
            0) AS totalLastFiscalYearTarget
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 12
          )
    ),
    TotalCurrentFiscalYearTargetAgg AS (
        SELECT
            ROUND(NULLIF(SUM(target_value), 0), 0) AS totalCurrentFiscalYearTarget
        FROM tbl_kpi_time_performance_target
        WHERE financial_year = @currentFiscalYear
          AND kpi_type_id = 3
          AND organisation_id IS NULL
          AND is_overall = 1
    ),
    totalLastFiscalX1 AS (
        SELECT
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS totalLastFiscalX1
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
          AND month BETWEEN 4 AND @endMonth
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                  AND month BETWEEN 4 AND @endMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @monthCount
          )
    ),
    totalLastFiscalY1 AS (
        SELECT
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS totalLastFiscalY1
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
          AND month = @prevMonth
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                  AND month = @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 1
          )
    ),
    totalLastFiscalZ1 AS (
        SELECT
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS totalLastFiscalZ1
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
          AND month BETWEEN 4 AND @prevMonth
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                  AND month BETWEEN 4 AND @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
          )
    ),
    totalCurrentFiscalX2 AS (
        SELECT
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS totalCurrentFiscalX2
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
          AND month BETWEEN 4 AND (@prevMonth - 1)
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month BETWEEN 4 AND (@prevMonth - 1)
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @xMonthCount
          )
    ),
    totalCurrentFiscalY2 AS (
        SELECT
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS totalCurrentFiscalY2
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
          AND month = @prevMonth
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month = @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 1
          )
    ),
    totalCurrentFiscalZ2 AS (
        SELECT
            ROUND(
                SUM(total_cargo_handled) /
                SUM(NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0)),
            0) AS totalCurrentFiscalZ2
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
          AND month BETWEEN 4 AND @prevMonth
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month BETWEEN 4 AND @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
          )
    ),
    totalMoMGrowth AS (
        SELECT
            ROUND(
                (
                    (SUM(CASE WHEN month = @prevMonth THEN total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN month = @prevMonth THEN NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0) ELSE 0 END), 0))
                    /
                    (SUM(CASE WHEN month = (@prevMonth - 1) THEN total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN month = (@prevMonth - 1) THEN NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0) ELSE 0 END), 0))
                    - 1
                ) * 100,
            0) AS totalMoMGrowth
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month IN (@prevMonth, @prevMonth - 1)
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 2
          )
    ),
    totalYoYGrowth AS (
        SELECT
            ROUND(
                (
                    (SUM(CASE WHEN fiscal_year = @currentFiscalYear THEN total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear THEN NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0) ELSE 0 END), 0))
                    /
                    (SUM(CASE WHEN fiscal_year = @lastFiscalYear THEN total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear THEN NULLIF(total_cargo_handled, 0) / NULLIF(osbd_overall, 0) ELSE 0 END), 0))
                    - 1
                ) * 100,
            0) AS totalYoYGrowth
        FROM tbl_kpi_time_performance
        WHERE month BETWEEN 4 AND @prevMonth
          AND organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @currentFiscalYear
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
                INTERSECT
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @lastFiscalYear
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
          )
    ),
 
 
    SmpaTotalLastFiscalYearTargetAgg AS (
        SELECT
            ROUND(
                NULLIF(SUM(tp.total_cargo_handled), 0) /
                NULLIF(SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0)), 0),
            0) AS smpaTotalLastFiscalYearTarget
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @lastFiscalYear
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 12
          )
        HAVING COUNT(DISTINCT tp.organisation_id) = 2
    ),
    SmpaTotalCurrentFiscalYearTargetAgg AS (
        SELECT
            ROUND(NULLIF(SUM(target_value), 0), 0) AS smpaTotalCurrentFiscalYearTarget
        FROM tbl_kpi_time_performance_target
        WHERE financial_year = @currentFiscalYear
          AND kpi_type_id = 3
          AND organisation_id IS NULL
          AND is_totalSmpa = 1
    ),
    smpaTotalLastFiscalX1 AS (
        SELECT
            ROUND(
                SUM(tp.total_cargo_handled) /
                SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0)),
            0) AS smpaTotalLastFiscalX1
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @lastFiscalYear
          AND tp.month BETWEEN 4 AND @endMonth
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                  AND month BETWEEN 4 AND @endMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @monthCount
          )
    ),
    smpaTotalLastFiscalY1 AS (
        SELECT
            ROUND(
                SUM(tp.total_cargo_handled) /
                SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0)),
            0) AS smpaTotalLastFiscalY1
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @lastFiscalYear
          AND tp.month = @prevMonth
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                  AND month = @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 1
          )
    ),
    smpaTotalLastFiscalZ1 AS (
        SELECT
            ROUND(
                SUM(tp.total_cargo_handled) /
                SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0)),
            0) AS smpaTotalLastFiscalZ1
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @lastFiscalYear
          AND tp.month BETWEEN 4 AND @prevMonth
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @lastFiscalYear
                  AND month BETWEEN 4 AND @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
          )
    ),
    smpaTotalCurrentFiscalX2 AS (
        SELECT
            ROUND(
                SUM(tp.total_cargo_handled) /
                SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0)),
            0) AS smpaTotalCurrentFiscalX2
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @currentFiscalYear
          AND tp.month BETWEEN 4 AND (@prevMonth - 1)
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month BETWEEN 4 AND (@prevMonth - 1)
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @xMonthCount
          )
    ),
    smpaTotalCurrentFiscalY2 AS (
        SELECT
            ROUND(
                SUM(tp.total_cargo_handled) /
                SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0)),
            0) AS smpaTotalCurrentFiscalY2
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @currentFiscalYear
          AND tp.month = @prevMonth
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month = @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 1
          )
    ),
    smpaTotalCurrentFiscalZ2 AS (
        SELECT
            ROUND(
                SUM(tp.total_cargo_handled) /
                SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0)),
            0) AS smpaTotalCurrentFiscalZ2
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @currentFiscalYear
          AND tp.month BETWEEN 4 AND @prevMonth
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month BETWEEN 4 AND @prevMonth
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
          )
    ),
    smpaMoMGrowth AS (
        SELECT
            ROUND(
                (
                    (SUM(CASE WHEN tp.month = @prevMonth THEN tp.total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN tp.month = @prevMonth THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0) ELSE 0 END), 0))
                    /
                    (SUM(CASE WHEN tp.month = (@prevMonth - 1) THEN tp.total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN tp.month = (@prevMonth - 1) THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0) ELSE 0 END), 0))
                    - 1
                ) * 100,
            0) AS smpaMoMGrowth
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.fiscal_year = @currentFiscalYear
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE fiscal_year = @currentFiscalYear
                  AND month IN (@prevMonth, @prevMonth - 1)
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = 2
          )
    ),
    smpaYoYGrowth AS (
        SELECT
            ROUND(
                (
                    (SUM(CASE WHEN tp.fiscal_year = @currentFiscalYear THEN tp.total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN tp.fiscal_year = @currentFiscalYear THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0) ELSE 0 END), 0))
                    /
                    (SUM(CASE WHEN tp.fiscal_year = @lastFiscalYear THEN tp.total_cargo_handled ELSE 0 END) /
                     NULLIF(SUM(CASE WHEN tp.fiscal_year = @lastFiscalYear THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.osbd_overall, 0) ELSE 0 END), 0))
                    - 1
                ) * 100,
            0) AS smpaYoYGrowth
        FROM tbl_kpi_time_performance tp
        INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
        WHERE tp.month BETWEEN 4 AND @prevMonth
          AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
          AND tp.organisation_id IN (
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @currentFiscalYear
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
                INTERSECT
                SELECT organisation_id
                FROM tbl_kpi_time_performance
                WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @lastFiscalYear
                GROUP BY organisation_id
                HAVING COUNT(DISTINCT month) = @zMonthCount
          )
    ),
 
 
    FinalData AS (
        SELECT
          org_names.organisation_id, -- Now explicitly taking organisation_id from the joined CTE
          org_names.organisation_name AS port, -- Getting port name from the new CTE
          CASE WHEN org_names.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex') THEN 'SMPA' ELSE 'OTHERS' END AS port_group,
          lfx1.lastFiscalX1,
          lfy1.lastFiscalY1,
          lfz1.lastFiscalZ1,
          cfx2.currentFiscalX2,
          cfy2.currentFiscalY2,
          cfz2.currentFiscalZ2,
          lfyTarget.lastFiscalYearTarget,
          cfyTarget.currentFiscalYearTarget,
          -- Explicitly cast NULL for the total/smpa fields in individual rows
          CAST(NULL AS DECIMAL(18, 0)) AS totalCurrentFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS totalLastFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS totalSmpaCurrentFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS smpaTotalLastFiscalYearTarget,
          MonthlyData.prevMonthData,
          MonthlyData.prevPrevMonthData,
          ROUND(CASE WHEN MonthlyData.prevPrevMonthData IS NOT NULL AND MonthlyData.prevPrevMonthData <> 0 THEN ((MonthlyData.prevMonthData * 1.0) / MonthlyData.prevPrevMonthData - 1) * 100 ELSE NULL END, 0) AS momGrowth,
          ROUND(CASE WHEN lfz1.lastFiscalZ1 IS NOT NULL AND lfz1.lastFiscalZ1 <> 0 THEN ((cfz2.currentFiscalZ2 * 1.0) / lfz1.lastFiscalZ1 - 1) * 100 ELSE NULL END, 0) AS yoyGrowth,
        DENSE_RANK() OVER (
            ORDER BY CASE WHEN MonthlyData.prevPrevMonthData IS NOT NULL AND MonthlyData.prevPrevMonthData <> 0 THEN ((MonthlyData.prevMonthData * 1.0) / MonthlyData.prevPrevMonthData - 1) ELSE NULL END DESC
        ) AS momRanking,
        DENSE_RANK() OVER (
            ORDER BY CASE WHEN lfz1.lastFiscalZ1 IS NOT NULL AND lfz1.lastFiscalZ1 <> 0 THEN ((cfz2.currentFiscalZ2 * 1.0) / lfz1.lastFiscalZ1 - 1) ELSE NULL END DESC
        ) AS yoyRanking,
          3 AS sort_order
        FROM (
            -- Select distinct organisation_ids from the KPI tables
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            UNION
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance_target
            WHERE organisation_id IS NOT NULL -- Exclude NULL organization_id from targets
        ) AS distinct_org_ids
        INNER JOIN OrganisationNames org_names ON distinct_org_ids.organisation_id = org_names.organisation_id
        LEFT JOIN LastFiscalYearTarget lfyTarget ON distinct_org_ids.organisation_id = lfyTarget.organisation_id
        LEFT JOIN CurrentFiscalYearTarget cfyTarget ON distinct_org_ids.organisation_id = cfyTarget.organisation_id
        LEFT JOIN lastFiscalX1 lfx1 ON distinct_org_ids.organisation_id = lfx1.organisation_id
        LEFT JOIN lastFiscalY1 lfy1 ON distinct_org_ids.organisation_id = lfy1.organisation_id
        LEFT JOIN lastFiscalZ1 lfz1 ON distinct_org_ids.organisation_id = lfz1.organisation_id
        LEFT JOIN currentFiscalX2 cfx2 ON distinct_org_ids.organisation_id = cfx2.organisation_id
        LEFT JOIN currentFiscalY2 cfy2 ON distinct_org_ids.organisation_id = cfy2.organisation_id
        LEFT JOIN currentFiscalZ2 cfz2 ON distinct_org_ids.organisation_id = cfz2.organisation_id
        LEFT JOIN MonthlyData MonthlyData ON distinct_org_ids.organisation_id = MonthlyData.organisation_id
        WHERE org_names.organisation_name NOT IN ('ALL PORT', 'SMPA TOTAL') -- Filter out summary names from individual ports if they exist in mmt_organisation
    ),
 
 
    TotalSummary AS (
        SELECT
          CAST(NULL AS INT) AS organisation_id,
          CAST('ALL PORT' AS NVARCHAR(100)) AS port,
          CAST('ALL' AS NVARCHAR(50)) AS port_group,
          total_lfx1.totalLastFiscalX1 AS lastFiscalX1,
          total_lfy1.totalLastFiscalY1 AS lastFiscalY1,
          total_lfz1.totalLastFiscalZ1 AS lastFiscalZ1,
          total_cfx2.totalCurrentFiscalX2 AS currentFiscalX2,
          total_cfy2.totalCurrentFiscalY2 AS currentFiscalY2,
          total_cfz2.totalCurrentFiscalZ2 AS currentFiscalZ2,
          total_lfyTargetAgg.totalLastFiscalYearTarget AS lastFiscalYearTarget,
          total_cfyTargetAgg.totalCurrentFiscalYearTarget AS currentFiscalYearTarget,
          total_cfyTargetAgg.totalCurrentFiscalYearTarget AS totalCurrentFiscalYearTarget,
          total_lfyTargetAgg.totalLastFiscalYearTarget AS totalLastFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS totalSmpaCurrentFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS smpaTotalLastFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS prevMonthData,
          CAST(NULL AS DECIMAL(18, 0)) AS prevPrevMonthData,
          total_mom.totalMoMGrowth AS momGrowth,
          total_yoy.totalYoYGrowth AS yoyGrowth,
          CAST(NULL AS INT) AS momRanking,
         CAST(NULL AS INT) AS yoyRanking,
          CAST(1 AS INT) AS sort_order
        FROM (SELECT 1 AS dummy) AS d -- Dummy table for LEFT JOINs
        LEFT JOIN totalLastFiscalX1 total_lfx1 ON 1=1
        LEFT JOIN totalLastFiscalY1 total_lfy1 ON 1=1
        LEFT JOIN totalLastFiscalZ1 total_lfz1 ON 1=1
        LEFT JOIN totalCurrentFiscalX2 total_cfx2 ON 1=1
        LEFT JOIN totalCurrentFiscalY2 total_cfy2 ON 1=1
        LEFT JOIN totalCurrentFiscalZ2 total_cfz2 ON 1=1
        LEFT JOIN TotalLastFiscalYearTargetAgg total_lfyTargetAgg ON 1=1
        LEFT JOIN TotalCurrentFiscalYearTargetAgg total_cfyTargetAgg ON 1=1
        LEFT JOIN totalMoMGrowth total_mom ON 1=1
        LEFT JOIN totalYoYGrowth total_yoy ON 1=1
    ),
 
 
    SmpaTotalSummary AS (
        SELECT
          CAST(NULL AS INT) AS organisation_id,
          CAST('SMPA TOTAL' AS NVARCHAR(100)) AS port,
          CAST('SMPA' AS NVARCHAR(50)) AS port_group,
          smpa_lfx1.smpaTotalLastFiscalX1 AS lastFiscalX1,
          smpa_lfy1.smpaTotalLastFiscalY1 AS lastFiscalY1,
          smpa_lfz1.smpaTotalLastFiscalZ1 AS lastFiscalZ1,
          smpa_cfx2.smpaTotalCurrentFiscalX2 AS currentFiscalX2,
          smpa_cfy2.smpaTotalCurrentFiscalY2 AS currentFiscalY2,
          smpa_cfz2.smpaTotalCurrentFiscalZ2 AS currentFiscalZ2,
          smpa_lfyTargetAgg.smpaTotalLastFiscalYearTarget AS lastFiscalYearTarget,
          smpa_cfyTargetAgg.smpaTotalCurrentFiscalYearTarget AS currentFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS totalCurrentFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS totalLastFiscalYearTarget,
          smpa_cfyTargetAgg.smpaTotalCurrentFiscalYearTarget AS totalSmpaCurrentFiscalYearTarget,
          smpa_lfyTargetAgg.smpaTotalLastFiscalYearTarget AS smpaTotalLastFiscalYearTarget,
          CAST(NULL AS DECIMAL(18, 0)) AS prevMonthData,
          CAST(NULL AS DECIMAL(18, 0)) AS prevPrevMonthData,
          smpa_mom.smpaMoMGrowth AS momGrowth,
          smpa_yoy.smpaYoYGrowth AS yoyGrowth,
          CAST(NULL AS INT) AS momRanking,
         CAST(NULL AS INT) AS yoyRanking,
          CAST(2 AS INT) AS sort_order
        FROM (SELECT 1 AS dummy) AS d -- Dummy table for LEFT JOINs
        LEFT JOIN smpaTotalLastFiscalX1 smpa_lfx1 ON 1=1
        LEFT JOIN smpaTotalLastFiscalY1 smpa_lfy1 ON 1=1
        LEFT JOIN smpaTotalLastFiscalZ1 smpa_lfz1 ON 1=1
        LEFT JOIN smpaTotalCurrentFiscalX2 smpa_cfx2 ON 1=1
        LEFT JOIN smpaTotalCurrentFiscalY2 smpa_cfy2 ON 1=1
        LEFT JOIN smpaTotalCurrentFiscalZ2 smpa_cfz2 ON 1=1
        LEFT JOIN SmpaTotalLastFiscalYearTargetAgg smpa_lfyTargetAgg ON 1=1
        LEFT JOIN SmpaTotalCurrentFiscalYearTargetAgg smpa_cfyTargetAgg ON 1=1
        LEFT JOIN smpaMoMGrowth smpa_mom ON 1=1
        LEFT JOIN smpaYoYGrowth smpa_yoy ON 1=1
    )
 
    -- Final SELECT combining all CTEs with UNION ALL
    SELECT * FROM TotalSummary
    UNION ALL
    SELECT * FROM SmpaTotalSummary
    UNION ALL
    SELECT * FROM FinalData
    ORDER BY sort_order, port;
    `;
 
    const request = conn.request();
    request.input("currentFiscalYear", currentFiscalYear);
    request.input("lastFiscalYear", lastFiscalYear);
    request.input("prevMonth", prevMonth);
    request.input("zMonthCount", zMonthCount);
    request.input("endMonth", endMonth);
    request.input("monthCount", monthCount);
    request.input("xMonthCount", xMonthCount);
 
    const result = await request.query(query);
    // console.log('result',result);
    return res.json({ rowData: result.recordset });
 
  } catch (error) {
    console.error("Error fetching OSBD report (5_1_1):", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

async function getObsd_5_2_1_Report(req, res) {
    const conn = await pool; 
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const query =` WITH MonthlyData AS (
                SELECT
                    organisation_id,
                    fiscal_year,
                    month,
                    SUM(osbd_overall) AS total_osbd_overall,
                    SUM(total_cargo_handled) AS total_cargo_handled_for_weighted_avg
                FROM tbl_kpi_time_performance
                GROUP BY organisation_id, fiscal_year, month
            ),
            PivotedData AS (
                SELECT
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    m.fiscal_year,
                    SUM(CASE WHEN m.month = 4 THEN m.total_osbd_overall END) AS April,
                    SUM(CASE WHEN m.month = 5 THEN m.total_osbd_overall END) AS May,
                    SUM(CASE WHEN m.month = 6 THEN m.total_osbd_overall END) AS June,
                    SUM(CASE WHEN m.month = 7 THEN m.total_osbd_overall END) AS July,
                    SUM(CASE WHEN m.month = 8 THEN m.total_osbd_overall END) AS August,
                    SUM(CASE WHEN m.month = 9 THEN m.total_osbd_overall END) AS September,
                    SUM(CASE WHEN m.month = 10 THEN m.total_osbd_overall END) AS October,
                    SUM(CASE WHEN m.month = 11 THEN m.total_osbd_overall END) AS November,
                    SUM(CASE WHEN m.month = 12 THEN m.total_osbd_overall END) AS December,
                    SUM(CASE WHEN m.month = 1 THEN m.total_osbd_overall END) AS January,
                    SUM(CASE WHEN m.month = 2 THEN m.total_osbd_overall END) AS February,
                    SUM(CASE WHEN m.month = 3 THEN m.total_osbd_overall END) AS March
                FROM MonthlyData m
                JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, m.fiscal_year

                UNION ALL

                SELECT
                    0 AS organisation_id, -- A dummy ID for the total row
                    'Total' AS majorPort, -- Now correctly outputs 'Total' from backend
                    m.fiscal_year,
                    ROUND(SUM(CASE WHEN m.month = 4 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 4 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS April,
                    ROUND(SUM(CASE WHEN m.month = 5 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 5 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS May,
                    ROUND(SUM(CASE WHEN m.month = 6 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 6 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS June,
                    ROUND(SUM(CASE WHEN m.month = 7 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 7 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS July,
                    ROUND(SUM(CASE WHEN m.month = 8 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 8 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS August,
                    ROUND(SUM(CASE WHEN m.month = 9 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 9 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS September,
                    ROUND(SUM(CASE WHEN m.month = 10 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 10 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS October,
                    ROUND(SUM(CASE WHEN m.month = 11 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 11 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS November,
                    ROUND(SUM(CASE WHEN m.month = 12 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 12 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS December,
                    ROUND(SUM(CASE WHEN m.month = 1 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 1 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS January,
                    ROUND(SUM(CASE WHEN m.month = 2 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 2 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS February,
                    ROUND(SUM(CASE WHEN m.month = 3 THEN m.total_cargo_handled_for_weighted_avg END) /
                          NULLIF(SUM(CASE WHEN m.month = 3 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS March
                FROM MonthlyData m
                GROUP BY m.fiscal_year
            )
            SELECT * FROM PivotedData
            WHERE
                COALESCE(April, 0) + COALESCE(May, 0) + COALESCE(June, 0) +
                COALESCE(July, 0) + COALESCE(August, 0) + COALESCE(September, 0) +
                COALESCE(October, 0) + COALESCE(November, 0) + COALESCE(December, 0) +
                COALESCE(January, 0) + COALESCE(February, 0) + COALESCE(March, 0) > 0
            ORDER BY majorPort, fiscal_year DESC;`;

        const request = conn.request();
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

      
        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching OBSD 5.2.1 report:", error); 
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getObsd_5_3_1_Report(req, res) {
    const conn = await pool;
    try 
    {
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
            return `MAX(CASE WHEN cwa.fiscal_year = '${year}' THEN cwa.weighted_average_osbd END) AS "FY${year}"`;
        }).join(',\n');

        const fiscalYearSumCondition = fiscalYears.map(year => {
            return `COALESCE(MAX(CASE WHEN cwa.fiscal_year = '${year}' THEN cwa.weighted_average_osbd END), 0)`;
        }).join(' + ');
        const query = `
            WITH YearlyAggregatedData AS (
                SELECT
                    v.organisation_id,
                    v.fiscal_year,
                    -- Calculate the numerator for the weighted average
                    SUM(v.osbd_overall * v.total_cargo_handled) AS sum_osbd_x_cargo,
                    -- Calculate the denominator for the weighted average
                    SUM(v.total_cargo_handled) AS total_cargo_handled_sum
                FROM tbl_kpi_time_performance v
                GROUP BY v.organisation_id, v.fiscal_year
            ),
            CalculatedWeightedAvg AS (
                SELECT
                    yd.organisation_id,
                    o.organisation_name AS majorPort,
                    yd.fiscal_year,
                    -- Calculate the weighted average, handling division by zero
                    CASE
                        WHEN yd.total_cargo_handled_sum IS NULL OR yd.total_cargo_handled_sum = 0 THEN NULL
                        ELSE ROUND(yd.sum_osbd_x_cargo / yd.total_cargo_handled_sum, 2)
                    END AS weighted_average_osbd
                FROM YearlyAggregatedData yd
                JOIN mmt_organisation o ON yd.organisation_id = o.organisation_id
            )
            SELECT
                cwa.organisation_id,
                cwa.majorPort,
                ${fiscalYearConditions} -- This will now correctly pivot weighted averages for all dynamic years
            FROM CalculatedWeightedAvg cwa
            GROUP BY cwa.organisation_id, cwa.majorPort
            HAVING ${fiscalYearSumCondition} > 0
            ORDER BY cwa.majorPort;
        `;

        const result = await conn.request().query(query);
        return res.json({ rowData: result.recordset });

    } catch (error) {
        console.error("Error fetching year-wise vessel traffic report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}



async function getEffectiveObsd_20_1_1_Report(req, res) {

  const conn = await pool;
    try {
    let currentDate = new Date();
    let currentYear = currentDate.getFullYear();
    let currentMonth = currentDate.getMonth() + 1;
    let prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    let zMonthCount = prevMonth - 4 + 1; 

    
    let endMonth = prevMonth - 1;
    let monthCount = endMonth - 4 + 1; 

    
    let xMonthCount = (prevMonth - 1) - 4 + 1; 
    let currentFiscalYear = currentMonth > 4
      ? `${currentYear}-${currentYear + 1}`
      : `${currentYear - 1}-${currentYear}`;
    let lastFiscalYear = currentMonth > 4
      ? `${currentYear - 1}-${currentYear}`
      : `${currentYear - 2}-${currentYear - 1}`;
      const selectedFiscalYear = req.query.financialYear;
        const selectedMonth = parseInt(req.query.month);

        if (selectedFiscalYear && !isNaN(selectedMonth)) {
            const [fyStart] = selectedFiscalYear.split('-').map(Number);
            prevMonth = selectedMonth;
            currentFiscalYear = selectedFiscalYear;
            lastFiscalYear = `${fyStart - 1}-${fyStart}`;
        }


    const query = `
                WITH

                OrganisationNames AS (
                    SELECT
                        organisation_id,
                        organisation_name
                    FROM mmt_organisation
                ),

                CurrentFiscalYearTarget AS (
                    SELECT
                      organisation_id,
                      ROUND(NULLIF(SUM(target_value), 0), 0) AS currentFiscalYearTarget
                    FROM tbl_kpi_time_performance_target
                    WHERE financial_year = @currentFiscalYear
                      AND kpi_type_id = 5
                      AND is_overall = 0
                      AND organisation_id IS NOT NULL
                    GROUP BY organisation_id
                ),
                LastFiscalYearTarget AS (
                    SELECT
                      organisation_id,
                      ROUND(
                          NULLIF(SUM(total_cargo_handled), 0) /
                          NULLIF(SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)), 0),
                      0) AS lastFiscalYearTarget
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 12
                      )
                    GROUP BY organisation_id
                ),
                lastFiscalX1 AS (
                    SELECT
                        organisation_id,
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS lastFiscalX1
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND month BETWEEN 4 AND @endMonth
                    GROUP BY organisation_id
                    HAVING COUNT(DISTINCT month) = @monthCount
                ),
                lastFiscalY1 AS (
                    SELECT
                        organisation_id,
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS lastFiscalY1
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND month = @prevMonth
                    GROUP BY organisation_id
                    HAVING COUNT(DISTINCT month) = 1
                ),
                lastFiscalZ1 AS (
                    SELECT
                        organisation_id,
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS lastFiscalZ1
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND month BETWEEN 4 AND @prevMonth
                    GROUP BY organisation_id
                    HAVING COUNT(DISTINCT month) = @zMonthCount
                ),
                currentFiscalX2 AS (
                    SELECT
                        organisation_id,
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS currentFiscalX2
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month BETWEEN 4 AND (@prevMonth - 1)
                    GROUP BY organisation_id
                    HAVING COUNT(DISTINCT month) = @xMonthCount
                ),
                currentFiscalY2 AS (
                    SELECT
                        organisation_id,
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS currentFiscalY2
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month = @prevMonth
                    GROUP BY organisation_id
                    HAVING COUNT(DISTINCT month) = 1
                ),
                currentFiscalZ2 AS (
                    SELECT
                        organisation_id,
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS currentFiscalZ2
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month BETWEEN 4 AND @prevMonth
                    GROUP BY organisation_id
                    HAVING COUNT(DISTINCT month) = @zMonthCount
                ),
                MonthlyData AS (
                    SELECT
                        organisation_id,
                        ROUND(NULLIF(SUM(CASE WHEN month = @prevMonth THEN total_cargo_handled ELSE 0 END), 0) /
                              NULLIF(SUM(CASE WHEN month = @prevMonth THEN NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0) ELSE 0 END), 0), 0) AS prevMonthData,
                        ROUND(NULLIF(SUM(CASE WHEN month = (@prevMonth - 1) THEN total_cargo_handled ELSE 0 END), 0) /
                              NULLIF(SUM(CASE WHEN month = (@prevMonth - 1) THEN NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0) ELSE 0 END), 0), 0) AS prevPrevMonthData
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                    GROUP BY organisation_id
                ),

                TotalLastFiscalYearTargetAgg AS (
                    SELECT
                        ROUND(
                            NULLIF(SUM(total_cargo_handled), 0) /
                            NULLIF(SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)), 0),
                        0) AS totalLastFiscalYearTarget
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 12
                      )
                ),
                TotalCurrentFiscalYearTargetAgg AS (
                    SELECT
                        ROUND(NULLIF(SUM(target_value), 0), 0) AS totalCurrentFiscalYearTarget
                    FROM tbl_kpi_time_performance_target
                    WHERE financial_year = @currentFiscalYear
                      AND kpi_type_id = 5
                      AND organisation_id IS NULL
                      AND is_overall = 1
                ),
                totalLastFiscalX1 AS (
                    SELECT
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS totalLastFiscalX1
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND month BETWEEN 4 AND @endMonth
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                              AND month BETWEEN 4 AND @endMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @monthCount
                      )
                ),
                totalLastFiscalY1 AS (
                    SELECT
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS totalLastFiscalY1
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND month = @prevMonth
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                              AND month = @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 1
                      )
                ),
                totalLastFiscalZ1 AS (
                    SELECT
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS totalLastFiscalZ1
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND month BETWEEN 4 AND @prevMonth
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                              AND month BETWEEN 4 AND @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                      )
                ),
                totalCurrentFiscalX2 AS (
                    SELECT
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS totalCurrentFiscalX2
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month BETWEEN 4 AND (@prevMonth - 1)
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month BETWEEN 4 AND (@prevMonth - 1)
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @xMonthCount
                      )
                ),
                totalCurrentFiscalY2 AS (
                    SELECT
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS totalCurrentFiscalY2
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month = @prevMonth
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month = @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 1
                      )
                ),
                totalCurrentFiscalZ2 AS (
                    SELECT
                        ROUND(
                            SUM(total_cargo_handled) /
                            SUM(NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0)),
                        0) AS totalCurrentFiscalZ2
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month BETWEEN 4 AND @prevMonth
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month BETWEEN 4 AND @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                      )
                ),
                totalMoMGrowth AS (
                    SELECT
                        ROUND(
                            (
                                (SUM(CASE WHEN month = @prevMonth THEN total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN month = @prevMonth THEN NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0) ELSE 0 END), 0))
                                /
                                (SUM(CASE WHEN month = (@prevMonth - 1) THEN total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN month = (@prevMonth - 1) THEN NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0) ELSE 0 END), 0))
                                - 1
                            ) * 100,
                        0) AS totalMoMGrowth
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month IN (@prevMonth, @prevMonth - 1)
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 2
                      )
                ),
                totalYoYGrowth AS (
                    SELECT
                        ROUND(
                            (
                                (SUM(CASE WHEN fiscal_year = @currentFiscalYear THEN total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN fiscal_year = @currentFiscalYear THEN NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0) ELSE 0 END), 0))
                                /
                                (SUM(CASE WHEN fiscal_year = @lastFiscalYear THEN total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN fiscal_year = @lastFiscalYear THEN NULLIF(total_cargo_handled, 0) / NULLIF(effective_osbd_overall, 0) ELSE 0 END), 0))
                                - 1
                            ) * 100,
                        0) AS totalYoYGrowth
                    FROM tbl_kpi_time_performance
                    WHERE month BETWEEN 4 AND @prevMonth
                      AND organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @currentFiscalYear
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                            INTERSECT
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @lastFiscalYear
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                      )
                ),


                SmpaTotalLastFiscalYearTargetAgg AS (
                    SELECT
                        ROUND(
                            NULLIF(SUM(tp.total_cargo_handled), 0) /
                            NULLIF(SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0)), 0),
                        0) AS smpaTotalLastFiscalYearTarget
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @lastFiscalYear
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 12
                      )
                    HAVING COUNT(DISTINCT tp.organisation_id) = 2
                ),
                SmpaTotalCurrentFiscalYearTargetAgg AS (
                    SELECT
                        ROUND(NULLIF(SUM(target_value), 0), 0) AS smpaTotalCurrentFiscalYearTarget
                    FROM tbl_kpi_time_performance_target
                    WHERE financial_year = @currentFiscalYear
                      AND kpi_type_id = 5
                      AND organisation_id IS NULL
                      AND is_totalSmpa = 1
                ),
                smpaTotalLastFiscalX1 AS (
                    SELECT
                        ROUND(
                            SUM(tp.total_cargo_handled) /
                            SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0)),
                        0) AS smpaTotalLastFiscalX1
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @lastFiscalYear
                      AND tp.month BETWEEN 4 AND @endMonth
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                              AND month BETWEEN 4 AND @endMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @monthCount
                      )
                ),
                smpaTotalLastFiscalY1 AS (
                    SELECT
                        ROUND(
                            SUM(tp.total_cargo_handled) /
                            SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0)),
                        0) AS smpaTotalLastFiscalY1
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @lastFiscalYear
                      AND tp.month = @prevMonth
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                              AND month = @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 1
                      )
                ),
                smpaTotalLastFiscalZ1 AS (
                    SELECT
                        ROUND(
                            SUM(tp.total_cargo_handled) /
                            SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0)),
                        0) AS smpaTotalLastFiscalZ1
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @lastFiscalYear
                      AND tp.month BETWEEN 4 AND @prevMonth
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @lastFiscalYear
                              AND month BETWEEN 4 AND @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                      )
                ),
                smpaTotalCurrentFiscalX2 AS (
                    SELECT
                        ROUND(
                            SUM(tp.total_cargo_handled) /
                            SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0)),
                        0) AS smpaTotalCurrentFiscalX2
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @currentFiscalYear
                      AND tp.month BETWEEN 4 AND (@prevMonth - 1)
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month BETWEEN 4 AND (@prevMonth - 1)
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @xMonthCount
                      )
                ),
                smpaTotalCurrentFiscalY2 AS (
                    SELECT
                        ROUND(
                            SUM(tp.total_cargo_handled) /
                            SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0)),
                        0) AS smpaTotalCurrentFiscalY2
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @currentFiscalYear
                      AND tp.month = @prevMonth
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month = @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 1
                      )
                ),
                smpaTotalCurrentFiscalZ2 AS (
                    SELECT
                        ROUND(
                            SUM(tp.total_cargo_handled) /
                            SUM(NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0)),
                        0) AS smpaTotalCurrentFiscalZ2
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @currentFiscalYear
                      AND tp.month BETWEEN 4 AND @prevMonth
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month BETWEEN 4 AND @prevMonth
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                      )
                ),
                smpaMoMGrowth AS (
                    SELECT
                        ROUND(
                            (
                                (SUM(CASE WHEN tp.month = @prevMonth THEN tp.total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN tp.month = @prevMonth THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0) ELSE 0 END), 0))
                                /
                                (SUM(CASE WHEN tp.month = (@prevMonth - 1) THEN tp.total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN tp.month = (@prevMonth - 1) THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0) ELSE 0 END), 0))
                                - 1
                            ) * 100,
                        0) AS smpaMoMGrowth
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.fiscal_year = @currentFiscalYear
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE fiscal_year = @currentFiscalYear
                              AND month IN (@prevMonth, @prevMonth - 1)
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = 2
                      )
                ),
                smpaYoYGrowth AS (
                    SELECT
                        ROUND(
                            (
                                (SUM(CASE WHEN tp.fiscal_year = @currentFiscalYear THEN tp.total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN tp.fiscal_year = @currentFiscalYear THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0) ELSE 0 END), 0))
                                /
                                (SUM(CASE WHEN tp.fiscal_year = @lastFiscalYear THEN tp.total_cargo_handled ELSE 0 END) /
                                 NULLIF(SUM(CASE WHEN tp.fiscal_year = @lastFiscalYear THEN NULLIF(tp.total_cargo_handled, 0) / NULLIF(tp.effective_osbd_overall, 0) ELSE 0 END), 0))
                                - 1
                            ) * 100,
                        0) AS smpaYoYGrowth
                    FROM tbl_kpi_time_performance tp
                    INNER JOIN OrganisationNames mo ON tp.organisation_id = mo.organisation_id -- Use OrganisationNames CTE
                    WHERE tp.month BETWEEN 4 AND @prevMonth
                      AND mo.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex')
                      AND tp.organisation_id IN (
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @currentFiscalYear
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                            INTERSECT
                            SELECT organisation_id
                            FROM tbl_kpi_time_performance
                            WHERE month BETWEEN 4 AND @prevMonth AND fiscal_year = @lastFiscalYear
                            GROUP BY organisation_id
                            HAVING COUNT(DISTINCT month) = @zMonthCount
                      )
                ),


                FinalData AS (
                    SELECT
                      org_names.organisation_id, -- Now explicitly taking organisation_id from the joined CTE
                      org_names.organisation_name AS port, -- Getting port name from the new CTE
                      CASE WHEN org_names.organisation_name IN ('SMPA - Kolkata Dock System', 'SMPA - Haldia Dock Complex') THEN 'SMPA' ELSE 'OTHERS' END AS port_group,
                      lfx1.lastFiscalX1,
                      lfy1.lastFiscalY1,
                      lfz1.lastFiscalZ1,
                      cfx2.currentFiscalX2,
                      cfy2.currentFiscalY2,
                      cfz2.currentFiscalZ2,
                      lfyTarget.lastFiscalYearTarget,
                      cfyTarget.currentFiscalYearTarget,
                      -- Explicitly cast NULL for the total/smpa fields in individual rows
                      CAST(NULL AS DECIMAL(18, 0)) AS totalCurrentFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS totalLastFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS totalSmpaCurrentFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS smpaTotalLastFiscalYearTarget,
                      MonthlyData.prevMonthData,
                      MonthlyData.prevPrevMonthData,
                      ROUND(CASE WHEN MonthlyData.prevPrevMonthData IS NOT NULL AND MonthlyData.prevPrevMonthData <> 0 THEN ((MonthlyData.prevMonthData * 1.0) / MonthlyData.prevPrevMonthData - 1) * 100 ELSE NULL END, 0) AS momGrowth,
                      ROUND(CASE WHEN lfz1.lastFiscalZ1 IS NOT NULL AND lfz1.lastFiscalZ1 <> 0 THEN ((cfz2.currentFiscalZ2 * 1.0) / lfz1.lastFiscalZ1 - 1) * 100 ELSE NULL END, 0) AS yoyGrowth,
                    DENSE_RANK() OVER (
                        ORDER BY CASE WHEN MonthlyData.prevPrevMonthData IS NOT NULL AND MonthlyData.prevPrevMonthData <> 0 THEN ((MonthlyData.prevMonthData * 1.0) / MonthlyData.prevPrevMonthData - 1) ELSE NULL END DESC
                    ) AS momRanking,
                    DENSE_RANK() OVER (
                        ORDER BY CASE WHEN lfz1.lastFiscalZ1 IS NOT NULL AND lfz1.lastFiscalZ1 <> 0 THEN ((cfz2.currentFiscalZ2 * 1.0) / lfz1.lastFiscalZ1 - 1) ELSE NULL END DESC
                    ) AS yoyRanking,
                      3 AS sort_order
                    FROM (
                        -- Select distinct organisation_ids from the KPI tables
                        SELECT DISTINCT organisation_id
                        FROM tbl_kpi_time_performance
                        UNION
                        SELECT DISTINCT organisation_id
                        FROM tbl_kpi_time_performance_target
                        WHERE organisation_id IS NOT NULL -- Exclude NULL organization_id from targets
                    ) AS distinct_org_ids
                    INNER JOIN OrganisationNames org_names ON distinct_org_ids.organisation_id = org_names.organisation_id
                    LEFT JOIN LastFiscalYearTarget lfyTarget ON distinct_org_ids.organisation_id = lfyTarget.organisation_id
                    LEFT JOIN CurrentFiscalYearTarget cfyTarget ON distinct_org_ids.organisation_id = cfyTarget.organisation_id
                    LEFT JOIN lastFiscalX1 lfx1 ON distinct_org_ids.organisation_id = lfx1.organisation_id
                    LEFT JOIN lastFiscalY1 lfy1 ON distinct_org_ids.organisation_id = lfy1.organisation_id
                    LEFT JOIN lastFiscalZ1 lfz1 ON distinct_org_ids.organisation_id = lfz1.organisation_id
                    LEFT JOIN currentFiscalX2 cfx2 ON distinct_org_ids.organisation_id = cfx2.organisation_id
                    LEFT JOIN currentFiscalY2 cfy2 ON distinct_org_ids.organisation_id = cfy2.organisation_id
                    LEFT JOIN currentFiscalZ2 cfz2 ON distinct_org_ids.organisation_id = cfz2.organisation_id
                    LEFT JOIN MonthlyData MonthlyData ON distinct_org_ids.organisation_id = MonthlyData.organisation_id
                    WHERE org_names.organisation_name NOT IN ('ALL PORT', 'SMPA TOTAL') -- Filter out summary names from individual ports if they exist in mmt_organisation
                ),


                TotalSummary AS (
                    SELECT
                      CAST(NULL AS INT) AS organisation_id,
                      CAST('ALL PORT' AS NVARCHAR(100)) AS port,
                      CAST('ALL' AS NVARCHAR(50)) AS port_group,
                      total_lfx1.totalLastFiscalX1 AS lastFiscalX1,
                      total_lfy1.totalLastFiscalY1 AS lastFiscalY1,
                      total_lfz1.totalLastFiscalZ1 AS lastFiscalZ1,
                      total_cfx2.totalCurrentFiscalX2 AS currentFiscalX2,
                      total_cfy2.totalCurrentFiscalY2 AS currentFiscalY2,
                      total_cfz2.totalCurrentFiscalZ2 AS currentFiscalZ2,
                      total_lfyTargetAgg.totalLastFiscalYearTarget AS lastFiscalYearTarget,
                      total_cfyTargetAgg.totalCurrentFiscalYearTarget AS currentFiscalYearTarget,
                      total_cfyTargetAgg.totalCurrentFiscalYearTarget AS totalCurrentFiscalYearTarget,
                      total_lfyTargetAgg.totalLastFiscalYearTarget AS totalLastFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS totalSmpaCurrentFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS smpaTotalLastFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS prevMonthData,
                      CAST(NULL AS DECIMAL(18, 0)) AS prevPrevMonthData,
                      total_mom.totalMoMGrowth AS momGrowth,
                      total_yoy.totalYoYGrowth AS yoyGrowth,
                      CAST(NULL AS INT) AS momRanking,
                     CAST(NULL AS INT) AS yoyRanking,
                      CAST(1 AS INT) AS sort_order
                    FROM (SELECT 1 AS dummy) AS d -- Dummy table for LEFT JOINs
                    LEFT JOIN totalLastFiscalX1 total_lfx1 ON 1=1
                    LEFT JOIN totalLastFiscalY1 total_lfy1 ON 1=1
                    LEFT JOIN totalLastFiscalZ1 total_lfz1 ON 1=1
                    LEFT JOIN totalCurrentFiscalX2 total_cfx2 ON 1=1
                    LEFT JOIN totalCurrentFiscalY2 total_cfy2 ON 1=1
                    LEFT JOIN totalCurrentFiscalZ2 total_cfz2 ON 1=1
                    LEFT JOIN TotalLastFiscalYearTargetAgg total_lfyTargetAgg ON 1=1
                    LEFT JOIN TotalCurrentFiscalYearTargetAgg total_cfyTargetAgg ON 1=1
                    LEFT JOIN totalMoMGrowth total_mom ON 1=1
                    LEFT JOIN totalYoYGrowth total_yoy ON 1=1
                ),


                SmpaTotalSummary AS (
                    SELECT
                      CAST(NULL AS INT) AS organisation_id,
                      CAST('SMPA TOTAL' AS NVARCHAR(100)) AS port,
                      CAST('SMPA' AS NVARCHAR(50)) AS port_group,
                      smpa_lfx1.smpaTotalLastFiscalX1 AS lastFiscalX1,
                      smpa_lfy1.smpaTotalLastFiscalY1 AS lastFiscalY1,
                      smpa_lfz1.smpaTotalLastFiscalZ1 AS lastFiscalZ1,
                      smpa_cfx2.smpaTotalCurrentFiscalX2 AS currentFiscalX2,
                      smpa_cfy2.smpaTotalCurrentFiscalY2 AS currentFiscalY2,
                      smpa_cfz2.smpaTotalCurrentFiscalZ2 AS currentFiscalZ2,
                      smpa_lfyTargetAgg.smpaTotalLastFiscalYearTarget AS lastFiscalYearTarget,
                      smpa_cfyTargetAgg.smpaTotalCurrentFiscalYearTarget AS currentFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS totalCurrentFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS totalLastFiscalYearTarget,
                      smpa_cfyTargetAgg.smpaTotalCurrentFiscalYearTarget AS totalSmpaCurrentFiscalYearTarget,
                      smpa_lfyTargetAgg.smpaTotalLastFiscalYearTarget AS smpaTotalLastFiscalYearTarget,
                      CAST(NULL AS DECIMAL(18, 0)) AS prevMonthData,
                      CAST(NULL AS DECIMAL(18, 0)) AS prevPrevMonthData,
                      smpa_mom.smpaMoMGrowth AS momGrowth,
                      smpa_yoy.smpaYoYGrowth AS yoyGrowth,
                      CAST(NULL AS INT) AS momRanking,
                     CAST(NULL AS INT) AS yoyRanking,
                      CAST(2 AS INT) AS sort_order
                    FROM (SELECT 1 AS dummy) AS d -- Dummy table for LEFT JOINs
                    LEFT JOIN smpaTotalLastFiscalX1 smpa_lfx1 ON 1=1
                    LEFT JOIN smpaTotalLastFiscalY1 smpa_lfy1 ON 1=1
                    LEFT JOIN smpaTotalLastFiscalZ1 smpa_lfz1 ON 1=1
                    LEFT JOIN smpaTotalCurrentFiscalX2 smpa_cfx2 ON 1=1
                    LEFT JOIN smpaTotalCurrentFiscalY2 smpa_cfy2 ON 1=1
                    LEFT JOIN smpaTotalCurrentFiscalZ2 smpa_cfz2 ON 1=1
                    LEFT JOIN SmpaTotalLastFiscalYearTargetAgg smpa_lfyTargetAgg ON 1=1
                    LEFT JOIN SmpaTotalCurrentFiscalYearTargetAgg smpa_cfyTargetAgg ON 1=1
                    LEFT JOIN smpaMoMGrowth smpa_mom ON 1=1
                    LEFT JOIN smpaYoYGrowth smpa_yoy ON 1=1
                )


                SELECT * FROM TotalSummary
                UNION ALL
                SELECT * FROM SmpaTotalSummary
                UNION ALL
                SELECT * FROM FinalData
                ORDER BY sort_order, port;
            `;
    const request = conn.request();
    request.input("currentFiscalYear", currentFiscalYear);
    request.input("lastFiscalYear", lastFiscalYear);
    request.input("prevMonth", prevMonth);
    request.input("zMonthCount", zMonthCount);
    request.input("endMonth", endMonth);
    request.input("monthCount", monthCount);
    request.input("xMonthCount", xMonthCount);

    const result = await request.query(query);
    
    return res.json({ rowData: result.recordset });

  } catch (error) {
    console.error("Error fetching Effective OSBD Report (20_1_1):", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}



async function getEffectiveObsd_20_2_1_Report(req, res) {
        const conn = await pool; 
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const query =` WITH MonthlyData AS (
                SELECT
                    organisation_id,
                    fiscal_year,
                    month,
                    SUM(effective_osbd_overall) AS total_osbd_overall,
                    SUM(total_cargo_handled) AS total_cargo_handled_for_weighted_avg
                FROM tbl_kpi_time_performance
                GROUP BY organisation_id, fiscal_year, month
            ),
            PivotedData AS (
                SELECT
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    m.fiscal_year,
                    SUM(CASE WHEN m.month = 4 THEN m.total_osbd_overall END) AS April,
                    SUM(CASE WHEN m.month = 5 THEN m.total_osbd_overall END) AS May,
                    SUM(CASE WHEN m.month = 6 THEN m.total_osbd_overall END) AS June,
                    SUM(CASE WHEN m.month = 7 THEN m.total_osbd_overall END) AS July,
                    SUM(CASE WHEN m.month = 8 THEN m.total_osbd_overall END) AS August,
                    SUM(CASE WHEN m.month = 9 THEN m.total_osbd_overall END) AS September,
                    SUM(CASE WHEN m.month = 10 THEN m.total_osbd_overall END) AS October,
                    SUM(CASE WHEN m.month = 11 THEN m.total_osbd_overall END) AS November,
                    SUM(CASE WHEN m.month = 12 THEN m.total_osbd_overall END) AS December,
                    SUM(CASE WHEN m.month = 1 THEN m.total_osbd_overall END) AS January,
                    SUM(CASE WHEN m.month = 2 THEN m.total_osbd_overall END) AS February,
                    SUM(CASE WHEN m.month = 3 THEN m.total_osbd_overall END) AS March
                FROM MonthlyData m
                JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
                GROUP BY o.organisation_id, o.organisation_name, m.fiscal_year

                UNION ALL

                SELECT
                    0 AS organisation_id, -- A dummy ID for the total row
                    'Total' AS majorPort, -- Now correctly outputs 'Total' from backend
                    m.fiscal_year,
                    ROUND(SUM(CASE WHEN m.month = 4 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 4 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS April,
                    ROUND(SUM(CASE WHEN m.month = 5 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 5 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS May,
                    ROUND(SUM(CASE WHEN m.month = 6 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 6 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS June,
                    ROUND(SUM(CASE WHEN m.month = 7 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 7 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS July,
                    ROUND(SUM(CASE WHEN m.month = 8 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 8 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS August,
                    ROUND(SUM(CASE WHEN m.month = 9 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 9 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS September,
                    ROUND(SUM(CASE WHEN m.month = 10 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 10 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS October,
                    ROUND(SUM(CASE WHEN m.month = 11 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 11 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS November,
                    ROUND(SUM(CASE WHEN m.month = 12 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 12 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS December,
                    ROUND(SUM(CASE WHEN m.month = 1 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 1 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS January,
                    ROUND(SUM(CASE WHEN m.month = 2 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 2 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS February,
                    ROUND(SUM(CASE WHEN m.month = 3 THEN m.total_cargo_handled_for_weighted_avg END) /
                        NULLIF(SUM(CASE WHEN m.month = 3 THEN m.total_cargo_handled_for_weighted_avg / NULLIF(m.total_osbd_overall, 0) END), 0), 2) AS March
                FROM MonthlyData m
                GROUP BY m.fiscal_year
            )
            SELECT * FROM PivotedData
            WHERE
                COALESCE(April, 0) + COALESCE(May, 0) + COALESCE(June, 0) +
                COALESCE(July, 0) + COALESCE(August, 0) + COALESCE(September, 0) +
                COALESCE(October, 0) + COALESCE(November, 0) + COALESCE(December, 0) +
                COALESCE(January, 0) + COALESCE(February, 0) + COALESCE(March, 0) > 0
            ORDER BY majorPort, fiscal_year DESC;`;

        const request = conn.request();
        request.input("prevMonth", prevMonth);

        const result = await request.query(query);
        const rowData = result.recordset;

    
        return res.json({ rowData });

    } catch (error) {
        console.error("Error fetching OBSD 5.2.1 report:", error); 
        return res.status(500).json({ error: "Internal Server Error" });
    }

}
  
  async function getEffectiveObsd_20_3_1_Report(req, res) {
  
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
                  return `MAX(CASE WHEN cwa.fiscal_year = '${year}' THEN cwa.weighted_average_osbd END) AS "FY${year}"`;
              }).join(',\n');
  
              const fiscalYearSumCondition = fiscalYears.map(year => {
                  return `COALESCE(MAX(CASE WHEN cwa.fiscal_year = '${year}' THEN cwa.weighted_average_osbd END), 0)`;
              }).join(' + ');
              const query = `
              WITH YearlyAggregatedData AS (
                  SELECT
                      v.organisation_id,
                      v.fiscal_year,
                      -- Calculate the numerator for the weighted average
                      SUM(v.effective_osbd_overall * v.total_cargo_handled) AS sum_osbd_x_cargo,
                      -- Calculate the denominator for the weighted average
                      SUM(v.total_cargo_handled) AS total_cargo_handled_sum
                  FROM tbl_kpi_time_performance v
                  GROUP BY v.organisation_id, v.fiscal_year
              ),
              CalculatedWeightedAvg AS (
                  SELECT
                      yd.organisation_id,
                      o.organisation_name AS majorPort,
                      yd.fiscal_year,
                      -- Calculate the weighted average, handling division by zero
                      CASE
                          WHEN yd.total_cargo_handled_sum IS NULL OR yd.total_cargo_handled_sum = 0 THEN NULL
                          ELSE ROUND(yd.sum_osbd_x_cargo / yd.total_cargo_handled_sum, 2)
                      END AS weighted_average_osbd
                  FROM YearlyAggregatedData yd
                  JOIN mmt_organisation o ON yd.organisation_id = o.organisation_id
              )
              SELECT
                  cwa.organisation_id,
                  cwa.majorPort,
                  ${fiscalYearConditions} -- This will now correctly pivot weighted averages for all dynamic years
              FROM CalculatedWeightedAvg cwa
              GROUP BY cwa.organisation_id, cwa.majorPort
              HAVING ${fiscalYearSumCondition} > 0
              ORDER BY cwa.majorPort;
          `;
  
              const result = await conn.request().query(query);
              return res.json({ rowData: result.recordset });
  
          } catch (error) {
              console.error("Error fetching year-wise vessel traffic report:", error);
              return res.status(500).json({ error: "Internal Server Error" });
          } 
  }

export default { getDwellTimeImportCycle_k_1_3_1_Report ,getDwellTimeCalMonthWise_k_1_3_2_Report, 
    getDwellTimeCalYearWise_k_1_3_3_Report, getPortPerformance_k_1_4_1_Report, getPortPerformance_k_1_4_2_Report,
    getPortPerformance_k_1_4_3_Report, getObsd_5_1_1_Report, getObsd_5_2_1_Report, getObsd_5_3_1_Report, 
    getEffectiveObsd_20_1_1_Report, getEffectiveObsd_20_2_1_Report, getEffectiveObsd_20_3_1_Report
};