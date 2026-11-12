
import { pool } from "../../db.js";

// Candidates are tied to an appointment two ways: tbl_ca_candidate.consultant_appointment_id
// (written whenever a candidate is attached) and the legacy comma-separated candidate_id list
// on the appointment. Records created before the foreign key was populated only have the list,
// so the candidate reports match on either. Joining the list column to the integer candidate_id
// directly fails outright — SQL Server converts the whole '12,13' string to int.
const CANDIDATE_LINK_SQL = `
    (
        tbl_consultant_appointment.consultant_appointment_id = tbl_ca_candidate.consultant_appointment_id
        OR ',' + REPLACE(ISNULL(tbl_consultant_appointment.candidate_id, ''), ' ', '') + ','
             LIKE '%,' + CAST(tbl_ca_candidate.candidate_id AS VARCHAR(20)) + ',%'
    )
`;

// Builds ag-grid column definitions from the shape of the first row.
function columnDefsFromRows(rowData) {
    if (!rowData.length) return [];
    return Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1),
        field: key,
    }));
}

async function getconsulAppReport (req, res)
{
    const conn = await pool;
    try
    {
        // One row per wing. stage_id must stay out of the GROUP BY: including it splits each
        // wing into one row per stage, so the counts came back spread over duplicate rows.
        const result = await conn.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_wings.wing_id) AS [S No],
            mmt_wings.wing_id As [Wing ID],
            mmt_wings.wing_name As [Wing Name],
            COUNT(tbl_consultant_appointment.consultant_appointment_id) AS [No of Consultant Officer],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 1 THEN 1 ELSE 0 END) AS [Admin Approval for engaging Consultant],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 2 THEN 1 ELSE 0 END) AS [Tender Published],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 3 THEN 1 ELSE 0 END) AS [Pre Bid Queries Responded],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 4 THEN 1 ELSE 0 END) AS [Bid Received],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 5 THEN 1 ELSE 0 END) AS [Technical Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 6 THEN 1 ELSE 0 END) AS [Financial Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 7 THEN 1 ELSE 0 END) AS [Work Order Issued],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 8 THEN 1 ELSE 0 END) AS [Contract Signed]

        FROM
            mmt_wings
        LEFT JOIN
            tbl_consultant_appointment ON mmt_wings.wing_id = tbl_consultant_appointment.wing
        GROUP BY
            mmt_wings.wing_id, mmt_wings.wing_name
        ORDER BY
            mmt_wings.wing_id
        ;`);

        const rowData = result.recordset;

        let columnDefs = [
            {
                headerName: "S No",
                field: "S No",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Wing ID",
                field: "Wing ID",

            },
            {
                headerName: "Wing Name",
                field: "Wing Name",
            },
            {
                headerName: "No of Consultant Officer",
                field: "No of Consultant Officer",
            },
            {
                headerName: "Consultant Appointments at different stages",
                headerClass: 'parent-header',
                children: [
                    {
                        headerName: "Admin Approval for engaging Consultant",
                        field: "Admin Approval for engaging Consultant",
                        width : 280
                    },
                    {
                        headerName: "Tender Published",
                        field: "Tender Published",
                    },
                    {
                        headerName: "Pre Bid Queries Responded",
                        field: "Pre Bid Queries Responded",
                    },
                    {
                        headerName: "Bid Received",
                        field: "Bid Received",
                    },
                    {
                        headerName: "Technical Bid Finalized",
                        field: "Technical Bid Finalized",
                    },
                    {
                        headerName: "Financial Bid Finalized",
                        field: "Financial Bid Finalized",
                    },
                    {
                        headerName: "Work Order Issued",
                        field: "Work Order Issued",
                    },
                    {
                        headerName: "Contract Signed",
                        field: "Contract Signed",
                    },
                ]
            }
        ];

        // An empty result is a report with no rows, not a failure — answering 404 made the
        // page render its error state instead of an empty table.
        res.json({ columnDefs, rowData });
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function caDivisionWiseReport (req, res)
{
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    try
    {
        const result = await request.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_division.division_id) AS [S No],
            mmt_wings.wing_name AS [Wing Name],
            mmt_division.division_id AS [Division ID],
            mmt_division.division_name AS [Division Name],

            COUNT(tbl_consultant_appointment.consultant_appointment_id) AS [No of Consultant Officer],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 1 THEN 1 ELSE 0 END) AS [Admin Approval for engaging Consultant],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 2 THEN 1 ELSE 0 END) AS [Tender Published],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 3 THEN 1 ELSE 0 END) AS [Pre Bid Queries Responded],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 4 THEN 1 ELSE 0 END) AS [Bid Received],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 5 THEN 1 ELSE 0 END) AS [Technical Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 6 THEN 1 ELSE 0 END) AS [Financial Bid Finalized],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 7 THEN 1 ELSE 0 END) AS [Work Order Issued],
            SUM(CASE WHEN tbl_consultant_appointment.stage_id = 8 THEN 1 ELSE 0 END) AS [Contract Signed]
        FROM
            mmt_division
        LEFT JOIN
            tbl_consultant_appointment ON mmt_division.division_id = tbl_consultant_appointment.division
        LEFT JOIN
            mmt_wings ON mmt_wings.wing_id = mmt_division.wing_id
        WHERE
            mmt_division.wing_id = @wingID
        GROUP BY
            mmt_wings.wing_name, mmt_division.division_name, mmt_division.division_id
        ORDER BY
            mmt_division.division_id
        ;`);

        const rowData = result.recordset;

        res.json({ columnDefs: columnDefsFromRows(rowData), rowData });
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCaWingWiseCandidateReport (req, res)
{
    const wingID = req.params.wingID;

    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);

    try
    {
        const result = await request.query(`

        SELECT
            ROW_NUMBER() OVER (ORDER BY tbl_ca_candidate.name) AS [S No],
            mmt_wings.wing_name As [Wing Name],
            mmt_division.division_name As [Division Name],
            tbl_ca_candidate.name AS [Name],
            tbl_ca_candidate.qualification AS [Qualification],
            tbl_ca_candidate.work_experience AS [Work Experience],
            tbl_ca_candidate.salary AS [Salary],
            tbl_ca_candidate.category AS [Category],
            tbl_ca_candidate.skill_set AS [Skill Set],
            CONVERT(VARCHAR(10), tbl_ca_candidate.date_of_appointment, 103) AS [Appointment Date],
            CONVERT(VARCHAR(10), tbl_consultant_appointment.updated_date, 103) AS [Last Updated Date]

            FROM tbl_ca_candidate

            INNER JOIN tbl_consultant_appointment ON ${CANDIDATE_LINK_SQL}
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_consultant_appointment.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_consultant_appointment.division
            WHERE tbl_consultant_appointment.wing = @wingID
            ORDER BY tbl_ca_candidate.name, tbl_ca_candidate.work_experience, tbl_ca_candidate.date_of_appointment
        ;`);

        const rowData = result.recordset;

        res.json({ columnDefs: columnDefsFromRows(rowData), rowData });
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

async function getCaDivisionWiseCandidateReport (req, res)
{
    const divisionID = req.params.divisionID;

    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);

    try
    {
        const result = await request.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY tbl_ca_candidate.name) AS [S No],
            mmt_wings.wing_name As [Wing Name],
            mmt_division.division_name As [Division Name],
            tbl_ca_candidate.name AS [Name],
            tbl_ca_candidate.qualification AS [Qualification],
            tbl_ca_candidate.work_experience AS [Work Experience],
            tbl_ca_candidate.salary AS [Salary],
            tbl_ca_candidate.category AS [Category],
            tbl_ca_candidate.skill_set AS [Skill Set],
            CONVERT(VARCHAR(10), tbl_ca_candidate.date_of_appointment, 103) AS [Appointment Date],
            CONVERT(VARCHAR(10), tbl_consultant_appointment.updated_date, 103) AS [Last Updated Date]

            FROM tbl_ca_candidate

            INNER JOIN tbl_consultant_appointment ON ${CANDIDATE_LINK_SQL}
            INNER JOIN mmt_wings on mmt_wings.wing_id = tbl_consultant_appointment.wing
            INNER JOIN mmt_division on mmt_division.division_id = tbl_consultant_appointment.division
            WHERE tbl_consultant_appointment.division = @divisionID
            ORDER BY tbl_ca_candidate.name, tbl_ca_candidate.work_experience, tbl_ca_candidate.date_of_appointment
        ;`);

        const rowData = result.recordset;

        res.json({ columnDefs: columnDefsFromRows(rowData), rowData });
    }
    catch(err)
    {
        console.log(err);
        return res.sendStatus(500);
    }
};

export default { getconsulAppReport, caDivisionWiseReport, getCaWingWiseCandidateReport, getCaDivisionWiseCandidateReport };
