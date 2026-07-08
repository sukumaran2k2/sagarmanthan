import { pool } from "../../db.js";
import fs from 'fs';


async function getVesselTrafficData(req, res) {
    const { fiscalYear, month, organisationId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("month", month);
        request.input("organisationId", organisationId);

        const result = await request.query(`
            SELECT * 
            FROM tbl_traffic_vessel 
            WHERE fiscal_year = @fiscalYear AND organisation_id = @organisationId
            AND month = @month
        `);

        return res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching vessel traffic data:", error);
        return res.sendStatus(500);
    }
}


async function submitVesselTrafficData(req, res) {
    const {
        fiscalYear,
        month,
        organisationId,
        cruiseVesselCallsDomestic,
        cruiseVesselCallsInternational,
        cruisePassengersDomestic,
        cruisePassengersInternational,
        ferryCalls,
        ferryPassengers,
        handlesPassengerFerry,
        userId
    } = req.body;

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("month", month);
        request.input("organisationId", organisationId);
        request.input("cruiseVesselCallsDomestic", cruiseVesselCallsDomestic);
        request.input("cruiseVesselCallsInternational", cruiseVesselCallsInternational);
        request.input("cruisePassengersDomestic", cruisePassengersDomestic);
        request.input("cruisePassengersInternational", cruisePassengersInternational);
        request.input("ferryCalls", handlesPassengerFerry == 1 ? ferryCalls : null);
        request.input("ferryPassengers", handlesPassengerFerry == 1 ? ferryPassengers : null);
        request.input("handlesPassengerFerry", handlesPassengerFerry);
        request.input("userId", userId);

        const result = await request.query(`
            IF EXISTS (
                SELECT 1
                FROM tbl_traffic_vessel
                WHERE fiscal_year = @fiscalYear AND organisation_id = @organisationId AND month = @month
            )
            BEGIN
                SELECT 0 AS rowsAffected;
            END
            ELSE
            BEGIN
            INSERT INTO tbl_traffic_vessel 
            (fiscal_year, month, organisation_id, 
             total_cruise_vessel_domestic, total_cruise_vessel_international, 
             total_cruise_passengers_domestic, total_cruise_passengers_international, 
             total_ferry_calls, total_ferry_passengers, handles_passenger_ferry, created_by, created_date) 
            VALUES 
            (@fiscalYear, @month, @organisationId, 
             @cruiseVesselCallsDomestic, @cruiseVesselCallsInternational, 
             @cruisePassengersDomestic, @cruisePassengersInternational, 
             @ferryCalls, @ferryPassengers, @handlesPassengerFerry, @userId, getDate())
            SELECT 1 AS rowsAffected;
            END
        `);

        const inserted = result.recordset?.[0]?.rowsAffected === 1;
        if (inserted) {
            return res.status(201).send("Vessel traffic data added successfully.");
        } else {
            return res.status(409).send("Data for this Financial Year and Month already exists.");
        }
    } catch (error) {
        console.error("Error submitting vessel traffic data:", error);
        return res.sendStatus(500);
    }
}


async function getYearlyVesselTrafficList(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const query = `
        SELECT 
         t.fiscal_year,
                t.organisation_id,
                o.organisation_name,
                t.month,
                SUM(t.total_cruise_vessel_domestic) AS total_cruise_vessel_domestic,
                SUM(t.total_cruise_vessel_international) AS total_cruise_vessel_international,
                SUM(t.total_cruise_passengers_domestic) AS total_cruise_passengers_domestic,
                SUM(t.total_cruise_passengers_international) AS total_cruise_passengers_international,
                SUM(t.total_ferry_calls) AS total_ferry_calls,
                SUM(t.total_ferry_passengers) AS total_ferry_passengers,
                MAX(COALESCE(t.updated_date, t.created_date)) AS updated_date
            FROM 
                dbo.tbl_traffic_vessel t
            LEFT JOIN 
                dbo.mmt_organisation o ON t.organisation_id = o.organisation_id
            GROUP BY 
                t.fiscal_year,
                t.organisation_id,
                o.organisation_name,
                t.month
            ORDER BY 
                CAST(LEFT(t.fiscal_year, 4) AS INT) DESC;
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching yearly vessel traffic list:", error);
        res.sendStatus(500);
    }
}

async function getMonthlyVesselTrafficList(req, res) {
    const { fiscalYear, organisationId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", organisationId);

        const query = `
            SELECT 
                t.fiscal_year,
                t.month,
                t.organisation_id,
                o.organisation_name,
                (t.total_cruise_vessel_domestic + t.total_cruise_vessel_international) AS actual_cruise_vessel_calls,
                (t.total_cruise_passengers_domestic + t.total_cruise_passengers_international) AS actual_cruise_passengers,
                t.total_ferry_calls AS actual_ferry_calls,
                t.total_ferry_passengers AS actual_ferry_passengers
            FROM 
                tbl_traffic_vessel t
            INNER JOIN 
                mmt_organisation o
            ON 
                t.organisation_id = o.organisation_id
            WHERE 
                t.fiscal_year = @fiscalYear AND t.organisation_id = @organisationId
            ORDER BY 
                t.month ASC;
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching monthly vessel traffic list:", error);
        res.sendStatus(500);
    }
}



async function updateVesselTrafficData(req, res) {
    const {
        fiscalYear,
        month,
        organisationId,
        cruiseVesselCallsDomestic,
        cruiseVesselCallsInternational,
        cruisePassengersDomestic,
        cruisePassengersInternational,
        ferryCalls,
        ferryPassengers,
        handlesPassengerFerry,
        userId
    } = req.body;

    console.log(req.body,"data")

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("month", month);
        request.input("organisationId", organisationId);
        request.input("cruiseVesselCallsDomestic", cruiseVesselCallsDomestic);
        request.input("cruiseVesselCallsInternational", cruiseVesselCallsInternational);
        request.input("cruisePassengersDomestic", cruisePassengersDomestic);
        request.input("cruisePassengersInternational", cruisePassengersInternational);
        request.input("ferryCalls", handlesPassengerFerry == 1 ? ferryCalls : null);
        request.input("ferryPassengers", handlesPassengerFerry == 1 ? ferryPassengers : null);
        request.input("handlesPassengerFerry", handlesPassengerFerry);
        request.input("userId", userId);

        const result = await request.query(`
            UPDATE tbl_traffic_vessel
            SET 
                total_cruise_vessel_domestic = @cruiseVesselCallsDomestic,
                total_cruise_vessel_international = @cruiseVesselCallsInternational,
                total_cruise_passengers_domestic = @cruisePassengersDomestic,
                total_cruise_passengers_international = @cruisePassengersInternational,
                total_ferry_calls = @ferryCalls,
                total_ferry_passengers = @ferryPassengers,
                handles_passenger_ferry = @handlesPassengerFerry,
                updated_by = @userId,
                updated_date = getDate()
            WHERE fiscal_year = @fiscalYear AND organisation_id = @organisationId AND month = @month
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: 'Vessel traffic data updated successfully.' });
        } else {
            return res.status(404).json({ message: 'No record found to update.' });
        }
    } catch (error) {
        console.error("Error updating vessel traffic data:", error);
        return res.status(500).json({ message: 'Error updating vessel traffic data.' });
    }
}


async function getCurisePassengerChart(req, res) {
    const conn = await pool;
    const organisationId = req.params.orgID;
    const financialYear = req.params.finYear;
    const monthId = req.params.monthId;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("monthId", monthId);
        request.input("organisationId", organisationId);

        let whereClause = [];

        if (financialYear && financialYear !== "0") {
            whereClause.push("tbl_traffic_vessel.fiscal_year = @financialYear");
        }

        if (monthId && monthId !== "0") {
            whereClause.push("tbl_traffic_vessel.month = @monthId");
        }

        if (organisationId && organisationId !== "0") {
            whereClause.push("tbl_traffic_vessel.organisation_id = @organisationId");
        }

        let whereCategoryCondition =
            whereClause.length > 0 ? "WHERE " + whereClause.join(" AND ") : "";

        const query = `
        SELECT 
          tbl_traffic_vessel.fiscal_year,
          tbl_traffic_vessel.month,
          tbl_traffic_vessel.organisation_id,
          (tbl_traffic_vessel.total_cruise_vessel_domestic + tbl_traffic_vessel.total_cruise_vessel_international) AS total_cruise_vessel,
          (tbl_traffic_vessel.total_cruise_passengers_domestic + tbl_traffic_vessel.total_cruise_passengers_international) AS total_cruise_passengers,
          tbl_traffic_vessel.total_ferry_calls,
          tbl_traffic_vessel.total_ferry_passengers,
          mmt_organisation.organisation_name,
          mmt_organisation.organisation_code
        FROM 
          tbl_traffic_vessel
        INNER JOIN 
          mmt_organisation 
        ON 
          tbl_traffic_vessel.organisation_id = mmt_organisation.organisation_id
        ${whereCategoryCondition};
      `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching cruise passenger chart:", error);
        res.sendStatus(500);
    }
}


async function submitTargetData(req, res) {
    const { fiscalYear, organisationId, targetCruiseVesselCalls, targetFerryCalls, userId } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", organisationId);
        request.input("targetCruiseVesselCalls", targetCruiseVesselCalls);
        request.input("targetFerryCalls", targetFerryCalls);
        request.input("userId", userId);

        const result = await request.query(`
            IF EXISTS (
                SELECT 1
                FROM tbl_traffic_vessel_target
                WHERE fiscal_year = @fiscalYear AND organisation_id = @organisationId
            )
            BEGIN
                SELECT 0 AS rowsAffected;
            END
            ELSE
            BEGIN
            INSERT INTO tbl_traffic_vessel_target 
            (fiscal_year, organisation_id, target_cruise_vessel_calls, target_ferry_calls, created_by, created_date) 
            VALUES 
            (@fiscalYear, @organisationId, @targetCruiseVesselCalls, @targetFerryCalls, @userId, getDate())
            SELECT 1 AS rowsAffected;
            END
        `);

        const inserted = result.recordset?.[0]?.rowsAffected === 1;
        if (inserted) {
            return res.status(201).send("Target data added successfully.");
        } else {
            return res.status(409).send("Target data for this fiscal year and organisation already exists.");
        }
    } catch (error) {
        console.error("Error submitting target data:", error);
        return res.sendStatus(500);
    }
}

async function updateTargetData(req, res) {
    const { fiscalYear, organisationId, targetCruiseVesselCalls, targetFerryCalls, userId } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", organisationId);
        request.input("targetCruiseVesselCalls", targetCruiseVesselCalls);
        request.input("targetFerryCalls", targetFerryCalls);
        request.input("userId", userId);

        const result = await request.query(`
            UPDATE tbl_traffic_vessel_target
            SET target_cruise_vessel_calls = @targetCruiseVesselCalls,
                target_ferry_calls = @targetFerryCalls,
                updated_by = @userId,
                updated_date = getDate()
            WHERE fiscal_year = @fiscalYear AND organisation_id = @organisationId;
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: "Target data updated successfully." });
        } else {
            return res.status(404).json({ message: "No target data found to update." });
        }
    } catch (error) {
        console.error("Error updating target data:", error);
        return res.status(500).json({ message: "Error updating target data." });
    }
}

async function getTargetData(req, res) {
    const { fiscalYear, organisationId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", organisationId);

        const query = `
            SELECT fiscal_year, organisation_id, target_cruise_vessel_calls, target_ferry_calls
            FROM tbl_traffic_vessel_target
            WHERE fiscal_year = @fiscalYear AND organisation_id = @organisationId;
        `;

        const result = await request.query(query);
        res.json(result.recordset[0]);
    } catch (error) {
        console.error("Error fetching target data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getCruiepassengersTargetData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.request().query(`
            SELECT 
                tfpt.organisation_id,
                tfpt.fiscal_year,
                mo.organisation_name,
                tfpt.target_cruise_vessel_calls,
                tfpt.target_ferry_calls,
                COALESCE(tfpt.updated_date, tfpt.created_date) AS updated_date
            FROM tbl_traffic_vessel_target AS tfpt
            LEFT JOIN mmt_organisation mo ON tfpt.organisation_id = mo.organisation_id
            ORDER BY tfpt.fiscal_year DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching monthly financial target data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}



const TrafficTab = {
    getVesselTrafficData, submitVesselTrafficData, getYearlyVesselTrafficList, getMonthlyVesselTrafficList, updateVesselTrafficData, getCurisePassengerChart, submitTargetData,
    updateTargetData, getTargetData, getCruiepassengersTargetData
};
export default TrafficTab;
