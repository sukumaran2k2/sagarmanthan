import { pool } from "../../db.js";
import fs from 'fs';

async function getKpiRenewableEnergyData(req, res) {
    const { financialYear, month, organisationId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("organisationId", organisationId);

        const result = await request.query(`
            SELECT *
            FROM tbl_kpi_renewable_energy
            WHERE financial_year = @financialYear 
              AND month = @month 
              AND organisation_id = @organisationId
        `);

        return res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching renewable energy data:", error);
        return res.sendStatus(500);
    }
}


async function submitKpiRenewableEnergyData(req, res) {
    const {
        financialYear,
        month,
        totalElectricalEnergy,
        totalRenewableEnergy,
        organisationId,
        userId
    } = req.body;

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("electricalEnergyConsumption", totalElectricalEnergy);
        request.input("renewableEnergyConsumption", totalRenewableEnergy);
        request.input("organisationId", organisationId);
        request.input("userId", userId);

        const result = await request.query(`
            INSERT INTO tbl_kpi_renewable_energy (
                financial_year,
                month,
                electrical_energy_consumption,
                renewable_energy_consumption,
                organisation_id,
                created_by,
                created_date
            )
            VALUES (
                @financialYear,
                @month,
                @electricalEnergyConsumption,
                @renewableEnergyConsumption,
                @organisationId,
                @userId,
                GETDATE()
            )
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(201).send("Renewable energy data submitted successfully.");
        } else {
            return res.status(400).send("Failed to insert renewable energy data.");
        }
    } catch (error) {
        console.error("Error inserting renewable energy data:", error);
        return res.sendStatus(500);
    }
}


async function updateKpiRenewableEnergyData(req, res) {
    const {
        financialYear,
        month,
        organisationId,
        totalElectricalEnergy,
        totalRenewableEnergy,
        userId
    } = req.body;

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("organisationId", organisationId);
        request.input("electricalEnergyConsumption", totalElectricalEnergy);
        request.input("renewableEnergyConsumption", totalRenewableEnergy);
        request.input("userId", userId);

        const result = await request.query(`
            UPDATE tbl_kpi_renewable_energy
            SET 
                electrical_energy_consumption = @electricalEnergyConsumption,
                renewable_energy_consumption = @renewableEnergyConsumption,
                updated_by = @userId,
                updated_date = GETDATE()
            WHERE 
                financial_year = @financialYear 
                AND month = @month 
                AND organisation_id = @organisationId
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: "Renewable Energy data updated successfully." });
        } else {
            return res.status(404).json({ message: "No matching data found to update." });
        }
    } catch (error) {
        console.error("Error updating Renewable Energy data:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


async function getKpiRenewableEnergyList(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const query = `
          SELECT 
            k.id,
            k.financial_year,
            k.month,
            k.organisation_id,
            o.organisation_name,
            k.electrical_energy_consumption,
            k.renewable_energy_consumption,
            k.created_by,
            k.updated_by,
            COALESCE(k.updated_date, k.created_date) AS updated_date
        FROM [sagarmanthan_revamp].[dbo].[tbl_kpi_renewable_energy] k
        LEFT JOIN [sagarmanthan_revamp].[dbo].[mmt_organisation] o
            ON k.organisation_id = o.organisation_id
        ORDER BY k.financial_year DESC, k.month DESC
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching KPI renewable energy list:", error);
        res.sendStatus(500);
    }
}


async function submitKpiRenewableEnergyTargetData(req, res) {
    const {
        fiscalYear,
        organisationId,
        renewableEnergyTarget,
        userId
    } = req.body;

    if (!fiscalYear || !organisationId || renewableEnergyTarget == null) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    const conn = await pool;

    try {
        const request = conn.request();

        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", organisationId);
        request.input("targetRenewableEnergyConsumption", renewableEnergyTarget);
        request.input("userId", userId);

        const result = await request.query(`
            INSERT INTO tbl_kpi_renewable_energy_target (
                financial_year,
                organisation_id,
                target_renewable_energy_consumption,
                created_by,
                created_date
            )
            VALUES (
                @fiscalYear,
                @organisationId,
                @targetRenewableEnergyConsumption,
                @userId,
                GETDATE()
            )
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(201).json({ message: "Renewable energy target data submitted successfully." });
        } else {
            return res.status(400).json({ message: "Failed to insert renewable energy target data." });
        }
    } catch (error) {
        console.error("Error inserting renewable energy target data:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


async function getKpiRenewableEnergyTargetData(req, res) {
    const { fiscalYear, organisationId } = req.query;

    if (!fiscalYear || !organisationId) {
        return res.status(400).json({ message: "Missing fiscalYear or organisationId in request." });
    }

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", parseInt(organisationId));

        const result = await request.query(`
            SELECT *
            FROM tbl_kpi_renewable_energy_target
            WHERE financial_year = @fiscalYear AND organisation_id = @organisationId
        `);

        if (result.recordset.length > 0) {
            return res.status(200).json(result.recordset[0]);
        } else {
            return res.sendStatus(204);
        }
    } catch (error) {
        console.error("Error fetching Renewable Energy Target data:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
async function getRenewableenergyTargetData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.request().query(`
            SELECT 
                tfpt.organisation_id,
                tfpt.financial_year,
                mo.organisation_name,
                tfpt.target_renewable_energy_consumption,
                tfpt.updated_date
            FROM tbl_kpi_renewable_energy_target AS tfpt
            LEFT JOIN mmt_organisation mo ON tfpt.organisation_id = mo.organisation_id
            ORDER BY tfpt.financial_year DESC
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching renewable energy target data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getRenewbleTargetData(req, res) {
    const { fiscalYear, organisationId } = req.query;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", organisationId);

        const query = `
            SELECT financial_year, organisation_id, target_renewable_energy_consumption
            FROM tbl_kpi_renewable_energy_target
            WHERE financial_year = @fiscalYear AND organisation_id = @organisationId;
        `;

        const result = await request.query(query);
        res.json(result.recordset[0]);
    } catch (error) {
        console.error("Error fetching target data:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
}
async function updateRenewableEnergyTargetData(req, res) {
    const { fiscalYear, organisationId,renewableEnergyTarget,userId } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("fiscalYear", fiscalYear);
        request.input("organisationId", organisationId);
        request.input("renewableEnergyTarget", renewableEnergyTarget);
        request.input("userId", userId);

        const result = await request.query(`
            UPDATE tbl_kpi_renewable_energy_target
            SET target_renewable_energy_consumption = @renewableEnergyTarget,
                updated_by = @userId,
                updated_date = getDate()
            WHERE financial_year = @fiscalYear AND organisation_id = @organisationId;
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

export default {
    getKpiRenewableEnergyData, submitKpiRenewableEnergyData, updateKpiRenewableEnergyData, getKpiRenewableEnergyList, submitKpiRenewableEnergyTargetData,
    getKpiRenewableEnergyTargetData, getRenewableenergyTargetData, getRenewbleTargetData, updateRenewableEnergyTargetData
};
