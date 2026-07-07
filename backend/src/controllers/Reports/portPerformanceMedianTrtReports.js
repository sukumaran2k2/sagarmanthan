import { pool } from "../../db.js";

async function getMedianTrtPortPerformance_k_1_18_1_Report(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        let prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        let currentFiscalYear = (currentMonth > 4)
            ? `${currentYear}-${currentYear + 1}`
            : `${currentYear - 1}-${currentYear}`;
        let lastFiscalYear = (currentMonth > 4)
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
DECLARE @currentFiscalYear NVARCHAR(9) = '${currentFiscalYear}';
DECLARE @lastFiscalYear NVARCHAR(9) = '${lastFiscalYear}';
DECLARE @prevMonth INT = ${prevMonth};

WITH LastFiscalYearX1_Median AS (
    SELECT 
        t1.organisation_id,
        MIN(t1.median_trt_overall) AS lastFiscalX1
    FROM (
        SELECT 
            organisation_id, 
            month, 
            median_trt_overall,
            total_sailed_vessel_handled,
            SUM(total_sailed_vessel_handled) OVER (
                PARTITION BY organisation_id 
                ORDER BY CAST(median_trt_overall AS DECIMAL(12, 2)) 
                ROWS UNBOUNDED PRECEDING
            ) AS cumulative_sum,
            (
                SELECT SUM(total_sailed_vessel_handled)
                FROM tbl_kpi_time_performance t2
                WHERE t2.organisation_id = t1.organisation_id
                  AND t2.fiscal_year = @lastFiscalYear
                  AND (
                      (@prevMonth <= 3 AND (t2.month < @prevMonth OR t2.month >= 4))
                      OR (@prevMonth > 3 AND (t2.month < @prevMonth AND t2.month >= 4))
                  )
            ) AS total_vessels
        FROM tbl_kpi_time_performance t1
        WHERE t1.fiscal_year = @lastFiscalYear
          AND (
              (@prevMonth <= 3 AND (t1.month < @prevMonth OR t1.month >= 4))
              OR (@prevMonth > 3 AND (t1.month < @prevMonth AND t1.month >= 4))
          )
          AND t1.organisation_id IN (
              SELECT organisation_id
              FROM tbl_kpi_time_performance
              WHERE fiscal_year = @lastFiscalYear
                AND (
                    (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4))
                    OR (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                )
              GROUP BY organisation_id
              HAVING COUNT(DISTINCT month) = 
                  CASE 
                      WHEN @prevMonth <= 3 THEN @prevMonth + 9 
                      ELSE @prevMonth - 4 
                  END
          )
    ) t1
    WHERE cumulative_sum >= (total_vessels * 1.0) / 2
    GROUP BY organisation_id
),

LastFiscalYearY1_Median AS (
    SELECT organisation_id,
        MIN(median_trt_overall) AS lastFiscalY1
    FROM (
        SELECT organisation_id, median_trt_overall,
            SUM(total_sailed_vessel_handled) OVER (PARTITION BY organisation_id ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
            (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
             WHERE t2.organisation_id = t1.organisation_id 
             AND t2.fiscal_year = @lastFiscalYear
             AND t2.month = @prevMonth) AS total_vessels
        FROM tbl_kpi_time_performance t1
        WHERE fiscal_year = @lastFiscalYear
        AND month = @prevMonth
    ) y
    WHERE cumulative_sum >= (total_vessels * 1.0) / 2
    GROUP BY organisation_id
),

LastFiscalYearZ1_Median AS (
    SELECT organisation_id,
        MIN(median_trt_overall) AS lastFiscalZ1
    FROM (
        SELECT organisation_id, median_trt_overall,
            SUM(total_sailed_vessel_handled) OVER (PARTITION BY organisation_id ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
            (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
             WHERE t2.organisation_id = t1.organisation_id 
             AND t2.fiscal_year = @lastFiscalYear
             AND (
                (@prevMonth <= 3 AND (t2.month <= @prevMonth OR t2.month >= 4))
                OR (@prevMonth > 3 AND t2.month <= @prevMonth)
             )) AS total_vessels
        FROM tbl_kpi_time_performance t1
        WHERE fiscal_year = @lastFiscalYear
        AND (
            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4))
            OR (@prevMonth > 3 AND month <= @prevMonth)
        )
    ) z
    WHERE cumulative_sum >= (total_vessels * 1.0) / 2
    GROUP BY organisation_id
),

CurrentFiscalYearX2_Median AS (
    SELECT 
        t1.organisation_id,
        MIN(t1.median_trt_overall) AS currentFiscalX2
    FROM (
        SELECT 
            organisation_id, 
            month, 
            median_trt_overall,
            total_sailed_vessel_handled,
            SUM(total_sailed_vessel_handled) OVER (
                PARTITION BY organisation_id 
                ORDER BY CAST(median_trt_overall AS DECIMAL(12, 2)) 
                ROWS UNBOUNDED PRECEDING
            ) AS cumulative_sum,
            (
                SELECT SUM(total_sailed_vessel_handled)
                FROM tbl_kpi_time_performance t2
                WHERE t2.organisation_id = t1.organisation_id
                  AND t2.fiscal_year = @currentFiscalYear
                  AND (
                      (@prevMonth <= 3 AND (t2.month < @prevMonth OR t2.month >= 4))
                      OR (@prevMonth > 3 AND t2.month < @prevMonth)
                  )
            ) AS total_vessels
        FROM tbl_kpi_time_performance t1
        WHERE t1.fiscal_year = @currentFiscalYear
          AND (
              (@prevMonth <= 3 AND (t1.month < @prevMonth OR t1.month >= 4))
              OR (@prevMonth > 3 AND t1.month < @prevMonth)
          )
          AND t1.organisation_id IN (
              SELECT organisation_id
              FROM tbl_kpi_time_performance
              WHERE fiscal_year = @currentFiscalYear
                AND (
                    (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4))
                    OR (@prevMonth > 3 AND month < @prevMonth)
                )
              GROUP BY organisation_id
              HAVING COUNT(DISTINCT month) = 
                  CASE 
                      WHEN @prevMonth <= 3 THEN @prevMonth + 9 
                      ELSE @prevMonth - 4 
                  END
          )
    ) t1
    WHERE cumulative_sum >= (total_vessels * 1.0) / 2
    GROUP BY organisation_id
),

CurrentFiscalYearY2_Median AS (
    SELECT organisation_id,
        MIN(median_trt_overall) AS currentFiscalY2
    FROM (
        SELECT organisation_id, median_trt_overall,
            SUM(total_sailed_vessel_handled) OVER (PARTITION BY organisation_id ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
            (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
             WHERE t2.organisation_id = t1.organisation_id 
             AND t2.fiscal_year = @currentFiscalYear
             AND t2.month = @prevMonth) AS total_vessels
        FROM tbl_kpi_time_performance t1
        WHERE fiscal_year = @currentFiscalYear
        AND month = @prevMonth
    ) y2
    WHERE cumulative_sum >= (total_vessels * 1.0) / 2
    GROUP BY organisation_id
),

CurrentFiscalYearZ2_Median AS (
    SELECT organisation_id,
        MIN(median_trt_overall) AS currentFiscalZ2
    FROM (
        SELECT organisation_id, median_trt_overall,
            SUM(total_sailed_vessel_handled) OVER (PARTITION BY organisation_id ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
            (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
             WHERE t2.organisation_id = t1.organisation_id 
             AND t2.fiscal_year = @currentFiscalYear
             AND (
                (@prevMonth <= 3 AND (t2.month <= @prevMonth OR t2.month >= 4))
                OR (@prevMonth > 3 AND t2.month <= @prevMonth)
             )) AS total_vessels
        FROM tbl_kpi_time_performance t1
        WHERE fiscal_year = @currentFiscalYear
        AND (
            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4))
            OR (@prevMonth > 3 AND month <= @prevMonth)
        )
    ) z2
    WHERE cumulative_sum >= (total_vessels * 1.0) / 2
    GROUP BY organisation_id
),

MonthlyData AS (
    SELECT 
        pm.organisation_id,
        pm.prevMonthData,
        ppm.prevPrevMonthData
    FROM 
        (SELECT organisation_id,
            MIN(median_trt_overall) AS prevMonthData
        FROM (
            SELECT organisation_id, median_trt_overall,
                SUM(total_sailed_vessel_handled) OVER (PARTITION BY organisation_id ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
                 WHERE t2.organisation_id = t1.organisation_id 
                 AND t2.fiscal_year = @currentFiscalYear
                 AND t2.month = @prevMonth) AS total_vessels
            FROM tbl_kpi_time_performance t1
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth
        ) pm_inner
        WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        GROUP BY organisation_id
        ) pm
    FULL OUTER JOIN
        (SELECT organisation_id,
            MIN(median_trt_overall) AS prevPrevMonthData
        FROM (
            SELECT organisation_id, median_trt_overall,
                SUM(total_sailed_vessel_handled) OVER (PARTITION BY organisation_id ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
                 WHERE t2.organisation_id = t1.organisation_id 
                 AND t2.fiscal_year = @currentFiscalYear
                 AND t2.month = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END) AS total_vessels
            FROM tbl_kpi_time_performance t1
            WHERE fiscal_year = @currentFiscalYear
            AND month = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END
        ) ppm_inner
        WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        GROUP BY organisation_id
        ) ppm
    ON pm.organisation_id = ppm.organisation_id
),

LastFiscalYearTarget AS (
    SELECT 
        t1.organisation_id,
        MIN(t1.median_trt_overall) AS lastFiscalYearTarget
    FROM (
        SELECT 
            organisation_id,
            month,
            median_trt_overall,
            total_sailed_vessel_handled,
            SUM(total_sailed_vessel_handled) OVER (
                PARTITION BY organisation_id 
                ORDER BY CAST(median_trt_overall AS DECIMAL(12,2)) 
                ROWS UNBOUNDED PRECEDING
            ) AS cumulative_sum,
            (
                SELECT SUM(total_sailed_vessel_handled)
                FROM tbl_kpi_time_performance t2
                WHERE t2.organisation_id = t1.organisation_id
                AND t2.fiscal_year = @lastFiscalYear
            ) AS total_vessels
        FROM tbl_kpi_time_performance t1
        WHERE fiscal_year = @lastFiscalYear
          AND organisation_id IN (
              SELECT organisation_id
              FROM tbl_kpi_time_performance
              WHERE fiscal_year = @lastFiscalYear
              GROUP BY organisation_id
              HAVING COUNT(DISTINCT month) = 12
          )
    ) t1
    WHERE cumulative_sum >= (total_vessels * 1.0) / 2
    GROUP BY organisation_id
),

CurrentFiscalYearTarget AS (
    SELECT 
        tpt.organisation_id,
        NULLIF(SUM(tpt.target_value), 0) AS currentFiscalYearTarget
    FROM tbl_kpi_time_performance_target tpt
    WHERE tpt.financial_year = @currentFiscalYear
    AND tpt.kpi_type_id = 2
    AND tpt.is_overall = 0
    AND tpt.organisation_id IS NOT NULL
    GROUP BY tpt.organisation_id
),
FinalData AS (
    SELECT
        o.organisation_id,
        o.organisation_name AS port,
        t1.lastFiscalYearTarget,
        t2.currentFiscalYearTarget,
        lfx1.lastFiscalX1, 
        lfy1.lastFiscalY1, 
        lfz1.lastFiscalZ1,
        cfx2.currentFiscalX2, 
        cfy2.currentFiscalY2, 
        cfz2.currentFiscalZ2,
        m.prevMonthData,
        m.prevPrevMonthData,
        CASE WHEN o.organisation_id IN (54, 55) THEN 1 ELSE 0 END AS is_smpa_port
    FROM (
        SELECT organisation_id 
        FROM tbl_kpi_time_performance 
        WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
        UNION
        SELECT organisation_id 
        FROM tbl_kpi_time_performance_target 
        WHERE financial_year IN (@lastFiscalYear, @currentFiscalYear)
        AND kpi_type_id = 2
    ) t
    LEFT JOIN mmt_organisation o ON t.organisation_id = o.organisation_id
    LEFT JOIN LastFiscalYearTarget t1 ON t.organisation_id = t1.organisation_id
    LEFT JOIN CurrentFiscalYearTarget t2 ON t.organisation_id = t2.organisation_id
    LEFT JOIN MonthlyData m ON t.organisation_id = m.organisation_id
    LEFT JOIN LastFiscalYearX1_Median lfx1 ON t.organisation_id = lfx1.organisation_id
    LEFT JOIN LastFiscalYearY1_Median lfy1 ON t.organisation_id = lfy1.organisation_id
    LEFT JOIN (
        SELECT 
            organisation_id, 
            MAX(ytd_median_trt_overall) AS lastFiscalZ1
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @lastFiscalYear
        AND month = @prevMonth
        GROUP BY organisation_id
    ) lfz1 ON t.organisation_id = lfz1.organisation_id
    LEFT JOIN CurrentFiscalYearX2_Median cfx2 ON t.organisation_id = cfx2.organisation_id
    LEFT JOIN CurrentFiscalYearY2_Median cfy2 ON t.organisation_id = cfy2.organisation_id
    LEFT JOIN (
        SELECT 
            organisation_id, 
            MAX(ytd_median_trt_overall) AS currentFiscalZ2
        FROM tbl_kpi_time_performance
        WHERE fiscal_year = @currentFiscalYear
        AND month = @prevMonth
        GROUP BY organisation_id
    ) cfz2 ON t.organisation_id = cfz2.organisation_id
    WHERE o.organisation_name IS NOT NULL
),
ValidPortsForMedian AS (
    SELECT organisation_id,

        -- Must have exactly 12 months for target
        CASE 
            WHEN COUNT(DISTINCT CASE 
                WHEN fiscal_year = @lastFiscalYear THEN month 
            END) = 12 
            THEN 1 ELSE 0 
        END AS valid_LFY_Target,

        -- Must have exactly required months for X1
        CASE 
            WHEN COUNT(DISTINCT CASE 
                WHEN fiscal_year = @lastFiscalYear AND (
                    (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) OR 
                    (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                ) 
                THEN month 
            END) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 9 
                    ELSE @prevMonth - 4 
                END 
            THEN 1 ELSE 0 
        END AS valid_LFY_X1,

        -- Must have exactly required months for X2
        CASE 
            WHEN COUNT(DISTINCT CASE 
                WHEN fiscal_year = @currentFiscalYear AND (
                    (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) OR 
                    (@prevMonth > 3 AND month < @prevMonth)
                ) 
                THEN month 
            END) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 9 
                    ELSE @prevMonth - 4 
                END 
            THEN 1 ELSE 0 
        END AS valid_CFY_X2,

        -- At least 1 month for Z1
        CASE 
            WHEN COUNT(DISTINCT CASE 
                WHEN fiscal_year = @lastFiscalYear AND (
                    (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) OR 
                    (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                ) 
                THEN month 
            END) >= 1 
            THEN 1 ELSE 0 
        END AS valid_LFY_Z1,

        -- At least 1 month for Z2
        CASE 
            WHEN COUNT(DISTINCT CASE 
                WHEN fiscal_year = @currentFiscalYear AND (
                    (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) OR 
                    (@prevMonth > 3 AND month <= @prevMonth)
                ) 
                THEN month 
            END) >= 1 
            THEN 1 ELSE 0 
        END AS valid_CFY_Z2

    FROM tbl_kpi_time_performance
    GROUP BY organisation_id
),
TotalData AS (
    SELECT 
        'Total' AS port,

        -- totalLastFiscalX1
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance t2
                    JOIN ValidPortsForMedian vp ON t2.organisation_id = vp.organisation_id
                    WHERE t2.fiscal_year = @lastFiscalYear
                      AND (
                           (@prevMonth <= 3 AND (t2.month < @prevMonth OR t2.month >= 4)) OR
                           (@prevMonth > 3 AND (t2.month < @prevMonth AND t2.month >= 4))
                      )
                      AND vp.valid_LFY_X1 = 1) AS total_vessels
            FROM tbl_kpi_time_performance t1
            JOIN ValidPortsForMedian vp ON t1.organisation_id = vp.organisation_id
            WHERE t1.fiscal_year = @lastFiscalYear
              AND (
                   (@prevMonth <= 3 AND (t1.month < @prevMonth OR t1.month >= 4)) OR
                   (@prevMonth > 3 AND (t1.month < @prevMonth AND t1.month >= 4))
              )
              AND vp.valid_LFY_X1 = 1
         ) lfx1
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalLastFiscalX1,

        -- totalLastFiscalY1
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
                 WHERE t2.fiscal_year = @lastFiscalYear
                 AND t2.month = @prevMonth) AS total_vessels
            FROM tbl_kpi_time_performance t1
            WHERE fiscal_year = @lastFiscalYear
            AND month = @prevMonth
         ) y_total
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalLastFiscalY1,

        -- totalLastFiscalZ1
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance t2
                    JOIN ValidPortsForMedian vp ON t2.organisation_id = vp.organisation_id
                    WHERE t2.fiscal_year = @lastFiscalYear
                      AND (
                           (@prevMonth <= 3 AND (t2.month <= @prevMonth OR t2.month >= 4)) OR
                           (@prevMonth > 3 AND (t2.month <= @prevMonth AND t2.month >= 4))
                      )
                      AND vp.valid_LFY_Z1 = 1) AS total_vessels
            FROM tbl_kpi_time_performance t1
            JOIN ValidPortsForMedian vp ON t1.organisation_id = vp.organisation_id
            WHERE t1.fiscal_year = @lastFiscalYear
              AND (
                   (@prevMonth <= 3 AND (t1.month <= @prevMonth OR t1.month >= 4)) OR
                   (@prevMonth > 3 AND (t1.month <= @prevMonth AND t1.month >= 4))
              )
              AND vp.valid_LFY_Z1 = 1
         ) z1
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalLastFiscalZ1,

        -- totalCurrentFiscalX2
          (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance t2
                    JOIN ValidPortsForMedian vp ON t2.organisation_id = vp.organisation_id
                    WHERE t2.fiscal_year = @currentFiscalYear
                      AND (
                           (@prevMonth <= 3 AND (t2.month < @prevMonth OR t2.month >= 4)) OR
                           (@prevMonth > 3 AND t2.month < @prevMonth)
                      )
                      AND vp.valid_CFY_X2 = 1) AS total_vessels
            FROM tbl_kpi_time_performance t1
            JOIN ValidPortsForMedian vp ON t1.organisation_id = vp.organisation_id
            WHERE t1.fiscal_year = @currentFiscalYear
              AND (
                   (@prevMonth <= 3 AND (t1.month < @prevMonth OR t1.month >= 4)) OR
                   (@prevMonth > 3 AND t1.month < @prevMonth)
              )
              AND vp.valid_CFY_X2 = 1
         ) x2
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalCurrentFiscalX2,

        -- totalCurrentFiscalY2
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
                 WHERE t2.fiscal_year = @currentFiscalYear
                 AND t2.month = @prevMonth) AS total_vessels
            FROM tbl_kpi_time_performance t1
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth
         ) y2_total
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalCurrentFiscalY2,

        -- totalCurrentFiscalZ2
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance t2
                    JOIN ValidPortsForMedian vp ON t2.organisation_id = vp.organisation_id
                    WHERE t2.fiscal_year = @currentFiscalYear
                      AND (
                           (@prevMonth <= 3 AND (t2.month <= @prevMonth OR t2.month >= 4)) OR
                           (@prevMonth > 3 AND t2.month <= @prevMonth)
                      )
                      AND vp.valid_CFY_Z2 = 1) AS total_vessels
            FROM tbl_kpi_time_performance t1
            JOIN ValidPortsForMedian vp ON t1.organisation_id = vp.organisation_id
            WHERE t1.fiscal_year = @currentFiscalYear
              AND (
                   (@prevMonth <= 3 AND (t1.month <= @prevMonth OR t1.month >= 4)) OR
                   (@prevMonth > 3 AND t1.month <= @prevMonth)
              )
              AND vp.valid_CFY_Z2 = 1
         ) z2
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalCurrentFiscalZ2,

        -- totalLastFiscalYearTarget
         (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance t2
                    JOIN ValidPortsForMedian vp ON t2.organisation_id = vp.organisation_id
                    WHERE t2.fiscal_year = @lastFiscalYear
                      AND vp.valid_LFY_Target = 1) AS total_vessels
            FROM tbl_kpi_time_performance t1
            JOIN ValidPortsForMedian vp ON t1.organisation_id = vp.organisation_id
            WHERE t1.fiscal_year = @lastFiscalYear
              AND vp.valid_LFY_Target = 1
         ) tgt
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalLastFiscalYearTarget,

        -- totalCurrentFiscalYearTarget (Sum, same as avg TRT report)
        NULLIF((
            SELECT SUM(target_value)
            FROM tbl_kpi_time_performance_target
            WHERE financial_year = @currentFiscalYear
            AND kpi_type_id = 2
            AND organisation_id IS NULL
            AND is_overall = 1
        ), 0) AS totalCurrentFiscalYearTarget,

        -- totalCurrentFiscalY3
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                SUM(total_sailed_vessel_handled) OVER (ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING) AS cumulative_sum,
                (SELECT SUM(total_sailed_vessel_handled) FROM tbl_kpi_time_performance t2 
                 WHERE t2.fiscal_year = @currentFiscalYear
                 AND t2.month = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END) AS total_vessels
            FROM tbl_kpi_time_performance t1
            WHERE fiscal_year = @currentFiscalYear
            AND month = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END
         ) y3_total
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS totalCurrentFiscalY3
),

SMPATotalData AS (
    SELECT 
        'Total SMPA' AS port,

        -- smpaLastFiscalX1
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND (
                          (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) OR
                          (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                      )
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
              AND (
                  (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) OR
                  (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
              )
              AND organisation_id IN (54, 55)
         ) x1
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaLastFiscalX1,

        -- smpaLastFiscalY1
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND month = @prevMonth
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
              AND month = @prevMonth
              AND organisation_id IN (54, 55)
         ) y1
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaLastFiscalY1,

        -- smpaLastFiscalZ1
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND (
                          (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) OR
                          (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                      )
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
              AND (
                  (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) OR
                  (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
              )
              AND organisation_id IN (54, 55)
         ) z1
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaLastFiscalZ1,

        -- smpaCurrentFiscalX2
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND (
                          (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) OR
                          (@prevMonth > 3 AND month < @prevMonth)
                      )
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
              AND (
                  (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) OR
                  (@prevMonth > 3 AND month < @prevMonth)
              )
              AND organisation_id IN (54, 55)
         ) x2
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaCurrentFiscalX2,

        -- smpaCurrentFiscalY2
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month = @prevMonth
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
              AND month = @prevMonth
              AND organisation_id IN (54, 55)
         ) y2
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaCurrentFiscalY2,

        -- smpaCurrentFiscalZ2
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND (
                          (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) OR
                          (@prevMonth > 3 AND month <= @prevMonth)
                      )
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
              AND (
                  (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) OR
                  (@prevMonth > 3 AND month <= @prevMonth)
              )
              AND organisation_id IN (54, 55)
         ) z2
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaCurrentFiscalZ2,

        -- smpaLastFiscalYearTarget
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @lastFiscalYear
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
              AND organisation_id IN (54, 55)
         ) t
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaLastFiscalYearTarget,

        -- smpaCurrentFiscalYearTarget
        NULLIF((
            SELECT target_value
            FROM tbl_kpi_time_performance_target
            WHERE financial_year = @currentFiscalYear
            AND kpi_type_id = 2
            AND is_totalSmpa = 1
            AND organisation_id IS NULL
        ), 0) AS smpaCurrentFiscalYearTarget,

        -- smpaCurrentFiscalY3
        (SELECT MIN(median_trt_overall)
         FROM (
            SELECT median_trt_overall,
                   SUM(total_sailed_vessel_handled) OVER (
                       ORDER BY median_trt_overall ASC ROWS UNBOUNDED PRECEDING
                   ) AS cumulative_sum,
                   (SELECT SUM(total_sailed_vessel_handled)
                    FROM tbl_kpi_time_performance
                    WHERE fiscal_year = @currentFiscalYear
                      AND month = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END
                      AND organisation_id IN (54, 55)
                   ) AS total_vessels
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
              AND month = CASE WHEN @prevMonth = 1 THEN 12 ELSE @prevMonth - 1 END
              AND organisation_id IN (54, 55)
         ) y3
         WHERE cumulative_sum >= (total_vessels * 1.0) / 2
        ) AS smpaCurrentFiscalY3
)

SELECT * FROM (
    SELECT 
        fd.*,
        td.totalLastFiscalX1, 
        td.totalLastFiscalY1, 
        td.totalLastFiscalZ1, 
        td.totalCurrentFiscalX2, 
        td.totalCurrentFiscalY2, 
        td.totalCurrentFiscalZ2, 
        td.totalLastFiscalYearTarget, 
        td.totalCurrentFiscalYearTarget,
        td.totalCurrentFiscalY3,
        CASE 
            WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
            THEN CAST((((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100) AS DECIMAL(10,2))
            ELSE NULL
        END AS momGrowthTotal,
        CASE 
            WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
            THEN CAST((((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100) AS DECIMAL(10,2))
            ELSE NULL
        END AS yoyGrowthTotal,
        st.smpaLastFiscalX1,
        st.smpaLastFiscalY1,
        st.smpaLastFiscalZ1,
        st.smpaCurrentFiscalX2,
        st.smpaCurrentFiscalY2,
        st.smpaCurrentFiscalZ2,
        st.smpaLastFiscalYearTarget,
        st.smpaCurrentFiscalYearTarget,
        st.smpaCurrentFiscalY3,
        CASE 
            WHEN fd.prevPrevMonthData > 0 AND fd.prevMonthData IS NOT NULL
            THEN CAST((((fd.prevMonthData * 1.0) / fd.prevPrevMonthData - 1) * 100) AS DECIMAL(10,2))
            ELSE NULL
        END AS momGrowth,
        CASE 
            WHEN fd.lastFiscalZ1 > 0 AND fd.currentFiscalZ2 IS NOT NULL
            THEN CAST((((fd.currentFiscalZ2 * 1.0) / fd.lastFiscalZ1 - 1) * 100) AS DECIMAL(10,2))
            ELSE NULL
        END AS yoyGrowth,
        0 AS sort_order
    FROM FinalData fd
    CROSS JOIN TotalData td
    CROSS JOIN SMPATotalData st

    UNION ALL

    -- Total SMPA row
    SELECT 
        NULL AS organisation_id,
        st.port,
        st.smpaLastFiscalYearTarget AS lastFiscalYearTarget,
        st.smpaCurrentFiscalYearTarget AS currentFiscalYearTarget,
        st.smpaLastFiscalX1 AS lastFiscalX1,
        st.smpaLastFiscalY1 AS lastFiscalY1,
        st.smpaLastFiscalZ1 AS lastFiscalZ1,
        st.smpaCurrentFiscalX2 AS currentFiscalX2,
        st.smpaCurrentFiscalY2 AS currentFiscalY2,
        st.smpaCurrentFiscalZ2 AS currentFiscalZ2,
        NULL AS prevMonthData,
        NULL AS prevPrevMonthData,
        1 AS is_smpa_port,
        td.totalLastFiscalX1, 
        td.totalLastFiscalY1, 
        td.totalLastFiscalZ1, 
        td.totalCurrentFiscalX2, 
        td.totalCurrentFiscalY2, 
        td.totalCurrentFiscalZ2, 
        td.totalLastFiscalYearTarget, 
        td.totalCurrentFiscalYearTarget,
        td.totalCurrentFiscalY3,
        NULL AS momGrowthTotal,
        NULL AS yoyGrowthTotal,
        st.smpaLastFiscalX1,
        st.smpaLastFiscalY1,
        st.smpaLastFiscalZ1,
        st.smpaCurrentFiscalX2,
        st.smpaCurrentFiscalY2,
        st.smpaCurrentFiscalZ2,
        st.smpaLastFiscalYearTarget,
        st.smpaCurrentFiscalYearTarget,
        st.smpaCurrentFiscalY3,
        CASE 
            WHEN st.smpaCurrentFiscalY3 > 0 AND st.smpaCurrentFiscalY2 IS NOT NULL
            THEN CAST((((st.smpaCurrentFiscalY2 * 1.0) / st.smpaCurrentFiscalY3 - 1) * 100) AS DECIMAL(10,2))
            ELSE NULL
        END AS smpaMomGrowth,
        CASE 
            WHEN st.smpaLastFiscalZ1 > 0 AND st.smpaCurrentFiscalZ2 IS NOT NULL
            THEN CAST((((st.smpaCurrentFiscalZ2 * 1.0) / st.smpaLastFiscalZ1 - 1) * 100) AS DECIMAL(10,2))
            ELSE NULL
        END AS smpaYoyGrowth,
        1 AS sort_order
    FROM TotalData td
    CROSS JOIN SMPATotalData st
) AS combined_data
ORDER BY sort_order, currentFiscalZ2 ASC;

`;

        const result = await conn.query(query);
        const rowData = result.recordset;

        return res.json({
            rowData,
            totalLastFiscalX1: rowData[0]?.totalLastFiscalX1 || null,
            totalCurrentFiscalX2: rowData[0]?.totalCurrentFiscalX2 || null,
            totalLastFiscalZ1: rowData[0]?.totalLastFiscalZ1 || null,
            totalCurrentFiscalZ2: rowData[0]?.totalCurrentFiscalZ2 || null,
            totalLastFiscalYearTarget: rowData[0]?.totalLastFiscalYearTarget || null,
            totalCurrentFiscalYearTarget: rowData[0]?.totalCurrentFiscalYearTarget || null,
            totalLastFiscalY1: rowData[0]?.totalLastFiscalY1 || null,
            totalCurrentFiscalY2: rowData[0]?.totalCurrentFiscalY2 || null,
            momGrowthTotal: rowData[0]?.momGrowthTotal || null,
            yoyGrowthTotal: rowData[0]?.yoyGrowthTotal || null,
            totalCurrentFiscalY3: rowData[0]?.totalCurrentFiscalY3 || null,
            smpaLastFiscalX1: rowData.find(row => row.port === 'Total SMPA')?.smpaLastFiscalX1 || null,
            smpaLastFiscalY1: rowData.find(row => row.port === 'Total SMPA')?.smpaLastFiscalY1 || null,
            smpaLastFiscalZ1: rowData.find(row => row.port === 'Total SMPA')?.smpaLastFiscalZ1 || null,
            smpaCurrentFiscalX2: rowData.find(row => row.port === 'Total SMPA')?.smpaCurrentFiscalX2 || null,
            smpaCurrentFiscalY2: rowData.find(row => row.port === 'Total SMPA')?.smpaCurrentFiscalY2 || null,
            smpaCurrentFiscalZ2: rowData.find(row => row.port === 'Total SMPA')?.smpaCurrentFiscalZ2 || null,
            smpaLastFiscalYearTarget: rowData.find(row => row.port === 'Total SMPA')?.smpaLastFiscalYearTarget || null,
            smpaCurrentFiscalYearTarget: rowData.find(row => row.port === 'Total SMPA')?.smpaCurrentFiscalYearTarget || null,
            smpaMomGrowth: rowData[0]?.smpaMomGrowth || null,
            smpaYoyGrowth: rowData[0]?.smpaYoyGrowth || null
        });

    } catch (error) {
        console.error("Error fetching Median TRT Port Performance report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getMedianTrtPortPerformance_k_1_18_2_Report(req, res) {
    const conn = await pool;
    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;
        const prevMonth = (currentMonth === 1) ? 12 : currentMonth - 1;

        const currentFiscalYear = (currentMonth > 4)
            ? `FY ${currentYear}-${currentYear + 1}`
            : `FY ${currentYear - 1}-${currentYear}`;
        const lastFiscalYear = (currentMonth > 4)
            ? `FY ${currentYear - 1}-${currentYear}`
            : `FY ${currentYear - 2}-${currentYear - 1}`;

        const query = `
            WITH MonthlyData AS (
                SELECT 
                    organisation_id,
                    fiscal_year,
                    month,
                    median_trt_overall,
                    total_sailed_vessel_handled
                FROM tbl_kpi_time_performance
            ),
            PortMonthlyMedian AS (
                SELECT 
                    organisation_id,
                    fiscal_year,
                    month,
                    MIN(median_trt_overall) AS median_value
                FROM (
                    SELECT 
                        organisation_id,
                        fiscal_year,
                        month,
                        median_trt_overall,
                        SUM(total_sailed_vessel_handled) OVER (
                            PARTITION BY organisation_id, fiscal_year, month 
                            ORDER BY median_trt_overall ASC 
                            ROWS UNBOUNDED PRECEDING
                        ) AS cumulative_sum,
                        SUM(total_sailed_vessel_handled) OVER (
                            PARTITION BY organisation_id, fiscal_year, month
                        ) AS total_vessels
                    FROM MonthlyData
                ) x
                WHERE cumulative_sum >= (total_vessels * 1.0) / 2
                GROUP BY organisation_id, fiscal_year, month
            ),
            PortMonthlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    m.fiscal_year,
                    m.month,
                    m.median_value
                FROM PortMonthlyMedian m
                JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
            ),
            PivotedPortData AS (
                SELECT 
                    organisation_id,
                    majorPort,
                    fiscal_year,
                    MAX(CASE WHEN month = 4 THEN median_value END) AS April,
                    MAX(CASE WHEN month = 5 THEN median_value END) AS May,
                    MAX(CASE WHEN month = 6 THEN median_value END) AS June,
                    MAX(CASE WHEN month = 7 THEN median_value END) AS July,
                    MAX(CASE WHEN month = 8 THEN median_value END) AS August,
                    MAX(CASE WHEN month = 9 THEN median_value END) AS September,
                    MAX(CASE WHEN month = 10 THEN median_value END) AS October,
                    MAX(CASE WHEN month = 11 THEN median_value END) AS November,
                    MAX(CASE WHEN month = 12 THEN median_value END) AS December,
                    MAX(CASE WHEN month = 1 THEN median_value END) AS January,
                    MAX(CASE WHEN month = 2 THEN median_value END) AS February,
                    MAX(CASE WHEN month = 3 THEN median_value END) AS March
                FROM PortMonthlyData
                GROUP BY organisation_id, majorPort, fiscal_year
            ),
            TotalMonthlyMedian AS (
                SELECT 
                    fiscal_year,
                    month,
                    MIN(median_trt_overall) AS median_value
                FROM (
                    SELECT 
                        fiscal_year,
                        month,
                        median_trt_overall,
                        SUM(total_sailed_vessel_handled) OVER (
                            PARTITION BY fiscal_year, month 
                            ORDER BY median_trt_overall ASC 
                            ROWS UNBOUNDED PRECEDING
                        ) AS cumulative_sum,
                        SUM(total_sailed_vessel_handled) OVER (
                            PARTITION BY fiscal_year, month
                        ) AS total_vessels
                    FROM MonthlyData
                ) y
                WHERE cumulative_sum >= (total_vessels * 1.0) / 2
                GROUP BY fiscal_year, month
            ),
            WeightedTotalData AS (
                SELECT 
                    fiscal_year,
                    MAX(CASE WHEN month = 4 THEN median_value END) AS April,
                    MAX(CASE WHEN month = 5 THEN median_value END) AS May,
                    MAX(CASE WHEN month = 6 THEN median_value END) AS June,
                    MAX(CASE WHEN month = 7 THEN median_value END) AS July,
                    MAX(CASE WHEN month = 8 THEN median_value END) AS August,
                    MAX(CASE WHEN month = 9 THEN median_value END) AS September,
                    MAX(CASE WHEN month = 10 THEN median_value END) AS October,
                    MAX(CASE WHEN month = 11 THEN median_value END) AS November,
                    MAX(CASE WHEN month = 12 THEN median_value END) AS December,
                    MAX(CASE WHEN month = 1 THEN median_value END) AS January,
                    MAX(CASE WHEN month = 2 THEN median_value END) AS February,
                    MAX(CASE WHEN month = 3 THEN median_value END) AS March
                FROM TotalMonthlyMedian
                GROUP BY fiscal_year
            )
            SELECT 
                'port' AS data_type,
                organisation_id,
                majorPort,
                fiscal_year,
                April, May, June, July, August, September, 
                October, November, December, January, February, March
            FROM PivotedPortData
            WHERE fiscal_year IN ('${lastFiscalYear.replace('FY ', '')}', '${currentFiscalYear.replace('FY ', '')}')
            
            UNION ALL
            
            SELECT 
                'total' AS data_type,
                NULL AS organisation_id,
                'Total' AS majorPort,
                fiscal_year,
                April, May, June, July, August, September, 
                October, November, December, January, February, March
            FROM WeightedTotalData
            WHERE fiscal_year IN ('${lastFiscalYear.replace('FY ', '')}', '${currentFiscalYear.replace('FY ', '')}')
            
            ORDER BY majorPort, fiscal_year DESC;
        `;

        const request = conn.request();
        const result = await request.query(query);
        const rowData = result.recordset;

        const months = ['April', 'May', 'June', 'July', 'August', 'September',
            'October', 'November', 'December', 'January', 'February', 'March'];

        const totals = {
            [lastFiscalYear]: rowData.find(r => r.data_type === 'total' && r.fiscal_year === lastFiscalYear.replace('FY ', '')),
            [currentFiscalYear]: rowData.find(r => r.data_type === 'total' && r.fiscal_year === currentFiscalYear.replace('FY ', ''))
        };

        const growthTotals = {};
        months.forEach(month => {
            const lastVal = totals[lastFiscalYear]?.[month] || 0;
            const currentVal = totals[currentFiscalYear]?.[month] || 0;

            if (lastVal > 0) {
                growthTotals[month] = ((currentVal - lastVal) / lastVal) * 100;
            } else {
                growthTotals[month] = null;
            }
        });

        return res.json({
            rowData: rowData.filter(r => r.data_type === 'port'),
            totals: {
                [lastFiscalYear]: totals[lastFiscalYear],
                [currentFiscalYear]: totals[currentFiscalYear],
                growth: growthTotals
            },
            currentFiscalYear,
            lastFiscalYear
        });

    } catch (error) {
        console.error("Error fetching Median TRT Month-Wise report (K1.18.2):", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


async function getMedianTrtPortPerformance_k_1_18_3_Report(req, res) {
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

        const fiscalYearColumns = fiscalYears.map(year => {
            return `
                MAX(CASE WHEN wmd.fiscal_year = '${year}' THEN wmd.weighted_median_trt ELSE NULL END) AS "FY${year}"
            `;
        }).join(',\n');

        const totalRowQueries = fiscalYears.map(year => {
            return `
                SELECT 
                    'total' AS type,
                    NULL AS organisation_id,
                    'Total' AS majorPort,
                    (SELECT MIN(median_trt_overall)
                     FROM (
                        SELECT 
                            median_trt_overall,
                            SUM(total_sailed_vessel_handled) OVER (
                                ORDER BY median_trt_overall ASC 
                                ROWS UNBOUNDED PRECEDING
                            ) AS cumulative_sum,
                            (SELECT SUM(total_sailed_vessel_handled) 
                             FROM tbl_kpi_time_performance 
                             WHERE fiscal_year = '${year}') AS total_vessels
                        FROM tbl_kpi_time_performance
                        WHERE fiscal_year = '${year}'
                     ) y
                     WHERE cumulative_sum >= (total_vessels * 1.0) / 2
                    ) AS "FY${year}"
            `;
        });

        const portDataQuery = `
            WITH YearlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    k.fiscal_year,
                    k.median_trt_overall,
                    k.total_sailed_vessel_handled
                FROM tbl_kpi_time_performance k
                JOIN mmt_organisation o ON k.organisation_id = o.organisation_id
            ),
            SortedData AS (
                SELECT
                    organisation_id,
                    fiscal_year,
                    median_trt_overall,
                    total_sailed_vessel_handled,
                    SUM(total_sailed_vessel_handled) OVER (
                        PARTITION BY organisation_id, fiscal_year 
                        ORDER BY median_trt_overall
                        ROWS UNBOUNDED PRECEDING
                    ) AS cumulative_sum,
                    SUM(total_sailed_vessel_handled) OVER (
                        PARTITION BY organisation_id, fiscal_year
                    ) AS total_vessels
                FROM YearlyData
            ),
            WeightedMedianData AS (
                SELECT 
                    organisation_id,
                    fiscal_year,
                    MIN(median_trt_overall) AS weighted_median_trt
                FROM SortedData
                WHERE cumulative_sum >= (total_vessels * 1.0) / 2
                GROUP BY organisation_id, fiscal_year
            )
            SELECT 
                'data' AS type,
                yd.organisation_id,
                yd.majorPort,
                ${fiscalYearColumns}
            FROM (
                SELECT DISTINCT organisation_id, majorPort 
                FROM YearlyData
            ) yd
            LEFT JOIN WeightedMedianData wmd ON yd.organisation_id = wmd.organisation_id
            GROUP BY yd.organisation_id, yd.majorPort
        `;

        const portDataResult = await conn.request().query(portDataQuery);
        const rowData = portDataResult.recordset;

        let totalRow = { type: 'total', organisation_id: null, majorPort: 'Total' };
        for (const query of totalRowQueries) {
            const result = await conn.request().query(query);
            if (result.recordset.length > 0) {
                totalRow = { ...totalRow, ...result.recordset[0] };
            }
        }

        return res.json({
            rowData,
            totals: totalRow,
            fiscalYears: fiscalYears.map(y => `FY${y}`)
        });

    } catch (error) {
        console.error("Error fetching Median TRT Year-Wise report (K1.18.3):", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


export default {
    getMedianTrtPortPerformance_k_1_18_1_Report, getMedianTrtPortPerformance_k_1_18_2_Report, getMedianTrtPortPerformance_k_1_18_3_Report
};