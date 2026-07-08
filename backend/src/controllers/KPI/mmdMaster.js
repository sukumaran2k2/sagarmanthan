import { pool } from "../../db.js";

async function getMmdData(req, res) {
    const { mmdId } = req.query;
    const conn = await pool;
    try {
        const request = conn.request();
        request.input("mmdId", mmdId);

        const result = await request.query(`
            SELECT * 
            FROM mmt_mmd_name 
            WHERE mmd_id = @mmdId
        `);

        return res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching MMD data:", error);
        return res.sendStatus(500);
    }
}

async function submitMmdData(req, res) {
    const { mmdName } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("mmdName", mmdName);

        const result = await request.query(`
            INSERT INTO mmt_mmd_name 
            (mmd_name) 
            VALUES (@mmdName)
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(201).send("MMD data added successfully.");
        } else {
            return res.status(400).send("Error adding MMD data.");
        }
    } catch (error) {
        console.error("Error submitting MMD data:", error);
        return res.sendStatus(500);
    }
}

async function getMmdList(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const query = `
            SELECT 
                mmd_id,
                mmd_name,
                status
            FROM 
                mmt_mmd_name
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching MMD list:", error);
        res.sendStatus(500);
    }
}

async function updateMmdData(req, res) {
    const { mmdId, mmdName } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("mmdId", mmdId);
        request.input("mmdName", mmdName);

        const result = await request.query(`
            UPDATE mmt_mmd_name
            SET mmd_name = @mmdName
            WHERE mmd_id = @mmdId
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: 'MMD data updated successfully.' });
        } else {
            return res.status(404).json({ message: 'No record found to update.' });
        }
    } catch (error) {
        console.error("Error updating MMD data:", error);
        return res.status(500).json({ message: 'Error updating MMD data.' });
    }
}

async function updateMmdStatus(req, res) {
    const { mmdId, status } = req.body;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("mmdId", mmdId);
        request.input("status", status);

        const result = await request.query(`
            UPDATE mmt_mmd_name
            SET status = @status
            WHERE mmd_id = @mmdId
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: 'MMD status updated successfully.' });
        } else {
            return res.status(404).json({ message: 'No record found to update.' });
        }
    } catch (error) {
        console.error("Error updating MMD status:", error);
        return res.status(500).json({ message: 'Error updating MMD status.' });
    }
}

const MMDTab = { getMmdData, submitMmdData, getMmdList, updateMmdData, updateMmdStatus };
export default MMDTab;
