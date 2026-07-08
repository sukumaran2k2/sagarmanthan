import { pool } from "../../db.js";


async function addGemProcurementGoods(req, res) {
    const userId = req.body.userID;
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const goodsProcurementPotential = req.body.goodsProcurementPotential;
    const eightMonthsProportionalTarget = (goodsProcurementPotential / 12) * 8;

    const conn = await pool;
    const request = conn.request();

    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("goodsProcurementPotential", goodsProcurementPotential);
    request.input("eightMonthsProportionalTarget", eightMonthsProportionalTarget);

    try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_gem_procurement_goods
            WHERE goods_financial_year = @financialYear
            AND goods_organisation_id = @organisationId
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "Record already exists for the specified financialYear and organisationId." });
        }

        const insertResult = await request.query(`
            INSERT INTO tbl_gem_procurement_goods (
                updated_by,
                goods_financial_year,
                goods_organisation_id,
                goods_procurement_potential,
                eight_months_proportional_target
            )
            VALUES (
                @userId,
                @financialYear,
                @organisationId,
                @goodsProcurementPotential,
                @eightMonthsProportionalTarget
            )
        `);

        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function addGemProcurementService(req, res) {
    const userId = req.body.userID;
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const serviceProcurementPotential = req.body.serviceProcurementPotential;
    const eightMonthsProportionalTarget = (serviceProcurementPotential / 12) * 8;

    const conn = await pool;
    const request = conn.request();

    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("serviceProcurementPotential", serviceProcurementPotential);
    request.input("eightMonthsProportionalTarget", eightMonthsProportionalTarget);

    try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_gem_procurement_service
            WHERE service_financial_year = @financialYear
            AND service_organisation_id = @organisationId
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "Record already exists for the specified financialYear and organisationId." });
        }

        const result = await request.query(`
            INSERT INTO tbl_gem_procurement_service (
                updated_by,
                service_financial_year,
                service_organisation_id,
                service_procurement_potential,
                eight_months_proportional_target
            )
            VALUES (
                @userId,
                @financialYear,
                @organisationId,
                @serviceProcurementPotential,
                @eightMonthsProportionalTarget
            )
        `);
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function addGemProcurementWork(req, res) {
    const userId = req.body.userID;
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const workProcurementPotential = req.body.workProcurementPotential;
    const eightMonthsProportionalTarget = (workProcurementPotential / 12) * 8;

    const conn = await pool;
    const request = conn.request();

    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("workProcurementPotential", workProcurementPotential);
    request.input("eightMonthsProportionalTarget", eightMonthsProportionalTarget);
    try {
        const checkResult = await request.query(`
        SELECT COUNT(*) AS count
        FROM tbl_gem_procurement_works
        WHERE works_financial_year = @financialYear
        AND works_organisation_id = @organisationId
    `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "Record already exists for the specified financialYear and organisationId." });
        }

        const result = await request.query(`
            INSERT INTO tbl_gem_procurement_works (
                updated_by,
                works_financial_year,
                works_organisation_id,
                works_procurement_potential,
                eight_months_proportional_target
            )
            VALUES (
                @userId,
                @financialYear,
                @organisationId,
                @workProcurementPotential,
                @eightMonthsProportionalTarget
            )
        `);
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getGemProcurementGoods(req, res) {
    const userID = req.params.userID;

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
        SELECT
        gpg.*,
        COALESCE(monthly.total_procurement_through_gem, 0) AS total_procurement_through_gem,
        COALESCE(monthly.total_procurement_outside_gem, 0) AS total_procurement_outside_gem
    FROM tbl_gem_procurement_goods gpg
    LEFT JOIN (
        SELECT
            goods_gem_id,
            ISNULL(SUM(ISNULL(procurement_through_gem_january, 0) +
                       ISNULL(procurement_through_gem_february, 0) +
                       ISNULL(procurement_through_gem_march, 0) +
                       ISNULL(procurement_through_gem_april, 0) +
                       ISNULL(procurement_through_gem_may, 0) +
                       ISNULL(procurement_through_gem_june, 0) +
                       ISNULL(procurement_through_gem_july, 0) +
                       ISNULL(procurement_through_gem_august, 0) +
                       ISNULL(procurement_through_gem_september, 0) +
                       ISNULL(procurement_through_gem_october, 0) +
                       ISNULL(procurement_through_gem_november, 0) +
                       ISNULL(procurement_through_gem_december, 0)), 0) AS total_procurement_through_gem,
            
            ISNULL(SUM(ISNULL(procurement_outside_gem_january, 0) +
                       ISNULL(procurement_outside_gem_february, 0) +
                       ISNULL(procurement_outside_gem_march, 0) +
                       ISNULL(procurement_outside_gem_april, 0) +
                       ISNULL(procurement_outside_gem_may, 0) +
                       ISNULL(procurement_outside_gem_june, 0) +
                       ISNULL(procurement_outside_gem_july, 0) +
                       ISNULL(procurement_outside_gem_august, 0) +
                       ISNULL(procurement_outside_gem_september, 0) +
                       ISNULL(procurement_outside_gem_october, 0) +
                       ISNULL(procurement_outside_gem_november, 0) +
                       ISNULL(procurement_outside_gem_december, 0)), 0) AS total_procurement_outside_gem
        FROM tbl_gem_procurement_goods_monthly
        GROUP BY goods_gem_id
    ) AS monthly ON gpg.goods_gem_id = monthly.goods_gem_id;    
    
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getGemProcurementService(req, res) {

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
        SELECT
        gps.*,
        COALESCE(monthly.total_procurement_through_gem, 0) AS total_procurement_through_gem,
        COALESCE(monthly.total_procurement_outside_gem, 0) AS total_procurement_outside_gem
    FROM tbl_gem_procurement_service gps
    LEFT JOIN (
        SELECT
            service_gem_id,
            ISNULL(SUM(ISNULL(procurement_through_gem_january, 0) +
                       ISNULL(procurement_through_gem_february, 0) +
                       ISNULL(procurement_through_gem_march, 0) +
                       ISNULL(procurement_through_gem_april, 0) +
                       ISNULL(procurement_through_gem_may, 0) +
                       ISNULL(procurement_through_gem_june, 0) +
                       ISNULL(procurement_through_gem_july, 0) +
                       ISNULL(procurement_through_gem_august, 0) +
                       ISNULL(procurement_through_gem_september, 0) +
                       ISNULL(procurement_through_gem_october, 0) +
                       ISNULL(procurement_through_gem_november, 0) +
                       ISNULL(procurement_through_gem_december, 0)), 0) AS total_procurement_through_gem,
            
            ISNULL(SUM(ISNULL(procurement_outside_gem_january, 0) +
                       ISNULL(procurement_outside_gem_february, 0) +
                       ISNULL(procurement_outside_gem_march, 0) +
                       ISNULL(procurement_outside_gem_april, 0) +
                       ISNULL(procurement_outside_gem_may, 0) +
                       ISNULL(procurement_outside_gem_june, 0) +
                       ISNULL(procurement_outside_gem_july, 0) +
                       ISNULL(procurement_outside_gem_august, 0) +
                       ISNULL(procurement_outside_gem_september, 0) +
                       ISNULL(procurement_outside_gem_october, 0) +
                       ISNULL(procurement_outside_gem_november, 0) +
                       ISNULL(procurement_outside_gem_december, 0)), 0) AS total_procurement_outside_gem
        FROM tbl_gem_procurement_service_monthly
        GROUP BY service_gem_id
    ) AS monthly ON gps.service_gem_id = monthly.service_gem_id;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getGemProcurementWork(req, res) {
    const userID = req.params.userID;

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
        SELECT
        gpw.*,
        COALESCE(monthly.total_procurement_through_gem, 0) AS total_procurement_through_gem,
        COALESCE(monthly.total_procurement_outside_gem, 0) AS total_procurement_outside_gem
    FROM tbl_gem_procurement_works gpw
    LEFT JOIN (
        SELECT
            works_gem_id,
            ISNULL(SUM(ISNULL(procurement_through_gem_january, 0) +
                       ISNULL(procurement_through_gem_february, 0) +
                       ISNULL(procurement_through_gem_march, 0) +
                       ISNULL(procurement_through_gem_april, 0) +
                       ISNULL(procurement_through_gem_may, 0) +
                       ISNULL(procurement_through_gem_june, 0) +
                       ISNULL(procurement_through_gem_july, 0) +
                       ISNULL(procurement_through_gem_august, 0) +
                       ISNULL(procurement_through_gem_september, 0) +
                       ISNULL(procurement_through_gem_october, 0) +
                       ISNULL(procurement_through_gem_november, 0) +
                       ISNULL(procurement_through_gem_december, 0)), 0) AS total_procurement_through_gem,
            
            ISNULL(SUM(ISNULL(procurement_outside_gem_january, 0) +
                       ISNULL(procurement_outside_gem_february, 0) +
                       ISNULL(procurement_outside_gem_march, 0) +
                       ISNULL(procurement_outside_gem_april, 0) +
                       ISNULL(procurement_outside_gem_may, 0) +
                       ISNULL(procurement_outside_gem_june, 0) +
                       ISNULL(procurement_outside_gem_july, 0) +
                       ISNULL(procurement_outside_gem_august, 0) +
                       ISNULL(procurement_outside_gem_september, 0) +
                       ISNULL(procurement_outside_gem_october, 0) +
                       ISNULL(procurement_outside_gem_november, 0) +
                       ISNULL(procurement_outside_gem_december, 0)), 0) AS total_procurement_outside_gem
        FROM tbl_gem_procurement_works_monthly
        GROUP BY works_gem_id
    ) AS monthly ON gpw.works_gem_id = monthly.works_gem_id;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getGemProcurementTotalData(req, res) {

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
        SELECT
            COALESCE(g.goods_gem_id, s.service_gem_id, w.works_gem_id) AS common_gem_id,
            COALESCE(g.goods_financial_year, s.service_financial_year, w.works_financial_year) AS common_financial_year,
            COALESCE(g.goods_organisation_id, s.service_organisation_id, w.works_organisation_id) AS common_organisation_id,
            COALESCE(g.goods_procurement_potential, 0) + COALESCE(s.service_procurement_potential, 0) + COALESCE(w.works_procurement_potential, 0)AS total_procurement_potential,
            COALESCE(gm.total_procurement_through_gem, 0) + COALESCE(sm.total_procurement_through_gem, 0) + COALESCE(wm.total_procurement_through_gem, 0) AS total_procurement_through_gem,
            COALESCE(gm.total_procurement_outside_gem, 0) + COALESCE(sm.total_procurement_outside_gem, 0) + COALESCE(wm.total_procurement_outside_gem, 0) AS total_procurement_outside_gem,
            COALESCE(g.eight_months_proportional_target, 0) + COALESCE(s.eight_months_proportional_target, 0) + COALESCE(w.eight_months_proportional_target, 0) AS eight_months_proportional_target
        FROM (
            SELECT DISTINCT goods_organisation_id, goods_financial_year FROM tbl_gem_procurement_goods
            UNION
            SELECT DISTINCT service_organisation_id, service_financial_year FROM tbl_gem_procurement_service
            UNION
            SELECT DISTINCT works_organisation_id, works_financial_year FROM tbl_gem_procurement_works
        ) AS org_years
        LEFT JOIN tbl_gem_procurement_goods g ON org_years.goods_organisation_id = g.goods_organisation_id AND org_years.goods_financial_year = g.goods_financial_year
        LEFT JOIN tbl_gem_procurement_service s ON org_years.goods_organisation_id = s.service_organisation_id AND org_years.goods_financial_year = s.service_financial_year
        LEFT JOIN tbl_gem_procurement_works w ON org_years.goods_organisation_id = w.works_organisation_id AND org_years.goods_financial_year = w.works_financial_year
        LEFT JOIN (
        SELECT
                goods_gem_id,
                ISNULL(SUM(ISNULL(procurement_through_gem_january, 0) +
                        ISNULL(procurement_through_gem_february, 0) +
                        ISNULL(procurement_through_gem_march, 0) +
                        ISNULL(procurement_through_gem_april, 0) +
                        ISNULL(procurement_through_gem_may, 0) +
                        ISNULL(procurement_through_gem_june, 0) +
                        ISNULL(procurement_through_gem_july, 0) +
                        ISNULL(procurement_through_gem_august, 0) +
                        ISNULL(procurement_through_gem_september, 0) +
                        ISNULL(procurement_through_gem_october, 0) +
                        ISNULL(procurement_through_gem_november, 0) +
                        ISNULL(procurement_through_gem_december, 0)), 0) AS total_procurement_through_gem,
                ISNULL(SUM(ISNULL(procurement_outside_gem_january, 0) +
                        ISNULL(procurement_outside_gem_february, 0) +
                        ISNULL(procurement_outside_gem_march, 0) +
                        ISNULL(procurement_outside_gem_april, 0) +
                        ISNULL(procurement_outside_gem_may, 0) +
                        ISNULL(procurement_outside_gem_june, 0) +
                        ISNULL(procurement_outside_gem_july, 0) +
                        ISNULL(procurement_outside_gem_august, 0) +
                        ISNULL(procurement_outside_gem_september, 0) +
                        ISNULL(procurement_outside_gem_october, 0) +
                        ISNULL(procurement_outside_gem_november, 0) +
                        ISNULL(procurement_outside_gem_december, 0)), 0) AS total_procurement_outside_gem
            FROM tbl_gem_procurement_goods_monthly
            GROUP BY goods_gem_id
        ) AS gm ON g.goods_gem_id = gm.goods_gem_id
        LEFT JOIN (
            SELECT
                service_gem_id,
                ISNULL(SUM(ISNULL(procurement_through_gem_january, 0) +
                        ISNULL(procurement_through_gem_february, 0) +
                        ISNULL(procurement_through_gem_march, 0) +
                        ISNULL(procurement_through_gem_april, 0) +
                        ISNULL(procurement_through_gem_may, 0) +
                        ISNULL(procurement_through_gem_june, 0) +
                        ISNULL(procurement_through_gem_july, 0) +
                        ISNULL(procurement_through_gem_august, 0) +
                        ISNULL(procurement_through_gem_september, 0) +
                        ISNULL(procurement_through_gem_october, 0) +
                        ISNULL(procurement_through_gem_november, 0) +
                        ISNULL(procurement_through_gem_december, 0)), 0) AS total_procurement_through_gem,
                ISNULL(SUM(ISNULL(procurement_outside_gem_january, 0) +
                        ISNULL(procurement_outside_gem_february, 0) +
                        ISNULL(procurement_outside_gem_march, 0) +
                        ISNULL(procurement_outside_gem_april, 0) +
                        ISNULL(procurement_outside_gem_may, 0) +
                        ISNULL(procurement_outside_gem_june, 0) +
                        ISNULL(procurement_outside_gem_july, 0) +
                        ISNULL(procurement_outside_gem_august, 0) +
                        ISNULL(procurement_outside_gem_september, 0) +
                        ISNULL(procurement_outside_gem_october, 0) +
                        ISNULL(procurement_outside_gem_november, 0) +
                        ISNULL(procurement_outside_gem_december, 0)), 0) AS total_procurement_outside_gem
            FROM tbl_gem_procurement_service_monthly
            GROUP BY service_gem_id
        ) AS sm ON s.service_gem_id = sm.service_gem_id
        LEFT JOIN (
            SELECT
                works_gem_id,
                ISNULL(SUM(ISNULL(procurement_through_gem_january, 0) +
                        ISNULL(procurement_through_gem_february, 0) +
                        ISNULL(procurement_through_gem_march, 0) +
                        ISNULL(procurement_through_gem_april, 0) +
                        ISNULL(procurement_through_gem_may, 0) +
                        ISNULL(procurement_through_gem_june, 0) +
                        ISNULL(procurement_through_gem_july, 0) +
                        ISNULL(procurement_through_gem_august, 0) +
                        ISNULL(procurement_through_gem_september, 0) +
                        ISNULL(procurement_through_gem_october, 0) +
                        ISNULL(procurement_through_gem_november, 0) +
                        ISNULL(procurement_through_gem_december, 0)), 0) AS total_procurement_through_gem,
                ISNULL(SUM(ISNULL(procurement_outside_gem_january, 0) +
                        ISNULL(procurement_outside_gem_february, 0) +
                        ISNULL(procurement_outside_gem_march, 0) +
                        ISNULL(procurement_outside_gem_april, 0) +
                        ISNULL(procurement_outside_gem_may, 0) +
                        ISNULL(procurement_outside_gem_june, 0) +
                        ISNULL(procurement_outside_gem_july, 0) +
                        ISNULL(procurement_outside_gem_august, 0) +
                        ISNULL(procurement_outside_gem_september, 0) +
                        ISNULL(procurement_outside_gem_october, 0) +
                        ISNULL(procurement_outside_gem_november, 0) +
                        ISNULL(procurement_outside_gem_december, 0)), 0) AS total_procurement_outside_gem
            FROM tbl_gem_procurement_works_monthly
            GROUP BY works_gem_id
        ) AS wm ON w.works_gem_id = wm.works_gem_id ORDER BY common_financial_year desc;

        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function addGemMonthlyGoodsData(req, res) {
    const goodsGemID = req.body.goodsGemID;
    const conn = await pool;
    const request = conn.request();

    request.input("goodsGemID", goodsGemID);
    
    const userID = req.body.userID;
    const procurementThroughGemJanuary = req.body.procurementThroughGemJanuary;
    const procurementOutsideGemJanuary = req.body.procurementOutsideGemJanuary;
    const reasonForNonProcurementJanuary = req.body.reasonForNonProcurementJanuary;

    const procurementThroughGemFebruary = req.body.procurementThroughGemFebruary;
    const procurementOutsideGemFebruary = req.body.procurementOutsideGemFebruary;
    const reasonForNonProcurementFebruary = req.body.reasonForNonProcurementFebruary;

    const procurementThroughGemMarch = req.body.procurementThroughGemMarch;
    const procurementOutsideGemMarch = req.body.procurementOutsideGemMarch;
    const reasonForNonProcurementMarch = req.body.reasonForNonProcurementMarch;

    const procurementThroughGemApril = req.body.procurementThroughGemApril;
    const procurementOutsideGemApril = req.body.procurementOutsideGemApril;
    const reasonForNonProcurementApril = req.body.reasonForNonProcurementApril;

    const procurementThroughGemMay = req.body.procurementThroughGemMay;
    const procurementOutsideGemMay = req.body.procurementOutsideGemMay;
    const reasonForNonProcurementMay = req.body.reasonForNonProcurementMay;

    const procurementThroughGemJune = req.body.procurementThroughGemJune;
    const procurementOutsideGemJune = req.body.procurementOutsideGemJune;
    const reasonForNonProcurementJune = req.body.reasonForNonProcurementJune;

    const procurementThroughGemJuly = req.body.procurementThroughGemJuly;
    const procurementOutsideGemJuly = req.body.procurementOutsideGemJuly;
    const reasonForNonProcurementJuly = req.body.reasonForNonProcurementJuly;

    const procurementThroughGemAugust = req.body.procurementThroughGemAugust;
    const procurementOutsideGemAugust = req.body.procurementOutsideGemAugust;
    const reasonForNonProcurementAugust = req.body.reasonForNonProcurementAugust;

    const procurementThroughGemSeptember = req.body.procurementThroughGemSeptember;
    const procurementOutsideGemSeptember = req.body.procurementOutsideGemSeptember;
    const reasonForNonProcurementSeptember = req.body.reasonForNonProcurementSeptember;

    const procurementThroughGemOctober = req.body.procurementThroughGemOctober;
    const procurementOutsideGemOctober = req.body.procurementOutsideGemOctober;
    const reasonForNonProcurementOctober = req.body.reasonForNonProcurementOctober;

    const procurementThroughGemNovember = req.body.procurementThroughGemNovember;
    const procurementOutsideGemNovember = req.body.procurementOutsideGemNovember;
    const reasonForNonProcurementNovember = req.body.reasonForNonProcurementNovember;

    const procurementThroughGemDecember = req.body.procurementThroughGemDecember;
    const procurementOutsideGemDecember = req.body.procurementOutsideGemDecember;
    const reasonForNonProcurementDecember = req.body.reasonForNonProcurementDecember;

    request.input("userID", userID);
    request.input("procurementThroughGemJanuary", procurementThroughGemJanuary);
    request.input("procurementOutsideGemJanuary", procurementOutsideGemJanuary);
    request.input("reasonForNonProcurementJanuary", reasonForNonProcurementJanuary);

    request.input("procurementThroughGemFebruary", procurementThroughGemFebruary);
    request.input("procurementOutsideGemFebruary", procurementOutsideGemFebruary);
    request.input("reasonForNonProcurementFebruary", reasonForNonProcurementFebruary);

    request.input("procurementThroughGemMarch", procurementThroughGemMarch);
    request.input("procurementOutsideGemMarch", procurementOutsideGemMarch);
    request.input("reasonForNonProcurementMarch", reasonForNonProcurementMarch);

    request.input("procurementThroughGemApril", procurementThroughGemApril);
    request.input("procurementOutsideGemApril", procurementOutsideGemApril);
    request.input("reasonForNonProcurementApril", reasonForNonProcurementApril);

    request.input("procurementThroughGemMay", procurementThroughGemMay);
    request.input("procurementOutsideGemMay", procurementOutsideGemMay);
    request.input("reasonForNonProcurementMay", reasonForNonProcurementMay);

    request.input("procurementThroughGemJune", procurementThroughGemJune);
    request.input("procurementOutsideGemJune", procurementOutsideGemJune);
    request.input("reasonForNonProcurementJune", reasonForNonProcurementJune);

    request.input("procurementThroughGemJuly", procurementThroughGemJuly);
    request.input("procurementOutsideGemJuly", procurementOutsideGemJuly);
    request.input("reasonForNonProcurementJuly", reasonForNonProcurementJuly);

    request.input("procurementThroughGemAugust", procurementThroughGemAugust);
    request.input("procurementOutsideGemAugust", procurementOutsideGemAugust);
    request.input("reasonForNonProcurementAugust", reasonForNonProcurementAugust);

    request.input("procurementThroughGemSeptember", procurementThroughGemSeptember);
    request.input("procurementOutsideGemSeptember", procurementOutsideGemSeptember);
    request.input("reasonForNonProcurementSeptember", reasonForNonProcurementSeptember);

    request.input("procurementThroughGemOctober", procurementThroughGemOctober);
    request.input("procurementOutsideGemOctober", procurementOutsideGemOctober);
    request.input("reasonForNonProcurementOctober", reasonForNonProcurementOctober);

    request.input("procurementThroughGemNovember", procurementThroughGemNovember);
    request.input("procurementOutsideGemNovember", procurementOutsideGemNovember);
    request.input("reasonForNonProcurementNovember", reasonForNonProcurementNovember);

    request.input("procurementThroughGemDecember", procurementThroughGemDecember);
    request.input("procurementOutsideGemDecember", procurementOutsideGemDecember);
    request.input("reasonForNonProcurementDecember", reasonForNonProcurementDecember);

    try {
        const checkResult = await request.query(`
        SELECT * FROM tbl_gem_procurement_goods_monthly
        WHERE goods_gem_id = @goodsGemID
    `);

        if (checkResult.recordset.length > 0) {
            const updateResult = await request.query(`
            UPDATE tbl_gem_procurement_goods_monthly
            SET
                procurement_through_gem_january = @procurementThroughGemJanuary,
                procurement_outside_gem_january = @procurementOutsideGemJanuary,
                reason_for_non_procurement_january = @reasonForNonProcurementJanuary,
                procurement_through_gem_february = @procurementThroughGemFebruary,
                procurement_outside_gem_february = @procurementOutsideGemFebruary,
                reason_for_non_procurement_february = @reasonForNonProcurementFebruary,
                procurement_through_gem_march = @procurementThroughGemMarch,
                procurement_outside_gem_march = @procurementOutsideGemMarch,
                reason_for_non_procurement_march = @reasonForNonProcurementMarch,
                procurement_through_gem_april = @procurementThroughGemApril,
                procurement_outside_gem_april = @procurementOutsideGemApril,
                reason_for_non_procurement_april = @reasonForNonProcurementApril,
                procurement_through_gem_may = @procurementThroughGemMay,
                procurement_outside_gem_may = @procurementOutsideGemMay,
                reason_for_non_procurement_may = @reasonForNonProcurementMay,
                procurement_through_gem_june = @procurementThroughGemJune,
                procurement_outside_gem_june = @procurementOutsideGemJune,
                reason_for_non_procurement_june = @reasonForNonProcurementJune,
                procurement_through_gem_july = @procurementThroughGemJuly,
                procurement_outside_gem_july = @procurementOutsideGemJuly,
                reason_for_non_procurement_july = @reasonForNonProcurementJuly,
                procurement_through_gem_august = @procurementThroughGemAugust,
                procurement_outside_gem_august = @procurementOutsideGemAugust,
                reason_for_non_procurement_august = @reasonForNonProcurementAugust,
                procurement_through_gem_september = @procurementThroughGemSeptember,
                procurement_outside_gem_september = @procurementOutsideGemSeptember,
                reason_for_non_procurement_september = @reasonForNonProcurementSeptember,
                procurement_through_gem_october = @procurementThroughGemOctober,
                procurement_outside_gem_october = @procurementOutsideGemOctober,
                reason_for_non_procurement_october = @reasonForNonProcurementOctober,
                procurement_through_gem_november = @procurementThroughGemNovember,
                procurement_outside_gem_november = @procurementOutsideGemNovember,
                reason_for_non_procurement_november = @reasonForNonProcurementNovember,
                procurement_through_gem_december = @procurementThroughGemDecember,
                procurement_outside_gem_december = @procurementOutsideGemDecember,
                reason_for_non_procurement_december = @reasonForNonProcurementDecember


                -- Parent table update
                UPDATE tbl_gem_procurement_goods
                SET
                    updated_by = @userID,
                    updated_date = GETDATE()                 

                
            WHERE goods_gem_id = @goodsGemID
        `);
        } else {
            const insertResult = await request.query(`
            INSERT INTO tbl_gem_procurement_goods_monthly (
                goods_gem_id,
                procurement_through_gem_january,
                procurement_outside_gem_january,
                reason_for_non_procurement_january,
                procurement_through_gem_february,
                procurement_outside_gem_february,
                reason_for_non_procurement_february,
                procurement_through_gem_march,
                procurement_outside_gem_march,
                reason_for_non_procurement_march,
                procurement_through_gem_april,
                procurement_outside_gem_april,
                reason_for_non_procurement_april,
                procurement_through_gem_may,
                procurement_outside_gem_may,
                reason_for_non_procurement_may,
                procurement_through_gem_june,
                procurement_outside_gem_june,
                reason_for_non_procurement_june,
                procurement_through_gem_july,
                procurement_outside_gem_july,
                reason_for_non_procurement_july,
                procurement_through_gem_august,
                procurement_outside_gem_august,
                reason_for_non_procurement_august,
                procurement_through_gem_september,
                procurement_outside_gem_september,
                reason_for_non_procurement_september,
                procurement_through_gem_october,
                procurement_outside_gem_october,
                reason_for_non_procurement_october,
                procurement_through_gem_november,
                procurement_outside_gem_november,
                reason_for_non_procurement_november,
                procurement_through_gem_december,
                procurement_outside_gem_december,
                reason_for_non_procurement_december
            )
            VALUES (
                @goodsGemID,
                @procurementThroughGemJanuary,
                @procurementOutsideGemJanuary,
                @reasonForNonProcurementJanuary,
                @procurementThroughGemFebruary,
                @procurementOutsideGemFebruary,
                @reasonForNonProcurementFebruary,
                @procurementThroughGemMarch,
                @procurementOutsideGemMarch,
                @reasonForNonProcurementMarch,
                @procurementThroughGemApril,
                @procurementOutsideGemApril,
                @reasonForNonProcurementApril,
                @procurementThroughGemMay,
                @procurementOutsideGemMay,
                @reasonForNonProcurementMay,
                @procurementThroughGemJune,
                @procurementOutsideGemJune,
                @reasonForNonProcurementJune,
                @procurementThroughGemJuly,
                @procurementOutsideGemJuly,
                @reasonForNonProcurementJuly,
                @procurementThroughGemAugust,
                @procurementOutsideGemAugust,
                @reasonForNonProcurementAugust,
                @procurementThroughGemSeptember,
                @procurementOutsideGemSeptember,
                @reasonForNonProcurementSeptember,
                @procurementThroughGemOctober,
                @procurementOutsideGemOctober,
                @reasonForNonProcurementOctober,
                @procurementThroughGemNovember,
                @procurementOutsideGemNovember,
                @reasonForNonProcurementNovember,
                @procurementThroughGemDecember,
                @procurementOutsideGemDecember,
                @reasonForNonProcurementDecember
            );
        
            -- Parent table update
            UPDATE tbl_gem_procurement_goods
            SET
                updated_by = @userID,
                updated_date = GETDATE()   
        `);
        }
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getGemMonthlyGoodsData(req, res) {
    const goodsGemID = req.params.goodsGemID;

    const conn = await pool;
    const request = conn.request();

    request.input("goodsGemID", goodsGemID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_gem_procurement_goods_monthly where goods_gem_id = @goodsGemID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function addGemMonthlyServiceData(req, res) {
    const serviceGemID = req.body.serviceGemID;
    const conn = await pool;
    const request = conn.request();

    request.input("serviceGemID", serviceGemID);
    const userID = req.body.userID;
    const procurementThroughGemJanuary = req.body.procurementThroughGemJanuary;
    const procurementOutsideGemJanuary = req.body.procurementOutsideGemJanuary;
    const reasonForNonProcurementJanuary = req.body.reasonForNonProcurementJanuary;

    const procurementThroughGemFebruary = req.body.procurementThroughGemFebruary;
    const procurementOutsideGemFebruary = req.body.procurementOutsideGemFebruary;
    const reasonForNonProcurementFebruary = req.body.reasonForNonProcurementFebruary;

    const procurementThroughGemMarch = req.body.procurementThroughGemMarch;
    const procurementOutsideGemMarch = req.body.procurementOutsideGemMarch;
    const reasonForNonProcurementMarch = req.body.reasonForNonProcurementMarch;

    const procurementThroughGemApril = req.body.procurementThroughGemApril;
    const procurementOutsideGemApril = req.body.procurementOutsideGemApril;
    const reasonForNonProcurementApril = req.body.reasonForNonProcurementApril;

    const procurementThroughGemMay = req.body.procurementThroughGemMay;
    const procurementOutsideGemMay = req.body.procurementOutsideGemMay;
    const reasonForNonProcurementMay = req.body.reasonForNonProcurementMay;

    const procurementThroughGemJune = req.body.procurementThroughGemJune;
    const procurementOutsideGemJune = req.body.procurementOutsideGemJune;
    const reasonForNonProcurementJune = req.body.reasonForNonProcurementJune;

    const procurementThroughGemJuly = req.body.procurementThroughGemJuly;
    const procurementOutsideGemJuly = req.body.procurementOutsideGemJuly;
    const reasonForNonProcurementJuly = req.body.reasonForNonProcurementJuly;

    const procurementThroughGemAugust = req.body.procurementThroughGemAugust;
    const procurementOutsideGemAugust = req.body.procurementOutsideGemAugust;
    const reasonForNonProcurementAugust = req.body.reasonForNonProcurementAugust;

    const procurementThroughGemSeptember = req.body.procurementThroughGemSeptember;
    const procurementOutsideGemSeptember = req.body.procurementOutsideGemSeptember;
    const reasonForNonProcurementSeptember = req.body.reasonForNonProcurementSeptember;

    const procurementThroughGemOctober = req.body.procurementThroughGemOctober;
    const procurementOutsideGemOctober = req.body.procurementOutsideGemOctober;
    const reasonForNonProcurementOctober = req.body.reasonForNonProcurementOctober;

    const procurementThroughGemNovember = req.body.procurementThroughGemNovember;
    const procurementOutsideGemNovember = req.body.procurementOutsideGemNovember;
    const reasonForNonProcurementNovember = req.body.reasonForNonProcurementNovember;

    const procurementThroughGemDecember = req.body.procurementThroughGemDecember;
    const procurementOutsideGemDecember = req.body.procurementOutsideGemDecember;
    const reasonForNonProcurementDecember = req.body.reasonForNonProcurementDecember;

    request.input("userID", userID);
    request.input("procurementThroughGemJanuary", procurementThroughGemJanuary);
    request.input("procurementOutsideGemJanuary", procurementOutsideGemJanuary);
    request.input("reasonForNonProcurementJanuary", reasonForNonProcurementJanuary);

    request.input("procurementThroughGemFebruary", procurementThroughGemFebruary);
    request.input("procurementOutsideGemFebruary", procurementOutsideGemFebruary);
    request.input("reasonForNonProcurementFebruary", reasonForNonProcurementFebruary);

    request.input("procurementThroughGemMarch", procurementThroughGemMarch);
    request.input("procurementOutsideGemMarch", procurementOutsideGemMarch);
    request.input("reasonForNonProcurementMarch", reasonForNonProcurementMarch);

    request.input("procurementThroughGemApril", procurementThroughGemApril);
    request.input("procurementOutsideGemApril", procurementOutsideGemApril);
    request.input("reasonForNonProcurementApril", reasonForNonProcurementApril);

    request.input("procurementThroughGemMay", procurementThroughGemMay);
    request.input("procurementOutsideGemMay", procurementOutsideGemMay);
    request.input("reasonForNonProcurementMay", reasonForNonProcurementMay);

    request.input("procurementThroughGemJune", procurementThroughGemJune);
    request.input("procurementOutsideGemJune", procurementOutsideGemJune);
    request.input("reasonForNonProcurementJune", reasonForNonProcurementJune);

    request.input("procurementThroughGemJuly", procurementThroughGemJuly);
    request.input("procurementOutsideGemJuly", procurementOutsideGemJuly);
    request.input("reasonForNonProcurementJuly", reasonForNonProcurementJuly);

    request.input("procurementThroughGemAugust", procurementThroughGemAugust);
    request.input("procurementOutsideGemAugust", procurementOutsideGemAugust);
    request.input("reasonForNonProcurementAugust", reasonForNonProcurementAugust);

    request.input("procurementThroughGemSeptember", procurementThroughGemSeptember);
    request.input("procurementOutsideGemSeptember", procurementOutsideGemSeptember);
    request.input("reasonForNonProcurementSeptember", reasonForNonProcurementSeptember);

    request.input("procurementThroughGemOctober", procurementThroughGemOctober);
    request.input("procurementOutsideGemOctober", procurementOutsideGemOctober);
    request.input("reasonForNonProcurementOctober", reasonForNonProcurementOctober);

    request.input("procurementThroughGemNovember", procurementThroughGemNovember);
    request.input("procurementOutsideGemNovember", procurementOutsideGemNovember);
    request.input("reasonForNonProcurementNovember", reasonForNonProcurementNovember);

    request.input("procurementThroughGemDecember", procurementThroughGemDecember);
    request.input("procurementOutsideGemDecember", procurementOutsideGemDecember);
    request.input("reasonForNonProcurementDecember", reasonForNonProcurementDecember);

    try {
        const checkResult = await request.query(`
        SELECT * FROM tbl_gem_procurement_service_monthly
        WHERE service_gem_id = @serviceGemID
    `);

        if (checkResult.recordset.length > 0) {
            const updateResult = await request.query(`
            UPDATE tbl_gem_procurement_service_monthly
            SET
                procurement_through_gem_january = @procurementThroughGemJanuary,
                procurement_outside_gem_january = @procurementOutsideGemJanuary,
                reason_for_non_procurement_january = @reasonForNonProcurementJanuary,
                procurement_through_gem_february = @procurementThroughGemFebruary,
                procurement_outside_gem_february = @procurementOutsideGemFebruary,
                reason_for_non_procurement_february = @reasonForNonProcurementFebruary,
                procurement_through_gem_march = @procurementThroughGemMarch,
                procurement_outside_gem_march = @procurementOutsideGemMarch,
                reason_for_non_procurement_march = @reasonForNonProcurementMarch,
                procurement_through_gem_april = @procurementThroughGemApril,
                procurement_outside_gem_april = @procurementOutsideGemApril,
                reason_for_non_procurement_april = @reasonForNonProcurementApril,
                procurement_through_gem_may = @procurementThroughGemMay,
                procurement_outside_gem_may = @procurementOutsideGemMay,
                reason_for_non_procurement_may = @reasonForNonProcurementMay,
                procurement_through_gem_june = @procurementThroughGemJune,
                procurement_outside_gem_june = @procurementOutsideGemJune,
                reason_for_non_procurement_june = @reasonForNonProcurementJune,
                procurement_through_gem_july = @procurementThroughGemJuly,
                procurement_outside_gem_july = @procurementOutsideGemJuly,
                reason_for_non_procurement_july = @reasonForNonProcurementJuly,
                procurement_through_gem_august = @procurementThroughGemAugust,
                procurement_outside_gem_august = @procurementOutsideGemAugust,
                reason_for_non_procurement_august = @reasonForNonProcurementAugust,
                procurement_through_gem_september = @procurementThroughGemSeptember,
                procurement_outside_gem_september = @procurementOutsideGemSeptember,
                reason_for_non_procurement_september = @reasonForNonProcurementSeptember,
                procurement_through_gem_october = @procurementThroughGemOctober,
                procurement_outside_gem_october = @procurementOutsideGemOctober,
                reason_for_non_procurement_october = @reasonForNonProcurementOctober,
                procurement_through_gem_november = @procurementThroughGemNovember,
                procurement_outside_gem_november = @procurementOutsideGemNovember,
                reason_for_non_procurement_november = @reasonForNonProcurementNovember,
                procurement_through_gem_december = @procurementThroughGemDecember,
                procurement_outside_gem_december = @procurementOutsideGemDecember,
                reason_for_non_procurement_december = @reasonForNonProcurementDecember

                -- Parent table update
                UPDATE tbl_gem_procurement_service
                SET
                    updated_by = @userID,
                    updated_date = GETDATE()  

            WHERE service_gem_id = @serviceGemID
        `);
        } else {
            const insertResult = await request.query(`
            INSERT INTO tbl_gem_procurement_service_monthly (
                service_gem_id,
                procurement_through_gem_january,
                procurement_outside_gem_january,
                reason_for_non_procurement_january,
                procurement_through_gem_february,
                procurement_outside_gem_february,
                reason_for_non_procurement_february,
                procurement_through_gem_march,
                procurement_outside_gem_march,
                reason_for_non_procurement_march,
                procurement_through_gem_april,
                procurement_outside_gem_april,
                reason_for_non_procurement_april,
                procurement_through_gem_may,
                procurement_outside_gem_may,
                reason_for_non_procurement_may,
                procurement_through_gem_june,
                procurement_outside_gem_june,
                reason_for_non_procurement_june,
                procurement_through_gem_july,
                procurement_outside_gem_july,
                reason_for_non_procurement_july,
                procurement_through_gem_august,
                procurement_outside_gem_august,
                reason_for_non_procurement_august,
                procurement_through_gem_september,
                procurement_outside_gem_september,
                reason_for_non_procurement_september,
                procurement_through_gem_october,
                procurement_outside_gem_october,
                reason_for_non_procurement_october,
                procurement_through_gem_november,
                procurement_outside_gem_november,
                reason_for_non_procurement_november,
                procurement_through_gem_december,
                procurement_outside_gem_december,
                reason_for_non_procurement_december
            )
            VALUES (
                @serviceGemID,
                @procurementThroughGemJanuary,
                @procurementOutsideGemJanuary,
                @reasonForNonProcurementJanuary,
                @procurementThroughGemFebruary,
                @procurementOutsideGemFebruary,
                @reasonForNonProcurementFebruary,
                @procurementThroughGemMarch,
                @procurementOutsideGemMarch,
                @reasonForNonProcurementMarch,
                @procurementThroughGemApril,
                @procurementOutsideGemApril,
                @reasonForNonProcurementApril,
                @procurementThroughGemMay,
                @procurementOutsideGemMay,
                @reasonForNonProcurementMay,
                @procurementThroughGemJune,
                @procurementOutsideGemJune,
                @reasonForNonProcurementJune,
                @procurementThroughGemJuly,
                @procurementOutsideGemJuly,
                @reasonForNonProcurementJuly,
                @procurementThroughGemAugust,
                @procurementOutsideGemAugust,
                @reasonForNonProcurementAugust,
                @procurementThroughGemSeptember,
                @procurementOutsideGemSeptember,
                @reasonForNonProcurementSeptember,
                @procurementThroughGemOctober,
                @procurementOutsideGemOctober,
                @reasonForNonProcurementOctober,
                @procurementThroughGemNovember,
                @procurementOutsideGemNovember,
                @reasonForNonProcurementNovember,
                @procurementThroughGemDecember,
                @procurementOutsideGemDecember,
                @reasonForNonProcurementDecember
            );

                -- Parent table update
            UPDATE tbl_gem_procurement_service
            SET
                updated_by = @userID,
                updated_date = GETDATE()  
        `);
        }
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getGemMonthlyServiceData(req, res) {
    const serviceGemID = req.params.serviceGemID;

    const conn = await pool;
    const request = conn.request();

    request.input("serviceGemID", serviceGemID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_gem_procurement_service_monthly where service_gem_id = @serviceGemID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function addGemMonthlyWorksData(req, res) {
    const worksGemID = req.body.worksGemID;
    const conn = await pool;
    const request = conn.request();

    request.input("worksGemID", worksGemID);

    const userID = req.body.userID;
    const procurementThroughGemJanuary = req.body.procurementThroughGemJanuary;
    const procurementOutsideGemJanuary = req.body.procurementOutsideGemJanuary;
    const reasonForNonProcurementJanuary = req.body.reasonForNonProcurementJanuary;

    const procurementThroughGemFebruary = req.body.procurementThroughGemFebruary;
    const procurementOutsideGemFebruary = req.body.procurementOutsideGemFebruary;
    const reasonForNonProcurementFebruary = req.body.reasonForNonProcurementFebruary;

    const procurementThroughGemMarch = req.body.procurementThroughGemMarch;
    const procurementOutsideGemMarch = req.body.procurementOutsideGemMarch;
    const reasonForNonProcurementMarch = req.body.reasonForNonProcurementMarch;

    const procurementThroughGemApril = req.body.procurementThroughGemApril;
    const procurementOutsideGemApril = req.body.procurementOutsideGemApril;
    const reasonForNonProcurementApril = req.body.reasonForNonProcurementApril;

    const procurementThroughGemMay = req.body.procurementThroughGemMay;
    const procurementOutsideGemMay = req.body.procurementOutsideGemMay;
    const reasonForNonProcurementMay = req.body.reasonForNonProcurementMay;

    const procurementThroughGemJune = req.body.procurementThroughGemJune;
    const procurementOutsideGemJune = req.body.procurementOutsideGemJune;
    const reasonForNonProcurementJune = req.body.reasonForNonProcurementJune;

    const procurementThroughGemJuly = req.body.procurementThroughGemJuly;
    const procurementOutsideGemJuly = req.body.procurementOutsideGemJuly;
    const reasonForNonProcurementJuly = req.body.reasonForNonProcurementJuly;

    const procurementThroughGemAugust = req.body.procurementThroughGemAugust;
    const procurementOutsideGemAugust = req.body.procurementOutsideGemAugust;
    const reasonForNonProcurementAugust = req.body.reasonForNonProcurementAugust;

    const procurementThroughGemSeptember = req.body.procurementThroughGemSeptember;
    const procurementOutsideGemSeptember = req.body.procurementOutsideGemSeptember;
    const reasonForNonProcurementSeptember = req.body.reasonForNonProcurementSeptember;

    const procurementThroughGemOctober = req.body.procurementThroughGemOctober;
    const procurementOutsideGemOctober = req.body.procurementOutsideGemOctober;
    const reasonForNonProcurementOctober = req.body.reasonForNonProcurementOctober;

    const procurementThroughGemNovember = req.body.procurementThroughGemNovember;
    const procurementOutsideGemNovember = req.body.procurementOutsideGemNovember;
    const reasonForNonProcurementNovember = req.body.reasonForNonProcurementNovember;

    const procurementThroughGemDecember = req.body.procurementThroughGemDecember;
    const procurementOutsideGemDecember = req.body.procurementOutsideGemDecember;
    const reasonForNonProcurementDecember = req.body.reasonForNonProcurementDecember;
 
    request.input("userID", userID);
    request.input("procurementThroughGemJanuary", procurementThroughGemJanuary);
    request.input("procurementOutsideGemJanuary", procurementOutsideGemJanuary);
    request.input("reasonForNonProcurementJanuary", reasonForNonProcurementJanuary);

    request.input("procurementThroughGemFebruary", procurementThroughGemFebruary);
    request.input("procurementOutsideGemFebruary", procurementOutsideGemFebruary);
    request.input("reasonForNonProcurementFebruary", reasonForNonProcurementFebruary);

    request.input("procurementThroughGemMarch", procurementThroughGemMarch);
    request.input("procurementOutsideGemMarch", procurementOutsideGemMarch);
    request.input("reasonForNonProcurementMarch", reasonForNonProcurementMarch);

    request.input("procurementThroughGemApril", procurementThroughGemApril);
    request.input("procurementOutsideGemApril", procurementOutsideGemApril);
    request.input("reasonForNonProcurementApril", reasonForNonProcurementApril);

    request.input("procurementThroughGemMay", procurementThroughGemMay);
    request.input("procurementOutsideGemMay", procurementOutsideGemMay);
    request.input("reasonForNonProcurementMay", reasonForNonProcurementMay);

    request.input("procurementThroughGemJune", procurementThroughGemJune);
    request.input("procurementOutsideGemJune", procurementOutsideGemJune);
    request.input("reasonForNonProcurementJune", reasonForNonProcurementJune);

    request.input("procurementThroughGemJuly", procurementThroughGemJuly);
    request.input("procurementOutsideGemJuly", procurementOutsideGemJuly);
    request.input("reasonForNonProcurementJuly", reasonForNonProcurementJuly);

    request.input("procurementThroughGemAugust", procurementThroughGemAugust);
    request.input("procurementOutsideGemAugust", procurementOutsideGemAugust);
    request.input("reasonForNonProcurementAugust", reasonForNonProcurementAugust);

    request.input("procurementThroughGemSeptember", procurementThroughGemSeptember);
    request.input("procurementOutsideGemSeptember", procurementOutsideGemSeptember);
    request.input("reasonForNonProcurementSeptember", reasonForNonProcurementSeptember);

    request.input("procurementThroughGemOctober", procurementThroughGemOctober);
    request.input("procurementOutsideGemOctober", procurementOutsideGemOctober);
    request.input("reasonForNonProcurementOctober", reasonForNonProcurementOctober);

    request.input("procurementThroughGemNovember", procurementThroughGemNovember);
    request.input("procurementOutsideGemNovember", procurementOutsideGemNovember);
    request.input("reasonForNonProcurementNovember", reasonForNonProcurementNovember);

    request.input("procurementThroughGemDecember", procurementThroughGemDecember);
    request.input("procurementOutsideGemDecember", procurementOutsideGemDecember);
    request.input("reasonForNonProcurementDecember", reasonForNonProcurementDecember);

    try {
        const checkResult = await request.query(`
        SELECT * FROM tbl_gem_procurement_works_monthly
        WHERE works_gem_id = @worksGemID
    `);

        if (checkResult.recordset.length > 0) {
            const updateResult = await request.query(`
            UPDATE tbl_gem_procurement_works_monthly
            SET
                procurement_through_gem_january = @procurementThroughGemJanuary,
                procurement_outside_gem_january = @procurementOutsideGemJanuary,
                reason_for_non_procurement_january = @reasonForNonProcurementJanuary,
                procurement_through_gem_february = @procurementThroughGemFebruary,
                procurement_outside_gem_february = @procurementOutsideGemFebruary,
                reason_for_non_procurement_february = @reasonForNonProcurementFebruary,
                procurement_through_gem_march = @procurementThroughGemMarch,
                procurement_outside_gem_march = @procurementOutsideGemMarch,
                reason_for_non_procurement_march = @reasonForNonProcurementMarch,
                procurement_through_gem_april = @procurementThroughGemApril,
                procurement_outside_gem_april = @procurementOutsideGemApril,
                reason_for_non_procurement_april = @reasonForNonProcurementApril,
                procurement_through_gem_may = @procurementThroughGemMay,
                procurement_outside_gem_may = @procurementOutsideGemMay,
                reason_for_non_procurement_may = @reasonForNonProcurementMay,
                procurement_through_gem_june = @procurementThroughGemJune,
                procurement_outside_gem_june = @procurementOutsideGemJune,
                reason_for_non_procurement_june = @reasonForNonProcurementJune,
                procurement_through_gem_july = @procurementThroughGemJuly,
                procurement_outside_gem_july = @procurementOutsideGemJuly,
                reason_for_non_procurement_july = @reasonForNonProcurementJuly,
                procurement_through_gem_august = @procurementThroughGemAugust,
                procurement_outside_gem_august = @procurementOutsideGemAugust,
                reason_for_non_procurement_august = @reasonForNonProcurementAugust,
                procurement_through_gem_september = @procurementThroughGemSeptember,
                procurement_outside_gem_september = @procurementOutsideGemSeptember,
                reason_for_non_procurement_september = @reasonForNonProcurementSeptember,
                procurement_through_gem_october = @procurementThroughGemOctober,
                procurement_outside_gem_october = @procurementOutsideGemOctober,
                reason_for_non_procurement_october = @reasonForNonProcurementOctober,
                procurement_through_gem_november = @procurementThroughGemNovember,
                procurement_outside_gem_november = @procurementOutsideGemNovember,
                reason_for_non_procurement_november = @reasonForNonProcurementNovember,
                procurement_through_gem_december = @procurementThroughGemDecember,
                procurement_outside_gem_december = @procurementOutsideGemDecember,
                reason_for_non_procurement_december = @reasonForNonProcurementDecember

                -- Parent table update
                UPDATE tbl_gem_procurement_works
                SET
                    updated_by = @userID,
                    updated_date = GETDATE()  

            WHERE works_gem_id = @worksGemID
        `);
        } else {
            const insertResult = await request.query(`
            INSERT INTO tbl_gem_procurement_works_monthly (
                works_gem_id,
                procurement_through_gem_january,
                procurement_outside_gem_january,
                reason_for_non_procurement_january,
                procurement_through_gem_february,
                procurement_outside_gem_february,
                reason_for_non_procurement_february,
                procurement_through_gem_march,
                procurement_outside_gem_march,
                reason_for_non_procurement_march,
                procurement_through_gem_april,
                procurement_outside_gem_april,
                reason_for_non_procurement_april,
                procurement_through_gem_may,
                procurement_outside_gem_may,
                reason_for_non_procurement_may,
                procurement_through_gem_june,
                procurement_outside_gem_june,
                reason_for_non_procurement_june,
                procurement_through_gem_july,
                procurement_outside_gem_july,
                reason_for_non_procurement_july,
                procurement_through_gem_august,
                procurement_outside_gem_august,
                reason_for_non_procurement_august,
                procurement_through_gem_september,
                procurement_outside_gem_september,
                reason_for_non_procurement_september,
                procurement_through_gem_october,
                procurement_outside_gem_october,
                reason_for_non_procurement_october,
                procurement_through_gem_november,
                procurement_outside_gem_november,
                reason_for_non_procurement_november,
                procurement_through_gem_december,
                procurement_outside_gem_december,
                reason_for_non_procurement_december
            )
            VALUES (
                @worksGemID,
                @procurementThroughGemJanuary,
                @procurementOutsideGemJanuary,
                @reasonForNonProcurementJanuary,
                @procurementThroughGemFebruary,
                @procurementOutsideGemFebruary,
                @reasonForNonProcurementFebruary,
                @procurementThroughGemMarch,
                @procurementOutsideGemMarch,
                @reasonForNonProcurementMarch,
                @procurementThroughGemApril,
                @procurementOutsideGemApril,
                @reasonForNonProcurementApril,
                @procurementThroughGemMay,
                @procurementOutsideGemMay,
                @reasonForNonProcurementMay,
                @procurementThroughGemJune,
                @procurementOutsideGemJune,
                @reasonForNonProcurementJune,
                @procurementThroughGemJuly,
                @procurementOutsideGemJuly,
                @reasonForNonProcurementJuly,
                @procurementThroughGemAugust,
                @procurementOutsideGemAugust,
                @reasonForNonProcurementAugust,
                @procurementThroughGemSeptember,
                @procurementOutsideGemSeptember,
                @reasonForNonProcurementSeptember,
                @procurementThroughGemOctober,
                @procurementOutsideGemOctober,
                @reasonForNonProcurementOctober,
                @procurementThroughGemNovember,
                @procurementOutsideGemNovember,
                @reasonForNonProcurementNovember,
                @procurementThroughGemDecember,
                @procurementOutsideGemDecember,
                @reasonForNonProcurementDecember
            );

            
            -- Parent table update
            UPDATE tbl_gem_procurement_works
            SET
                updated_by = @userID,
                updated_date = GETDATE()  
        `);
        }
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function updateGemProcurementGoods(req, res) {
    const userId = req.body.userID;
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const goodsProcurementPotential = req.body.goodsProcurementPotential;
    const eightMonthsProportionalTarget = (goodsProcurementPotential / 12) * 8;

    const conn = await pool;
    const request = conn.request();

    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("goodsProcurementPotential", goodsProcurementPotential);
    request.input("eightMonthsProportionalTarget", eightMonthsProportionalTarget);

    try {
        const updateResult = await request.query(`
            UPDATE tbl_gem_procurement_goods
            SET 
                goods_procurement_potential = @goodsProcurementPotential,
                eight_months_proportional_target = @eightMonthsProportionalTarget,
                updated_by = @userId,
                updated_date = GETDATE()
            WHERE 
                goods_financial_year = @financialYear
                AND goods_organisation_id = @organisationId
        `);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function updateGemProcurementService(req, res) {
    const userId = req.body.userID;
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const serviceProcurementPotential = req.body.serviceProcurementPotential;
    const eightMonthsProportionalTarget = (serviceProcurementPotential / 12) * 8;

    const conn = await pool;
    const request = conn.request();

    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("serviceProcurementPotential", serviceProcurementPotential);
    request.input("eightMonthsProportionalTarget", eightMonthsProportionalTarget);

    try {
        const updateResult = await request.query(`
            UPDATE tbl_gem_procurement_service
            SET 
                service_procurement_potential = @serviceProcurementPotential,
                eight_months_proportional_target = @eightMonthsProportionalTarget,
                updated_by = @userId,
                updated_date = GETDATE()
            WHERE 
                service_financial_year = @financialYear
                AND service_organisation_id = @organisationId
        `);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function updateGemProcurementWork(req, res) {
    const userId = req.body.userID;
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const workProcurementPotential = req.body.workProcurementPotential;
    const eightMonthsProportionalTarget = (workProcurementPotential / 12) * 8;

    const conn = await pool;
    const request = conn.request();

    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("workProcurementPotential", workProcurementPotential);
    request.input("eightMonthsProportionalTarget", eightMonthsProportionalTarget);

    try {
        const updateResult = await request.query(`
            UPDATE tbl_gem_procurement_works
            SET 
                works_procurement_potential = @workProcurementPotential,
                eight_months_proportional_target = @eightMonthsProportionalTarget,
                updated_by = @userId,
                updated_date = GETDATE()
            WHERE 
                works_financial_year = @financialYear
                AND works_organisation_id = @organisationId
        `);

        if (updateResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function deleteGemProcurementGoods(req, res) {
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);

    try {
        const idResult = await request.query(`
            SELECT goods_gem_id
            FROM tbl_gem_procurement_goods
            WHERE goods_financial_year = @financialYear
            AND goods_organisation_id = @organisationId
        `);

        if (idResult.recordset.length === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        const goodsGemId = idResult.recordset[0].goods_gem_id;

        await request.input("goodsGemId", goodsGemId).query(`
            DELETE FROM tbl_gem_procurement_goods_monthly
            WHERE goods_gem_id = @goodsGemId
        `);

        const deleteResult = await request.query(`
            DELETE FROM tbl_gem_procurement_goods
            WHERE goods_financial_year = @financialYear
            AND goods_organisation_id = @organisationId
        `);

        if (deleteResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function deleteGemProcurementService(req, res) {
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);

    try {
        const idResult = await request.query(`
            SELECT service_gem_id
            FROM tbl_gem_procurement_service
            WHERE service_financial_year = @financialYear
            AND service_organisation_id = @organisationId
        `);

        if (idResult.recordset.length === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        const serviceGemId = idResult.recordset[0].service_gem_id;

        await request.input("serviceGemId", serviceGemId).query(`
            DELETE FROM tbl_gem_procurement_service_monthly
            WHERE service_gem_id = @serviceGemId
        `);

        const deleteResult = await request.query(`
            DELETE FROM tbl_gem_procurement_service
            WHERE service_financial_year = @financialYear
            AND service_organisation_id = @organisationId
        `);

        if (deleteResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function deleteGemProcurementWork(req, res) {
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;

    const conn = await pool;
    const request = conn.request();

    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);

    try {
        const idResult = await request.query(`
            SELECT works_gem_id
            FROM tbl_gem_procurement_works
            WHERE works_financial_year = @financialYear
            AND works_organisation_id = @organisationId
        `);

        if (idResult.recordset.length === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        const workGemId = idResult.recordset[0].works_gem_id;

        await request.input("workGemId", workGemId).query(`
            DELETE FROM tbl_gem_procurement_works_monthly
            WHERE works_gem_id = @workGemId
        `);

        const deleteResult = await request.query(`
            DELETE FROM tbl_gem_procurement_works
            WHERE works_financial_year = @financialYear
            AND works_organisation_id = @organisationId
        `);

        if (deleteResult.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Record not found for the specified financialYear and organisationId." });
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getGemMonthlyWorksData(req, res) {
    const worksGemID = req.params.worksGemID;

    const conn = await pool;
    const request = conn.request();

    request.input("worksGemID", worksGemID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_gem_procurement_works_monthly where works_gem_id = @worksGemID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getOrganisationName(req, res) {
    const organisationID = req.params.organisationID;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);

    try {

        const result = await request.query(`SELECT organisation_name FROM mmt_organisation WHERE organisation_id = @organisationID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getGoodsProcurementPotential(req, res) {
    const goodsGemID = req.params.goodsGemID;
    const conn = await pool;
    const request = conn.request();
    request.input("goodsGemID", goodsGemID);

    try {

        const result = await request.query(`SELECT goods_procurement_potential FROM tbl_gem_procurement_goods WHERE goods_gem_id = @goodsGemID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getServiceProcurementPotential(req, res) {
    const serviceGemID = req.params.serviceGemID;
    const conn = await pool;
    const request = conn.request();
    request.input("serviceGemID", serviceGemID);

    try {

        const result = await request.query(`SELECT service_procurement_potential FROM tbl_gem_procurement_service WHERE service_gem_id = @serviceGemID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getWorksProcurementPotential(req, res) {
    const worksGemID = req.params.worksGemID;
    const conn = await pool;
    const request = conn.request();
    request.input("worksGemID", worksGemID);

    try {

        const result = await request.query(`SELECT works_procurement_potential FROM tbl_gem_procurement_works WHERE works_gem_id = @worksGemID;`);

        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getGemProcurementDataEntry(req, res) {
    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

    const conn = await pool;
    const request = conn.request();

    request.input('financialYear', financialYear);

    try {
        const result = await request.query(`
            SELECT TOP (1000) 
                g.goods_gem_id,
                mmt.organisation_name,    
				[goods_procurement_potential],
				CASE 
				   WHEN ([goods_procurement_potential] IS NOT NULL) THEN 'TRUE'
				   ELSE 'FALSE'
				END AS 'last_procurement_updated_by_ministry',
                CASE 
                    WHEN [procurement_through_gem_march] IS NOT NULL OR 
                         [procurement_outside_gem_march] IS NOT NULL  THEN 'March'
                    WHEN [procurement_through_gem_february] IS NOT NULL OR 
                         [procurement_outside_gem_february] IS NOT NULL THEN 'February'
                    WHEN [procurement_through_gem_january] IS NOT NULL OR 
                         [procurement_outside_gem_january] IS NOT NULL THEN 'January'
                    WHEN [procurement_through_gem_december] IS NOT NULL OR 
                         [procurement_outside_gem_december] IS NOT NULL THEN 'December'
                    WHEN [procurement_through_gem_november] IS NOT NULL OR 
                         [procurement_outside_gem_november] IS NOT NULL THEN 'November'
                    WHEN [procurement_through_gem_october] IS NOT NULL OR 
                         [procurement_outside_gem_october] IS NOT NULL THEN 'October'
                    WHEN [procurement_through_gem_september] IS NOT NULL OR 
                         [procurement_outside_gem_september] IS NOT NULL THEN 'September'
                    WHEN [procurement_through_gem_august] IS NOT NULL OR 
                         [procurement_outside_gem_august] IS NOT NULL THEN 'August'
                    WHEN [procurement_through_gem_july] IS NOT NULL OR 
                         [procurement_outside_gem_july] IS NOT NULL THEN 'July'
                    WHEN [procurement_through_gem_june] IS NOT NULL OR 
                         [procurement_outside_gem_june] IS NOT NULL THEN 'June'
                    WHEN [procurement_through_gem_may] IS NOT NULL OR 
                         [procurement_outside_gem_may] IS NOT NULL THEN 'May'
                    WHEN [procurement_through_gem_april] IS NOT NULL OR 
                         [procurement_outside_gem_april] IS NOT NULL THEN 'April'
            	    ELSE '-'
                END AS updated_month
            FROM mmt_organisation mmt
			LEFT JOIN mmt_organisation_category mmt_oc ON mmt.organisation_category_id  = mmt_oc.organisation_category_id 
			LEFT JOIN tbl_gem_procurement_goods g ON mmt.organisation_id = g.goods_organisation_id AND g.goods_financial_year = @financialYear  
            LEFT JOIN tbl_gem_procurement_goods_monthly gm ON g.goods_gem_id = gm.goods_gem_id
			WHERE mmt.organisation_category_id=1 OR mmt.organisation_id IN (25,15,18,19,21,17)
            ORDER BY updated_month 
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


export default {
    addGemProcurementGoods, addGemProcurementService, addGemProcurementWork, getGemProcurementGoods, getGemProcurementService, getGemProcurementWork,
    addGemMonthlyGoodsData, getGemMonthlyGoodsData, addGemMonthlyServiceData, getGemMonthlyServiceData, addGemMonthlyWorksData, getGemMonthlyWorksData, getOrganisationName,
    getGoodsProcurementPotential, getServiceProcurementPotential, getWorksProcurementPotential, getGemProcurementTotalData, updateGemProcurementGoods, updateGemProcurementService, updateGemProcurementWork,
    deleteGemProcurementGoods, deleteGemProcurementService, deleteGemProcurementWork, getGemProcurementDataEntry
};