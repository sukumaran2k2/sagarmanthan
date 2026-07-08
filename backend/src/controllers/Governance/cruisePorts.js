
import { pool } from "../../db.js";
import fs from 'fs';
async function submitCruisePortsData(req, res) {

    const {
        addyear,addmonth,organisationID,addinternationalVessels,addinternationalPassengers,adddomesticVessels,adddomesticPassengers,userID
    } = req.body;

    console.log(req.body.userID, "pdata");

    const conn = await pool;

    try {

        // Check existing record
        const checkRequest = conn.request();

        checkRequest.input("addyear", addyear);
        checkRequest.input("addmonth", addmonth);
        checkRequest.input("organisationID", organisationID);

        const result = await checkRequest.query(`
            SELECT COUNT(*) AS count
            FROM tbl_cruise_ports
            WHERE financial_year = @addyear
            AND month = @addmonth
            AND organisation_id = @organisationID
        `);

        // If already exists
        if (result.recordset[0].count > 0) {
            return res.sendStatus(205);
        }

        // Insert data
        const request = conn.request();

        request.input("addyear", addyear);
        request.input("addmonth", addmonth);
        request.input("organisationID", organisationID);
        request.input("addinternationalVessels", addinternationalVessels);
        request.input("addinternationalPassengers", addinternationalPassengers);
        request.input("adddomesticVessels", adddomesticVessels);
        request.input("adddomesticPassengers", adddomesticPassengers);
        request.input("userID", userID);

        await request.query(`
            INSERT INTO tbl_cruise_ports (
                financial_year, month,organisation_id,no_of_international_vessels,no_of_international_pax,no_of_domestic_vessels,no_of_domestic_pax,created_date,
                created_by
            )
            VALUES (
                @addyear,@addmonth,@organisationID,@addinternationalVessels,@addinternationalPassengers,@adddomesticVessels,@adddomesticPassengers,GETDATE(),
                @userID
            )
        `);

        res.sendStatus(201);

    } catch (err) {

        console.error(err);
        res.sendStatus(500);

    }
}

async function getCruisePortsReportData(req, res) {
    const fromFinancialYear = req.query.fromYear;
    const fromMonth = req.query.fromMonth;
    const toFinancialYear = req.query.toYear;
    const toMonth = req.query.toMonth;

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fromFinancialYear", fromFinancialYear);
        request.input("fromMonth", fromMonth);
        request.input("toFinancialYear", toFinancialYear);
        request.input("toMonth", toMonth);

        const result = await request.query(`
       SELECT
        o.organisation_id,
        o.organisation_name,
        COALESCE(SUM(p.no_of_international_vessels),0) AS total_international_vessels,
        COALESCE(SUM(p.no_of_international_pax),0) AS total_international_pax,
        COALESCE(SUM(p.no_of_domestic_vessels),0) AS total_domestic_vessels,
        COALESCE(SUM(p.no_of_domestic_pax),0) AS total_domestic_pax,
        COALESCE(SUM(p.no_of_international_vessels + p.no_of_domestic_vessels),0) AS total_vessels,
        COALESCE(SUM(p.no_of_international_pax + p.no_of_domestic_pax),0) AS total_pax
    FROM
        mmt_organisation o
    LEFT JOIN tbl_cruise_ports p
        ON p.organisation_id = o.organisation_id
        AND (
            (p.financial_year = 2022 AND p.month >= 5)
            OR (p.financial_year > 2022)
        )
        AND (
            (p.financial_year = 2025 AND p.month <= 7)
            OR (p.financial_year < 2025)
        )
    WHERE
        o.organisation_id IN (1,2,6,7,8,12,78,79,80)
    GROUP BY
        o.organisation_id, o.organisation_name;

            `);

        const totalsByOrg = result.recordset;

        res.json(totalsByOrg);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

async function getCruisePortsDataByYearAndMonth(req, res) {
    const financialYear = req.query.financialYear;
    const month = req.query.month;

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("month", month);

        const result = await request.query(`
            SELECT
                o.organisation_name,
                SUM(p.no_of_international_vessels) AS total_international_vessels,
                SUM(p.no_of_international_pax) AS total_international_pax,
                SUM(p.no_of_domestic_vessels) AS total_domestic_vessels,
                SUM(p.no_of_domestic_pax) AS total_domestic_pax
            FROM
                tbl_cruise_ports p
            LEFT JOIN
                mmt_organisation o ON p.organisation_id = o.organisation_id
            WHERE
                p.financial_year = @financialYear
                AND p.month = @month
            GROUP BY
                o.organisation_name;
        `);

        const reportData = result.recordset;
        res.json(reportData);
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}
async function getcruisepassengersData(req, res) {
    try {

        const roleID = req.params.roleID;
        const organisationID = req.params.organisationID;

        const conn = await pool;
        const request = conn.request();

        request.input("roleID", roleID);
        request.input("organisationID", organisationID);

        let query = "";

        // Admin Roles → Show All Organisations
        if (roleID == 2 || roleID == 3 || roleID == 4 || roleID == 5 || roleID == 8) {

            query = `
                SELECT 
                c.id,
                    c.financial_year,
                    c.organisation_id,
                    o.organisation_name,
                    c.no_of_international_vessels,
                    c.no_of_international_pax,
                    c.no_of_domestic_vessels,
                    c.no_of_domestic_pax,
                    c.month
                FROM tbl_cruise_ports c
                LEFT JOIN mmt_organisation o
                    ON c.organisation_id = o.organisation_id
                ORDER BY c.financial_year DESC, c.month DESC
            `;

        } else {

            // Normal Users → Show Only Their Organisation
            query = `
                SELECT 
                    c.id,
                    c.financial_year,
                    c.organisation_id,
                    o.organisation_name,
                    c.no_of_international_vessels,
                    c.no_of_international_pax,
                    c.no_of_domestic_vessels,
                    c.no_of_domestic_pax,
                    c.month
                FROM tbl_cruise_ports c
                LEFT JOIN mmt_organisation o
                    ON c.organisation_id = o.organisation_id
                WHERE c.organisation_id = @organisationID
                ORDER BY c.financial_year DESC, c.month DESC
            `;
        }

        const result = await request.query(query);

        return res.json({ rowData: result.recordset });

    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}

    async function getUpdateCruiseShippingdata(req, res) 
    {

        const CruiseShippingId = req.params.CruiseShippingId;
        const conn = await pool;
        const request = conn.request();
        request.input("CruiseShippingId", CruiseShippingId);

        try {
            const result = await request.query(`
                SELECT 
                    *
                FROM 
                    tbl_cruise_ports
                    WHERE id  = @CruiseShippingId
            `);

            res.json(result.recordset);
        } catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        }

        
    async function updateCruiseshippingData(req,res){

        const data = req.body;

        const year = req.body.year;
        const month = req.body.month;
        const internationalVessels = req.body.internationalVessels;
        const internationalPassengers = req.body.internationalPassengers;
        const domesticVessels = req.body.domesticVessels;
        const domesticPassengers = req.body.domesticPassengers;
        const  CruiseShippingIdOrg  = req.body. CruiseShippingIdOrg ;
        const userID = req.body.userID;


        const conn = await pool;
        const request = conn.request();
        request.input('year', year);
        request.input('month',month);
        request.input('internationalVessels',internationalVessels);
        request.input('internationalPassengers',internationalPassengers);
        request.input('domesticVessels',domesticVessels);
        request.input('domesticPassengers',domesticPassengers);
        request.input("userID", userID);
        request.input("CruiseShippingIdOrg", CruiseShippingIdOrg);

        try {
            const result = await request.query(`UPDATE tbl_cruise_ports SET financial_year = @year, month = @month,no_of_international_vessels = @internationalVessels,no_of_international_pax  = @internationalPassengers,no_of_domestic_vessels = @domesticVessels,no_of_domestic_pax = @domesticPassengers,updated_by = @userID,updated_date = getDate() WHERE id  = @CruiseShippingIdOrg`);
            return res.sendStatus(200);
        }
        catch (err) {
            console.log(err);
            return res.sendStatus(500);
        }
    }

export default { submitCruisePortsData, getCruisePortsReportData, getCruisePortsDataByYearAndMonth,getcruisepassengersData,getUpdateCruiseShippingdata,updateCruiseshippingData};