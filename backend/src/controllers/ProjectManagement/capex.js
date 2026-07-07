import { pool } from "../../db.js";

async function addCapex(req, res) {
    const userId = req.body.userID;
    const financialYear = req.body.financialYear;
    const organisationId = req.body.organisationId;
    const gbsValue = req.body.gbsValue; 
    const iebrValue = req.body.iebrValue; 
    const PPPValue = req.body.PPPValue;
    const totalValue = req.body.totalValue; 

    const conn = await pool;
    const request = conn.request();

    request.input("userId", userId);
    request.input("financialYear", financialYear);
    request.input("organisationId", organisationId);
    request.input("gbsValue", gbsValue);
    request.input("iebrValue", iebrValue);   
    request.input("PPPValue", PPPValue);
    request.input("totalValue", totalValue);

    try {
        const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_capex
            WHERE capex_financial_year = @financialYear
            AND capex_organisation_id = @organisationId
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "Record already exists for the specified financialYear and organisationId." });
        }

        const insertResult = await request.query(`
            INSERT INTO tbl_capex (
                created_by,
                capex_financial_year,
                capex_organisation_id,
                capex_gbs_value,
                capex_iebr_value,
                capex_ppp_value,
                capex_total_value
            )
            VALUES (
                @userId,
                @financialYear,
                @organisationId,
                @gbsValue,
                @iebrValue,
                @PPPValue,
                @totalValue
            )
        `);

        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getCapexData(req, res) {
    const userID = req.params.userID;

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
        SELECT
            tbl_capex.*,
            COALESCE(monthly.total_capex_expenditure, 0) AS total_capex_expenditure,
            org.organisation_name as organisation_name
        FROM sagarmanthan_revamp.dbo.tbl_capex
        LEFT JOIN (
            SELECT
                capex_id,
                ISNULL(SUM(
                    ISNULL(capex_Total_Month_January, 0) +
                    ISNULL(capex_Total_Month_February, 0) +
                    ISNULL(capex_Total_Month_March, 0) +
                    ISNULL(capex_Total_Month_April, 0) +
                    ISNULL(capex_Total_Month_May, 0) +
                    ISNULL(capex_Total_Month_June, 0) +
                    ISNULL(capex_Total_Month_July, 0) +
                    ISNULL(capex_Total_Month_August, 0) +
                    ISNULL(capex_Total_Month_September, 0) +
                    ISNULL(capex_Total_Month_October, 0) +
                    ISNULL(capex_Total_Month_November, 0) +
                    ISNULL(capex_Total_Month_December, 0)
                ), 0) AS total_capex_expenditure
            FROM sagarmanthan_revamp.dbo.tbl_capex_monthly
            GROUP BY capex_id
        ) AS monthly ON tbl_capex.capex_id = monthly.capex_id
        LEFT JOIN sagarmanthan_revamp.dbo.mmt_organisation AS org ON tbl_capex.capex_organisation_id = org.organisation_id
        ORDER BY tbl_capex.capex_financial_year DESC;
     `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function addCapexMonthlyData(req, res) {
    const capexID = req.body.capexID;
    const conn = await pool;
    const request = conn.request();
    // January
    const capexGBSWeek1January = req.body.capexGBSWeek1January;
    const capexIEBRWeek1January = req.body.capexIEBRWeek1January;
    const capexPPPWeek1January = req.body.capexPPPWeek1January;

    const capexGBSWeek2January = req.body.capexGBSWeek2January;
    const capexIEBRWeek2January = req.body.capexIEBRWeek2January;
    const capexPPPWeek2January = req.body.capexPPPWeek2January;

    const capexGBSWeek3January = req.body.capexGBSWeek3January;
    const capexIEBRWeek3January = req.body.capexIEBRWeek3January;
    const capexPPPWeek3January = req.body.capexPPPWeek3January;

    const capexGBSWeek4January = req.body.capexGBSWeek4January;
    const capexIEBRWeek4January = req.body.capexIEBRWeek4January;
    const capexPPPWeek4January = req.body.capexPPPWeek4January;

    const capexTotalMonthJanuary = req.body.capexTotalMonthJanuary;

    // February
    const capexGBSWeek1February = req.body.capexGBSWeek1February;
    const capexIEBRWeek1February = req.body.capexIEBRWeek1February;
    const capexPPPWeek1February = req.body.capexPPPWeek1February;

    const capexGBSWeek2February = req.body.capexGBSWeek2February;
    const capexIEBRWeek2February = req.body.capexIEBRWeek2February;
    const capexPPPWeek2February = req.body.capexPPPWeek2February;

    const capexGBSWeek3February = req.body.capexGBSWeek3February;
    const capexIEBRWeek3February = req.body.capexIEBRWeek3February;
    const capexPPPWeek3February = req.body.capexPPPWeek3February;

    const capexGBSWeek4February = req.body.capexGBSWeek4February;
    const capexIEBRWeek4February = req.body.capexIEBRWeek4February;
    const capexPPPWeek4February = req.body.capexPPPWeek4February;

    const capexTotalMonthFebruary = req.body.capexTotalMonthFebruary;
    // March
    const capexGBSWeek1March = req.body.capexGBSWeek1March;
    const capexIEBRWeek1March = req.body.capexIEBRWeek1March;
    const capexPPPWeek1March = req.body.capexPPPWeek1March;

    const capexGBSWeek2March = req.body.capexGBSWeek2March;
    const capexIEBRWeek2March = req.body.capexIEBRWeek2March;
    const capexPPPWeek2March = req.body.capexPPPWeek2March;

    const capexGBSWeek3March = req.body.capexGBSWeek3March;
    const capexIEBRWeek3March = req.body.capexIEBRWeek3March;
    const capexPPPWeek3March = req.body.capexPPPWeek3March;

    const capexGBSWeek4March = req.body.capexGBSWeek4March;
    const capexIEBRWeek4March = req.body.capexIEBRWeek4March;
    const capexPPPWeek4March = req.body.capexPPPWeek4March;

    const capexTotalMonthMarch = req.body.capexTotalMonthMarch;

    // April
    const capexGBSWeek1April = req.body.capexGBSWeek1April;
    const capexIEBRWeek1April = req.body.capexIEBRWeek1April;
    const capexPPPWeek1April = req.body.capexPPPWeek1April;

    const capexGBSWeek2April = req.body.capexGBSWeek2April;
    const capexIEBRWeek2April = req.body.capexIEBRWeek2April;
    const capexPPPWeek2April = req.body.capexPPPWeek2April;

    const capexGBSWeek3April = req.body.capexGBSWeek3April;
    const capexIEBRWeek3April = req.body.capexIEBRWeek3April;
    const capexPPPWeek3April = req.body.capexPPPWeek3April;

    const capexGBSWeek4April = req.body.capexGBSWeek4April;
    const capexIEBRWeek4April = req.body.capexIEBRWeek4April;
    const capexPPPWeek4April = req.body.capexPPPWeek4April;

    const capexTotalMonthApril = req.body.capexTotalMonthApril;

    // May
    const capexGBSWeek1May = req.body.capexGBSWeek1May;
    const capexIEBRWeek1May = req.body.capexIEBRWeek1May;
    const capexPPPWeek1May = req.body.capexPPPWeek1May;

    const capexGBSWeek2May = req.body.capexGBSWeek2May;
    const capexIEBRWeek2May = req.body.capexIEBRWeek2May;
    const capexPPPWeek2May = req.body.capexPPPWeek2May;

    const capexGBSWeek3May = req.body.capexGBSWeek3May;
    const capexIEBRWeek3May = req.body.capexIEBRWeek3May;
    const capexPPPWeek3May = req.body.capexPPPWeek3May;

    const capexGBSWeek4May = req.body.capexGBSWeek4May;
    const capexIEBRWeek4May = req.body.capexIEBRWeek4May;
    const capexPPPWeek4May = req.body.capexPPPWeek4May;

    const capexTotalMonthMay = req.body.capexTotalMonthMay;

    // June
    const capexGBSWeek1June = req.body.capexGBSWeek1June;
    const capexIEBRWeek1June = req.body.capexIEBRWeek1June;
    const capexPPPWeek1June = req.body.capexPPPWeek1June;

    const capexGBSWeek2June = req.body.capexGBSWeek2June;
    const capexIEBRWeek2June = req.body.capexIEBRWeek2June;
    const capexPPPWeek2June = req.body.capexPPPWeek2June;

    const capexGBSWeek3June = req.body.capexGBSWeek3June;
    const capexIEBRWeek3June = req.body.capexIEBRWeek3June;
    const capexPPPWeek3June = req.body.capexPPPWeek3June;

    const capexGBSWeek4June = req.body.capexGBSWeek4June;
    const capexIEBRWeek4June = req.body.capexIEBRWeek4June;
    const capexPPPWeek4June = req.body.capexPPPWeek4June;

    const capexTotalMonthJune = req.body.capexTotalMonthJune;

    // July
    const capexGBSWeek1July = req.body.capexGBSWeek1July;
    const capexIEBRWeek1July = req.body.capexIEBRWeek1July;
    const capexPPPWeek1July = req.body.capexPPPWeek1July;

    const capexGBSWeek2July = req.body.capexGBSWeek2July;
    const capexIEBRWeek2July = req.body.capexIEBRWeek2July;
    const capexPPPWeek2July = req.body.capexPPPWeek2July;

    const capexGBSWeek3July = req.body.capexGBSWeek3July;
    const capexIEBRWeek3July = req.body.capexIEBRWeek3July;
    const capexPPPWeek3July = req.body.capexPPPWeek3July;

    const capexGBSWeek4July = req.body.capexGBSWeek4July;
    const capexIEBRWeek4July = req.body.capexIEBRWeek4July;
    const capexPPPWeek4July = req.body.capexPPPWeek4July;

    const capexTotalMonthJuly = req.body.capexTotalMonthJuly;

    // August
    const capexGBSWeek1August = req.body.capexGBSWeek1August;
    const capexIEBRWeek1August = req.body.capexIEBRWeek1August;
    const capexPPPWeek1August = req.body.capexPPPWeek1August;

    const capexGBSWeek2August = req.body.capexGBSWeek2August;
    const capexIEBRWeek2August = req.body.capexIEBRWeek2August;
    const capexPPPWeek2August = req.body.capexPPPWeek2August;

    const capexGBSWeek3August = req.body.capexGBSWeek3August;
    const capexIEBRWeek3August = req.body.capexIEBRWeek3August;
    const capexPPPWeek3August = req.body.capexPPPWeek3August;

    const capexGBSWeek4August = req.body.capexGBSWeek4August;
    const capexIEBRWeek4August = req.body.capexIEBRWeek4August;
    const capexPPPWeek4August = req.body.capexPPPWeek4August;

    const capexTotalMonthAugust = req.body.capexTotalMonthAugust;

    // September
    const capexGBSWeek1September = req.body.capexGBSWeek1September;
    const capexIEBRWeek1September = req.body.capexIEBRWeek1September;
    const capexPPPWeek1September = req.body.capexPPPWeek1September;

    const capexGBSWeek2September = req.body.capexGBSWeek2September;
    const capexIEBRWeek2September = req.body.capexIEBRWeek2September;
    const capexPPPWeek2September = req.body.capexPPPWeek2September;

    const capexGBSWeek3September = req.body.capexGBSWeek3September;
    const capexIEBRWeek3September = req.body.capexIEBRWeek3September;
    const capexPPPWeek3September = req.body.capexPPPWeek3September;

    const capexGBSWeek4September = req.body.capexGBSWeek4September;
    const capexIEBRWeek4September = req.body.capexIEBRWeek4September;
    const capexPPPWeek4September = req.body.capexPPPWeek4September;

    const capexTotalMonthSeptember = req.body.capexTotalMonthSeptember;

    // October
    const capexGBSWeek1October = req.body.capexGBSWeek1October;
    const capexIEBRWeek1October = req.body.capexIEBRWeek1October;
    const capexPPPWeek1October = req.body.capexPPPWeek1October;

    const capexGBSWeek2October = req.body.capexGBSWeek2October;
    const capexIEBRWeek2October = req.body.capexIEBRWeek2October;
    const capexPPPWeek2October = req.body.capexPPPWeek2October;

    const capexGBSWeek3October = req.body.capexGBSWeek3October;
    const capexIEBRWeek3October = req.body.capexIEBRWeek3October;
    const capexPPPWeek3October = req.body.capexPPPWeek3October;

    const capexGBSWeek4October = req.body.capexGBSWeek4October;
    const capexIEBRWeek4October = req.body.capexIEBRWeek4October;
    const capexPPPWeek4October = req.body.capexPPPWeek4October;

    const capexTotalMonthOctober = req.body.capexTotalMonthOctober;

    // November
    const capexGBSWeek1November = req.body.capexGBSWeek1November;
    const capexIEBRWeek1November = req.body.capexIEBRWeek1November;
    const capexPPPWeek1November = req.body.capexPPPWeek1November;

    const capexGBSWeek2November = req.body.capexGBSWeek2November;
    const capexIEBRWeek2November = req.body.capexIEBRWeek2November;
    const capexPPPWeek2November = req.body.capexPPPWeek2November;

    const capexGBSWeek3November = req.body.capexGBSWeek3November;
    const capexIEBRWeek3November = req.body.capexIEBRWeek3November;
    const capexPPPWeek3November = req.body.capexPPPWeek3November;

    const capexGBSWeek4November = req.body.capexGBSWeek4November;
    const capexIEBRWeek4November = req.body.capexIEBRWeek4November;
    const capexPPPWeek4November = req.body.capexPPPWeek4November;

    const capexTotalMonthNovember = req.body.capexTotalMonthNovember;

    // December
    const capexGBSWeek1December = req.body.capexGBSWeek1December;
    const capexIEBRWeek1December = req.body.capexIEBRWeek1December;
    const capexPPPWeek1December = req.body.capexPPPWeek1December;

    const capexGBSWeek2December = req.body.capexGBSWeek2December;
    const capexIEBRWeek2December = req.body.capexIEBRWeek2December;
    const capexPPPWeek2December = req.body.capexPPPWeek2December;

    const capexGBSWeek3December = req.body.capexGBSWeek3December;
    const capexIEBRWeek3December = req.body.capexIEBRWeek3December;
    const capexPPPWeek3December = req.body.capexPPPWeek3December;

    const capexGBSWeek4December = req.body.capexGBSWeek4December;
    const capexIEBRWeek4December = req.body.capexIEBRWeek4December;
    const capexPPPWeek4December = req.body.capexPPPWeek4December

    const capexTotalMonthDecember =  req.body.capexTotalMonthDecember;

    const totalGBS =  req.body.totalGBS;
    const totalIEBR =  req.body.totalIEBR;
    const totalPPP =  req.body.totalPPP;
    const totalCapex =  req.body.totalCapex;


    request.input("capexID", capexID);

    // January
    request.input("capexGBSWeek1January", capexGBSWeek1January);
    request.input("capexIEBRWeek1January", capexIEBRWeek1January);
    request.input("capexPPPWeek1January", capexPPPWeek1January);

    request.input("capexGBSWeek2January", capexGBSWeek2January);
    request.input("capexIEBRWeek2January", capexIEBRWeek2January);
    request.input("capexPPPWeek2January", capexPPPWeek2January);

    request.input("capexGBSWeek3January", capexGBSWeek3January);
    request.input("capexIEBRWeek3January", capexIEBRWeek3January);
    request.input("capexPPPWeek3January", capexPPPWeek3January);

    request.input("capexGBSWeek4January", capexGBSWeek4January);
    request.input("capexIEBRWeek4January", capexIEBRWeek4January);
    request.input("capexPPPWeek4January", capexPPPWeek4January);

    request.input("capexTotalMonthJanuary", capexTotalMonthJanuary);

    // February
    request.input("capexGBSWeek1February", capexGBSWeek1February);
    request.input("capexIEBRWeek1February", capexIEBRWeek1February);
    request.input("capexPPPWeek1February", capexPPPWeek1February);

    request.input("capexGBSWeek2February", capexGBSWeek2February);
    request.input("capexIEBRWeek2February", capexIEBRWeek2February);
    request.input("capexPPPWeek2February", capexPPPWeek2February);

    request.input("capexGBSWeek3February", capexGBSWeek3February);
    request.input("capexIEBRWeek3February", capexIEBRWeek3February);
    request.input("capexPPPWeek3February", capexPPPWeek3February);

    request.input("capexGBSWeek4February", capexGBSWeek4February);
    request.input("capexIEBRWeek4February", capexIEBRWeek4February);
    request.input("capexPPPWeek4February", capexPPPWeek4February);

    request.input("capexTotalMonthFebruary", capexTotalMonthFebruary);

    // March
    request.input("capexGBSWeek1March", capexGBSWeek1March);
    request.input("capexIEBRWeek1March", capexIEBRWeek1March);
    request.input("capexPPPWeek1March", capexPPPWeek1March);

    request.input("capexGBSWeek2March", capexGBSWeek2March);
    request.input("capexIEBRWeek2March", capexIEBRWeek2March);
    request.input("capexPPPWeek2March", capexPPPWeek2March);

    request.input("capexGBSWeek3March", capexGBSWeek3March);
    request.input("capexIEBRWeek3March", capexIEBRWeek3March);
    request.input("capexPPPWeek3March", capexPPPWeek3March);

    request.input("capexGBSWeek4March", capexGBSWeek4March);
    request.input("capexIEBRWeek4March", capexIEBRWeek4March);
    request.input("capexPPPWeek4March", capexPPPWeek4March);

    request.input("capexTotalMonthMarch", capexTotalMonthMarch);

    // April
    request.input("capexGBSWeek1April", capexGBSWeek1April);
    request.input("capexIEBRWeek1April", capexIEBRWeek1April);
    request.input("capexPPPWeek1April", capexPPPWeek1April);

    request.input("capexGBSWeek2April", capexGBSWeek2April);
    request.input("capexIEBRWeek2April", capexIEBRWeek2April);
    request.input("capexPPPWeek2April", capexPPPWeek2April);

    request.input("capexGBSWeek3April", capexGBSWeek3April);
    request.input("capexIEBRWeek3April", capexIEBRWeek3April);
    request.input("capexPPPWeek3April", capexPPPWeek3April);

    request.input("capexGBSWeek4April", capexGBSWeek4April);
    request.input("capexIEBRWeek4April", capexIEBRWeek4April);
    request.input("capexPPPWeek4April", capexPPPWeek4April);

    request.input("capexTotalMonthApril", capexTotalMonthApril);

    // May
    request.input("capexGBSWeek1May", capexGBSWeek1May);
    request.input("capexIEBRWeek1May", capexIEBRWeek1May);
    request.input("capexPPPWeek1May", capexPPPWeek1May);

    request.input("capexGBSWeek2May", capexGBSWeek2May);
    request.input("capexIEBRWeek2May", capexIEBRWeek2May);
    request.input("capexPPPWeek2May", capexPPPWeek2May);

    request.input("capexGBSWeek3May", capexGBSWeek3May);
    request.input("capexIEBRWeek3May", capexIEBRWeek3May);
    request.input("capexPPPWeek3May", capexPPPWeek3May);

    request.input("capexGBSWeek4May", capexGBSWeek4May);
    request.input("capexIEBRWeek4May", capexIEBRWeek4May);
    request.input("capexPPPWeek4May", capexPPPWeek4May);

    request.input("capexTotalMonthMay", capexTotalMonthMay);

    // June
    request.input("capexGBSWeek1June", capexGBSWeek1June);
    request.input("capexIEBRWeek1June", capexIEBRWeek1June);
    request.input("capexPPPWeek1June", capexPPPWeek1June);

    request.input("capexGBSWeek2June", capexGBSWeek2June);
    request.input("capexIEBRWeek2June", capexIEBRWeek2June);
    request.input("capexPPPWeek2June", capexPPPWeek2June);

    request.input("capexGBSWeek3June", capexGBSWeek3June);
    request.input("capexIEBRWeek3June", capexIEBRWeek3June);
    request.input("capexPPPWeek3June", capexPPPWeek3June);

    request.input("capexGBSWeek4June", capexGBSWeek4June);
    request.input("capexIEBRWeek4June", capexIEBRWeek4June);
    request.input("capexPPPWeek4June", capexPPPWeek4June);

    request.input("capexTotalMonthJune", capexTotalMonthJune);

    // July
    request.input("capexGBSWeek1July", capexGBSWeek1July);
    request.input("capexIEBRWeek1July", capexIEBRWeek1July);
    request.input("capexPPPWeek1July", capexPPPWeek1July);

    request.input("capexGBSWeek2July", capexGBSWeek2July);
    request.input("capexIEBRWeek2July", capexIEBRWeek2July);
    request.input("capexPPPWeek2July", capexPPPWeek2July);

    request.input("capexGBSWeek3July", capexGBSWeek3July);
    request.input("capexIEBRWeek3July", capexIEBRWeek3July);
    request.input("capexPPPWeek3July", capexPPPWeek3July);

    request.input("capexGBSWeek4July", capexGBSWeek4July);
    request.input("capexIEBRWeek4July", capexIEBRWeek4July);
    request.input("capexPPPWeek4July", capexPPPWeek4July);

    request.input("capexTotalMonthJuly", capexTotalMonthJuly);

    // August
    request.input("capexGBSWeek1August", capexGBSWeek1August);
    request.input("capexIEBRWeek1August", capexIEBRWeek1August);
    request.input("capexPPPWeek1August", capexPPPWeek1August);

    request.input("capexGBSWeek2August", capexGBSWeek2August);
    request.input("capexIEBRWeek2August", capexIEBRWeek2August);
    request.input("capexPPPWeek2August", capexPPPWeek2August);

    request.input("capexGBSWeek3August", capexGBSWeek3August);
    request.input("capexIEBRWeek3August", capexIEBRWeek3August);
    request.input("capexPPPWeek3August", capexPPPWeek3August);

    request.input("capexGBSWeek4August", capexGBSWeek4August);
    request.input("capexIEBRWeek4August", capexIEBRWeek4August);
    request.input("capexPPPWeek4August", capexPPPWeek4August);

    request.input("capexTotalMonthAugust", capexTotalMonthAugust);

    // September
    request.input("capexGBSWeek1September", capexGBSWeek1September);
    request.input("capexIEBRWeek1September", capexIEBRWeek1September);
    request.input("capexPPPWeek1September", capexPPPWeek1September);

    request.input("capexGBSWeek2September", capexGBSWeek2September);
    request.input("capexIEBRWeek2September", capexIEBRWeek2September);
    request.input("capexPPPWeek2September", capexPPPWeek2September);

    request.input("capexGBSWeek3September", capexGBSWeek3September);
    request.input("capexIEBRWeek3September", capexIEBRWeek3September);
    request.input("capexPPPWeek3September", capexPPPWeek3September);

    request.input("capexGBSWeek4September", capexGBSWeek4September);
    request.input("capexIEBRWeek4September", capexIEBRWeek4September);
    request.input("capexPPPWeek4September", capexPPPWeek4September);

    request.input("capexTotalMonthSeptember", capexTotalMonthSeptember);

    // October
    request.input("capexGBSWeek1October", capexGBSWeek1October);
    request.input("capexIEBRWeek1October", capexIEBRWeek1October);
    request.input("capexPPPWeek1October", capexPPPWeek1October);

    request.input("capexGBSWeek2October", capexGBSWeek2October);
    request.input("capexIEBRWeek2October", capexIEBRWeek2October);
    request.input("capexPPPWeek2October", capexPPPWeek2October);

    request.input("capexGBSWeek3October", capexGBSWeek3October);
    request.input("capexIEBRWeek3October", capexIEBRWeek3October);
    request.input("capexPPPWeek3October", capexPPPWeek3October);

    request.input("capexGBSWeek4October", capexGBSWeek4October);
    request.input("capexIEBRWeek4October", capexIEBRWeek4October);
    request.input("capexPPPWeek4October", capexPPPWeek4October);

    request.input("capexTotalMonthOctober", capexTotalMonthOctober);

    // November
    request.input("capexGBSWeek1November", capexGBSWeek1November);
    request.input("capexIEBRWeek1November", capexIEBRWeek1November);
    request.input("capexPPPWeek1November", capexPPPWeek1November);

    request.input("capexGBSWeek2November", capexGBSWeek2November);
    request.input("capexIEBRWeek2November", capexIEBRWeek2November);
    request.input("capexPPPWeek2November", capexPPPWeek2November);

    request.input("capexGBSWeek3November", capexGBSWeek3November);
    request.input("capexIEBRWeek3November", capexIEBRWeek3November);
    request.input("capexPPPWeek3November", capexPPPWeek3November);

    request.input("capexGBSWeek4November", capexGBSWeek4November);
    request.input("capexIEBRWeek4November", capexIEBRWeek4November);
    request.input("capexPPPWeek4November", capexPPPWeek4November);

    request.input("capexTotalMonthNovember", capexTotalMonthNovember);

    // December
    request.input("capexGBSWeek1December", capexGBSWeek1December);
    request.input("capexIEBRWeek1December", capexIEBRWeek1December);
    request.input("capexPPPWeek1December", capexPPPWeek1December);

    request.input("capexGBSWeek2December", capexGBSWeek2December);
    request.input("capexIEBRWeek2December", capexIEBRWeek2December);
    request.input("capexPPPWeek2December", capexPPPWeek2December);

    request.input("capexGBSWeek3December", capexGBSWeek3December);
    request.input("capexIEBRWeek3December", capexIEBRWeek3December);
    request.input("capexPPPWeek3December", capexPPPWeek3December);

    request.input("capexGBSWeek4December", capexGBSWeek4December);
    request.input("capexIEBRWeek4December", capexIEBRWeek4December);
    request.input("capexPPPWeek4December", capexPPPWeek4December);

    request.input("capexTotalMonthDecember", capexTotalMonthDecember);

    request.input("totalGBS",totalGBS);
    request.input("totalIEBR",totalIEBR);
    request.input("totalPPP",totalPPP);
    request.input("totalCapex",totalCapex);

    try {
        const checkResult = await request.query(`
        SELECT * FROM tbl_capex_monthly
        WHERE capex_id = @capexID
    `);

        if (checkResult.recordset.length > 0) {
            const updateResult = await request.query(`
            UPDATE tbl_capex_monthly
            SET
            capex_id = @capexID,
            capex_GBS_Week1_January = @capexGBSWeek1January,
            capex_IEBR_Week1_January = @capexIEBRWeek1January,
            capex_PPP_Week1_January = @capexPPPWeek1January,
            capex_GBS_Week2_January = @capexGBSWeek2January,
            capex_IEBR_Week2_January = @capexIEBRWeek2January,
            capex_PPP_Week2_January = @capexPPPWeek2January,
            capex_GBS_Week3_January = @capexGBSWeek3January,
            capex_IEBR_Week3_January = @capexIEBRWeek3January,
            capex_PPP_Week3_January = @capexPPPWeek3January,
            capex_GBS_Week4_January = @capexGBSWeek4January,
            capex_IEBR_Week4_January = @capexIEBRWeek4January,
            capex_PPP_Week4_January = @capexPPPWeek4January,
            capex_Total_Month_January = @capexTotalMonthJanuary,
            
            capex_GBS_Week1_February = @capexGBSWeek1February,
            capex_IEBR_Week1_February = @capexIEBRWeek1February,
            capex_PPP_Week1_February = @capexPPPWeek1February,
            capex_GBS_Week2_February = @capexGBSWeek2February,
            capex_IEBR_Week2_February = @capexIEBRWeek2February,
            capex_PPP_Week2_February = @capexPPPWeek2February,
            capex_GBS_Week3_February = @capexGBSWeek3February,
            capex_IEBR_Week3_February = @capexIEBRWeek3February,
            capex_PPP_Week3_February = @capexPPPWeek3February,
            capex_GBS_Week4_February = @capexGBSWeek4February,
            capex_IEBR_Week4_February = @capexIEBRWeek4February,
            capex_PPP_Week4_February = @capexPPPWeek4February,
            capex_Total_Month_February = @capexTotalMonthFebruary,

            capex_GBS_Week1_March = @capexGBSWeek1March,
            capex_IEBR_Week1_March = @capexIEBRWeek1March,
            capex_PPP_Week1_March = @capexPPPWeek1March,
            capex_GBS_Week2_March = @capexGBSWeek2March,
            capex_IEBR_Week2_March = @capexIEBRWeek2March,
            capex_PPP_Week2_March = @capexPPPWeek2March,
            capex_GBS_Week3_March = @capexGBSWeek3March,
            capex_IEBR_Week3_March = @capexIEBRWeek3March,
            capex_PPP_Week3_March = @capexPPPWeek3March,
            capex_GBS_Week4_March = @capexGBSWeek4March,
            capex_IEBR_Week4_March = @capexIEBRWeek4March,
            capex_PPP_Week4_March = @capexPPPWeek4March,
            capex_Total_Month_March = @capexTotalMonthMarch,

            capex_GBS_Week1_April = @capexGBSWeek1April,
            capex_IEBR_Week1_April = @capexIEBRWeek1April,
            capex_PPP_Week1_April = @capexPPPWeek1April,
            capex_GBS_Week2_April = @capexGBSWeek2April,
            capex_IEBR_Week2_April = @capexIEBRWeek2April,
            capex_PPP_Week2_April = @capexPPPWeek2April,
            capex_GBS_Week3_April = @capexGBSWeek3April,
            capex_IEBR_Week3_April = @capexIEBRWeek3April,
            capex_PPP_Week3_April = @capexPPPWeek3April,
            capex_GBS_Week4_April = @capexGBSWeek4April,
            capex_IEBR_Week4_April = @capexIEBRWeek4April,
            capex_PPP_Week4_April = @capexPPPWeek4April,
            capex_Total_Month_April = @capexTotalMonthApril,

            capex_GBS_Week1_May = @capexGBSWeek1May,
            capex_IEBR_Week1_May = @capexIEBRWeek1May,
            capex_PPP_Week1_May = @capexPPPWeek1May,
            capex_GBS_Week2_May = @capexGBSWeek2May,
            capex_IEBR_Week2_May = @capexIEBRWeek2May,
            capex_PPP_Week2_May = @capexPPPWeek2May,
            capex_GBS_Week3_May = @capexGBSWeek3May,
            capex_IEBR_Week3_May = @capexIEBRWeek3May,
            capex_PPP_Week3_May = @capexPPPWeek3May,
            capex_GBS_Week4_May = @capexGBSWeek4May,
            capex_IEBR_Week4_May = @capexIEBRWeek4May,
            capex_PPP_Week4_May = @capexPPPWeek4May,
            capex_Total_Month_May = @capexTotalMonthMay,

            capex_GBS_Week1_June = @capexGBSWeek1June,
            capex_IEBR_Week1_June = @capexIEBRWeek1June,
            capex_PPP_Week1_June = @capexPPPWeek1June,
            capex_GBS_Week2_June = @capexGBSWeek2June,
            capex_IEBR_Week2_June = @capexIEBRWeek2June,
            capex_PPP_Week2_June = @capexPPPWeek2June,
            capex_GBS_Week3_June = @capexGBSWeek3June,
            capex_IEBR_Week3_June = @capexIEBRWeek3June,
            capex_PPP_Week3_June = @capexPPPWeek3June,
            capex_GBS_Week4_June = @capexGBSWeek4June,
            capex_IEBR_Week4_June = @capexIEBRWeek4June,
            capex_PPP_Week4_June = @capexPPPWeek4June,
            capex_Total_Month_June = @capexTotalMonthJune,

            capex_GBS_Week1_July = @capexGBSWeek1July,
            capex_IEBR_Week1_July = @capexIEBRWeek1July,
            capex_PPP_Week1_July = @capexPPPWeek1July,
            capex_GBS_Week2_July = @capexGBSWeek2July,
            capex_IEBR_Week2_July = @capexIEBRWeek2July,
            capex_PPP_Week2_July = @capexPPPWeek2July,
            capex_GBS_Week3_July = @capexGBSWeek3July,
            capex_IEBR_Week3_July = @capexIEBRWeek3July,
            capex_PPP_Week3_July = @capexPPPWeek3July,
            capex_GBS_Week4_July = @capexGBSWeek4July,
            capex_IEBR_Week4_July = @capexIEBRWeek4July,
            capex_PPP_Week4_July = @capexPPPWeek4July,
            capex_Total_Month_July = @capexTotalMonthJuly,

            capex_GBS_Week1_August = @capexGBSWeek1August,
            capex_IEBR_Week1_August = @capexIEBRWeek1August,
            capex_PPP_Week1_August = @capexPPPWeek1August,
            capex_GBS_Week2_August = @capexGBSWeek2August,
            capex_IEBR_Week2_August = @capexIEBRWeek2August,
            capex_PPP_Week2_August = @capexPPPWeek2August,
            capex_GBS_Week3_August = @capexGBSWeek3August,
            capex_IEBR_Week3_August = @capexIEBRWeek3August,
            capex_PPP_Week3_August = @capexPPPWeek3August,
            capex_GBS_Week4_August = @capexGBSWeek4August,
            capex_IEBR_Week4_August = @capexIEBRWeek4August,
            capex_PPP_Week4_August = @capexPPPWeek4August,
            capex_Total_Month_August = @capexTotalMonthAugust,

            capex_GBS_Week1_September = @capexGBSWeek1September,
            capex_IEBR_Week1_September = @capexIEBRWeek1September,
            capex_PPP_Week1_September = @capexPPPWeek1September,
            capex_GBS_Week2_September = @capexGBSWeek2September,
            capex_IEBR_Week2_September = @capexIEBRWeek2September,
            capex_PPP_Week2_September = @capexPPPWeek2September,
            capex_GBS_Week3_September = @capexGBSWeek3September,
            capex_IEBR_Week3_September = @capexIEBRWeek3September,
            capex_PPP_Week3_September = @capexPPPWeek3September,
            capex_GBS_Week4_September = @capexGBSWeek4September,
            capex_IEBR_Week4_September = @capexIEBRWeek4September,
            capex_PPP_Week4_September = @capexPPPWeek4September,
            capex_Total_Month_September = @capexTotalMonthSeptember,

            capex_GBS_Week1_October = @capexGBSWeek1October,
            capex_IEBR_Week1_October = @capexIEBRWeek1October,
            capex_PPP_Week1_October = @capexPPPWeek1October,
            capex_GBS_Week2_October = @capexGBSWeek2October,
            capex_IEBR_Week2_October = @capexIEBRWeek2October,
            capex_PPP_Week2_October = @capexPPPWeek2October,
            capex_GBS_Week3_October = @capexGBSWeek3October,
            capex_IEBR_Week3_October = @capexIEBRWeek3October,
            capex_PPP_Week3_October = @capexPPPWeek3October,
            capex_GBS_Week4_October = @capexGBSWeek4October,
            capex_IEBR_Week4_October = @capexIEBRWeek4October,
            capex_PPP_Week4_October = @capexPPPWeek4October,
            capex_Total_Month_October = @capexTotalMonthOctober,

            capex_IEBR_Week1_November = @capexIEBRWeek1November,
            capex_PPP_Week1_November = @capexPPPWeek1November,
            capex_GBS_Week2_November = @capexGBSWeek2November,
            capex_IEBR_Week2_November = @capexIEBRWeek2November,
            capex_PPP_Week2_November = @capexPPPWeek2November,
            capex_GBS_Week3_November = @capexGBSWeek3November,
            capex_IEBR_Week3_November = @capexIEBRWeek3November,
            capex_PPP_Week3_November = @capexPPPWeek3November,
            capex_GBS_Week4_November = @capexGBSWeek4November,
            capex_IEBR_Week4_November = @capexIEBRWeek4November,
            capex_PPP_Week4_November = @capexPPPWeek4November,
            capex_Total_Month_November = @capexTotalMonthNovember,

            capex_GBS_Week1_December = @capexGBSWeek1December,
            capex_IEBR_Week1_December = @capexIEBRWeek1December,
            capex_PPP_Week1_December = @capexPPPWeek1December,
            capex_GBS_Week2_December = @capexGBSWeek2December,
            capex_IEBR_Week2_December = @capexIEBRWeek2December,
            capex_PPP_Week2_December = @capexPPPWeek2December,
            capex_GBS_Week3_December = @capexGBSWeek3December,
            capex_IEBR_Week3_December = @capexIEBRWeek3December,
            capex_PPP_Week3_December = @capexPPPWeek3December,
            capex_GBS_Week4_December = @capexGBSWeek4December,
            capex_IEBR_Week4_December = @capexIEBRWeek4December,
            capex_PPP_Week4_December = @capexPPPWeek4December,
            capex_Total_Month_December = @capexTotalMonthDecember,

            total_GBS = @totalGBS,
            total_IEBR = @totalIEBR,
            total_PPP = @totalPPP,
            total_Capex = @totalCapex,
            updated_date = getDate()

            WHERE capex_id = @capexID;
        `);
        } else {
            const insertResult = await request.query(`
            INSERT INTO tbl_capex_monthly (
                capex_id,
                capex_GBS_Week1_January, capex_IEBR_Week1_January, capex_PPP_Week1_January, 
                capex_GBS_Week2_January, capex_IEBR_Week2_January, capex_PPP_Week2_January, 
                capex_GBS_Week3_January, capex_IEBR_Week3_January, capex_PPP_Week3_January, 
                capex_GBS_Week4_January, capex_IEBR_Week4_January, capex_PPP_Week4_January, 
                capex_Total_Month_January,
            
                capex_GBS_Week1_February, capex_IEBR_Week1_February, capex_PPP_Week1_February, 
                capex_GBS_Week2_February, capex_IEBR_Week2_February, capex_PPP_Week2_February, 
                capex_GBS_Week3_February, capex_IEBR_Week3_February, capex_PPP_Week3_February, 
                capex_GBS_Week4_February, capex_IEBR_Week4_February, capex_PPP_Week4_February, 
                capex_Total_Month_February,
            
                capex_GBS_Week1_March, capex_IEBR_Week1_March, capex_PPP_Week1_March, 
                capex_GBS_Week2_March, capex_IEBR_Week2_March, capex_PPP_Week2_March, 
                capex_GBS_Week3_March, capex_IEBR_Week3_March, capex_PPP_Week3_March, 
                capex_GBS_Week4_March, capex_IEBR_Week4_March, capex_PPP_Week4_March, 
                capex_Total_Month_March,
            
                capex_GBS_Week1_April, capex_IEBR_Week1_April, capex_PPP_Week1_April, 
                capex_GBS_Week2_April, capex_IEBR_Week2_April, capex_PPP_Week2_April, 
                capex_GBS_Week3_April, capex_IEBR_Week3_April, capex_PPP_Week3_April, 
                capex_GBS_Week4_April, capex_IEBR_Week4_April, capex_PPP_Week4_April, 
                capex_Total_Month_April,
            
                capex_GBS_Week1_May, capex_IEBR_Week1_May, capex_PPP_Week1_May, 
                capex_GBS_Week2_May, capex_IEBR_Week2_May, capex_PPP_Week2_May, 
                capex_GBS_Week3_May, capex_IEBR_Week3_May, capex_PPP_Week3_May, 
                capex_GBS_Week4_May, capex_IEBR_Week4_May, capex_PPP_Week4_May, 
                capex_Total_Month_May,
            
                capex_GBS_Week1_June, capex_IEBR_Week1_June, capex_PPP_Week1_June, 
                capex_GBS_Week2_June, capex_IEBR_Week2_June, capex_PPP_Week2_June, 
                capex_GBS_Week3_June, capex_IEBR_Week3_June, capex_PPP_Week3_June, 
                capex_GBS_Week4_June, capex_IEBR_Week4_June, capex_PPP_Week4_June, 
                capex_Total_Month_June,
            
                capex_GBS_Week1_July, capex_IEBR_Week1_July, capex_PPP_Week1_July, 
                capex_GBS_Week2_July, capex_IEBR_Week2_July, capex_PPP_Week2_July, 
                capex_GBS_Week3_July, capex_IEBR_Week3_July, capex_PPP_Week3_July, 
                capex_GBS_Week4_July, capex_IEBR_Week4_July, capex_PPP_Week4_July, 
                capex_Total_Month_July,
            
                capex_GBS_Week1_August, capex_IEBR_Week1_August, capex_PPP_Week1_August, 
                capex_GBS_Week2_August, capex_IEBR_Week2_August, capex_PPP_Week2_August, 
                capex_GBS_Week3_August, capex_IEBR_Week3_August, capex_PPP_Week3_August, 
                capex_GBS_Week4_August, capex_IEBR_Week4_August, capex_PPP_Week4_August, 
                capex_Total_Month_August,
            
                capex_GBS_Week1_September, capex_IEBR_Week1_September, capex_PPP_Week1_September, 
                capex_GBS_Week2_September, capex_IEBR_Week2_September, capex_PPP_Week2_September, 
                capex_GBS_Week3_September, capex_IEBR_Week3_September, capex_PPP_Week3_September, 
                capex_GBS_Week4_September, capex_IEBR_Week4_September, capex_PPP_Week4_September, 
                capex_Total_Month_September,
            
                capex_GBS_Week1_October, capex_IEBR_Week1_October, capex_PPP_Week1_October, 
                capex_GBS_Week2_October, capex_IEBR_Week2_October, capex_PPP_Week2_October, 
                capex_GBS_Week3_October, capex_IEBR_Week3_October, capex_PPP_Week3_October, 
                capex_GBS_Week4_October, capex_IEBR_Week4_October, capex_PPP_Week4_October, 
                capex_Total_Month_October,    
                
                capex_GBS_Week1_November, capex_IEBR_Week1_November, capex_PPP_Week1_November,
                capex_GBS_Week2_November, capex_IEBR_Week2_November, capex_PPP_Week2_November,
                capex_GBS_Week3_November, capex_IEBR_Week3_November, capex_PPP_Week3_November,
                capex_GBS_Week4_November, capex_IEBR_Week4_November, capex_PPP_Week4_November,
                capex_Total_Month_November,
            
                capex_GBS_Week1_December, capex_IEBR_Week1_December, capex_PPP_Week1_December,
                capex_GBS_Week2_December, capex_IEBR_Week2_December, capex_PPP_Week2_December,
                capex_GBS_Week3_December, capex_IEBR_Week3_December, capex_PPP_Week3_December,
                capex_GBS_Week4_December, capex_IEBR_Week4_December, capex_PPP_Week4_December,
                capex_Total_Month_December,

                total_GBS, total_IEBR , total_PPP, total_Capex 
            )
            VALUES (
                @capexID,
                @capexGBSWeek1January, @capexIEBRWeek1January, @capexPPPWeek1January, 
                @capexGBSWeek2January, @capexIEBRWeek2January, @capexPPPWeek2January, 
                @capexGBSWeek3January, @capexIEBRWeek3January, @capexPPPWeek3January, 
                @capexGBSWeek4January, @capexIEBRWeek4January, @capexPPPWeek4January, 
                @capexTotalMonthJanuary,         
            
                @capexGBSWeek1February, @capexIEBRWeek1February, @capexPPPWeek1February, 
                @capexGBSWeek2February, @capexIEBRWeek2February, @capexPPPWeek2February, 
                @capexGBSWeek3February, @capexIEBRWeek3February, @capexPPPWeek3February, 
                @capexGBSWeek4February, @capexIEBRWeek4February, @capexPPPWeek4February, 
                @capexTotalMonthFebruary,

                @capexGBSWeek1March, @capexIEBRWeek1March, @capexPPPWeek1March, 
                @capexGBSWeek2March, @capexIEBRWeek2March, @capexPPPWeek2March, 
                @capexGBSWeek3March, @capexIEBRWeek3March, @capexPPPWeek3March, 
                @capexGBSWeek4March, @capexIEBRWeek4March, @capexPPPWeek4March, 
                @capexTotalMonthMarch,
            
                @capexGBSWeek1April, @capexIEBRWeek1April, @capexPPPWeek1April, 
                @capexGBSWeek2April, @capexIEBRWeek2April, @capexPPPWeek2April, 
                @capexGBSWeek3April, @capexIEBRWeek3April, @capexPPPWeek3April, 
                @capexGBSWeek4April, @capexIEBRWeek4April, @capexPPPWeek4April, 
                @capexTotalMonthApril,
            
                @capexGBSWeek1May, @capexIEBRWeek1May, @capexPPPWeek1May, 
                @capexGBSWeek2May, @capexIEBRWeek2May, @capexPPPWeek2May, 
                @capexGBSWeek3May, @capexIEBRWeek3May, @capexPPPWeek3May, 
                @capexGBSWeek4May, @capexIEBRWeek4May, @capexPPPWeek4May, 
                @capexTotalMonthMay,
            
                @capexGBSWeek1June, @capexIEBRWeek1June, @capexPPPWeek1June, 
                @capexGBSWeek2June, @capexIEBRWeek2June, @capexPPPWeek2June, 
                @capexGBSWeek3June, @capexIEBRWeek3June, @capexPPPWeek3June, 
                @capexGBSWeek4June, @capexIEBRWeek4June, @capexPPPWeek4June, 
                @capexTotalMonthJune,
            
                @capexGBSWeek1July, @capexIEBRWeek1July, @capexPPPWeek1July, 
                @capexGBSWeek2July, @capexIEBRWeek2July, @capexPPPWeek2July, 
                @capexGBSWeek3July, @capexIEBRWeek3July, @capexPPPWeek3July, 
                @capexGBSWeek4July, @capexIEBRWeek4July, @capexPPPWeek4July, 
                @capexTotalMonthJuly,
            
                @capexGBSWeek1August, @capexIEBRWeek1August, @capexPPPWeek1August, 
                @capexGBSWeek2August, @capexIEBRWeek2August, @capexPPPWeek2August, 
                @capexGBSWeek3August, @capexIEBRWeek3August, @capexPPPWeek3August, 
                @capexGBSWeek4August, @capexIEBRWeek4August, @capexPPPWeek4August, 
                @capexTotalMonthAugust,
            
                @capexGBSWeek1September, @capexIEBRWeek1September, @capexPPPWeek1September, 
                @capexGBSWeek2September, @capexIEBRWeek2September, @capexPPPWeek2September, 
                @capexGBSWeek3September, @capexIEBRWeek3September, @capexPPPWeek3September, 
                @capexGBSWeek4September, @capexIEBRWeek4September, @capexPPPWeek4September, 
                @capexTotalMonthSeptember,
            
                @capexGBSWeek1October, @capexIEBRWeek1October, @capexPPPWeek1October, 
                @capexGBSWeek2October, @capexIEBRWeek2October, @capexPPPWeek2October, 
                @capexGBSWeek3October, @capexIEBRWeek3October, @capexPPPWeek3October, 
                @capexGBSWeek4October, @capexIEBRWeek4October, @capexPPPWeek4October, 
                @capexTotalMonthOctober,
            
                @capexGBSWeek1November, @capexIEBRWeek1November, @capexPPPWeek1November, 
                @capexGBSWeek2November, @capexIEBRWeek2November, @capexPPPWeek2November, 
                @capexGBSWeek3November, @capexIEBRWeek3November, @capexPPPWeek3November, 
                @capexGBSWeek4November, @capexIEBRWeek4November, @capexPPPWeek4November, 
                @capexTotalMonthNovember,
            
                @capexGBSWeek1December, @capexIEBRWeek1December, @capexPPPWeek1December, 
                @capexGBSWeek2December, @capexIEBRWeek2December, @capexPPPWeek2December, 
                @capexGBSWeek3December, @capexIEBRWeek3December, @capexPPPWeek3December, 
                @capexGBSWeek4December, @capexIEBRWeek4December, @capexPPPWeek4December, 
                @capexTotalMonthDecember,

                @totalGBS, @totalIEBR, @totalPPP, @totalCapex
            );
        `);
        }
        return res.sendStatus(201);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getCapexMonthlyData(req, res) {
    const capexID = req.params.capexID;

    const conn = await pool;
    const request = conn.request();

    request.input("capexID", capexID);
    try {
        const result = await request.query(`
            SELECT * FROM tbl_capex_monthly where capex_id = @capexID;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}


async function getCapexExpediture(req, res) {
    const capexID = req.params.capexID;
    const conn = await pool;
    const request = conn.request();
    request.input("capexID", capexID);

    try {
        const result = await request.query(`SELECT capex_total_value FROM tbl_capex WHERE capex_id = @capexID;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function editCapexExpediture(req,res){
    const capexID = req.body.ID;
    const gbsValue = req.body.gbsValue;
    const iebrValue = req.body.iebrValue;
    const pppValue = req.body.pppValue;
    const totalValue = req.body.totalValue;
    const userID = req.body.userID;
    const conn = await pool;
    const request = conn.request();
    request.input("capexID", capexID);
    request.input("gbsValue", gbsValue);
    request.input("iebrValue", iebrValue);
    request.input("pppValue", pppValue);
    request.input("totalValue", totalValue);
    request.input("userID", userID);

    try {
        const result = await request.query(`UPDATE tbl_capex SET capex_gbs_value = @gbsValue, capex_iebr_value = @iebrValue, capex_ppp_value = @pppValue,
        updated_by = @userID, capex_total_value = @totalValue,updated_date = GETDATE() WHERE capex_id = @capexID`);
        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getCapexDataEntry(req, res) {
    const currentYear = new Date().getFullYear();
    const financialYear = new Date().getMonth() > 3? `${currentYear}-${currentYear + 1}` : `${currentYear - 1}-${currentYear}`;

    const conn = await pool;
    const request = conn.request();

    try {
        const result = await request.query(`
            SELECT 
                mmt.organisation_id,
                mmt.organisation_name,
				c.capex_total_value,
				CASE 
				   WHEN (c.capex_total_value IS NOT NULL) THEN 'TRUE'
				   ELSE 'FALSE'
				END AS 'last_procurement_updated_by_ministry',
                CASE 
            	   WHEN (capex_GBS_Week4_March IS NOT NULL AND capex_GBS_Week4_March <> 0.00) OR 
                         (capex_IEBR_Week4_March IS NOT NULL AND capex_IEBR_Week4_March <> 0.00) OR 
                         (capex_PPP_Week4_March IS NOT NULL AND capex_PPP_Week4_March <> 0.00) THEN 'Week 4 - March'
                    WHEN (capex_GBS_Week3_March IS NOT NULL AND capex_GBS_Week3_March <> 0.00) OR 
                         (capex_IEBR_Week3_March IS NOT NULL AND capex_IEBR_Week3_March <> 0.00) OR 
                         (capex_PPP_Week3_March IS NOT NULL AND capex_PPP_Week3_March <> 0.00) THEN 'Week 3 - March'
                    WHEN (capex_GBS_Week2_March IS NOT NULL AND capex_GBS_Week2_March <> 0.00) OR 
                         (capex_IEBR_Week2_March IS NOT NULL AND capex_IEBR_Week2_March <> 0.00) OR 
                         (capex_PPP_Week2_March IS NOT NULL AND capex_PPP_Week2_March <> 0.00) THEN 'Week 2 - March'
                    WHEN (capex_GBS_Week1_March IS NOT NULL AND capex_GBS_Week1_March <> 0.00) OR 
                         (capex_IEBR_Week1_March IS NOT NULL AND capex_IEBR_Week1_March <> 0.00) OR 
                         (capex_PPP_Week1_March IS NOT NULL AND capex_PPP_Week1_March <> 0.00) THEN 'Week 1 - March'
            	     WHEN (capex_GBS_Week4_February IS NOT NULL AND capex_GBS_Week4_February <> 0.00) OR 
                         (capex_IEBR_Week4_February IS NOT NULL AND capex_IEBR_Week4_February <> 0.00) OR 
                         (capex_PPP_Week4_February IS NOT NULL AND capex_PPP_Week4_February <> 0.00) THEN 'Week 4 - February'
                    WHEN (capex_GBS_Week3_February IS NOT NULL AND capex_GBS_Week3_February <> 0.00) OR 
                         (capex_IEBR_Week3_February IS NOT NULL AND capex_IEBR_Week3_February <> 0.00) OR 
                         (capex_PPP_Week3_February IS NOT NULL AND capex_PPP_Week3_February <> 0.00) THEN 'Week 3 - February'
                    WHEN (capex_GBS_Week2_February IS NOT NULL AND capex_GBS_Week2_February <> 0.00) OR 
                         (capex_IEBR_Week2_February IS NOT NULL AND capex_IEBR_Week2_February <> 0.00) OR 
                         (capex_PPP_Week2_February IS NOT NULL AND capex_PPP_Week2_February <> 0.00) THEN 'Week 2 - February'
                    WHEN (capex_GBS_Week1_February IS NOT NULL AND capex_GBS_Week1_February <> 0.00) OR 
                         (capex_IEBR_Week1_February IS NOT NULL AND capex_IEBR_Week1_February <> 0.00) OR 
                         (capex_PPP_Week1_February IS NOT NULL AND capex_PPP_Week1_February <> 0.00) THEN 'Week 1 - February'
                    WHEN (capex_GBS_Week4_January IS NOT NULL AND capex_GBS_Week4_January <> 0.00) OR 
                         (capex_IEBR_Week4_January IS NOT NULL AND capex_IEBR_Week4_January <> 0.00) OR 
                         (capex_PPP_Week4_January IS NOT NULL AND capex_PPP_Week4_January <> 0.00) THEN 'Week 4 - January'
                    WHEN (capex_GBS_Week3_January IS NOT NULL AND capex_GBS_Week3_January <> 0.00) OR 
                         (capex_IEBR_Week3_January IS NOT NULL AND capex_IEBR_Week3_January <> 0.00) OR 
                         (capex_PPP_Week3_January IS NOT NULL AND capex_PPP_Week3_January <> 0.00) THEN 'Week 3 - January'
                    WHEN (capex_GBS_Week2_January IS NOT NULL AND capex_GBS_Week2_January <> 0.00) OR 
                         (capex_IEBR_Week2_January IS NOT NULL AND capex_IEBR_Week2_January <> 0.00) OR 
                         (capex_PPP_Week2_January IS NOT NULL AND capex_PPP_Week2_January <> 0.00) THEN 'Week 2 - January'
                    WHEN (capex_GBS_Week1_January IS NOT NULL AND capex_GBS_Week1_January <> 0.00) OR 
                         (capex_IEBR_Week1_January IS NOT NULL AND capex_IEBR_Week1_January <> 0.00) OR 
                         (capex_PPP_Week1_January IS NOT NULL AND capex_PPP_Week1_January <> 0.00) THEN 'Week 1 - January'
                    WHEN (capex_GBS_Week4_December IS NOT NULL AND capex_GBS_Week4_December <> 0.00) OR 
                         (capex_IEBR_Week4_December IS NOT NULL AND capex_IEBR_Week4_December <> 0.00) OR 
                         (capex_PPP_Week4_December IS NOT NULL AND capex_PPP_Week4_December <> 0.00) THEN 'Week 4 - December'
                    WHEN (capex_GBS_Week3_December IS NOT NULL AND capex_GBS_Week3_December <> 0.00) OR 
                         (capex_IEBR_Week3_December IS NOT NULL AND capex_IEBR_Week3_December <> 0.00) OR 
                         (capex_PPP_Week3_December IS NOT NULL AND capex_PPP_Week3_December <> 0.00) THEN 'Week 3 - December'
                    WHEN (capex_GBS_Week2_December IS NOT NULL AND capex_GBS_Week2_December <> 0.00) OR 
                         (capex_IEBR_Week2_December IS NOT NULL AND capex_IEBR_Week2_December <> 0.00) OR 
                         (capex_PPP_Week2_December IS NOT NULL AND capex_PPP_Week2_December <> 0.00) THEN 'Week 2 - December'
                    WHEN (capex_GBS_Week1_December IS NOT NULL AND capex_GBS_Week1_December <> 0.00) OR 
                         (capex_IEBR_Week1_December IS NOT NULL AND capex_IEBR_Week1_December <> 0.00) OR 
                         (capex_PPP_Week1_December IS NOT NULL AND capex_PPP_Week1_December <> 0.00) THEN 'Week 1 - December'
                    WHEN (capex_GBS_Week4_November IS NOT NULL AND capex_GBS_Week4_November <> 0.00) OR 
                         (capex_IEBR_Week4_November IS NOT NULL AND capex_IEBR_Week4_November <> 0.00) OR 
                         (capex_PPP_Week4_November IS NOT NULL AND capex_PPP_Week4_November <> 0.00) THEN 'Week 4 - November'
                    WHEN (capex_GBS_Week3_November IS NOT NULL AND capex_GBS_Week3_November <> 0.00) OR 
                         (capex_IEBR_Week3_November IS NOT NULL AND capex_IEBR_Week3_November <> 0.00) OR 
                         (capex_PPP_Week3_November IS NOT NULL AND capex_PPP_Week3_November <> 0.00) THEN 'Week 3 - November'
                    WHEN (capex_GBS_Week2_November IS NOT NULL AND capex_GBS_Week2_November <> 0.00) OR 
                         (capex_IEBR_Week2_November IS NOT NULL AND capex_IEBR_Week2_November <> 0.00) OR 
                         (capex_PPP_Week2_November IS NOT NULL AND capex_PPP_Week2_November <> 0.00) THEN 'Week 2 - November'
                    WHEN (capex_GBS_Week1_November IS NOT NULL AND capex_GBS_Week1_November <> 0.00) OR 
                         (capex_IEBR_Week1_November IS NOT NULL AND capex_IEBR_Week1_November <> 0.00) OR 
                         (capex_PPP_Week1_November IS NOT NULL AND capex_PPP_Week1_November <> 0.00) THEN 'Week 1 - November'
                    WHEN (capex_GBS_Week4_October IS NOT NULL AND capex_GBS_Week4_October <> 0.00) OR 
                         (capex_IEBR_Week4_October IS NOT NULL AND capex_IEBR_Week4_October <> 0.00) OR 
                         (capex_PPP_Week4_October IS NOT NULL AND capex_PPP_Week4_October <> 0.00) THEN 'Week 4 - October'
                    WHEN (capex_GBS_Week3_October IS NOT NULL AND capex_GBS_Week3_October <> 0.00) OR 
                         (capex_IEBR_Week3_October IS NOT NULL AND capex_IEBR_Week3_October <> 0.00) OR 
                         (capex_PPP_Week3_October IS NOT NULL AND capex_PPP_Week3_October <> 0.00) THEN 'Week 3 - October'
                    WHEN (capex_GBS_Week2_October IS NOT NULL AND capex_GBS_Week2_October <> 0.00) OR 
                         (capex_IEBR_Week2_October IS NOT NULL AND capex_IEBR_Week2_October <> 0.00) OR 
                         (capex_PPP_Week2_October IS NOT NULL AND capex_PPP_Week2_October <> 0.00) THEN 'Week 2 - October'
                    WHEN (capex_GBS_Week1_October IS NOT NULL AND capex_GBS_Week1_October <> 0.00) OR 
                         (capex_IEBR_Week1_October IS NOT NULL AND capex_IEBR_Week1_October <> 0.00) OR 
                         (capex_PPP_Week1_October IS NOT NULL AND capex_PPP_Week1_October <> 0.00) THEN 'Week 1 - October'
                    WHEN (capex_GBS_Week4_September IS NOT NULL AND capex_GBS_Week4_September <> 0.00) OR 
                         (capex_IEBR_Week4_September IS NOT NULL AND capex_IEBR_Week4_September <> 0.00) OR 
                         (capex_PPP_Week4_September IS NOT NULL AND capex_PPP_Week4_September <> 0.00) THEN 'Week 4 - September'
                    WHEN (capex_GBS_Week3_September IS NOT NULL AND capex_GBS_Week3_September <> 0.00) OR 
                         (capex_IEBR_Week3_September IS NOT NULL AND capex_IEBR_Week3_September <> 0.00) OR 
                         (capex_PPP_Week3_September IS NOT NULL AND capex_PPP_Week3_September <> 0.00) THEN 'Week 3 - September'
                    WHEN (capex_GBS_Week2_September IS NOT NULL AND capex_GBS_Week2_September <> 0.00) OR 
                         (capex_IEBR_Week2_September IS NOT NULL AND capex_IEBR_Week2_September <> 0.00) OR 
                         (capex_PPP_Week2_September IS NOT NULL AND capex_PPP_Week2_September <> 0.00) THEN 'Week 2 - September'
                    WHEN (capex_GBS_Week1_September IS NOT NULL AND capex_GBS_Week1_September <> 0.00) OR 
                         (capex_IEBR_Week1_September IS NOT NULL AND capex_IEBR_Week1_September <> 0.00) OR 
                         (capex_PPP_Week1_September IS NOT NULL AND capex_PPP_Week1_September <> 0.00) THEN 'Week 1 - September'
                    WHEN (capex_GBS_Week4_August IS NOT NULL AND capex_GBS_Week4_August <> 0.00) OR 
                         (capex_IEBR_Week4_August IS NOT NULL AND capex_IEBR_Week4_August <> 0.00) OR 
                         (capex_PPP_Week4_August IS NOT NULL AND capex_PPP_Week4_August <> 0.00) THEN 'Week 4 - August'
                    WHEN (capex_GBS_Week3_August IS NOT NULL AND capex_GBS_Week3_August <> 0.00) OR 
                         (capex_IEBR_Week3_August IS NOT NULL AND capex_IEBR_Week3_August <> 0.00) OR 
                         (capex_PPP_Week3_August IS NOT NULL AND capex_PPP_Week3_August <> 0.00) THEN 'Week 3 - August'
                    WHEN (capex_GBS_Week2_August IS NOT NULL AND capex_GBS_Week2_August <> 0.00) OR 
                         (capex_IEBR_Week2_August IS NOT NULL AND capex_IEBR_Week2_August <> 0.00) OR 
                         (capex_PPP_Week2_August IS NOT NULL AND capex_PPP_Week2_August <> 0.00) THEN 'Week 2 - August'
                    WHEN (capex_GBS_Week1_August IS NOT NULL AND capex_GBS_Week1_August <> 0.00) OR 
                         (capex_IEBR_Week1_August IS NOT NULL AND capex_IEBR_Week1_August <> 0.00) OR 
                         (capex_PPP_Week1_August IS NOT NULL AND capex_PPP_Week1_August <> 0.00) THEN 'Week 1 - August'
                    WHEN (capex_GBS_Week4_July IS NOT NULL AND capex_GBS_Week4_July <> 0.00) OR 
                         (capex_IEBR_Week4_July IS NOT NULL AND capex_IEBR_Week4_July <> 0.00) OR 
                         (capex_PPP_Week4_July IS NOT NULL AND capex_PPP_Week4_July <> 0.00) THEN 'Week 4 - July'
                    WHEN (capex_GBS_Week3_July IS NOT NULL AND capex_GBS_Week3_July <> 0.00) OR 
                         (capex_IEBR_Week3_July IS NOT NULL AND capex_IEBR_Week3_July <> 0.00) OR 
                         (capex_PPP_Week3_July IS NOT NULL AND capex_PPP_Week3_July <> 0.00) THEN 'Week 3 - July'
                    WHEN (capex_GBS_Week2_July IS NOT NULL AND capex_GBS_Week2_July <> 0.00) OR 
                         (capex_IEBR_Week2_July IS NOT NULL AND capex_IEBR_Week2_July <> 0.00) OR 
                         (capex_PPP_Week2_July IS NOT NULL AND capex_PPP_Week2_July <> 0.00) THEN 'Week 2 - July'
                    WHEN (capex_GBS_Week1_July IS NOT NULL AND capex_GBS_Week1_July <> 0.00) OR 
                         (capex_IEBR_Week1_July IS NOT NULL AND capex_IEBR_Week1_July <> 0.00) OR 
                         (capex_PPP_Week1_July IS NOT NULL AND capex_PPP_Week1_July <> 0.00) THEN 'Week 1 - July'
                    WHEN (capex_GBS_Week4_June IS NOT NULL AND capex_GBS_Week4_June <> 0.00) OR 
                         (capex_IEBR_Week4_June IS NOT NULL AND capex_IEBR_Week4_June <> 0.00) OR 
                         (capex_PPP_Week4_June IS NOT NULL AND capex_PPP_Week4_June <> 0.00) THEN 'Week 4 - June'
                    WHEN (capex_GBS_Week3_June IS NOT NULL AND capex_GBS_Week3_June <> 0.00) OR 
                         (capex_IEBR_Week3_June IS NOT NULL AND capex_IEBR_Week3_June <> 0.00) OR 
                         (capex_PPP_Week3_June IS NOT NULL AND capex_PPP_Week3_June <> 0.00) THEN 'Week 3 - June'
                    WHEN (capex_GBS_Week2_June IS NOT NULL AND capex_GBS_Week2_June <> 0.00) OR 
                         (capex_IEBR_Week2_June IS NOT NULL AND capex_IEBR_Week2_June <> 0.00) OR 
                         (capex_PPP_Week2_June IS NOT NULL AND capex_PPP_Week2_June <> 0.00) THEN 'Week 2 - June'
                    WHEN (capex_GBS_Week1_June IS NOT NULL AND capex_GBS_Week1_June <> 0.00) OR 
                         (capex_IEBR_Week1_June IS NOT NULL AND capex_IEBR_Week1_June <> 0.00) OR 
                         (capex_PPP_Week1_June IS NOT NULL AND capex_PPP_Week1_June <> 0.00) THEN 'Week 1 - June'
                    WHEN (capex_GBS_Week4_May IS NOT NULL AND capex_GBS_Week4_May <> 0.00) OR 
                         (capex_IEBR_Week4_May IS NOT NULL AND capex_IEBR_Week4_May <> 0.00) OR 
                         (capex_PPP_Week4_May IS NOT NULL AND capex_PPP_Week4_May <> 0.00) THEN 'Week 4 - May'
                    WHEN (capex_GBS_Week3_May IS NOT NULL AND capex_GBS_Week3_May <> 0.00) OR 
                         (capex_IEBR_Week3_May IS NOT NULL AND capex_IEBR_Week3_May <> 0.00) OR 
                         (capex_PPP_Week3_May IS NOT NULL AND capex_PPP_Week3_May <> 0.00) THEN 'Week 3 - May'
                    WHEN (capex_GBS_Week2_May IS NOT NULL AND capex_GBS_Week2_May <> 0.00) OR 
                         (capex_IEBR_Week2_May IS NOT NULL AND capex_IEBR_Week2_May <> 0.00) OR 
                         (capex_PPP_Week2_May IS NOT NULL AND capex_PPP_Week2_May <> 0.00) THEN 'Week 2 - May'
                    WHEN (capex_GBS_Week1_May IS NOT NULL AND capex_GBS_Week1_May <> 0.00) OR 
                         (capex_IEBR_Week1_May IS NOT NULL AND capex_IEBR_Week1_May <> 0.00) OR 
                         (capex_PPP_Week1_May IS NOT NULL AND capex_PPP_Week1_May <> 0.00) THEN 'Week 1 - May'
                    WHEN (capex_GBS_Week4_April IS NOT NULL AND capex_GBS_Week4_April <> 0.00) OR 
                         (capex_IEBR_Week4_April IS NOT NULL AND capex_IEBR_Week4_April <> 0.00) OR 
                         (capex_PPP_Week4_April IS NOT NULL AND capex_PPP_Week4_April <> 0.00) THEN 'Week 4 - April'
                    WHEN (capex_GBS_Week3_April IS NOT NULL AND capex_GBS_Week3_April <> 0.00) OR 
                         (capex_IEBR_Week3_April IS NOT NULL AND capex_IEBR_Week3_April <> 0.00) OR 
                         (capex_PPP_Week3_April IS NOT NULL AND capex_PPP_Week3_April <> 0.00) THEN 'Week 3 - April'
                    WHEN (capex_GBS_Week2_April IS NOT NULL AND capex_GBS_Week2_April <> 0.00) OR 
                         (capex_IEBR_Week2_April IS NOT NULL AND capex_IEBR_Week2_April <> 0.00) OR 
                         (capex_PPP_Week2_April IS NOT NULL AND capex_PPP_Week2_April <> 0.00) THEN 'Week 2 - April'
                    WHEN (capex_GBS_Week1_April IS NOT NULL AND capex_GBS_Week1_April <> 0.00) OR 
                         (capex_IEBR_Week1_April IS NOT NULL AND capex_IEBR_Week1_April <> 0.00) OR 
                         (capex_PPP_Week1_April IS NOT NULL AND capex_PPP_Week1_April <> 0.00) THEN 'Week 1 - April'
                    ELSE '-'
                END AS Latest_Update_Week
            FROM 
			    mmt_organisation mmt
			LEFT JOIN mmt_organisation_category mmt_oc ON mmt.organisation_category_id  = mmt_oc.organisation_category_id 
			LEFT JOIN [tbl_capex] c ON mmt.organisation_id = c.capex_organisation_id AND c.capex_financial_year='${financialYear}'
            LEFT JOIN tbl_capex_monthly cm ON c.capex_id = cm.capex_id
			WHERE mmt.organisation_category_id=1 OR mmt.organisation_id IN (25,15,18,19,21,17)
            ORDER BY Latest_Update_Week
            
         `);
            
        res.json(result.recordset);
    } catch (err) {
        console.error(err);
        return res.sendStatus(500);
    }
}

async function getCapexDashboard(req, res) {
    try {
        const clusterID = parseInt(req.params.clusterID, 10) || 0;
        const financialYear = req.params.financialYear || null;

        const conn = await pool;
        const request = conn.request();

        request.input("clusterID", clusterID);
        request.input("financialYear", financialYear);

        const combinedQuery = `
            SELECT
            -- Total Planned Expenditure
            SUM(tc.capex_total_value) AS totalPlannedExpenditure,

            -- Total Actual Expenditure
            SUM(tcm.total_capex) AS totalActualExpenditure,

            -- Expenditure Percentage
            CASE 
                WHEN SUM(tc.capex_total_value) = 0 THEN 0
                ELSE (SUM(tcm.total_capex) / SUM(tc.capex_total_value)) * 100
            END AS expenditurePercentage
        FROM tbl_capex tc
        LEFT JOIN tbl_capex_monthly tcm ON tc.capex_id = tcm.capex_id
        INNER JOIN mmt_organisation o ON tc.capex_organisation_id = o.organisation_id
        INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
        WHERE
            (@financialYear IS NULL OR tc.capex_financial_year = @financialYear)
            AND (@clusterID = 0 OR o.hr_cluster_id = @clusterID);
        `;

        const combinedResult = await request.query(combinedQuery);

        return res.json({
            combinedTotals: combinedResult.recordset[0],
            message: "Filtered by financial year only"
        });

    } catch (error) {
        console.error("Error fetching CAPEX dashboard data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getCapexDashboardBarGraph(req, res) {
  try {
    const clusterID = parseInt(req.params.clusterID, 10) || 0;
    const financialYear = req.params.financialYear || null;

    const conn = await pool;
    const request = conn.request();

    request.input("clusterID", clusterID);
    request.input("financialYear", financialYear);

    const sqlQuery = `
      SELECT
        o.organisation_code,
        tc.capex_total_value AS planned,
        ISNULL(SUM(tcm.total_capex), 0) AS actual
      FROM tbl_capex tc
      INNER JOIN mmt_organisation o ON tc.capex_organisation_id = o.organisation_id
      INNER JOIN mmt_hr_cluster cid ON o.hr_cluster_id = cid.hr_cluster_id
      LEFT JOIN tbl_capex_monthly tcm ON tc.capex_id = tcm.capex_id
      WHERE
        (@financialYear IS NULL OR tc.capex_financial_year = @financialYear)
        AND (@clusterID = 0 OR o.hr_cluster_id = @clusterID)
      GROUP BY
        o.organisation_code,
        tc.capex_total_value
      ORDER BY o.organisation_code;
    `;

    const { recordset } = await request.query(sqlQuery);

    if (!recordset.length) {
      return res.status(404).json({ error: "No data available" });
    }

    res.json({
      labels: recordset.map(r => r.organisation_code),
      datasets: [
        {
          label: "Planned Expenditure",
          data: recordset.map(r => r.planned)
        },
        {
          label: "Actual Expenditure",
          data: recordset.map(r => r.actual)
        }
      ]
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
async function getCapexDashboardorg(req, res) {
    try {
        
        const financialYear = req.params.financialYear || null;
        const organisationID = req.params.organisationID ? parseInt(req.params.organisationID, 10) : 0;
        const conn = await pool;
        const request = conn.request();

        request.input("financialYear", financialYear);
        request.input("organisationID", organisationID);

        const combinedQuery = `
            -- Aggregate planned expenditure per org/year
            WITH Planned AS (
                SELECT
                    capex_organisation_id,
                    capex_financial_year,
                    SUM(capex_total_value) AS totalPlannedExpenditure
                FROM tbl_capex
                GROUP BY capex_organisation_id, capex_financial_year
            ),
            -- Aggregate actual expenditure per org/year
            Actual AS (
                SELECT
                    tc.capex_organisation_id,
                    tc.capex_financial_year,
                    SUM(tcm.total_capex) AS totalActualExpenditure
                FROM tbl_capex tc
                LEFT JOIN tbl_capex_monthly tcm
                    ON tc.capex_id = tcm.capex_id
                GROUP BY tc.capex_organisation_id, tc.capex_financial_year
            )

            SELECT
                o.organisation_id,
                o.organisation_name,
                p.capex_financial_year,
                p.totalPlannedExpenditure,
                COALESCE(a.totalActualExpenditure, 0) AS totalActualExpenditure,
                CASE 
                    WHEN p.totalPlannedExpenditure = 0 THEN 0
                    ELSE (COALESCE(a.totalActualExpenditure,0)/p.totalPlannedExpenditure)*100
                END AS expenditurePercentage
            FROM Planned p
            LEFT JOIN Actual a
                ON p.capex_organisation_id = a.capex_organisation_id
               AND p.capex_financial_year = a.capex_financial_year
            INNER JOIN mmt_organisation o
                ON p.capex_organisation_id = o.organisation_id
            INNER JOIN mmt_hr_cluster cid
                ON o.hr_cluster_id = cid.hr_cluster_id
            WHERE
                (@financialYear IS NULL OR p.capex_financial_year = @financialYear)
                AND (@organisationID = 0 OR o.organisation_id = @organisationID)
        `;

        const combinedResult = await request.query(combinedQuery);

        return res.json({
            combinedTotals: combinedResult.recordset[0] || {
                totalPlannedExpenditure: 0,
                totalActualExpenditure: 0,
                expenditurePercentage: 0
            },
            message: "Filtered by financial year, cluster, and organisation"
        });

    } catch (error) {
        console.error("Error fetching CAPEX dashboard data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}


async function getfinancialYearDataOrgwise(req, res) {
    try {

   
        const organisationID = req.params.organisationID;
          const financialYear = req.params.financialYear || null;

        const conn = await pool;
        const request = conn.request();

        request.input("organisationID", organisationID);
              request.input("financialYear", financialYear);

        const combinedQuery = `
           SELECT 
            c.capex_organisation_id AS organisation_id,
            c.capex_financial_year AS financial_year,
            v.month,

            SUM(v.GBS)  AS GBS,
            SUM(v.IEBR) AS IEBR,
            SUM(v.PPP)  AS PPP

        FROM tbl_capex c
        JOIN tbl_capex_monthly m 
            ON c.capex_id = m.capex_id

        CROSS APPLY (
            VALUES

            -- JAN
            ('Jan',
                ISNULL(m.capex_GBS_Week1_January,0) + ISNULL(m.capex_GBS_Week2_January,0) + ISNULL(m.capex_GBS_Week3_January,0) + ISNULL(m.capex_GBS_Week4_January,0),
                ISNULL(m.capex_IEBR_Week1_January,0) + ISNULL(m.capex_IEBR_Week2_January,0) + ISNULL(m.capex_IEBR_Week3_January,0) + ISNULL(m.capex_IEBR_Week4_January,0),
                ISNULL(m.capex_PPP_Week1_January,0) + ISNULL(m.capex_PPP_Week2_January,0) + ISNULL(m.capex_PPP_Week3_January,0) + ISNULL(m.capex_PPP_Week4_January,0)
            ),

            -- FEB
            ('Feb',
                ISNULL(m.capex_GBS_Week1_February,0) + ISNULL(m.capex_GBS_Week2_February,0) + ISNULL(m.capex_GBS_Week3_February,0) + ISNULL(m.capex_GBS_Week4_February,0),
                ISNULL(m.capex_IEBR_Week1_February,0) + ISNULL(m.capex_IEBR_Week2_February,0) + ISNULL(m.capex_IEBR_Week3_February,0) + ISNULL(m.capex_IEBR_Week4_February,0),
                ISNULL(m.capex_PPP_Week1_February,0) + ISNULL(m.capex_PPP_Week2_February,0) + ISNULL(m.capex_PPP_Week3_February,0) + ISNULL(m.capex_PPP_Week4_February,0)
            ),

            -- MAR
            ('Mar',
                ISNULL(m.capex_GBS_Week1_March,0) + ISNULL(m.capex_GBS_Week2_March,0) + ISNULL(m.capex_GBS_Week3_March,0) + ISNULL(m.capex_GBS_Week4_March,0),
                ISNULL(m.capex_IEBR_Week1_March,0) + ISNULL(m.capex_IEBR_Week2_March,0) + ISNULL(m.capex_IEBR_Week3_March,0) + ISNULL(m.capex_IEBR_Week4_March,0),
                ISNULL(m.capex_PPP_Week1_March,0) + ISNULL(m.capex_PPP_Week2_March,0) + ISNULL(m.capex_PPP_Week3_March,0) + ISNULL(m.capex_PPP_Week4_March,0)
            ),

            -- APR
            ('Apr',
                ISNULL(m.capex_GBS_Week1_April,0) + ISNULL(m.capex_GBS_Week2_April,0) + ISNULL(m.capex_GBS_Week3_April,0) + ISNULL(m.capex_GBS_Week4_April,0),
                ISNULL(m.capex_IEBR_Week1_April,0) + ISNULL(m.capex_IEBR_Week2_April,0) + ISNULL(m.capex_IEBR_Week3_April,0) + ISNULL(m.capex_IEBR_Week4_April,0),
                ISNULL(m.capex_PPP_Week1_April,0) + ISNULL(m.capex_PPP_Week2_April,0) + ISNULL(m.capex_PPP_Week3_April,0) + ISNULL(m.capex_PPP_Week4_April,0)
            ),

            -- MAY
            ('May',
                ISNULL(m.capex_GBS_Week1_May,0) + ISNULL(m.capex_GBS_Week2_May,0) + ISNULL(m.capex_GBS_Week3_May,0) + ISNULL(m.capex_GBS_Week4_May,0),
                ISNULL(m.capex_IEBR_Week1_May,0) + ISNULL(m.capex_IEBR_Week2_May,0) + ISNULL(m.capex_IEBR_Week3_May,0) + ISNULL(m.capex_IEBR_Week4_May,0),
                ISNULL(m.capex_PPP_Week1_May,0) + ISNULL(m.capex_PPP_Week2_May,0) + ISNULL(m.capex_PPP_Week3_May,0) + ISNULL(m.capex_PPP_Week4_May,0)
            ),

            -- JUN
            ('Jun',
                ISNULL(m.capex_GBS_Week1_June,0) + ISNULL(m.capex_GBS_Week2_June,0) + ISNULL(m.capex_GBS_Week3_June,0) + ISNULL(m.capex_GBS_Week4_June,0),
                ISNULL(m.capex_IEBR_Week1_June,0) + ISNULL(m.capex_IEBR_Week2_June,0) + ISNULL(m.capex_IEBR_Week3_June,0) + ISNULL(m.capex_IEBR_Week4_June,0),
                ISNULL(m.capex_PPP_Week1_June,0) + ISNULL(m.capex_PPP_Week2_June,0) + ISNULL(m.capex_PPP_Week3_June,0) + ISNULL(m.capex_PPP_Week4_June,0)
            ),

            -- JUL
            ('Jul',
                ISNULL(m.capex_GBS_Week1_July,0) + ISNULL(m.capex_GBS_Week2_July,0) + ISNULL(m.capex_GBS_Week3_July,0) + ISNULL(m.capex_GBS_Week4_July,0),
                ISNULL(m.capex_IEBR_Week1_July,0) + ISNULL(m.capex_IEBR_Week2_July,0) + ISNULL(m.capex_IEBR_Week3_July,0) + ISNULL(m.capex_IEBR_Week4_July,0),
                ISNULL(m.capex_PPP_Week1_July,0) + ISNULL(m.capex_PPP_Week2_July,0) + ISNULL(m.capex_PPP_Week3_July,0) + ISNULL(m.capex_PPP_Week4_July,0)
            ),

            -- AUG
            ('Aug',
                ISNULL(m.capex_GBS_Week1_August,0) + ISNULL(m.capex_GBS_Week2_August,0) + ISNULL(m.capex_GBS_Week3_August,0) + ISNULL(m.capex_GBS_Week4_August,0),
                ISNULL(m.capex_IEBR_Week1_August,0) + ISNULL(m.capex_IEBR_Week2_August,0) + ISNULL(m.capex_IEBR_Week3_August,0) + ISNULL(m.capex_IEBR_Week4_August,0),
                ISNULL(m.capex_PPP_Week1_August,0) + ISNULL(m.capex_PPP_Week2_August,0) + ISNULL(m.capex_PPP_Week3_August,0) + ISNULL(m.capex_PPP_Week4_August,0)
            ),

            -- SEP
            ('Sep',
                ISNULL(m.capex_GBS_Week1_September,0) + ISNULL(m.capex_GBS_Week2_September,0) + ISNULL(m.capex_GBS_Week3_September,0) + ISNULL(m.capex_GBS_Week4_September,0),
                ISNULL(m.capex_IEBR_Week1_September,0) + ISNULL(m.capex_IEBR_Week2_September,0) + ISNULL(m.capex_IEBR_Week3_September,0) + ISNULL(m.capex_IEBR_Week4_September,0),
                ISNULL(m.capex_PPP_Week1_September,0) + ISNULL(m.capex_PPP_Week2_September,0) + ISNULL(m.capex_PPP_Week3_September,0) + ISNULL(m.capex_PPP_Week4_September,0)
            ),

            -- OCT
            ('Oct',
                ISNULL(m.capex_GBS_Week1_October,0) + ISNULL(m.capex_GBS_Week2_October,0) + ISNULL(m.capex_GBS_Week3_October,0) + ISNULL(m.capex_GBS_Week4_October,0),
                ISNULL(m.capex_IEBR_Week1_October,0) + ISNULL(m.capex_IEBR_Week2_October,0) + ISNULL(m.capex_IEBR_Week3_October,0) + ISNULL(m.capex_IEBR_Week4_October,0),
                ISNULL(m.capex_PPP_Week1_October,0) + ISNULL(m.capex_PPP_Week2_October,0) + ISNULL(m.capex_PPP_Week3_October,0) + ISNULL(m.capex_PPP_Week4_October,0)
            ),

            -- NOV
            ('Nov',
                ISNULL(m.capex_GBS_Week1_November,0) + ISNULL(m.capex_GBS_Week2_November,0) + ISNULL(m.capex_GBS_Week3_November,0) + ISNULL(m.capex_GBS_Week4_November,0),
                ISNULL(m.capex_IEBR_Week1_November,0) + ISNULL(m.capex_IEBR_Week2_November,0) + ISNULL(m.capex_IEBR_Week3_November,0) + ISNULL(m.capex_IEBR_Week4_November,0),
                ISNULL(m.capex_PPP_Week1_November,0) + ISNULL(m.capex_PPP_Week2_November,0) + ISNULL(m.capex_PPP_Week3_November,0) + ISNULL(m.capex_PPP_Week4_November,0)
            ),

            -- DEC
            ('Dec',
                ISNULL(m.capex_GBS_Week1_December,0) + ISNULL(m.capex_GBS_Week2_December,0) + ISNULL(m.capex_GBS_Week3_December,0) + ISNULL(m.capex_GBS_Week4_December,0),
                ISNULL(m.capex_IEBR_Week1_December,0) + ISNULL(m.capex_IEBR_Week2_December,0) + ISNULL(m.capex_IEBR_Week3_December,0) + ISNULL(m.capex_IEBR_Week4_December,0),
                ISNULL(m.capex_PPP_Week1_December,0) + ISNULL(m.capex_PPP_Week2_December,0) + ISNULL(m.capex_PPP_Week3_December,0) + ISNULL(m.capex_PPP_Week4_December,0)
            )

        ) v(month, GBS, IEBR, PPP)

        WHERE 
        c.capex_organisation_id = @organisationID
        AND (@financialYear IS NULL OR c.capex_financial_year = @financialYear)

        GROUP BY 
            c.capex_organisation_id,
            c.capex_financial_year,
            v.month

        ORDER BY 
            c.capex_organisation_id,
            c.capex_financial_year,
            v.month;
                `;

        const combinedResult = await request.query(combinedQuery);

        return res.json(combinedResult.recordset);

    } catch (error) {
        console.error("Error fetching CAPEX dashboard data:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getCapexDashboardBarGraphorg(req, res) {
  try {
    const organisationID = req.params.organisationID ? parseInt(req.params.organisationID, 10) : 0;
    const conn = await pool;
    const request = conn.request();
    request.input("organisationID", organisationID);

    const sqlQuery = `
      SELECT
        tc.capex_financial_year,
        SUM(tc.capex_total_value) AS planned,
        ISNULL(SUM(tcm.totalActual), 0) AS actual
    FROM tbl_capex tc
    LEFT JOIN (
        SELECT capex_id, SUM(total_capex) AS totalActual
        FROM tbl_capex_monthly
        GROUP BY capex_id
    ) tcm 
        ON tc.capex_id = tcm.capex_id
    WHERE
        (@organisationID = 0 OR tc.capex_organisation_id = @organisationID)
    GROUP BY
        tc.capex_financial_year
    ORDER BY
     tc.capex_financial_year ;
    `;

    const { recordset } = await request.query(sqlQuery);

    if (!recordset.length) {
      return res.status(404).json({ error: "No data available" });
    }

    res.json({
      labels: recordset.map(r => r.capex_financial_year),
      datasets: [
        {
          label: "Planned Expenditure",
          data: recordset.map(r => r.planned)
        },
        {
          label: "Actual Expenditure",
          data: recordset.map(r => r.actual)
        }
      ]
    });
  } catch (err) {
    console.error("Database Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

export default {
    addCapex, getCapexExpediture, getCapexMonthlyData, addCapexMonthlyData, getCapexData, editCapexExpediture, getCapexDataEntry,
    getCapexDashboard,getCapexDashboardBarGraph, getfinancialYearDataOrgwise,getCapexDashboardorg,getCapexDashboardBarGraphorg
};