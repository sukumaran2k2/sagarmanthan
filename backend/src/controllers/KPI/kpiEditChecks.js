import { pool } from "../../db.js";

// Checks shared by the DGLL / CSL / IMU / SCI edit functions (QC KPI-05 / KPI-09).
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
