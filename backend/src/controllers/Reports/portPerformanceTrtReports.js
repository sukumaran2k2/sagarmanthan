import { pool } from "../../db.js";

async function getTrtPortPerformance_k_1_2_1_Report(req, res) {
    const conn = await pool;
    try {
        let currentDate = new Date();
        let currentMonth = currentDate.getMonth() + 1;
        let currentYear = currentDate.getFullYear();

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

        WITH LastFiscalYearData AS ( 
            SELECT 
                organisation_id,
                CASE 
                    WHEN (
                        SELECT COUNT(DISTINCT month) 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @lastFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                        )
                    ) = 
                        CASE 
                            WHEN @prevMonth <= 3 THEN @prevMonth + 9
                            ELSE @prevMonth - 3 
                        END
                    THEN NULLIF(SUM(CASE 
                        WHEN fiscal_year = @lastFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                            )
                        THEN average_trt_overall * total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0) 
                    / 
                    NULLIF(SUM(CASE 
                        WHEN fiscal_year = @lastFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                            )
                        THEN total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS lastFiscalZ1,
                
                CASE 
                    WHEN (
                        SELECT COUNT(DISTINCT month) 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @lastFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                        )
                    ) = 
                        CASE 
                            WHEN @prevMonth <= 3 THEN @prevMonth + 8
                            ELSE @prevMonth - 4
                        END
                    THEN NULLIF(SUM(CASE 
                        WHEN fiscal_year = @lastFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                            )
                        THEN average_trt_overall * total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0) / 
                    NULLIF(SUM(CASE 
                        WHEN fiscal_year = @lastFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                            )
                        THEN total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS lastFiscalX1,
                
                CASE
                    WHEN EXISTS (
                        SELECT 1 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @lastFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND month = @prevMonth
                    )
                    THEN NULLIF(SUM(CASE 
                        WHEN fiscal_year = @lastFiscalYear AND month = @prevMonth 
                        THEN average_trt_overall 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS lastFiscalY1
            FROM tbl_kpi_time_performance t
            WHERE fiscal_year = @lastFiscalYear
            GROUP BY organisation_id
        ),
        CurrentFiscalYearData AS (
            SELECT 
                organisation_id,
                CASE 
                    WHEN (
                        SELECT COUNT(DISTINCT month) 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @currentFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        )
                    ) = 
                        CASE 
                            WHEN @prevMonth <= 3 THEN @prevMonth + 9
                            ELSE @prevMonth - 3
                        END
                    THEN NULLIF(SUM(CASE 
                        WHEN fiscal_year = @currentFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND month <= @prevMonth)
                            )
                        THEN average_trt_overall * total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0) 
                    / 
                    NULLIF(SUM(CASE 
                        WHEN fiscal_year = @currentFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND month <= @prevMonth)
                            )
                        THEN total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS currentFiscalZ2,
                
                CASE 
                    WHEN (
                        SELECT COUNT(DISTINCT month) 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @currentFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        )
                    ) = 
                        CASE 
                            WHEN @prevMonth <= 3 THEN @prevMonth + 8
                            ELSE @prevMonth - 4
                        END
                    THEN NULLIF(SUM(CASE 
                        WHEN fiscal_year = @currentFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND month < @prevMonth)
                            )
                        THEN average_trt_overall * total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0) / 
                    NULLIF(SUM(CASE 
                        WHEN fiscal_year = @currentFiscalYear AND 
                            (
                                (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                                OR 
                                (@prevMonth > 3 AND month < @prevMonth)
                            )
                        THEN total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS currentFiscalX2,
                
                CASE
                    WHEN EXISTS (
                        SELECT 1 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @currentFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND month = @prevMonth
                    )
                    THEN NULLIF(SUM(CASE 
                        WHEN fiscal_year = @currentFiscalYear AND month = @prevMonth 
                        THEN average_trt_overall 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS currentFiscalY2
            FROM tbl_kpi_time_performance t
            WHERE fiscal_year = @currentFiscalYear
            GROUP BY organisation_id
        ),
        MonthlyData AS (
            SELECT 
                organisation_id,
                CASE
                    WHEN EXISTS (
                        SELECT 1 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @currentFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND month = @prevMonth
                    )
                    THEN NULLIF(SUM(CASE 
                        WHEN month = @prevMonth AND fiscal_year = @currentFiscalYear 
                        THEN average_trt_overall * total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0) 
                    / 
                    NULLIF(SUM(CASE 
                        WHEN month = @prevMonth AND fiscal_year = @currentFiscalYear 
                        THEN total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS prevMonthData,
                CASE
                    WHEN EXISTS (
                        SELECT 1 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @currentFiscalYear 
                        AND organisation_id = t.organisation_id
                        AND month = @prevMonth - 1
                    )
                    THEN NULLIF(SUM(CASE 
                        WHEN month = @prevMonth - 1 AND fiscal_year = @currentFiscalYear 
                        THEN average_trt_overall * total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0) 
                    / 
                    NULLIF(SUM(CASE 
                        WHEN month = @prevMonth - 1 AND fiscal_year = @currentFiscalYear 
                        THEN total_sailed_vessel_handled 
                        ELSE 0 
                    END), 0)
                    ELSE NULL
                END AS prevPrevMonthData
            FROM tbl_kpi_time_performance t
            WHERE fiscal_year = @currentFiscalYear
            GROUP BY organisation_id
        ),
        LastFiscalYearTarget AS (
            SELECT
                organisation_id,
                CASE 
                    WHEN (
                        SELECT COUNT(DISTINCT month) 
                        FROM tbl_kpi_time_performance 
                        WHERE fiscal_year = @lastFiscalYear 
                        AND organisation_id = t.organisation_id
                    ) = 12
                    THEN NULLIF(SUM(
                        CASE
                            WHEN fiscal_year = @lastFiscalYear
                            THEN average_trt_overall * total_sailed_vessel_handled
                            ELSE 0
                        END
                    ), 0) / 
                    NULLIF(SUM(
                        CASE 
                            WHEN fiscal_year = @lastFiscalYear
                            THEN total_sailed_vessel_handled
                            ELSE 0
                        END
                    ), 0)
                    ELSE NULL
                END AS lastFiscalYearTarget
            FROM tbl_kpi_time_performance t
            WHERE fiscal_year = @lastFiscalYear
            GROUP BY organisation_id
        ),
        CurrentFiscalYearTarget AS (
            SELECT 
                tpt.organisation_id,
                NULLIF(SUM(tpt.target_value), 0) AS currentFiscalYearTarget
            FROM tbl_kpi_time_performance_target tpt
            WHERE tpt.financial_year = @currentFiscalYear
            AND tpt.kpi_type_id = 1
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
        lfy.lastFiscalX1, lfy.lastFiscalY1, lfy.lastFiscalZ1,
        cfy.currentFiscalX2, cfy.currentFiscalY2, cfy.currentFiscalZ2,
        @lastFiscalYear AS lastFiscalYear,
        CASE 
            WHEN m.prevPrevMonthData > 0 AND m.prevMonthData IS NOT NULL
            THEN ((m.prevMonthData * 1.0) / m.prevPrevMonthData - 1) * 100
            ELSE NULL
        END AS momGrowth,
        CASE 
            WHEN lfy.lastFiscalZ1 > 0 AND cfy.currentFiscalZ2 IS NOT NULL
            THEN ((cfy.currentFiscalZ2 * 1.0) / lfy.lastFiscalZ1 - 1) * 100
            ELSE NULL
        END AS yoyGrowth,
        o.organisation_id AS org_id_for_outer,
        CASE WHEN o.organisation_id IN (54, 55) THEN 1 ELSE 0 END AS is_smpa_port
    FROM (
        SELECT DISTINCT organisation_id 
        FROM tbl_kpi_time_performance 
        WHERE fiscal_year IN (@lastFiscalYear, @currentFiscalYear)
        UNION
        SELECT DISTINCT organisation_id 
        FROM tbl_kpi_time_performance_target 
        WHERE financial_year IN (@lastFiscalYear, @currentFiscalYear)
        AND kpi_type_id = 1
    ) t
    LEFT JOIN LastFiscalYearData lfy ON t.organisation_id = lfy.organisation_id
    LEFT JOIN CurrentFiscalYearData cfy ON t.organisation_id = cfy.organisation_id
    LEFT JOIN MonthlyData m ON t.organisation_id = m.organisation_id
    LEFT JOIN LastFiscalYearTarget t1 ON t.organisation_id = t1.organisation_id
    LEFT JOIN CurrentFiscalYearTarget t2 ON t.organisation_id = t2.organisation_id
    LEFT JOIN mmt_organisation o ON t.organisation_id = o.organisation_id
    WHERE t.organisation_id IS NOT NULL
),
        ValidOrganisationsForLastFiscalZ1 AS (
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
        ValidOrganisationsForLastFiscalX1 AS (
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
        ValidOrganisationsForLastFiscalY1 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            AND month = @prevMonth
        ),
        ValidOrganisationsForCurrentFiscalZ2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND (
                (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                OR 
                (@prevMonth > 3 AND month <= @prevMonth)
            )
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 
                CASE 
                    WHEN @prevMonth <= 3 THEN @prevMonth + 9
                    ELSE @prevMonth - 3
                END
        ),
        ValidOrganisationsForCurrentFiscalX2 AS (
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
        ValidOrganisationsForCurrentFiscalY2 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth
        ),
        ValidOrganisationsForCurrentFiscalY3 AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @currentFiscalYear
            AND month = @prevMonth - 1
        ),
        ValidOrganisationsForLastFiscalTarget AS (
            SELECT DISTINCT organisation_id
            FROM tbl_kpi_time_performance
            WHERE fiscal_year = @lastFiscalYear
            GROUP BY organisation_id
            HAVING COUNT(DISTINCT month) = 12
        ),
        TotalData AS (
            SELECT 
                'Total' AS port,
                
                -- Last Fiscal Year X1 Total (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                        ) AND
                        vx.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                        ) AND
                        vx.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS totalLastFiscalX1,
                
                -- Last Fiscal Year Y1 Total (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        month = @prevMonth AND
                        vy.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        month = @prevMonth AND
                        vy.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS totalLastFiscalY1,
                
                -- Last Fiscal Year Z1 Total (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                        ) AND
                        vz.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                        ) AND
                        vz.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS totalLastFiscalZ1,
                
                -- Current Fiscal Year X2 Total (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        ) AND
                        vx2.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        ) AND
                        vx2.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS totalCurrentFiscalX2,
                
                -- Current Fiscal Year Y2 Total (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth AND
                        vy2.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth AND
                        vy2.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS totalCurrentFiscalY2,
                
                -- Current Fiscal Year Z2 Total (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        ) AND
                        vz2.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        ) AND
                        vz2.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS totalCurrentFiscalZ2,
                
                -- Last Fiscal Year Target Total (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND
                        vt.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled
                    ELSE 0
                END), 0) / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND
                        vt.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled
                    ELSE 0
                END), 0) AS totalLastFiscalYearTarget,
                
                -- Current Fiscal Year Target Total (Simple Sum)
                NULLIF(
                    (SELECT SUM(target_value)
                    FROM tbl_kpi_time_performance_target t5
                    WHERE t5.financial_year = @currentFiscalYear
                    AND t5.kpi_type_id = 1
                    AND t5.organisation_id IS NULL
                    AND t5.is_overall = 1), 0) AS totalCurrentFiscalYearTarget,
                
                -- Current Fiscal Year Y3 Total (Weighted Average) for Previous to Previous Month
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth - 1 AND
                        vy3.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth - 1 AND
                        vy3.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS totalCurrentFiscalY3
            FROM tbl_kpi_time_performance t
            LEFT JOIN ValidOrganisationsForLastFiscalX1 vx ON t.organisation_id = vx.organisation_id
            LEFT JOIN ValidOrganisationsForLastFiscalY1 vy ON t.organisation_id = vy.organisation_id
            LEFT JOIN ValidOrganisationsForLastFiscalZ1 vz ON t.organisation_id = vz.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalX2 vx2 ON t.organisation_id = vx2.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalY2 vy2 ON t.organisation_id = vy2.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalZ2 vz2 ON t.organisation_id = vz2.organisation_id
            LEFT JOIN ValidOrganisationsForLastFiscalTarget vt ON t.organisation_id = vt.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalY3 vy3 ON t.organisation_id = vy3.organisation_id
        ),
        SMPATotalData AS (
            SELECT 
                'Total SMPA' AS port,
                
                -- Last Fiscal Year X1 Total for SMKP (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vx.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month < @prevMonth AND month >= 4))
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vx.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS smpaLastFiscalX1,
                
                -- Last Fiscal Year Y1 Total for SMKP (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        month = @prevMonth AND
                        t.organisation_id IN (54, 55) AND
                        vy.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        month = @prevMonth AND
                        t.organisation_id IN (54, 55) AND
                        vy.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS smpaLastFiscalY1,
                
                -- Last Fiscal Year Z1 Total for SMKP (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vz.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND (month <= @prevMonth AND month >= 4))
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vz.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS smpaLastFiscalZ1,
                
                -- Current Fiscal Year X2 Total for SMKP (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vx2.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month < @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month < @prevMonth)
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vx2.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS smpaCurrentFiscalX2,
                
                -- Current Fiscal Year Y2 Total for SMKP (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth AND
                        t.organisation_id IN (54, 55) AND
                        vy2.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth AND
                        t.organisation_id IN (54, 55) AND
                        vy2.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS smpaCurrentFiscalY2,
                
                -- Current Fiscal Year Z2 Total for SMKP (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vz2.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        (
                            (@prevMonth <= 3 AND (month <= @prevMonth OR month >= 4)) 
                            OR 
                            (@prevMonth > 3 AND month <= @prevMonth)
                        ) AND
                        t.organisation_id IN (54, 55) AND
                        vz2.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS smpaCurrentFiscalZ2,
                
                -- Last Fiscal Year Target Total for SMKP (Weighted Average)
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND
                        t.organisation_id IN (54, 55) AND
                        vt.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled
                    ELSE 0
                END), 0) / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @lastFiscalYear AND
                        t.organisation_id IN (54, 55) AND
                        vt.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled
                    ELSE 0
                END), 0) AS smpaLastFiscalYearTarget,
                
                -- Current Fiscal Year Target for SMPA
                NULLIF(
                    (SELECT target_value
                    FROM tbl_kpi_time_performance_target
                    WHERE financial_year = @currentFiscalYear
                    AND kpi_type_id = 1
                    AND is_totalSmpa = 1
                    AND organisation_id IS NULL), 0) AS smpaCurrentFiscalYearTarget,
                
                -- Current Fiscal Year Y3 Total for SMKP (Weighted Average) for Previous to Previous Month
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth - 1 AND
                        t.organisation_id IN (54, 55) AND
                        vy3.organisation_id IS NOT NULL
                    THEN average_trt_overall * total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) 
                / 
                NULLIF(SUM(CASE 
                    WHEN t.fiscal_year = @currentFiscalYear AND 
                        month = @prevMonth - 1 AND
                        t.organisation_id IN (54, 55) AND
                        vy3.organisation_id IS NOT NULL
                    THEN total_sailed_vessel_handled 
                    ELSE 0 
                END), 0) AS smpaCurrentFiscalY3
            FROM tbl_kpi_time_performance t
            LEFT JOIN ValidOrganisationsForLastFiscalX1 vx ON t.organisation_id = vx.organisation_id
            LEFT JOIN ValidOrganisationsForLastFiscalY1 vy ON t.organisation_id = vy.organisation_id
            LEFT JOIN ValidOrganisationsForLastFiscalZ1 vz ON t.organisation_id = vz.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalX2 vx2 ON t.organisation_id = vx2.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalY2 vy2 ON t.organisation_id = vy2.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalZ2 vz2 ON t.organisation_id = vz2.organisation_id
            LEFT JOIN ValidOrganisationsForLastFiscalTarget vt ON t.organisation_id = vt.organisation_id
            LEFT JOIN ValidOrganisationsForCurrentFiscalY3 vy3 ON t.organisation_id = vy3.organisation_id
        ),
        SMPAPortsData AS (
            SELECT 
                fd.*
            FROM FinalData fd
            WHERE fd.organisation_id IN (54, 55)
        ),
        NonSMPAPortsData AS (
            SELECT 
                fd.*
            FROM FinalData fd
            WHERE fd.organisation_id NOT IN (54, 55)
        )
        
        SELECT * FROM (
            -- Non-SMPA ports
            SELECT 
                fd.*,   
                td.totalLastFiscalZ1, 
                td.totalCurrentFiscalZ2, 
                td.totalLastFiscalX1, 
                td.totalCurrentFiscalX2, 
                td.totalLastFiscalY1, 
                td.totalCurrentFiscalY2,
                td.totalLastFiscalYearTarget, 
                td.totalCurrentFiscalYearTarget,
                st.smpaLastFiscalX1,
                st.smpaLastFiscalY1,
                st.smpaLastFiscalZ1,
                st.smpaCurrentFiscalX2,
                st.smpaCurrentFiscalY2,
                st.smpaCurrentFiscalZ2,
                st.smpaLastFiscalYearTarget,
                st.smpaCurrentFiscalYearTarget,
                CASE 
                    WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
                    THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100
                    ELSE NULL
                END AS momGrowthTotal,
                CASE 
                    WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
                    THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS yoyGrowthTotal,
                CASE 
                    WHEN st.smpaCurrentFiscalY3 > 0 AND st.smpaCurrentFiscalY2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalY2 * 1.0) / st.smpaCurrentFiscalY3 - 1) * 100
                    ELSE NULL
                END AS smpaMomGrowth,
                CASE 
                    WHEN st.smpaLastFiscalZ1 > 0 AND st.smpaCurrentFiscalZ2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalZ2 * 1.0) / st.smpaLastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS smpaYoyGrowth,
                0 AS sort_order
            FROM FinalData fd
            CROSS JOIN TotalData td
            CROSS JOIN SMPATotalData st
            WHERE fd.is_smpa_port = 0
            
            UNION ALL
            
            -- SMPA ports (54 and 55)
            SELECT 
                fd.*,   
                td.totalLastFiscalZ1, 
                td.totalCurrentFiscalZ2, 
                td.totalLastFiscalX1, 
                td.totalCurrentFiscalX2, 
                td.totalLastFiscalY1, 
                td.totalCurrentFiscalY2,
                td.totalLastFiscalYearTarget, 
                td.totalCurrentFiscalYearTarget,
                st.smpaLastFiscalX1,
                st.smpaLastFiscalY1,
                st.smpaLastFiscalZ1,
                st.smpaCurrentFiscalX2,
                st.smpaCurrentFiscalY2,
                st.smpaCurrentFiscalZ2,
                st.smpaLastFiscalYearTarget,
                st.smpaCurrentFiscalYearTarget,
                CASE 
                    WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
                    THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100
                    ELSE NULL
                END AS momGrowthTotal,
                CASE 
                    WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
                    THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS yoyGrowthTotal,
                CASE 
                    WHEN st.smpaCurrentFiscalY3 > 0 AND st.smpaCurrentFiscalY2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalY2 * 1.0) / st.smpaCurrentFiscalY3 - 1) * 100
                    ELSE NULL
                END AS smpaMomGrowth,
                CASE 
                    WHEN st.smpaLastFiscalZ1 > 0 AND st.smpaCurrentFiscalZ2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalZ2 * 1.0) / st.smpaLastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS smpaYoyGrowth,
                1 AS sort_order
            FROM FinalData fd
            CROSS JOIN TotalData td
            CROSS JOIN SMPATotalData st
            WHERE fd.is_smpa_port = 1
            
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
                @lastFiscalYear AS lastFiscalYear,
                CASE 
                    WHEN st.smpaCurrentFiscalY3 > 0 AND st.smpaCurrentFiscalY2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalY2 * 1.0) / st.smpaCurrentFiscalY3 - 1) * 100
                    ELSE NULL
                END AS momGrowth,
                CASE 
                    WHEN st.smpaLastFiscalZ1 > 0 AND st.smpaCurrentFiscalZ2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalZ2 * 1.0) / st.smpaLastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS yoyGrowth,
                NULL AS org_id_for_outer,
                2 AS is_smpa_port,
                td.totalLastFiscalZ1, 
                td.totalCurrentFiscalZ2, 
                td.totalLastFiscalX1, 
                td.totalCurrentFiscalX2, 
                td.totalLastFiscalY1, 
                td.totalCurrentFiscalY2,
                td.totalLastFiscalYearTarget, 
                td.totalCurrentFiscalYearTarget,
                st.smpaLastFiscalX1,
                st.smpaLastFiscalY1,
                st.smpaLastFiscalZ1,
                st.smpaCurrentFiscalX2,
                st.smpaCurrentFiscalY2,
                st.smpaCurrentFiscalZ2,
                st.smpaLastFiscalYearTarget,
                st.smpaCurrentFiscalYearTarget,
                CASE 
                    WHEN td.totalCurrentFiscalY3 > 0 AND td.totalCurrentFiscalY2 IS NOT NULL
                    THEN ((td.totalCurrentFiscalY2 * 1.0) / td.totalCurrentFiscalY3 - 1) * 100
                    ELSE NULL
                END AS momGrowthTotal,
                CASE 
                    WHEN td.totalLastFiscalZ1 > 0 AND td.totalCurrentFiscalZ2 IS NOT NULL
                    THEN ((td.totalCurrentFiscalZ2 * 1.0) / td.totalLastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS yoyGrowthTotal,
                CASE 
                    WHEN st.smpaCurrentFiscalY3 > 0 AND st.smpaCurrentFiscalY2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalY2 * 1.0) / st.smpaCurrentFiscalY3 - 1) * 100
                    ELSE NULL
                END AS smpaMomGrowth,
                CASE 
                    WHEN st.smpaLastFiscalZ1 > 0 AND st.smpaCurrentFiscalZ2 IS NOT NULL
                    THEN ((st.smpaCurrentFiscalZ2 * 1.0) / st.smpaLastFiscalZ1 - 1) * 100
                    ELSE NULL
                END AS smpaYoyGrowth,
                3 AS sort_order
            FROM TotalData td
            CROSS JOIN SMPATotalData st
        ) AS combined_data
        ORDER BY 
            sort_order,
            CASE WHEN sort_order = 0 THEN currentFiscalZ2 ELSE NULL END ASC;
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
            smpaLastFiscalX1: rowData[0]?.smpaLastFiscalX1 || null,
            smpaLastFiscalY1: rowData[0]?.smpaLastFiscalY1 || null,
            smpaLastFiscalZ1: rowData[0]?.smpaLastFiscalZ1 || null,
            smpaCurrentFiscalX2: rowData[0]?.smpaCurrentFiscalX2 || null,
            smpaCurrentFiscalY2: rowData[0]?.smpaCurrentFiscalY2 || null,
            smpaCurrentFiscalZ2: rowData[0]?.smpaCurrentFiscalZ2 || null,
            smpaLastFiscalYearTarget: rowData[0]?.smpaLastFiscalYearTarget || null,
            smpaCurrentFiscalYearTarget: rowData[0]?.smpaCurrentFiscalYearTarget || null,
            smpaMomGrowth: rowData[0]?.smpaMomGrowth || null,
            smpaYoyGrowth: rowData[0]?.smpaYoyGrowth || null
        });

    } catch (error) {
        console.error("Error fetching TRT Port Performance report:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getTrtPortPerformance_k_1_2_2_Report(req, res) {
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
                    average_trt_overall,
                    total_sailed_vessel_handled,
                    average_trt_overall * total_sailed_vessel_handled AS weighted_trt
                FROM tbl_kpi_time_performance
            ),
            PortMonthlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    m.fiscal_year,
                    m.month,
                    m.average_trt_overall,
                    m.total_sailed_vessel_handled,
                    m.weighted_trt
                FROM MonthlyData m
                JOIN mmt_organisation o ON m.organisation_id = o.organisation_id
            ),
            PivotedPortData AS (
                SELECT 
                    organisation_id,
                    majorPort,
                    fiscal_year,
                    SUM(CASE WHEN month = 4 THEN average_trt_overall END) AS April,
                    SUM(CASE WHEN month = 5 THEN average_trt_overall END) AS May,
                    SUM(CASE WHEN month = 6 THEN average_trt_overall END) AS June,
                    SUM(CASE WHEN month = 7 THEN average_trt_overall END) AS July,
                    SUM(CASE WHEN month = 8 THEN average_trt_overall END) AS August,
                    SUM(CASE WHEN month = 9 THEN average_trt_overall END) AS September,
                    SUM(CASE WHEN month = 10 THEN average_trt_overall END) AS October,
                    SUM(CASE WHEN month = 11 THEN average_trt_overall END) AS November,
                    SUM(CASE WHEN month = 12 THEN average_trt_overall END) AS December,
                    SUM(CASE WHEN month = 1 THEN average_trt_overall END) AS January,
                    SUM(CASE WHEN month = 2 THEN average_trt_overall END) AS February,
                    SUM(CASE WHEN month = 3 THEN average_trt_overall END) AS March
                FROM PortMonthlyData
                GROUP BY organisation_id, majorPort, fiscal_year
            ),
            WeightedTotalData AS (
                SELECT 
                    fiscal_year,
                    NULLIF(SUM(CASE WHEN month = 4 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 4 THEN total_sailed_vessel_handled END), 0) AS April,
                    NULLIF(SUM(CASE WHEN month = 5 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 5 THEN total_sailed_vessel_handled END), 0) AS May,
                    NULLIF(SUM(CASE WHEN month = 6 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 6 THEN total_sailed_vessel_handled END), 0) AS June,
                    NULLIF(SUM(CASE WHEN month = 7 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 7 THEN total_sailed_vessel_handled END), 0) AS July,
                    NULLIF(SUM(CASE WHEN month = 8 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 8 THEN total_sailed_vessel_handled END), 0) AS August,
                    NULLIF(SUM(CASE WHEN month = 9 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 9 THEN total_sailed_vessel_handled END), 0) AS September,
                    NULLIF(SUM(CASE WHEN month = 10 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 10 THEN total_sailed_vessel_handled END), 0) AS October,
                    NULLIF(SUM(CASE WHEN month = 11 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 11 THEN total_sailed_vessel_handled END), 0) AS November,
                    NULLIF(SUM(CASE WHEN month = 12 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 12 THEN total_sailed_vessel_handled END), 0) AS December,
                    NULLIF(SUM(CASE WHEN month = 1 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 1 THEN total_sailed_vessel_handled END), 0) AS January,
                    NULLIF(SUM(CASE WHEN month = 2 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 2 THEN total_sailed_vessel_handled END), 0) AS February,
                    NULLIF(SUM(CASE WHEN month = 3 THEN weighted_trt END), 0) / 
                    NULLIF(SUM(CASE WHEN month = 3 THEN total_sailed_vessel_handled END), 0) AS March
                FROM MonthlyData
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
        console.error("Error fetching TRT Month-Wise report (K1.2.2):", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

async function getTrtPortPerformance_k_1_2_3_Report(req, res) {
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
                NULLIF(SUM(CASE WHEN yd.fiscal_year = '${year}' 
                    THEN yd.average_trt_overall * yd.total_sailed_vessel_handled ELSE 0 END), 0)
                /
                NULLIF(SUM(CASE WHEN yd.fiscal_year = '${year}' 
                    THEN yd.total_sailed_vessel_handled ELSE 0 END), 0)
                AS "FY${year}"
            `;
        }).join(',\n');

        const totalRowColumns = fiscalYears.map(year => {
            return `
                NULLIF(SUM(CASE WHEN fiscal_year = '${year}' 
                    THEN average_trt_overall * total_sailed_vessel_handled ELSE 0 END), 0)
                /
                NULLIF(SUM(CASE WHEN fiscal_year = '${year}' 
                    THEN total_sailed_vessel_handled ELSE 0 END), 0)
                AS "FY${year}"
            `;
        }).join(',\n');

        const query = `
            WITH YearlyData AS (
                SELECT 
                    o.organisation_id,
                    o.organisation_name AS majorPort,
                    k.fiscal_year,
                    k.average_trt_overall,
                    k.total_sailed_vessel_handled
                FROM tbl_kpi_time_performance k
                JOIN mmt_organisation o ON k.organisation_id = o.organisation_id
            )
            SELECT 
                'data' AS type,
                yd.organisation_id,
                yd.majorPort,
                ${fiscalYearColumns}
            FROM YearlyData yd
            GROUP BY yd.organisation_id, yd.majorPort

            UNION ALL

            SELECT 
                'total' AS type,
                NULL AS organisation_id,
                'Total' AS majorPort,
                ${totalRowColumns}
            FROM tbl_kpi_time_performance
        `;

        const result = await conn.request().query(query);
        const allRows = result.recordset;

        const rowData = allRows.filter(r => r.type === 'data');
        const totalRow = allRows.find(r => r.type === 'total');

        return res.json({ rowData, totals: totalRow });

    } catch (error) {
        console.error("Error fetching TRT Year-Wise report (K1.2.3):", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}


export default {
    getTrtPortPerformance_k_1_2_1_Report, getTrtPortPerformance_k_1_2_2_Report, getTrtPortPerformance_k_1_2_3_Report
};
