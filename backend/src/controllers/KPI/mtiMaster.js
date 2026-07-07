import { pool } from "../../db.js";

async function submitMTIMasterData(req, res) {
    const {
        mtiName, mtiNumber, stateId, status, approvalDate, jurisdictionalMmd, suspendedDate,
        permanentWithdrawalDate, closedDate, approvedInPrincipleDate, userId
    } = req.body;

    if (approvalDate == "") {
        approvalDate = null;
    }
    if (suspendedDate == "") {
        suspendedDate = null;
    }

    if (permanentWithdrawalDate == "") {
        permanentWithdrawalDate = null;
    }

    if (closedDate == "") {
        closedDate = null;
    }

    if (approvedInPrincipleDate == "") {
        approvedInPrincipleDate = null;
    }

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("mtiName", mtiName);
        request.input("mtiNumber", mtiNumber);
        request.input("stateId", stateId);
        request.input("status", status);
        request.input("approvalDate", approvalDate);
        request.input("jurisdictionalMmd", jurisdictionalMmd);
        request.input("suspendedDate", suspendedDate);
        request.input("permanentWithdrawalDate", permanentWithdrawalDate);
        request.input("closedDate", closedDate);
        request.input("approvedInPrincipleDate", approvedInPrincipleDate);
        request.input("userId", userId);

        const result = await request.query(`
            INSERT INTO mmt_mti 
            (mti_name, mti_number, state_id, status, approval_date, jurisdictional_mmd, suspended_date, permanent_withdrawal_date, closed_date, approved_in_principle_date, created_by, created_date) 
            VALUES 
            (@mtiName, @mtiNumber, @stateId, @status, @approvalDate, @jurisdictionalMmd, @suspendedDate, @permanentWithdrawalDate, @closedDate, @approvedInPrincipleDate, @userId, getDate())
        `);

        if (result.rowsAffected[0] > 0) {
            return res.status(201).send("MTI Master data added successfully.");
        } else {
            return res.status(400).send("Error adding MTI Master data.");
        }
    } catch (error) {
        console.error("Error submitting MTI Master data:", error);
        return res.sendStatus(500);
    }
}

async function getMTIMasterData(req, res) {
    const conn = await pool;

    try {
        const request = conn.request();

        const query = `
            SELECT 
                mti.mti_id,
                mti.mti_name,
                mti.mti_number,
                st.state_name,
                mti.status,
                mti.approval_date,
                mti.jurisdictional_mmd,
                mti.suspended_date,
                mti.permanent_withdrawal_date,
                mti.closed_date,
                mti.approved_in_principle_date
            FROM 
                mmt_mti mti
            INNER JOIN 
                mmt_state st ON mti.state_id = st.state_id
        `;

        const result = await request.query(query);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error fetching MTI Master data:", error);
        res.sendStatus(500);
    }
}

async function getMTIMasterDataById(req, res) {
    const { mtiId } = req.params;
    const conn = await pool;

    try {
        const request = conn.request();
        request.input("mtiId", mtiId);

        const result = await request.query(`
            SELECT * FROM mmt_mti WHERE mti_id = @mtiId
        `);

        if (result.recordset.length > 0) {
            return res.status(200).json(result.recordset[0]);
        } else {
            return res.status(404).json({ message: 'No data found for this ID.' });
        }
    } catch (error) {
        console.error("Error fetching MTI Master data:", error);
        return res.status(500).json({ message: 'Error fetching MTI Master data.' });
    }
}

async function updateMTIMasterData(req, res) {
    const {
        mtiName, mtiNumber, stateId, status, approvalDate, jurisdictionalMmd, suspendedDate,
        permanentWithdrawalDate, closedDate, approvedInPrincipleDate, userId, mtiId
    } = req.body;

    if (approvalDate == "") {
        approvalDate = null;
    }
    if (suspendedDate == "") {
        suspendedDate = null;
    }

    if (permanentWithdrawalDate == "") {
        permanentWithdrawalDate = null;
    }

    if (closedDate == "") {
        closedDate = null;
    }

    if (approvedInPrincipleDate == "") {
        approvedInPrincipleDate = null;
    }

    const conn = await pool;

    try {
        const request = conn.request();
        request.input("mtiName", mtiName);
        request.input("mtiNumber", mtiNumber);
        request.input("stateId", stateId);
        request.input("status", status);
        request.input("approvalDate", approvalDate);
        request.input("jurisdictionalMmd", jurisdictionalMmd);
        request.input("userId", userId);
        request.input("mtiId", mtiId);

        let query = `UPDATE mmt_mti
                     SET mti_name = @mtiName, mti_number = @mtiNumber, state_id = @stateId, status = @status, approval_date = @approvalDate, jurisdictional_mmd = @jurisdictionalMmd, updated_by = @userId, updated_date = GETDATE()`;

        if (suspendedDate) {
            request.input("suspendedDate", suspendedDate);
            query += `, suspended_date = @suspendedDate`;
        } else if (permanentWithdrawalDate) {
            request.input("permanentWithdrawalDate", permanentWithdrawalDate);
            query += `, permanent_withdrawal_date = @permanentWithdrawalDate`;
        } else if (closedDate) {
            request.input("closedDate", closedDate);
            query += `, closed_date = @closedDate`;
        } else if (approvedInPrincipleDate) {
            request.input("approvedInPrincipleDate", approvedInPrincipleDate);
            query += `, approved_in_principle_date = @approvedInPrincipleDate`;
        }

        query += ` WHERE mti_id = @mtiId`;

        const result = await request.query(query);
        if (result.rowsAffected[0] > 0) {
            if (status === "Suspended" || status === "Active") {
                const courseRequest = conn.request();
                courseRequest.input("mtiId", mtiId);
                courseRequest.input("status", status);
                await courseRequest.query(`
                    UPDATE mmt_mti_course
                    SET status = @status, status_updated_date = GETDATE()
                    WHERE mti_id = @mtiId
                `);
            }
            return res.status(200).json({ message: "MTI Master data updated successfully." });
        } else {
            return res.status(404).json({ message: "No record found to update." });
        }
    } catch (error) {
        console.error("Error updating MTI Master data:", error);
        return res.status(500).json({ message: 'Error updating MTI Master data.' });
    }
}



const mtiMasterTab = { submitMTIMasterData, getMTIMasterData, getMTIMasterDataById, updateMTIMasterData };
export default mtiMasterTab;
