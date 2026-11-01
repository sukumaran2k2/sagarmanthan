
import { pool } from "../../db.js";
import { WING_FIELDS } from "../Governance/cabinetNotesMinistryFields.js";

// Days a note has been pending since it was received (0 = received today)
const PENDING_DAYS = `DATEDIFF(day, n.received_ministry_date, CAST(GETDATE() AS date))`;

// Pendency buckets; the drill-down sends a day count that falls inside one of them
const PENDENCY_BUCKETS = [
    { min: 0, max: 30 },
    { min: 31, max: 60 },
    { min: 61, max: null },
];

function columnDefsFor(rowData) {
    return Object.keys(rowData[0]).map(key => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1),
        field: key,
    }));
}

function serverError(res, report, err) {
    console.error(`[CabinetMinistryReports] ${report}:`, err);
    return res.status(500).json({ error: `Could not load the ${report}. Please try again.` });
}

async function cabinetMinistryReport (req, res)
{
    const conn = await pool;
    try
    {
        const result = await conn.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
            mmt_ministry.ministry_name AS [Name of the Ministry/Department Received from],
            mmt_ministry.ministry_id AS [Ministry Id],
            COUNT(tbl_cabinet_notes_ministry.cabinet_notes_ministry_id) AS [No of Cabinet Notes],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 0 THEN tbl_cabinet_notes_ministry.cabinet_notes_ministry_id END) AS [Status Not Recorded],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 1 THEN tbl_cabinet_notes_ministry.cabinet_notes_ministry_id END) AS [Received but yet to be sent for Comments],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 2 THEN tbl_cabinet_notes_ministry.cabinet_notes_ministry_id END) AS [Sent for Comments],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 3 THEN tbl_cabinet_notes_ministry.cabinet_notes_ministry_id END) AS [Comments Received],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 4 THEN tbl_cabinet_notes_ministry.cabinet_notes_ministry_id END) AS [File submitted for Approval],
            COUNT(CASE WHEN mmt_cabinet_ministry_stage.cab_ministry_stage_id = 5 THEN tbl_cabinet_notes_ministry.cabinet_notes_ministry_id END) AS [Reply furnished to other ministry]
        FROM
            mmt_ministry
        LEFT JOIN
            tbl_cabinet_notes_ministry ON mmt_ministry.ministry_id = tbl_cabinet_notes_ministry.ministry_id
        LEFT JOIN
            mmt_cabinet_ministry_stage ON mmt_cabinet_ministry_stage.cab_ministry_stage_id = tbl_cabinet_notes_ministry.stage_id
        GROUP BY
            mmt_ministry.ministry_id,
            mmt_ministry.ministry_name
        ORDER BY
            mmt_ministry.ministry_id;
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        let columnDefs = [
            {
                headerName: "S No",
                field: "S No",
                cellStyle: {textAlign: 'center'}
            },
            {
                headerName: "Name of the Ministry/Department Received from",
                field: "Name of the Ministry/Department Received from",

            },
            {
                headerName: "Ministry Id",
                field: "Ministry Id",
            },
            {
                headerName: "No of Cabinet Notes",
                field: "No of Cabinet Notes",
            },
            {
                headerName: "No of Cabinet Notes at different stages",
                children: [
                    {
                        headerName: "Status Not Recorded",
                        field: "Status Not Recorded"
                    },
                    {
                        headerName: "Received but yet to be sent for Comments",
                        field: "Received but yet to be sent for Comments",
                    },
                    {
                        headerName: "Sent for Comments",
                        field: "Sent for Comments",
                    },
                    {
                        headerName: "Comments Received",
                        field: "Comments Received",
                    },
                    {
                        headerName: "File submitted for Approval",
                        field: "File submitted for Approval",
                    },
                    {
                        headerName: "Reply furnished to other ministry",
                        field: "Reply furnished to other ministry",
                    },
                ]
            }
        ];
        res.json({ columnDefs, rowData });
    }
    catch(err)
    {
        return serverError(res, 'cabinet ministry report', err);
    }
};

async function getMinistryDetailsReport (req, res)
{
    const ministryId = Number(req.params.ministryId);
    const stage = req.params.cabinetMinistryStage;
    const stageId = stage === 'all' ? null : Number(stage);
    if (!Number.isInteger(ministryId) || (stage !== 'all' && !Number.isInteger(stageId))) {
        return res.status(400).json({ error: 'Invalid ministry or stage.' });
    }
    const todayServerDate = new Date().toISOString().split('T')[0];

    try
    {
        const conn = await pool;
        const request = conn.request();
        request.input("ministryId", ministryId);
        if (stageId !== null) request.input("stageId", stageId);

        const [notesResult, wingsResult] = await Promise.all([
            request.query(`
                SELECT
                    mmt_ministry.ministry_name AS [Ministry Name],
                    n.ministry_id AS [Ministry Id],
                    n.subject AS [Subject],
                    n.eoffice_file_number AS [Eoffice File Number],
                    CONVERT(VARCHAR(10), n.received_ministry_date, 103) AS [Received but yet to be sent for Comments],
                    CONVERT(VARCHAR(10), n.sent_for_comments_date, 103) AS [Sent for Comments],
                    CONVERT(VARCHAR(10), n.comments_rec_date, 103) AS [Comments Received],
                    CONVERT(VARCHAR(10), n.file_submitted_date, 103) AS [File submitted for Approval],
                    CONVERT(VARCHAR(10), n.reply_furnished_date, 103) AS [Reply furnished to other ministry],
                    CONVERT(VARCHAR(10), n.updated_date, 103) AS [Last Updated Date],
                    n.sent_for_comments_wings,
                    ${WING_FIELDS.map(f => `n.${f.column}_date`).join(', ')}
                FROM tbl_cabinet_notes_ministry AS n
                INNER JOIN mmt_ministry ON mmt_ministry.ministry_id = n.ministry_id
                WHERE n.ministry_id = @ministryId
                    ${stageId !== null ? 'AND n.stage_id = @stageId' : ''}
                ORDER BY n.cabinet_notes_ministry_id
            `),
            conn.query(`SELECT wing_id, LTRIM(RTRIM(wing_name)) AS wing_name FROM mmt_wings`),
        ]);

        if (notesResult.recordset.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }

        const wingNames = new Map(wingsResult.recordset.map(w => [String(w.wing_id), w.wing_name]));
        const fieldsByName = new Map(WING_FIELDS.map(f => [f.label, f]));

        // Only the wings the note was sent to: replied = its wing date is filled in
        const rowData = notesResult.recordset.map((note, i) => {
            const { sent_for_comments_wings: sentWings, ...row } = note;
            const received = [];
            const pending = [];
            for (const item of String(sentWings || '').split(',').map(s => s.trim()).filter(Boolean)) {
                const name = wingNames.get(item) || item; // older rows stored wing names
                const field = fieldsByName.get(name);
                (field && note[`${field.column}_date`] ? received : pending).push(name);
            }
            for (const f of WING_FIELDS) delete row[`${f.column}_date`];
            return {
                'S No': i + 1,
                ...row,
                'Comments Received From': received.join(', '),
                'Comments Pending From': pending.join(', '),
            };
        });

        res.json({ todayServerDate, columnDefs: columnDefsFor(rowData), rowData });
    }
    catch(err)
    {
        return serverError(res, 'ministry details report', err);
    }
};

// --------------------------------------------- Pendency ------------------------------------------------
// Notes received but not yet replied to (stage 5), aged by days since received
async function cabinetMinistryPendencyReport (req, res)
{
    try
    {
        const conn = await pool;
        const result = await conn.query(`
        SELECT
            ROW_NUMBER() OVER (ORDER BY mmt_ministry.ministry_id) AS [S No],
            mmt_ministry.ministry_name AS [Name of the Ministry/Department Received from],
            mmt_ministry.ministry_id AS [Ministry Id],
            COUNT(CASE WHEN ${PENDING_DAYS} BETWEEN 0 AND 30 THEN 1 END) AS [0-30 Days],
            COUNT(CASE WHEN ${PENDING_DAYS} BETWEEN 31 AND 60 THEN 1 END) AS [31-60 Days],
            COUNT(CASE WHEN ${PENDING_DAYS} >= 61 THEN 1 END) AS [More than 60 Days],
            COUNT(n.cabinet_notes_ministry_id) AS [Total No of Cabinet Ministry]
        FROM
            mmt_ministry
        LEFT JOIN
            tbl_cabinet_notes_ministry AS n
                ON n.ministry_id = mmt_ministry.ministry_id
                AND n.stage_id <> 5
                AND n.received_ministry_date <= CAST(GETDATE() AS date)
        GROUP BY
            mmt_ministry.ministry_id,
            mmt_ministry.ministry_name
        ORDER BY
            mmt_ministry.ministry_id;
        `);

        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        res.json({ columnDefs: columnDefsFor(rowData), rowData });
    }
    catch(err)
    {
        return serverError(res, 'pendency report', err);
    }
};

async function getDetailMinistryPendencyReport (req, res)
{
    const ministryId = Number(req.params.ministryId);
    const countDate = Number(req.params.countDate);
    const bucket = PENDENCY_BUCKETS.find(b => countDate >= b.min && (b.max === null || countDate <= b.max));
    if (!Number.isInteger(ministryId) || !bucket) {
        return res.status(400).json({ error: 'Invalid ministry or pendency range.' });
    }

    try
    {
        const conn = await pool;
        const request = conn.request();
        request.input("ministryId", ministryId);
        request.input("minDays", bucket.min);
        if (bucket.max !== null) request.input("maxDays", bucket.max);

        const result = await request.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY n.subject, n.eoffice_file_number) AS [S No],
                mmt_ministry.ministry_name AS [Ministry Name],
                n.ministry_id AS [Ministry ID],
                n.subject AS [Subject],
                n.eoffice_file_number AS [Eoffice File Number],
                CONVERT(varchar(10), n.received_ministry_date, 101) AS [Received but yet to be sent for Comments],
                CONVERT(varchar(10), n.sent_for_comments_date, 101) AS [Sent for Comments],
                CONVERT(varchar(10), n.comments_rec_date, 101) AS [Comments Received],
                CONVERT(varchar(10), n.file_submitted_date, 101) AS [File submitted for Approval],
                CONVERT(varchar(10), n.reply_furnished_date, 101) AS [Reply furnished to other ministry],
                CONVERT(varchar(10), n.updated_date, 101) AS [Last Updated Date]
            FROM tbl_cabinet_notes_ministry AS n
            INNER JOIN mmt_ministry ON mmt_ministry.ministry_id = n.ministry_id
            WHERE n.ministry_id = @ministryId
                AND n.stage_id <> 5
                AND ${PENDING_DAYS} >= @minDays
                ${bucket.max !== null ? `AND ${PENDING_DAYS} <= @maxDays` : ''}
            ORDER BY n.subject, n.eoffice_file_number
        `);
        const rowData = result.recordset;

        if (rowData.length === 0) {
            return res.status(404).json({ error: 'No data available' });
        }
        res.json({ columnDefs: columnDefsFor(rowData), rowData });
    }
    catch(err)
    {
        return serverError(res, 'pendency details report', err);
    }

};

export default { cabinetMinistryReport, getMinistryDetailsReport, cabinetMinistryPendencyReport,
    getDetailMinistryPendencyReport };
