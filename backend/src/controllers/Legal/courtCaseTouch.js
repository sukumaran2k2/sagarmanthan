import { pool } from "../../db.js";

// Parent case table for each case-ID prefix (same prefixes as deleteCourtCaseData).
const CASE_TABLE_BY_PREFIX = {
    LI: "tbl_litigation_cases",
    AR: "tbl_arbitration_cases",
    CO: "tbl_conciliation_cases",
};

// Bump the parent case's updated_date after a child record (hearing, order, counsel, parties...)
// is saved, so the case shows as recently updated. Never fails the caller's save.
export async function touchCourtCase(caseID) {
    const table = CASE_TABLE_BY_PREFIX[String(caseID || "").slice(0, 2)];
    if (!table) return;
    try {
        const conn = await pool;
        await conn.request()
            .input("caseID", caseID)
            .query(`UPDATE ${table} SET updated_date = GETDATE() WHERE case_id = @caseID`);
    } catch (err) {
        console.log("touchCourtCase error", err);
    }
}
