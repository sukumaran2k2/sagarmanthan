
import { pool } from "../../db.js";
import { applyDataScope, getDataScope } from "../../middleware/dataScope.js";

function isOrganisationInScope(req, organisationId) {
    const { isWide, isOrganisation, organisationId: scopeOrgId } = getDataScope(req.user);
    if (isWide) return true;
    if (!isOrganisation) return false;
    return Number(organisationId) === Number(scopeOrgId);
}

async function loadRecordOrganisationId(table, idColumn, organisationColumn, idValue) {
    const conn = await pool;
    const request = conn.request();
    request.input("idValue", idValue);
    const result = await request.query(`
        SELECT ${organisationColumn} AS organisation_id
        FROM ${table}
        WHERE ${idColumn} = @idValue
    `);
    return result.recordset.length ? result.recordset[0].organisation_id : null;
}

async function gemGoodsData (req, res) 
{
    const conn = await pool;
    const request = conn.request();
    const { whereSql } = applyDataScope(request, req.user, {
        strategy: "directOrgColumn",
        alias: "gpg",
        orgColumn: "goods_organisation_id",
    });
    try 
    {
        const result = await request.query(`SELECT
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
    ) AS monthly ON gpg.goods_gem_id = monthly.goods_gem_id
    WHERE 1 = 1 ${whereSql};`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function gemServiceData (req, res) 
{
    const conn = await pool;
    const request = conn.request();
    const { whereSql } = applyDataScope(request, req.user, {
        strategy: "directOrgColumn",
        alias: "gps",
        orgColumn: "service_organisation_id",
    });
    try 
    {
        const result = await request.query(`   SELECT
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
    ) AS monthly ON gps.service_gem_id = monthly.service_gem_id
    WHERE 1 = 1 ${whereSql};`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function gemWorksData (req, res) 
{
    const conn = await pool;
    const request = conn.request();
    const { whereSql } = applyDataScope(request, req.user, {
        strategy: "directOrgColumn",
        alias: "gpw",
        orgColumn: "works_organisation_id",
    });
    try 
    {
        const result = await request.query(` SELECT
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
    ) AS monthly ON gpw.works_gem_id = monthly.works_gem_id
    WHERE 1 = 1 ${whereSql};`);
        res.json(result.recordset);
    }
    catch(err) 
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function gemTotalMonthlyReport(req, res) {
    const goodsGemID = req.params.gemGoodsID;
    const gemGoodsFinYear = req.params.gemGoodsFinYear;
    const orgId = req.params.orgId;

    if (!Number.isFinite(Number(orgId)) || Number(orgId) <= 0) {
        return res.status(400).json({ error: "Invalid orgId." });
    }
    if (!isOrganisationInScope(req, orgId)) {
        return res.status(403).json({ error: "Organisation outside your data scope." });
    }

    const conn = await pool;
    const request = conn.request();


    console.log('goodsgemID', goodsGemID);
    console.log('gemGoodsFinYear', gemGoodsFinYear);
    console.log('orgId', orgId);


    request.input("goodsGemID", goodsGemID);
    request.input("gemGoodsFinYear", gemGoodsFinYear);
    request.input("orgId", orgId);
    
    try {
        const result = await request.query(`
        
        
        WITH PrimaryQueryResult AS (
            SELECT
                (
                    SELECT COALESCE(goods_gem_id, 0)
                    FROM tbl_gem_procurement_goods
                    WHERE goods_financial_year = @gemGoodsFinYear AND goods_organisation_id = @orgId
                ) AS gem_id_goods,
                (
                    SELECT COALESCE(service_gem_id, 0)
                    FROM tbl_gem_procurement_service
                    WHERE service_financial_year = @gemGoodsFinYear AND service_organisation_id = @orgId
                ) AS gem_id_service,
                (
                    SELECT COALESCE(works_gem_id, 0)
                    FROM tbl_gem_procurement_works
                    WHERE works_financial_year = @gemGoodsFinYear AND works_organisation_id = @orgId
                ) AS gem_id_works
            )
        
        SELECT
            SUM(ISNULL(gm.through_gem_january, 0) + ISNULL(sm.through_gem_january, 0) + ISNULL(wm.through_gem_january, 0)) AS through_gem_january,
                SUM(ISNULL(gm.through_gem_february, 0) + ISNULL(sm.through_gem_february, 0) + ISNULL(wm.through_gem_february, 0)) AS through_gem_february,
                SUM(ISNULL(gm.through_gem_march, 0) + ISNULL(sm.through_gem_march, 0) + ISNULL(wm.through_gem_march, 0)) AS through_gem_march,
                SUM(ISNULL(gm.through_gem_april, 0) + ISNULL(sm.through_gem_april, 0) + ISNULL(wm.through_gem_april, 0)) AS through_gem_april,
                SUM(ISNULL(gm.through_gem_may, 0) + ISNULL(sm.through_gem_may, 0) + ISNULL(wm.through_gem_may, 0)) AS through_gem_may,
                SUM(ISNULL(gm.through_gem_june, 0) + ISNULL(sm.through_gem_june, 0) + ISNULL(wm.through_gem_june, 0)) AS through_gem_june,
                SUM(ISNULL(gm.through_gem_july, 0) + ISNULL(sm.through_gem_july, 0) + ISNULL(wm.through_gem_july, 0)) AS through_gem_july,
                SUM(ISNULL(gm.through_gem_august, 0) + ISNULL(sm.through_gem_august, 0) + ISNULL(wm.through_gem_august, 0)) AS through_gem_august,
                SUM(ISNULL(gm.through_gem_september, 0) + ISNULL(sm.through_gem_september, 0) + ISNULL(wm.through_gem_september, 0)) AS through_gem_september,
                SUM(ISNULL(gm.through_gem_october, 0) + ISNULL(sm.through_gem_october, 0) + ISNULL(wm.through_gem_october, 0)) AS through_gem_october,
                SUM(ISNULL(gm.through_gem_november, 0) + ISNULL(sm.through_gem_november, 0) + ISNULL(wm.through_gem_november, 0)) AS through_gem_november,
                SUM(ISNULL(gm.through_gem_december, 0) + ISNULL(sm.through_gem_december, 0) + ISNULL(wm.through_gem_december, 0)) AS through_gem_december,
            
            SUM(ISNULL(gm.outside_gem_january, 0) + ISNULL(sm.outside_gem_january, 0) + ISNULL(wm.outside_gem_january, 0)) AS outside_gem_january,
                SUM(ISNULL(gm.outside_gem_february, 0) + ISNULL(sm.outside_gem_february, 0) + ISNULL(wm.outside_gem_february, 0)) AS outside_gem_february,
                SUM(ISNULL(gm.outside_gem_march, 0) + ISNULL(sm.outside_gem_march, 0) + ISNULL(wm.outside_gem_march, 0)) AS outside_gem_march,
                SUM(ISNULL(gm.outside_gem_april, 0) + ISNULL(sm.outside_gem_april, 0) + ISNULL(wm.outside_gem_april, 0)) AS outside_gem_april,
                SUM(ISNULL(gm.outside_gem_may, 0) + ISNULL(sm.outside_gem_may, 0) + ISNULL(wm.outside_gem_may, 0)) AS outside_gem_may,
                SUM(ISNULL(gm.outside_gem_june, 0) + ISNULL(sm.outside_gem_june, 0) + ISNULL(wm.outside_gem_june, 0)) AS outside_gem_june,
                SUM(ISNULL(gm.outside_gem_july, 0) + ISNULL(sm.outside_gem_july, 0) + ISNULL(wm.outside_gem_july, 0)) AS outside_gem_july,
                SUM(ISNULL(gm.outside_gem_august, 0) + ISNULL(sm.outside_gem_august, 0) + ISNULL(wm.outside_gem_august, 0)) AS outside_gem_august,
                SUM(ISNULL(gm.outside_gem_september, 0) + ISNULL(sm.outside_gem_september, 0) + ISNULL(wm.outside_gem_september, 0)) AS outside_gem_september,
                SUM(ISNULL(gm.outside_gem_october, 0) + ISNULL(sm.outside_gem_october, 0) + ISNULL(wm.outside_gem_october, 0)) AS outside_gem_october,
                SUM(ISNULL(gm.outside_gem_november, 0) + ISNULL(sm.outside_gem_november, 0) + ISNULL(wm.outside_gem_november, 0)) AS outside_gem_november,
                SUM(ISNULL(gm.outside_gem_december, 0) + ISNULL(sm.outside_gem_december, 0) + ISNULL(wm.outside_gem_december, 0)) AS outside_gem_december		
        FROM
        (
            SELECT
                goods_gem_id,
                ISNULL(SUM(procurement_through_gem_january), 0) AS through_gem_january,
                    ISNULL(SUM(procurement_through_gem_february), 0) AS through_gem_february,
                    ISNULL(SUM(procurement_through_gem_march), 0) AS through_gem_march,
                    ISNULL(SUM(procurement_through_gem_april), 0) AS through_gem_april,
                    ISNULL(SUM(procurement_through_gem_may), 0) AS through_gem_may,
                    ISNULL(SUM(procurement_through_gem_june), 0) AS through_gem_june,
                    ISNULL(SUM(procurement_through_gem_july), 0) AS through_gem_july,
                    ISNULL(SUM(procurement_through_gem_august), 0) AS through_gem_august,
                    ISNULL(SUM(procurement_through_gem_september), 0) AS through_gem_september,
                    ISNULL(SUM(procurement_through_gem_august), 0) AS through_gem_october,
                    ISNULL(SUM(procurement_through_gem_september), 0) AS through_gem_november,
                    ISNULL(SUM(procurement_through_gem_december), 0) AS through_gem_december,

                ISNULL(SUM(procurement_outside_gem_january), 0) AS outside_gem_january,
                    ISNULL(SUM(procurement_outside_gem_february), 0) AS outside_gem_february,
                    ISNULL(SUM(procurement_outside_gem_march), 0) AS outside_gem_march,
                    ISNULL(SUM(procurement_outside_gem_april), 0) AS outside_gem_april,
                    ISNULL(SUM(procurement_outside_gem_may), 0) AS outside_gem_may,
                    ISNULL(SUM(procurement_outside_gem_june), 0) AS outside_gem_june,
                    ISNULL(SUM(procurement_outside_gem_july), 0) AS outside_gem_july,
                    ISNULL(SUM(procurement_outside_gem_august), 0) AS outside_gem_august,
                    ISNULL(SUM(procurement_outside_gem_september), 0) AS outside_gem_september,
                    ISNULL(SUM(procurement_outside_gem_august), 0) AS outside_gem_october,
                    ISNULL(SUM(procurement_outside_gem_september), 0) AS outside_gem_november,
                    ISNULL(SUM(procurement_outside_gem_december), 0) AS outside_gem_december
            FROM
                tbl_gem_procurement_goods_monthly
                WHERE
                goods_gem_id IN (SELECT ISNULL(gem_id_goods, 0) FROM PrimaryQueryResult)
            GROUP BY
                goods_gem_id
        ) AS gm
        FULL OUTER JOIN
        (
            SELECT
                service_gem_id,
                ISNULL(SUM(procurement_through_gem_january), 0) AS through_gem_january,
                    ISNULL(SUM(procurement_through_gem_february), 0) AS through_gem_february,
                    ISNULL(SUM(procurement_through_gem_march), 0) AS through_gem_march,
                    ISNULL(SUM(procurement_through_gem_april), 0) AS through_gem_april,
                    ISNULL(SUM(procurement_through_gem_may), 0) AS through_gem_may,
                    ISNULL(SUM(procurement_through_gem_june), 0) AS through_gem_june,
                    ISNULL(SUM(procurement_through_gem_july), 0) AS through_gem_july,
                    ISNULL(SUM(procurement_through_gem_august), 0) AS through_gem_august,
                    ISNULL(SUM(procurement_through_gem_september), 0) AS through_gem_september,
                    ISNULL(SUM(procurement_through_gem_august), 0) AS through_gem_october,
                    ISNULL(SUM(procurement_through_gem_september), 0) AS through_gem_november,
                    ISNULL(SUM(procurement_through_gem_december), 0) AS through_gem_december,

                ISNULL(SUM(procurement_outside_gem_january), 0) AS outside_gem_january,
                    ISNULL(SUM(procurement_outside_gem_february), 0) AS outside_gem_february,
                    ISNULL(SUM(procurement_outside_gem_march), 0) AS outside_gem_march,
                    ISNULL(SUM(procurement_outside_gem_april), 0) AS outside_gem_april,
                    ISNULL(SUM(procurement_outside_gem_may), 0) AS outside_gem_may,
                    ISNULL(SUM(procurement_outside_gem_june), 0) AS outside_gem_june,
                    ISNULL(SUM(procurement_outside_gem_july), 0) AS outside_gem_july,
                    ISNULL(SUM(procurement_outside_gem_august), 0) AS outside_gem_august,
                    ISNULL(SUM(procurement_outside_gem_september), 0) AS outside_gem_september,
                    ISNULL(SUM(procurement_outside_gem_august), 0) AS outside_gem_october,
                    ISNULL(SUM(procurement_outside_gem_september), 0) AS outside_gem_november,
                    ISNULL(SUM(procurement_outside_gem_december), 0) AS outside_gem_december
            FROM
                tbl_gem_procurement_service_monthly
            WHERE
                service_gem_id IN (SELECT ISNULL(gem_id_service, 0) FROM PrimaryQueryResult)
            GROUP BY
                service_gem_id
        ) AS sm ON gm.goods_gem_id = sm.service_gem_id
        FULL OUTER JOIN
        (
            SELECT
                works_gem_id,
                ISNULL(SUM(procurement_through_gem_january), 0) AS through_gem_january,
                    ISNULL(SUM(procurement_through_gem_february), 0) AS through_gem_february,
                    ISNULL(SUM(procurement_through_gem_march), 0) AS through_gem_march,
                    ISNULL(SUM(procurement_through_gem_april), 0) AS through_gem_april,
                    ISNULL(SUM(procurement_through_gem_may), 0) AS through_gem_may,
                    ISNULL(SUM(procurement_through_gem_june), 0) AS through_gem_june,
                    ISNULL(SUM(procurement_through_gem_july), 0) AS through_gem_july,
                    ISNULL(SUM(procurement_through_gem_august), 0) AS through_gem_august,
                    ISNULL(SUM(procurement_through_gem_september), 0) AS through_gem_september,
                    ISNULL(SUM(procurement_through_gem_august), 0) AS through_gem_october,
                    ISNULL(SUM(procurement_through_gem_september), 0) AS through_gem_november,
                    ISNULL(SUM(procurement_through_gem_december), 0) AS through_gem_december,

                ISNULL(SUM(procurement_outside_gem_january), 0) AS outside_gem_january,
                    ISNULL(SUM(procurement_outside_gem_february), 0) AS outside_gem_february,
                    ISNULL(SUM(procurement_outside_gem_march), 0) AS outside_gem_march,
                    ISNULL(SUM(procurement_outside_gem_april), 0) AS outside_gem_april,
                    ISNULL(SUM(procurement_outside_gem_may), 0) AS outside_gem_may,
                    ISNULL(SUM(procurement_outside_gem_june), 0) AS outside_gem_june,
                    ISNULL(SUM(procurement_outside_gem_july), 0) AS outside_gem_july,
                    ISNULL(SUM(procurement_outside_gem_august), 0) AS outside_gem_august,
                    ISNULL(SUM(procurement_outside_gem_september), 0) AS outside_gem_september,
                    ISNULL(SUM(procurement_outside_gem_august), 0) AS outside_gem_october,
                    ISNULL(SUM(procurement_outside_gem_september), 0) AS outside_gem_november,
                    ISNULL(SUM(procurement_outside_gem_december), 0) AS outside_gem_december
            FROM
                tbl_gem_procurement_works_monthly
                WHERE
                works_gem_id IN (SELECT ISNULL(gem_id_works, 0) FROM PrimaryQueryResult)
            GROUP BY
                works_gem_id
        ) AS wm ON gm.goods_gem_id = wm.works_gem_id;

        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function gemGoodsMonthlyReport(req, res) {
    const goodsGemID = req.params.goodsGemID;

    const recordOrgId = await loadRecordOrganisationId(
        "tbl_gem_procurement_goods",
        "goods_gem_id",
        "goods_organisation_id",
        goodsGemID
    );
    if (recordOrgId == null) {
        return res.status(404).json({ error: "GeM goods record not found." });
    }
    if (!isOrganisationInScope(req, recordOrgId)) {
        return res.status(403).json({ error: "Record outside your data scope." });
    }

    const conn = await pool;
    const request = conn.request();
    console.log('goodsgemID', goodsGemID);
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

async function gemServiceMonthlyReport(req, res) {
    const serviceGemId = req.params.serviceGemID;

    const recordOrgId = await loadRecordOrganisationId(
        "tbl_gem_procurement_service",
        "service_gem_id",
        "service_organisation_id",
        serviceGemId
    );
    if (recordOrgId == null) {
        return res.status(404).json({ error: "GeM service record not found." });
    }
    if (!isOrganisationInScope(req, recordOrgId)) {
        return res.status(403).json({ error: "Record outside your data scope." });
    }

    const conn = await pool;
    const request = conn.request();
    console.log('serviceGemId', serviceGemId);
    request.input("serviceGemId", serviceGemId);
    
    try {
        const result = await request.query(`
            SELECT * FROM tbl_gem_procurement_service_monthly where service_gem_id = @serviceGemId;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function gemWorkMonthlyReport(req, res) {
    const worksGemID = req.params.worksGemID;

    const recordOrgId = await loadRecordOrganisationId(
        "tbl_gem_procurement_works",
        "works_gem_id",
        "works_organisation_id",
        worksGemID
    );
    if (recordOrgId == null) {
        return res.status(404).json({ error: "GeM works record not found." });
    }
    if (!isOrganisationInScope(req, recordOrgId)) {
        return res.status(403).json({ error: "Record outside your data scope." });
    }

    const conn = await pool;
    const request = conn.request();
    console.log('worksGemID', worksGemID);
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



const GEM_MONTHS = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
];

const monthlySum = (prefix) =>
    GEM_MONTHS.map((month) => `ISNULL(${prefix}_${month}, 0)`).join(" + ");

const categoryRollup = (alias, table, monthlyTable, idCol, orgCol, yearCol, targetCol) => `
        ${alias} AS (
            SELECT
                t.${orgCol} AS organisation_id,
                SUM(ISNULL(t.${targetCol}, 0)) AS planned,
                SUM(ISNULL(m.through_gem, 0)) AS through_gem,
                SUM(ISNULL(m.outside_gem, 0)) AS outside_gem
            FROM ${table} t
            LEFT JOIN (
                SELECT
                    ${idCol},
                    SUM(${monthlySum("procurement_through_gem")}) AS through_gem,
                    SUM(${monthlySum("procurement_outside_gem")}) AS outside_gem
                FROM ${monthlyTable}
                GROUP BY ${idCol}
            ) m ON m.${idCol} = t.${idCol}
            WHERE t.${yearCol} = @selectedYear
            GROUP BY t.${orgCol}
        )`;

async function getGemReport(req, res)
{
    const selectedYear = req.params.selectedYear;

    const conn = await pool;
    const request = conn.request();

    request.input("selectedYear", selectedYear);

    const { whereSql } = applyDataScope(request, req.user, {
        strategy: "directOrgColumn",
        alias: "o",
        orgColumn: "organisation_id",
    });

    try
    {
       const gemReportQuery = await request.query(`
        WITH
${categoryRollup("goods", "tbl_gem_procurement_goods", "tbl_gem_procurement_goods_monthly", "goods_gem_id", "goods_organisation_id", "goods_financial_year", "goods_procurement_potential")},
${categoryRollup("service", "tbl_gem_procurement_service", "tbl_gem_procurement_service_monthly", "service_gem_id", "service_organisation_id", "service_financial_year", "service_procurement_potential")},
${categoryRollup("works", "tbl_gem_procurement_works", "tbl_gem_procurement_works_monthly", "works_gem_id", "works_organisation_id", "works_financial_year", "works_procurement_potential")}
        SELECT
            o.organisation_id,
            o.organisation_name,
            CASE
                WHEN o.gemreport_order BETWEEN 2 AND 13 THEN 'Major Ports'
                WHEN o.gemreport_order BETWEEN 14 AND 15 THEN 'Authorities'
                WHEN o.gemreport_order BETWEEN 16 AND 18 THEN 'Subordinate/Attached Offices'
                WHEN o.gemreport_order BETWEEN 19 AND 25 THEN 'Public Sector Undertakings'
                WHEN o.gemreport_order >= 26 THEN 'Other Organizations'
                ELSE ''
            END AS display_group,
            (ISNULL(g.planned,0) + ISNULL(s.planned,0) + ISNULL(w.planned,0)) AS planned_procurement,
            ISNULL(g.planned,0) AS goods_procurement_potential,
            ISNULL(s.planned,0) AS service_procurement_potential,
            ISNULL(w.planned,0) AS works_procurement_potential,
            ISNULL(g.through_gem,0) AS products,
            ISNULL(s.through_gem,0) AS services,
            ISNULL(w.through_gem,0) AS works,
            (ISNULL(g.through_gem,0) + ISNULL(s.through_gem,0) + ISNULL(w.through_gem,0)) AS grand_total,
            (ISNULL(g.outside_gem,0) + ISNULL(s.outside_gem,0) + ISNULL(w.outside_gem,0)) AS outside_gem
        FROM mmt_organisation o
        LEFT JOIN goods g ON g.organisation_id = o.organisation_id
        LEFT JOIN service s ON s.organisation_id = o.organisation_id
        LEFT JOIN works w ON w.organisation_id = o.organisation_id
        WHERE o.gemreport_order IS NOT NULL ${whereSql}
        ORDER BY o.gemreport_order;`);

    res.json({
        gemReport: gemReportQuery.recordset
    });

    }catch(err){
        return res.status(500).json({
            message: err.message
        });
    }
}

function getIndianFinancialYearStart(date = new Date()) {
    const month = date.getMonth();
    const year = date.getFullYear();
    return month >= 3 ? year : year - 1;
}

function buildYoYFinancialYears(fromStartYear = 2022, asOf = new Date()) {
    const currentStart = getIndianFinancialYearStart(asOf);
    const years = [];
    for (let y = fromStartYear; y <= currentStart; y += 1) {
        years.push(`${y}-${y + 1}`);
    }
    return years;
}

function pivotGemYoYRows(flatRows, financialYears) {
    const byOrg = new Map();

    (flatRows || []).forEach((row) => {
        const key = String(row.organisation_id ?? row.organisation_name);
        if (!byOrg.has(key)) {
            const years = {};
            financialYears.forEach((fy) => {
                years[fy] = {
                    planned_procurement: 0,
                    through_gem: 0,
                    outside_gem: 0,
                    pct: 0,
                };
            });
            byOrg.set(key, {
                organisation_id: row.organisation_id,
                organisation_name: row.organisation_name || "—",
                display_group: row.display_group || "",
                years,
            });
        }

        const entry = byOrg.get(key);
        const fy = row.financial_year;
        if (fy && entry.years[fy]) {
            entry.years[fy] = {
                planned_procurement: Number(row.planned_procurement) || 0,
                through_gem: Number(row.through_gem) || 0,
                outside_gem: Number(row.outside_gem) || 0,
                pct: Number(row.pct) || 0,
            };
        }
    });

    return Array.from(byOrg.values()).sort((a, b) =>
        String(a.organisation_name).localeCompare(String(b.organisation_name), "en")
    );
}

async function getGemSummaryReport(req, res) {
    const selectedYear = req.params.selectedYear;

    const conn = await pool;
    const request = conn.request();
    request.input("selectedYear", selectedYear);

    const { whereSql } = applyDataScope(request, req.user, {
        strategy: "directOrgColumn",
        alias: "o",
        orgColumn: "organisation_id",
    });

    try {
        const result = await request.query(`
            WITH
${categoryRollup("goods", "tbl_gem_procurement_goods", "tbl_gem_procurement_goods_monthly", "goods_gem_id", "goods_organisation_id", "goods_financial_year", "goods_procurement_potential")},
${categoryRollup("service", "tbl_gem_procurement_service", "tbl_gem_procurement_service_monthly", "service_gem_id", "service_organisation_id", "service_financial_year", "service_procurement_potential")},
${categoryRollup("works", "tbl_gem_procurement_works", "tbl_gem_procurement_works_monthly", "works_gem_id", "works_organisation_id", "works_financial_year", "works_procurement_potential")}
            SELECT
                o.organisation_id,
                o.organisation_name,
                CASE
                    WHEN o.gemreport_order BETWEEN 2 AND 13 THEN 'Major Ports'
                    WHEN o.gemreport_order BETWEEN 14 AND 15 THEN 'Authorities'
                    WHEN o.gemreport_order BETWEEN 16 AND 18 THEN 'Subordinate/Attached Offices'
                    WHEN o.gemreport_order BETWEEN 19 AND 25 THEN 'Public Sector Undertakings'
                    WHEN o.gemreport_order >= 26 THEN 'Other Organizations'
                    ELSE ''
                END AS display_group,
                (ISNULL(g.planned,0) + ISNULL(s.planned,0) + ISNULL(w.planned,0)) AS planned_procurement,
                (ISNULL(g.through_gem,0) + ISNULL(s.through_gem,0) + ISNULL(w.through_gem,0)) AS through_gem,
                (ISNULL(g.outside_gem,0) + ISNULL(s.outside_gem,0) + ISNULL(w.outside_gem,0)) AS outside_gem,
                CASE
                    WHEN (ISNULL(g.planned,0) + ISNULL(s.planned,0) + ISNULL(w.planned,0)) = 0 THEN 0
                    ELSE ROUND(
                        ((ISNULL(g.through_gem,0) + ISNULL(s.through_gem,0) + ISNULL(w.through_gem,0)) * 100.0)
                        / (ISNULL(g.planned,0) + ISNULL(s.planned,0) + ISNULL(w.planned,0)),
                        2
                    )
                END AS pct
            FROM mmt_organisation o
            LEFT JOIN goods g ON g.organisation_id = o.organisation_id
            LEFT JOIN service s ON s.organisation_id = o.organisation_id
            LEFT JOIN works w ON w.organisation_id = o.organisation_id
            WHERE o.gemreport_order IS NOT NULL ${whereSql}
            ORDER BY o.gemreport_order;
        `);

        res.json({
            selectedYear,
            data: result.recordset || [],
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
}

async function getGemYoYReport(req, res) {
    const financialYears = buildYoYFinancialYears();
    if (!financialYears.length) {
        return res.json({ financialYears: [], data: [] });
    }

    const conn = await pool;
    const request = conn.request();

    const fyParams = financialYears.map((fy, i) => {
        const name = `fy${i}`;
        request.input(name, fy);
        return `@${name}`;
    });

    const { whereSql } = applyDataScope(request, req.user, {
        strategy: "directOrgColumn",
        alias: "o",
        orgColumn: "organisation_id",
    });

    try {
        const result = await request.query(`
            WITH months_goods AS (
                SELECT goods_gem_id,
                    SUM(${monthlySum("procurement_through_gem")}) AS through_gem,
                    SUM(${monthlySum("procurement_outside_gem")}) AS outside_gem
                FROM tbl_gem_procurement_goods_monthly
                GROUP BY goods_gem_id
            ),
            goods AS (
                SELECT
                    g.goods_organisation_id AS organisation_id,
                    g.goods_financial_year AS financial_year,
                    SUM(ISNULL(g.goods_procurement_potential,0)) AS planned,
                    SUM(ISNULL(mg.through_gem,0)) AS through_gem,
                    SUM(ISNULL(mg.outside_gem,0)) AS outside_gem
                FROM tbl_gem_procurement_goods g
                LEFT JOIN months_goods mg ON mg.goods_gem_id = g.goods_gem_id
                WHERE g.goods_financial_year IN (${fyParams.join(", ")})
                GROUP BY g.goods_organisation_id, g.goods_financial_year
            ),
            months_service AS (
                SELECT service_gem_id,
                    SUM(${monthlySum("procurement_through_gem")}) AS through_gem,
                    SUM(${monthlySum("procurement_outside_gem")}) AS outside_gem
                FROM tbl_gem_procurement_service_monthly
                GROUP BY service_gem_id
            ),
            service AS (
                SELECT
                    s.service_organisation_id AS organisation_id,
                    s.service_financial_year AS financial_year,
                    SUM(ISNULL(s.service_procurement_potential,0)) AS planned,
                    SUM(ISNULL(ms.through_gem,0)) AS through_gem,
                    SUM(ISNULL(ms.outside_gem,0)) AS outside_gem
                FROM tbl_gem_procurement_service s
                LEFT JOIN months_service ms ON ms.service_gem_id = s.service_gem_id
                WHERE s.service_financial_year IN (${fyParams.join(", ")})
                GROUP BY s.service_organisation_id, s.service_financial_year
            ),
            months_works AS (
                SELECT works_gem_id,
                    SUM(${monthlySum("procurement_through_gem")}) AS through_gem,
                    SUM(${monthlySum("procurement_outside_gem")}) AS outside_gem
                FROM tbl_gem_procurement_works_monthly
                GROUP BY works_gem_id
            ),
            works AS (
                SELECT
                    w.works_organisation_id AS organisation_id,
                    w.works_financial_year AS financial_year,
                    SUM(ISNULL(w.works_procurement_potential,0)) AS planned,
                    SUM(ISNULL(mw.through_gem,0)) AS through_gem,
                    SUM(ISNULL(mw.outside_gem,0)) AS outside_gem
                FROM tbl_gem_procurement_works w
                LEFT JOIN months_works mw ON mw.works_gem_id = w.works_gem_id
                WHERE w.works_financial_year IN (${fyParams.join(", ")})
                GROUP BY w.works_organisation_id, w.works_financial_year
            ),
            all_data AS (
                SELECT organisation_id, financial_year, planned, through_gem, outside_gem FROM goods
                UNION ALL
                SELECT organisation_id, financial_year, planned, through_gem, outside_gem FROM service
                UNION ALL
                SELECT organisation_id, financial_year, planned, through_gem, outside_gem FROM works
            ),
            by_org_fy AS (
                SELECT
                    organisation_id,
                    financial_year,
                    SUM(ISNULL(planned,0)) AS planned_procurement,
                    SUM(ISNULL(through_gem,0)) AS through_gem,
                    SUM(ISNULL(outside_gem,0)) AS outside_gem
                FROM all_data
                GROUP BY organisation_id, financial_year
            )
            SELECT
                o.organisation_id,
                o.organisation_name,
                CASE
                    WHEN o.gemreport_order BETWEEN 2 AND 13 THEN 'Major Ports'
                    WHEN o.gemreport_order BETWEEN 14 AND 15 THEN 'Authorities'
                    WHEN o.gemreport_order BETWEEN 16 AND 18 THEN 'Subordinate/Attached Offices'
                    WHEN o.gemreport_order BETWEEN 19 AND 25 THEN 'Public Sector Undertakings'
                    WHEN o.gemreport_order >= 26 THEN 'Other Organizations'
                    ELSE ''
                END AS display_group,
                d.financial_year,
                ISNULL(d.planned_procurement, 0) AS planned_procurement,
                ISNULL(d.through_gem, 0) AS through_gem,
                ISNULL(d.outside_gem, 0) AS outside_gem,
                CASE
                    WHEN ISNULL(d.planned_procurement, 0) = 0 THEN 0
                    ELSE ROUND((ISNULL(d.through_gem, 0) * 100.0) / ISNULL(d.planned_procurement, 0), 2)
                END AS pct
            FROM mmt_organisation o
            LEFT JOIN by_org_fy d ON d.organisation_id = o.organisation_id
            WHERE o.gemreport_order IS NOT NULL
              AND d.financial_year IN (${fyParams.join(", ")})
              ${whereSql}
            ORDER BY o.gemreport_order, d.financial_year;
        `);

        res.json({
            financialYears,
            data: pivotGemYoYRows(result.recordset, financialYears),
        });
    } catch (err) {
        return res.status(500).json({
            message: err.message,
        });
    }
}

export default {
    gemGoodsData,
    gemTotalMonthlyReport,
    gemGoodsMonthlyReport,
    gemServiceMonthlyReport,
    gemWorkMonthlyReport,
    gemServiceData,
    gemWorksData,
    getGemReport,
    getGemSummaryReport,
    getGemYoYReport,
};