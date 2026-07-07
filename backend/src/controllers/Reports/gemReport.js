
import { pool } from "../../db.js";

async function gemGoodsData (req, res) 
{
    const conn = await pool;
    try 
    {
        const result = await conn.query(`SELECT
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
    ) AS monthly ON gpg.goods_gem_id = monthly.goods_gem_id   ;`);
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
    try 
    {
        const result = await conn.query(`   SELECT
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
    

    ;`);
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
    try 
    {
        const result = await conn.query(` SELECT
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
    ) AS monthly ON gpw.works_gem_id = monthly.works_gem_id ;`);
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

        //console.log(result);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function gemGoodsMonthlyReport(req, res) {
    const goodsGemID = req.params.goodsGemID;

    const conn = await pool;
    const request = conn.request();
    console.log('goodsgemID', goodsGemID);
    request.input("goodsGemID", goodsGemID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_gem_procurement_goods_monthly where goods_gem_id = @goodsGemID;
        `);

        // console.log(result);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function gemServiceMonthlyReport(req, res) {
    const serviceGemId = req.params.serviceGemID;

    const conn = await pool;
    const request = conn.request();
    console.log('serviceGemId', serviceGemId);
    request.input("serviceGemId", serviceGemId);
    
    try {
        const result = await request.query(`
            SELECT * FROM tbl_gem_procurement_service_monthly where service_gem_id = @serviceGemId;
        `);

        // console.log(result);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function gemWorkMonthlyReport(req, res) {
    const worksGemID = req.params.worksGemID;

    const conn = await pool;
    const request = conn.request();
    console.log('worksGemID', worksGemID);
    request.input("worksGemID", worksGemID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_gem_procurement_works_monthly where works_gem_id = @worksGemID;
        `);

        // console.log(result);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}



async function getGemReport(req, res)
{
    const selectedYear = req.params.selectedYear;

    const conn = await pool;
    const request = conn.request();

    request.input("selectedYear", selectedYear);

    try
    {
       const gemReportQuery = await request.query(`
        SELECT
            o.organisation_id,
            o.organisation_name,
            CASE
                WHEN o.gemreport_order = 2 THEN 'Major Ports'
                WHEN o.gemreport_order = 14 THEN 'Authorities'
                WHEN o.gemreport_order = 16 THEN 'Subordinate/Attached Offices'
                WHEN o.gemreport_order = 19 THEN 'Public Sector Undertakings'
                WHEN o.gemreport_order = 26 THEN 'Other Organizations'
                ELSE ''
            END AS display_group,
            (
                ISNULL(g.goods_procurement_potential,0)+
                ISNULL(s.service_procurement_potential,0)+
                ISNULL(w.works_procurement_potential,0)
            ) AS planned_procurement,
            ISNULL(g.goods_procurement_potential,0) AS goods_procurement_potential,
            ISNULL(s.service_procurement_potential,0) AS service_procurement_potential,
            ISNULL(w.works_procurement_potential,0) AS works_procurement_potential,
            ISNULL(gm.through_gem_total,0) AS products,
            ISNULL(sm.through_gem_total,0) AS services,
            ISNULL(wm.through_gem_total,0) AS works,
            (
                ISNULL(gm.through_gem_total,0)+
                ISNULL(sm.through_gem_total,0)+
                ISNULL(wm.through_gem_total,0) ) AS grand_total,
            (
                ISNULL(gm.outside_gem_total,0)+
                ISNULL(sm.outside_gem_total,0)+
                ISNULL(wm.outside_gem_total,0) ) AS outside_gem
        FROM mmt_organisation o

        LEFT JOIN tbl_gem_procurement_goods g
        ON o.organisation_id = g.goods_organisation_id
        AND g.goods_financial_year = @selectedYear

        LEFT JOIN tbl_gem_procurement_service s
        ON o.organisation_id = s.service_organisation_id
        AND s.service_financial_year = @selectedYear

        LEFT JOIN tbl_gem_procurement_works w
        ON o.organisation_id = w.works_organisation_id
        AND w.works_financial_year = @selectedYear

        LEFT JOIN tbl_gem_procurement_goods_monthly gm
        ON g.goods_gem_id = gm.goods_gem_id

        LEFT JOIN tbl_gem_procurement_service_monthly sm
        ON s.service_gem_id = sm.service_gem_id

        LEFT JOIN tbl_gem_procurement_works_monthly wm
        ON w.works_gem_id = wm.works_gem_id

        WHERE o.gemreport_order IS NOT NULL
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




export default { gemGoodsData, gemTotalMonthlyReport, gemGoodsMonthlyReport, gemServiceMonthlyReport, gemWorkMonthlyReport, gemServiceData, gemWorksData, getGemReport };