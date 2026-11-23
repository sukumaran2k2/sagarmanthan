import sql from "mssql";
import { pool } from "../../db.js";

// E-Office Employee Info: the employee list (mmt_employee_info) that E-Office and Attendance
// sheets are matched against by Emp Id. List, edit and delete here; adding uses
// /eoffice-employee-data (empAttendance.addEmpDataAttendance), the same as the upload pages.

// Level of designation codes stored in mmt_employee_info.level (NULL = none of these)
export const EMPLOYEE_LEVELS = ["JS", "DSDIR", "US", "SO", "ASO", "YP", "CONSULTANT"];

const text = (v) => (v === undefined || v === null ? "" : String(v).trim());
const levelOf = (v) => {
    const code = text(v).toUpperCase();
    return code === "" ? null : (EMPLOYEE_LEVELS.includes(code) ? code : undefined);
};

// Uploaded rows that point at an employee; while any exist the employee can't be deleted,
// or those rows would lose their name, designation and wing in the lists and reports
const USED_IN = [
    ["File Pendency", "tbl_file_pendancy", "Emp_Id"],
    ["Receipt Pendency", "tbl_receipt_pendency", "Emp_Id"],
    ["File Disposal", "tbl_file_disposal", "[Emp Id]"],
    ["Attendance", "tbl_employee_attendance", "Emp_Id"],
];

async function getEmployees(req, res) {
    try {
        const result = await (await pool).request().query(`
            SELECT e.ID AS id, LTRIM(RTRIM(e.Emp_Id)) AS empId, e.Emp_Name AS empName,
                   e.Designation AS designation, e.level,
                   o.wing_id AS wingId, LTRIM(RTRIM(o.wing_name)) AS wingName,
                   o.division_id AS divisionId, LTRIM(RTRIM(o.division_name)) AS divisionName
            FROM mmt_employee_info e
            LEFT JOIN mmt_organization_info o ON o.organization_id = e.organization_id
            ORDER BY e.Emp_Name, e.Emp_Id`);
        return res.json(result.recordset);
    } catch (err) {
        console.error("E-Office employee list failed:", err.message);
        return res.status(500).json({ error: "The employee list could not be loaded." });
    }
}

// Edit: name, designation, level and wing / division; the Emp Id identifies the employee in
// the uploaded sheets, so it stays as it is
async function updateEmployee(req, res) {
    const id = Number(req.params.id);
    const empName = text(req.body.empName);
    const designation = text(req.body.designation);
    const wingId = Number(req.body.wing);
    const divisionId = Number(req.body.division);
    const level = levelOf(req.body.level);

    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Not a valid employee." });
    const missing = [!empName && "Emp Name", !designation && "Designation",
        !Number.isInteger(wingId) && "Wing", !Number.isInteger(divisionId) && "Division"].filter(Boolean);
    if (missing.length) return res.status(400).json({ error: `Fill in: ${missing.join(", ")}` });
    if (level === undefined) return res.status(400).json({ error: "Not a valid level of designation." });
    if (empName.length > 255 || designation.length > 255) return res.status(400).json({ error: "Name and designation can be up to 255 characters." });

    try {
        const request = (await pool).request();
        request.input("id", sql.Int, id);
        request.input("empName", sql.NVarChar(255), empName);
        request.input("designation", sql.NVarChar(255), designation);
        request.input("level", sql.NVarChar(255), level);
        request.input("wing", sql.Int, wingId);
        request.input("division", sql.Int, divisionId);
        const result = await request.query(`
            DECLARE @org INT = (SELECT TOP 1 organization_id FROM mmt_organization_info
                                WHERE wing_id = @wing AND division_id = @division);
            IF @org IS NULL
            BEGIN
                SELECT CAST(0 AS BIT) AS unitOk, 0 AS updated;
                RETURN;
            END
            UPDATE mmt_employee_info
            SET Emp_Name = @empName, Designation = @designation, level = @level, organization_id = @org
            WHERE ID = @id;
            SELECT CAST(1 AS BIT) AS unitOk, @@ROWCOUNT AS updated;`);
        const { unitOk, updated } = result.recordset[0];
        if (!unitOk) return res.status(400).json({ error: "That division does not belong to the chosen wing." });
        if (!updated) return res.status(404).json({ error: "This employee no longer exists. Refresh the list and try again." });
        return res.json({ message: "Employee updated" });
    } catch (err) {
        console.error("E-Office employee update failed:", err.message);
        return res.status(500).json({ error: "The employee could not be updated." });
    }
}

async function deleteEmployee(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Not a valid employee." });
    try {
        const request = (await pool).request();
        request.input("id", sql.Int, id);
        // Look up the uses and delete in one transaction
        const usedSql = USED_IN.map(([label, table, col]) =>
            `SELECT '${label}' AS sheet, COUNT(*) AS n FROM ${table} WHERE LTRIM(RTRIM(CONVERT(NVARCHAR(255), ${col}))) = @empId`).join(" UNION ALL ");
        const result = await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            DECLARE @empId NVARCHAR(255) = (SELECT LTRIM(RTRIM(Emp_Id)) FROM mmt_employee_info WITH (UPDLOCK, HOLDLOCK) WHERE ID = @id);
            DECLARE @used TABLE (sheet NVARCHAR(50), n INT);
            IF @empId IS NOT NULL
                INSERT INTO @used ${usedSql};
            DECLARE @deleted INT = 0;
            IF @empId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM @used WHERE n > 0)
            BEGIN
                DELETE FROM mmt_employee_info WHERE ID = @id;
                SET @deleted = @@ROWCOUNT;
            END
            COMMIT TRANSACTION;
            SELECT CASE WHEN @empId IS NULL THEN 0 ELSE 1 END AS found, @deleted AS deleted;
            SELECT sheet, n FROM @used WHERE n > 0;`);
        const { found, deleted } = result.recordsets[0][0];
        if (!found) return res.status(404).json({ error: "This employee no longer exists. Refresh the list and try again." });
        if (!deleted) {
            const uses = result.recordsets[1].map((u) => `${u.sheet} (${u.n} row${u.n === 1 ? "" : "s"})`).join(", ");
            return res.status(409).json({ error: `This employee appears in uploaded sheets: ${uses}. Delete those uploads first, or edit the employee instead.` });
        }
        return res.json({ message: "Employee deleted" });
    } catch (err) {
        console.error("E-Office employee delete failed:", err.message);
        return res.status(500).json({ error: "The employee could not be deleted." });
    }
}

const eOfficeEmployeesTab = { getEmployees, updateEmployee, deleteEmployee };
export default eOfficeEmployeesTab;
