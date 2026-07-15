import { pool } from "../../db.js";

// Main report endpoint: returns S No, Wing, Division, In Position
async function getYoungProfessionalReport(req, res) {
    const conn = await pool;
    try {
        const result = await conn.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY w.wing_name, d.division_name) AS [S No],
                w.wing_id AS [Wing ID],
                w.wing_name AS [Wing],
                d.division_id AS [Division ID],
                d.division_name AS [Division],
                SUM(CASE WHEN yp.is_active = 1 THEN 1 ELSE 0 END) AS [In Position]
            FROM
                mmt_division d
            INNER JOIN
                mmt_wings w ON d.wing_id = w.wing_id
            LEFT JOIN
                dbo.tbl_young_professionals yp ON yp.wing_id = w.wing_id AND yp.division_id = d.division_id
            GROUP BY
                w.wing_id, w.wing_name, d.division_id, d.division_name
            ORDER BY
                w.wing_name, d.division_name
        `);

        const rowData = result.recordset;

        const columnDefs = [
            { headerName: "S No", field: "S No", width: 80, cellStyle: { textAlign: 'center' } },
            { headerName: "Wing ID", field: "Wing ID", hide: true },
            { headerName: "Division ID", field: "Division ID", hide: true },
            { headerName: "Wing", field: "Wing", filter: true, sortable: true },
            { headerName: "Division", field: "Division", filter: true, sortable: true },
            { headerName: "In Position", field: "In Position", filter: true, sortable: true, cellStyle: { fontWeight: 'bold' } }
        ];

        res.json({ columnDefs, rowData });
    } catch (err) {
        console.error("Error fetching getYoungProfessionalReport:", err);
        return res.sendStatus(500);
    }
}

// Division wise report (for compatibility if needed)
async function ypDivisionWiseReport(req, res) {
    return getYoungProfessionalReport(req, res);
}

// Drill-down: Get list of active candidates in a specific wing and division
async function getYpDivisionWiseCandidate(req, res) {
    const divisionID = req.params.divisionID;
    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);

    try {
        const result = await request.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY yp.name) AS [S No],
                w.wing_name AS [Wing Name], 
                d.division_name AS [Division Name], 
                yp.name AS [Name], 
                yp.qualification AS [Qualification], 
                yp.role AS [Role],
                yp.salary AS [Salary (per month)], 
                yp.total_experience AS [Experience (Years)], 
                yp.skills AS [Skills],
                FORMAT(yp.appointment_date, 'dd-MM-yyyy') AS [Appointment Date],
                yp.appointment_document AS [Document],
                FORMAT(yp.created_date, 'dd-MM-yyyy HH:mm') AS [Created At],
                CAST(yp.created_by AS VARCHAR) AS [Created By],
                FORMAT(yp.last_updated_date, 'dd-MM-yyyy HH:mm') AS [Last Updated At]
            FROM dbo.tbl_young_professionals yp
            INNER JOIN mmt_wings w ON w.wing_id = yp.wing_id
            INNER JOIN mmt_division d ON d.division_id = yp.division_id
            WHERE yp.division_id = @divisionID AND yp.is_active = 1
            ORDER BY yp.name
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.json({ columnDefs: [], rowData: [] });
        }

        const columnDefs = [
            { headerName: "S No", field: "S No", width: 80, cellStyle: { textAlign: 'center' } },
            { headerName: "Wing Name", field: "Wing Name" },
            { headerName: "Division Name", field: "Division Name" },
            { headerName: "Name", field: "Name", fontStyle: "bold" },
            { headerName: "Qualification", field: "Qualification" },
            { headerName: "Role", field: "Role" },
            { headerName: "Salary (per month)", field: "Salary (per month)" },
            { headerName: "Experience (Years)", field: "Experience (Years)" },
            { headerName: "Skills", field: "Skills" },
            { headerName: "Appointment Date", field: "Appointment Date" },
            { headerName: "Document", field: "Document" }
        ];

        res.json({ columnDefs, rowData });
    } catch (err) {
        console.error("Error fetching getYpDivisionWiseCandidate:", err);
        return res.sendStatus(500);
    }
}

// Wing wise candidate list (if needed)
async function getYpWingWiseCandidate(req, res) {
    const wingID = req.params.wingID;
    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);

    try {
        const result = await request.query(`
            SELECT 
                ROW_NUMBER() OVER (ORDER BY yp.name) AS [S No],
                w.wing_name AS [Wing Name], 
                d.division_name AS [Division Name], 
                yp.name AS [Name], 
                yp.qualification AS [Qualification], 
                yp.role AS [Role],
                yp.salary AS [Salary (per month)], 
                yp.total_experience AS [Experience (Years)], 
                yp.skills AS [Skills],
                FORMAT(yp.appointment_date, 'dd-MM-yyyy') AS [Appointment Date],
                yp.appointment_document AS [Document],
                FORMAT(yp.created_date, 'dd-MM-yyyy HH:mm') AS [Created At],
                CAST(yp.created_by AS VARCHAR) AS [Created By],
                FORMAT(yp.last_updated_date, 'dd-MM-yyyy HH:mm') AS [Last Updated At]
            FROM dbo.tbl_young_professionals yp
            INNER JOIN mmt_wings w ON w.wing_id = yp.wing_id
            INNER JOIN mmt_division d ON d.division_id = yp.division_id
            WHERE yp.wing_id = @wingID AND yp.is_active = 1
            ORDER BY yp.name
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.json({ columnDefs: [], rowData: [] });
        }

        const columnDefs = [
            { headerName: "S No", field: "S No", width: 80, cellStyle: { textAlign: 'center' } },
            { headerName: "Wing Name", field: "Wing Name" },
            { headerName: "Division Name", field: "Division Name" },
            { headerName: "Name", field: "Name" },
            { headerName: "Qualification", field: "Qualification" },
            { headerName: "Role", field: "Role" },
            { headerName: "Salary (per month)", field: "Salary (per month)" },
            { headerName: "Experience (Years)", field: "Experience (Years)" },
            { headerName: "Skills", field: "Skills" },
            { headerName: "Appointment Date", field: "Appointment Date" },
            { headerName: "Document", field: "Document" }
        ];

        res.json({ columnDefs, rowData });
    } catch (err) {
        console.error("Error fetching getYpWingWiseCandidate:", err);
        return res.sendStatus(500);
    }
}

// Vacancy Age Report (returns vacant positions, for compatibility/modals)
async function getYpWingWiseReport(req, res) {
    res.json([]);
}

export default { 
    getYoungProfessionalReport, 
    ypDivisionWiseReport, 
    getYpWingWiseReport, 
    getYpWingWiseCandidate, 
    getYpDivisionWiseCandidate 
};