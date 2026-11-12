import fs from "fs";
import { pool } from "../../db.js";

// Checks shared by the DGLL / CSL / IMU / SCI edit and delete functions (QC KPI-05 / 08 / 09).
// Table and column names come from the code, never from the request.

// Before an edit: 'missing' when the record no longer exists, 'taken' when another record already
// has the new period (e.g. the same financial year, or year + quarter), else null.
export async function checkEdit({ table, idColumn, id, period = {} }) {
    const request = (await pool).request();
    request.input("editId", id);
    const exists = await request.query(`SELECT 1 AS ok FROM ${table} WHERE ${idColumn} = @editId`);
    if (!exists.recordset.length) return "missing";
    const columns = Object.keys(period);
    if (!columns.length) return null;
    columns.forEach((column, i) => request.input(`period${i}`, period[column]));
    const clash = await request.query(`SELECT TOP 1 1 AS taken FROM ${table}
        WHERE ${idColumn} <> @editId AND ${columns.map((column, i) => `${column} = @period${i}`).join(" AND ")}`);
    return clash.recordset.length ? "taken" : null;
}

// The answer for a refused edit
export function refuseEdit(res, check) {
    return check === "missing"
        ? res.status(404).json({ message: "This entry no longer exists. Refresh the list and try again." })
        : res.status(409).json({ message: "An entry for this period already exists." });
}

// Deletes one KPI entry (QC KPI-08). A copy of the row goes to tbl_kpi_delete_log in the same
// transaction as the delete, with the signed-in user as the deleter. Until sql/kpi-modules has
// created that table, the copy is written to ./delete_log/<logFolder> as before, so no delete goes
// unrecorded. Answers 400 (bad id), 404 (no such entry), 201 (deleted) or 500.
export async function deleteKpiEntry(req, res, { table, idColumn, idParam, logFolder }) {
    const id = Number(req.params[idParam]);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Not a valid entry." });
    const userId = req.user.userId; // the signed-in user, not a request value (QC KPI-02)
    try {
        const request = (await pool).request();
        request.input("entryId", id);
        request.input("userId", userId);
        const result = await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            DECLARE @row NVARCHAR(MAX) = (SELECT * FROM ${table} WHERE ${idColumn} = @entryId
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);
            DECLARE @logged BIT = 0;
            IF @row IS NOT NULL AND OBJECT_ID('dbo.tbl_kpi_delete_log', 'U') IS NOT NULL
            BEGIN
                INSERT INTO dbo.tbl_kpi_delete_log (table_name, record_id, row_json, deleted_by)
                VALUES ('${table}', @entryId, @row, @userId);
                SET @logged = 1;
            END
            DELETE FROM ${table} WHERE ${idColumn} = @entryId;
            DECLARE @deleted INT = @@ROWCOUNT;
            COMMIT TRANSACTION;
            SELECT @deleted AS deleted, @logged AS logged, @row AS row_json;`);
        const { deleted, logged, row_json: rowJson } = result.recordset[0];
        if (!deleted) return res.status(404).json({ message: "This entry no longer exists." });
        if (!logged) {
            const stamp = new Date().toISOString().replace(/[-:]/g, "").replace("T", "_").slice(0, 15);
            const folder = `./delete_log/${logFolder}`;
            fs.mkdir(folder, { recursive: true }, (mkdirErr) => {
                if (mkdirErr) return console.error("KPI delete log folder error:", mkdirErr);
                fs.appendFile(`${folder}/deleted_${logFolder}_log_${stamp}.txt`,
                    `User '${userId}' deleted ${logFolder} data with Data ID '${id}'. Deleted Data: ${rowJson}\n`,
                    (err) => { if (err) console.error("KPI delete log error:", err); });
            });
        }
        return res.sendStatus(201);
    } catch (err) {
        console.error(`KPI delete error (${table}):`, err);
        return res.sendStatus(500);
    }
}
