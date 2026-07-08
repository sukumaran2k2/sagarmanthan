import { pool } from "../../db.js";

async function addCargoTerminalData(req, res) {
    const { financialYear, month, cargoData } = req.body;

    const conn = await pool;

    for (const cargo of cargoData) {
        const { Cargos, terminal, totalVolume, percentHandled } = cargo;

        const request = conn.request();

        request.input("financialYear", financialYear);
        request.input("month", month);
        request.input("Cargos", Cargos);
        request.input("terminal", terminal);
        request.input("totalVolume", totalVolume);
        request.input("percentHandled", percentHandled);
    try {
            const checkResult = await request.query(`
            SELECT COUNT(*) AS count
            FROM tbl_iwai_nw_cargo_handle
            WHERE financialYear = @financialYear
            AND month = @month
            AND cargo = @Cargos
            AND terminal = @terminal
        `);

        if (checkResult.recordset[0].count > 0) {
            return res.status(400).json({ error: "Record already exists for the specified financialYear and month." });
        }
        await request.query(`
            INSERT INTO tbl_iwai_nw_cargo_handle (
                financialYear, month, cargo, terminal, total_volume, percent_handled
            )
            VALUES (
                @financialYear, @month, @Cargos, @terminal, @totalVolume, @percentHandled
            )
        `);
        return res.sendStatus(201);
        } catch (error) {
            console.error('Error adding cargo terminal data:', error);
            res.sendStatus(500);
        }
    }
}

async function getCargoTerminalData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
        SELECT
        financialYear,
        terminal,
        cargo,
        CASE
            WHEN month IN ('January', 'February', 'March') THEN 'Quarter 1'
            WHEN month IN ('April', 'May', 'June') THEN 'Quarter 2'
            WHEN month IN ('July', 'August', 'September') THEN 'Quarter 3'
            WHEN month IN ('October', 'November', 'December') THEN 'Quarter 4'
        END AS quarter,
        SUM(total_volume) AS total_volume,
        SUM(percent_handled) AS percent_handled
        FROM tbl_iwai_nw_cargo_handle
        GROUP BY financialYear, terminal, cargo,
            CASE
                WHEN month IN ('January', 'February', 'March') THEN 'Quarter 1'
                WHEN month IN ('April', 'May', 'June') THEN 'Quarter 2'
                WHEN month IN ('July', 'August', 'September') THEN 'Quarter 3'
                WHEN month IN ('October', 'November', 'December') THEN 'Quarter 4'
            END
        ORDER BY financialYear DESC, quarter DESC, terminal, cargo;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


// Function to get monthly cargo handling data
async function getMonthlyCargoTerminalData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                financialYear,
                month,
                terminal,
                cargo,
                SUM(total_volume) AS total_volume,
                SUM(percent_handled) AS percent_handled
            FROM tbl_iwai_nw_cargo_handle
            GROUP BY financialYear, month, terminal, cargo
            ORDER BY financialYear DESC, month DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Function to get quarterly cargo handling data
async function getQuarterlyCargoTerminalData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
            financialYear,
            terminal,
            cargo,
            CASE
                WHEN month IN ('January', 'February', 'March') THEN 'Quarter 1'
                WHEN month IN ('April', 'May', 'June') THEN 'Quarter 2'
                WHEN month IN ('July', 'August', 'September') THEN 'Quarter 3'
                WHEN month IN ('October', 'November', 'December') THEN 'Quarter 4'
            END AS quarter,
            SUM(total_volume) AS total_volume,
            SUM(percent_handled) AS percent_handled
            FROM tbl_iwai_nw_cargo_handle
            GROUP BY financialYear, terminal, cargo,
                CASE
                    WHEN month IN ('January', 'February', 'March') THEN 'Quarter 1'
                    WHEN month IN ('April', 'May', 'June') THEN 'Quarter 2'
                    WHEN month IN ('July', 'August', 'September') THEN 'Quarter 3'
                    WHEN month IN ('October', 'November', 'December') THEN 'Quarter 4'
                END
            ORDER BY financialYear DESC, quarter DESC, terminal, cargo;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}


// Function to get annually cargo handling data
async function getAnnuallyCargoTerminalData(req, res) {
    const conn = await pool;

    try {
        const result = await conn.query(`
            SELECT
                financialYear,
                terminal,
                cargo,
                SUM(total_volume) AS total_volume,
                SUM(percent_handled) AS percent_handled
            FROM tbl_iwai_nw_cargo_handle
            GROUP BY financialYear, terminal, cargo
            ORDER BY financialYear DESC;
        `);

        res.json(result.recordset);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}



const cargoTerminalController = {
    addCargoTerminalData,
    getCargoTerminalData,
    getMonthlyCargoTerminalData,
    getQuarterlyCargoTerminalData,
    getAnnuallyCargoTerminalData,
};

export default cargoTerminalController;
