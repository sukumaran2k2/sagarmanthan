
import { pool } from "../../db.js";
import fs from 'fs';

// Stage flags are BIT columns; the form sends 'Yes' / 'No' (true / 1 are accepted too).
const toBit = (v) => (v === true || v === 1 || /^(yes|true|1)$/i.test(String(v ?? '').trim()) ? 1 : 0);

// Stages (mmt_audit_para_stage): 1 Received ... 6 Accepted by CAG are open; 7 Dropped is disposed
const DROPPED_STAGE = 7;
// The form's categories (frontend constants.js CATEGORIES)
const CATEGORIES = ['Audit Para', 'Draft Para', 'CAG Report Item'];

// The form fields for each stage, in order: its Yes/No flag and its date (stage 4 has no date)
const STAGE_FIELDS = [
    { flag: 'yetSentForComment', date: 'yetSentForCommentDate' },
    { flag: 'commentSoughtOrg', date: 'commentSoughtOrgDate' },
    { flag: 'commentReceived', date: 'commentReceivedDate' },
    { flag: 'underClarification', date: null },
    { flag: 'commentFurnished', date: 'commentFurnishedDate' },
    { flag: 'cagAccepted', date: 'cagAcceptedDate' },
    { flag: 'disposed', date: 'disposedDate' },
];

// Date a para entered its current stage (stage 4 has no date: the last update stands in)
// The para's current stage as the Data List and the report work it out: the last step marked
// Yes (0 = none). The dashboard uses it too, so the three always agree even when a stored
// stage_id is missing or out of step with the flags (e.g. a para from 2.0).
const CURRENT_STAGE = `(CASE
        WHEN tbl_audit_para.disposed = 1 THEN 7
        WHEN tbl_audit_para.cag_accepted = 1 THEN 6
        WHEN tbl_audit_para.comments_furnished = 1 THEN 5
        WHEN tbl_audit_para.under_clarification = 1 THEN 4
        WHEN tbl_audit_para.comments_rec = 1 THEN 3
        WHEN tbl_audit_para.comments_sought = 1 THEN 2
        WHEN tbl_audit_para.received_at_ministry = 1 THEN 1
        ELSE 0 END)`;
const STAGE_SINCE = `COALESCE(CASE ${CURRENT_STAGE}
        WHEN 1 THEN tbl_audit_para.date_of_receipt
        WHEN 2 THEN tbl_audit_para.comments_sought_date
        WHEN 3 THEN tbl_audit_para.comments_rec_date
        WHEN 5 THEN tbl_audit_para.comments_furnished_date
        WHEN 6 THEN tbl_audit_para.cag_accepted_date
    END, tbl_audit_para.updated_date, tbl_audit_para.created_date)`;
const IS_OPEN = `${CURRENT_STAGE} < ${DROPPED_STAGE}`;
// When a para reached the Ministry (the entry date when that is missing)
const RECEIVED_ON = 'COALESCE(tbl_audit_para.date_of_receipt, tbl_audit_para.created_date)';
const IS_DRAFT = "tbl_audit_para.category = 'Draft Para'";
// The category as the Data List shows it (no category = Audit Para), for the dashboard splits
const CATEGORY_OF = "ISNULL(NULLIF(LTRIM(RTRIM(tbl_audit_para.category)), ''), 'Audit Para')";


// Which paras the signed-in user may see, as a condition on tbl_audit_para (same rule as Bills):
// Ministry users, the organisation nodal officer and users with no wing see every para; anyone
// else sees their wing's paras and the ones they created.
async function auditScope(request, userId) {
    request.input("scopeUserId", userId);
    const result = await request.query(`SELECT u.role_id, u.wing_id, ds.data_scope_code
        FROM tbl_user u
        LEFT JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
        LEFT JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
        WHERE u.user_id = @scopeUserId`);
    const { role_id, wing_id, data_scope_code } = result.recordset[0] || {};
    if (!result.recordset.length) return '1 = 0';
    if (data_scope_code === 'MINISTRY' || role_id === 8 || wing_id === null || wing_id === undefined) return '1 = 1';
    request.input("userWingId", wing_id);
    return '(tbl_audit_para.wing = @userWingId OR tbl_audit_para.created_by = @scopeUserId)';
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

// Checks the form and returns the values to save, or { error }. The stage is the last step
// reached (the browser's selectedStage isn't trusted); a dated step counts once it has a date.
// A new para's wing and division are checked; an update keeps them.
async function readAuditPara(body, conn, { isNew, savedDays = null }) {
    const paraNumber = String(body.auditParaNumber ?? '').trim();
    const subject = String(body.subject ?? '').trim();
    const category = String(body.category ?? '').trim();
    if (!paraNumber) return { error: 'Para number is required.' };
    if (paraNumber.length > 256) return { error: 'Para number can be at most 256 characters.' };
    if (!subject) return { error: 'Subject is required.' };
    if (subject.length > 256) return { error: 'Subject can be at most 256 characters.' };
    if (!CATEGORIES.includes(category)) return { error: 'Category must be Audit Para, Draft Para or CAG Report Item.' };

    // Stage dates as on the form: valid, not in the future, and each on or after the previous dated
    // stage (QC AP-03). On an edit that leaves every date as it was, the order and future checks are
    // skipped, so an old para with dates out of order can still be corrected in its other fields.
    const sent = STAGE_FIELDS.map(({ date }) => (date ? String(body[date] ?? '').trim() || null : null));
    const datesUnchanged = !!savedDays && sent.every((d, i) => d === savedDays[i]);
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const steps = [];
    let lastDay = null;
    for (const { flag, date } of STAGE_FIELDS) {
        const day = date ? String(body[date] ?? '').trim() : '';
        if (day && !isDate(day)) return { error: 'A stage date is not a valid date.' };
        if (!datesUnchanged && day && day > today) return { error: 'A stage date cannot be in the future.' };
        if (!datesUnchanged && day && lastDay && day < lastDay) return { error: 'Each stage date must be on or after the date of the stage before it.' };
        if (day) lastDay = day;
        steps.push({ on: toBit(body[flag]) || (day ? 1 : 0), day: day || null });
    }
    let stage = 1;
    steps.forEach((s, i) => { if (s.on) stage = i + 1; });

    const values = { paraNumber, subject, category, steps, stage, remarks: body.remarks ?? null };
    if (isNew) {
        const wing = Number(body.wing);
        const division = Number(body.division);
        if (!Number.isInteger(wing) || wing <= 0) return { error: 'Wing is required.' };
        if (!Number.isInteger(division) || division <= 0) return { error: 'Division is required.' };
        const check = conn.request();
        check.input("wing", wing);
        check.input("division", division);
        const found = await check.query(`SELECT 1 AS ok FROM mmt_division WHERE division_id = @division AND wing_id = @wing`);
        if (!found.recordset.length) return { error: 'The division does not belong to the selected wing.' };
        Object.assign(values, { wing, division });
    }
    return values;
}

const STEP_COLUMNS = [
    ['received_at_ministry', 'date_of_receipt'],
    ['comments_sought', 'comments_sought_date'],
    ['comments_rec', 'comments_rec_date'],
    ['under_clarification', null],
    ['comments_furnished', 'comments_furnished_date'],
    ['cag_accepted', 'cag_accepted_date'],
    ['disposed', 'disposed_date'],
];

function addStepInputs(request, steps) {
    steps.forEach((s, i) => {
        request.input(`flag${i}`, s.on);
        if (STEP_COLUMNS[i][1]) request.input(`date${i}`, s.day);
    });
}

async function createAuditPara(req, res) {
    const conn = await pool;
    try {
        const values = await readAuditPara(req.body, conn, { isNew: true });
        if (values.error) return res.status(400).json({ message: values.error });

        const request = conn.request();
        request.input("paraNumber", values.paraNumber);
        request.input("subject", values.subject);
        request.input("wing", values.wing);
        request.input("division", values.division);
        request.input("category", values.category);
        request.input("remarks", values.remarks);
        request.input("stage", values.stage);
        request.input("userID", req.user.userId); // the signed-in user, not a form value
        addStepInputs(request, values.steps);

        const columns = STEP_COLUMNS.flatMap(([flag, date]) => (date ? [flag, date] : [flag]));
        const params = STEP_COLUMNS.flatMap(([, date], i) => (date ? [`@flag${i}`, `@date${i}`] : [`@flag${i}`]));
        await request.query(`INSERT INTO tbl_audit_para (para_number, subject, wing, division, category,
            ${columns.join(', ')}, remarks, stage_id, created_by, created_date)
            VALUES (@paraNumber, @subject, @wing, @division, @category,
            ${params.join(', ')}, @remarks, @stage, @userID, GETDATE())`);
        return res.sendStatus(201);
    } catch (err) {
        console.error('Audit Para create error:', err);
        return res.sendStatus(500);
    }
}

async function getAuditPara(req, res) {
    const conn = await pool;
    try {
        const request = conn.request();
        const scope = await auditScope(request, req.user.userId);
        // A para whose wing, division or stage is missing (or not in the master) is still listed,
        // as "Not specified" / "No Status", as on the dashboard (inner joins used to drop it)
        const result = await request.query(`SELECT audit_para_id, tbl_audit_para.stage_id, para_number, subject,
        wing, division, ISNULL(mmt_wings.wing_name, 'Not specified') AS wing_name,
        ISNULL(mmt_division.division_name, 'Not specified') AS division_name, category,
        received_at_ministry, date_of_receipt, comments_sought, comments_sought_date, comments_rec, comments_rec_date,
        under_clarification, comments_furnished, comments_furnished_date, cag_accepted, cag_accepted_date, disposed,
        disposed_date, remarks, created_by, ISNULL(mmt_audit_para_stage.audit_para_stage_name, 'No Status') AS audit_para_stage_name, updated_date
        FROM tbl_audit_para
        LEFT JOIN mmt_division ON tbl_audit_para.division = mmt_division.division_id
        LEFT JOIN mmt_wings ON tbl_audit_para.wing = mmt_wings.wing_id
        LEFT JOIN mmt_audit_para_stage ON mmt_audit_para_stage.audit_para_stage_id = tbl_audit_para.stage_id
        WHERE ${scope}
        ORDER BY ISNULL(tbl_audit_para.stage_id, 0) ASC;`);
        return res.json(result.recordset);
    } catch (err) {
        console.error('Audit Para list error:', err);
        return res.sendStatus(500);
    }
}

// Only a para the user may see can be changed (404 otherwise); its wing and division are kept
async function updateAuditPara(req, res) {
    const conn = await pool;
    try {
        const id = Number(req.body.auditParaID);
        if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Audit Para is missing.' });
        // The saved stage dates, so the date rules apply only when a date is changed
        const savedRow = (await conn.request().input('savedId', id)
            .query('SELECT * FROM tbl_audit_para WHERE audit_para_id = @savedId')).recordset[0];
        const savedDays = savedRow
            ? STEP_COLUMNS.map(([, date]) => (date && savedRow[date] ? new Date(savedRow[date]).toISOString().slice(0, 10) : null))
            : null;
        const values = await readAuditPara(req.body, conn, { isNew: false, savedDays });
        if (values.error) return res.status(400).json({ message: values.error });

        const request = conn.request();
        const scope = await auditScope(request, req.user.userId);
        request.input("auditParaID", id);
        request.input("paraNumber", values.paraNumber);
        request.input("subject", values.subject);
        request.input("category", values.category);
        request.input("remarks", values.remarks);
        request.input("stage", values.stage);
        request.input("userID", req.user.userId);
        addStepInputs(request, values.steps);

        const sets = STEP_COLUMNS.flatMap(([flag, date], i) => (date ? [`${flag} = @flag${i}`, `${date} = @date${i}`] : [`${flag} = @flag${i}`]));
        const result = await request.query(`UPDATE tbl_audit_para SET para_number = @paraNumber, subject = @subject,
            category = @category, ${sets.join(', ')},
            remarks = @remarks, stage_id = @stage, updated_date = GETDATE(), updated_by = @userID
            WHERE audit_para_id = @auditParaID AND ${scope}`);
        if (!result.rowsAffected[0]) return res.status(404).json({ message: 'Audit Para not found.' });
        return res.sendStatus(200);
    } catch (err) {
        console.error('Audit Para update error:', err);
        return res.sendStatus(500);
    }
}

// Only a para the user may see can be deleted. A copy goes to tbl_audit_para_delete_log in the same
// transaction (QC AP-02); until sql/governance/01 has created that table, to delete_log/Audit_para.
async function deleteAuditPara(req, res) {
    const id = Number(req.params.audit_para_id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: 'Audit Para is missing.' });
    const userID = req.user.userId; // the signed-in user, not the path value
    const conn = await pool;
    try {
        const request = conn.request();
        const scope = await auditScope(request, userID);
        request.input("auditParaID", id);
        request.input("userID", userID);
        const result = await request.query(`
            SET XACT_ABORT ON;
            BEGIN TRANSACTION;
            DECLARE @row NVARCHAR(MAX) = (SELECT * FROM tbl_audit_para
                WHERE audit_para_id = @auditParaID AND ${scope}
                FOR JSON PATH, WITHOUT_ARRAY_WRAPPER, INCLUDE_NULL_VALUES);
            DECLARE @logged BIT = 0;
            IF @row IS NOT NULL AND OBJECT_ID('dbo.tbl_audit_para_delete_log', 'U') IS NOT NULL
            BEGIN
                INSERT INTO dbo.tbl_audit_para_delete_log (audit_para_id, para_number, row_json, deleted_by)
                VALUES (@auditParaID, JSON_VALUE(@row, '$.para_number'), @row, @userID);
                SET @logged = 1;
            END
            DELETE FROM tbl_audit_para WHERE audit_para_id = @auditParaID AND ${scope};
            DECLARE @deleted INT = @@ROWCOUNT;
            COMMIT TRANSACTION;
            SELECT @deleted AS deleted, @logged AS logged, @row AS row_json;`);
        const { deleted, logged, row_json: rowJson } = result.recordset[0];
        if (!deleted) return res.status(404).json({ message: 'Audit Para not found.' });
        if (logged) return res.sendStatus(201);

        const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
        const logFolder = './delete_log/Audit_para';
        const logMessage = `User '${userID}' deleted Audit para data with Data ID '${id}'. Deleted Data: ${rowJson}\n`;
        fs.mkdir(logFolder, { recursive: true }, (mkdirErr) => {
            if (mkdirErr) return console.error('Audit Para delete log folder error:', mkdirErr);
            fs.appendFile(`${logFolder}/deleted_Auditpara_log_${timestamp}.txt`, logMessage, (err) => {
                if (err) console.error('Audit Para delete log error:', err);
            });
        });
        return res.sendStatus(201);
    } catch (err) {
        console.error('Audit Para delete error:', err);
        return res.sendStatus(500);
    }
}

// Dashboard: totals, open paras per stage with how long they have waited, paras per wing (per division of a picked wing), paras received and dropped each year, and the
// ten longest-pending paras. ?wingId narrows everything (across wings the wing chart stays whole);
// ?category narrows everything. Active = every stage before Dropped.
async function getAuditParaDashboard(req, res) {
    const conn = await pool;
    try {
        const wingId = Number(req.query.wingId);
        const filterWing = Number.isInteger(wingId) && wingId > 0;
        // ?category narrows every figure, the wing chart included
        const category = CATEGORIES.includes(req.query.category) ? req.query.category : null;
        const query = async (sql, { byWing = true } = {}) => {
            const request = conn.request();
            const conditions = [await auditScope(request, req.user.userId)];
            if (byWing && filterWing) {
                request.input("filterWingId", wingId);
                conditions.push('tbl_audit_para.wing = @filterWingId');
            }
            if (category) {
                request.input("filterCategory", category);
                conditions.push('tbl_audit_para.category = @filterCategory');
            }
            // Every /*SCOPE*/ in the statement gets the same conditions
            return (await request.query(sql.split('/*SCOPE*/').join(conditions.map((c) => `AND ${c}`).join(' ')))).recordset;
        };

        const [kpi = {}] = await query(`
            SELECT COUNT(*) AS total,
                SUM(CASE WHEN ${IS_OPEN} THEN 1 ELSE 0 END) AS open_count,
                SUM(CASE WHEN ${IS_OPEN} THEN 0 ELSE 1 END) AS dropped,
                SUM(CASE WHEN ${IS_OPEN} AND tbl_audit_para.category = 'Draft Para' THEN 1 ELSE 0 END) AS open_draft,
                CAST(AVG(CASE WHEN ${IS_OPEN} THEN CAST(DATEDIFF(day,
                    COALESCE(tbl_audit_para.date_of_receipt, tbl_audit_para.created_date), GETDATE()) AS FLOAT) END) AS INT) AS avg_age_days,
                MAX(COALESCE(tbl_audit_para.updated_date, tbl_audit_para.created_date)) AS last_update
            FROM tbl_audit_para
            WHERE 1 = 1 /*SCOPE*/`);

        // Open paras per stage (every open stage listed, empty ones with 0)
        const stages = await query(`
            SELECT stage.audit_para_stage_id AS stage_id, stage.audit_para_stage_name AS stage_name,
                COUNT(tbl_audit_para.audit_para_id) AS para_count,
                CAST(AVG(CAST(DATEDIFF(day, ${STAGE_SINCE}, GETDATE()) AS FLOAT)) AS INT) AS avg_days,
                MAX(DATEDIFF(day, ${STAGE_SINCE}, GETDATE())) AS max_days
            FROM mmt_audit_para_stage AS stage
            LEFT JOIN tbl_audit_para ON ${CURRENT_STAGE} = stage.audit_para_stage_id /*SCOPE*/
            WHERE stage.audit_para_stage_id < ${DROPPED_STAGE}
            GROUP BY stage.audit_para_stage_id, stage.audit_para_stage_name
            ORDER BY stage.audit_para_stage_id`);

        // Paras per wing (or, with a wing picked, per division of that wing): open and dropped ones,
        // each split by category; the one with most open paras comes first. Across wings the wing
        // filter doesn't apply (the chart compares wings).
        const byDivision = filterWing;
        // A para whose wing / division is missing (or not in the master) is listed as "Not specified"
        // rather than left out of the chart. Each bar is one category, as the Data List filters by.
        const groupJoin = byDivision
            ? 'LEFT JOIN mmt_division AS grp ON grp.division_id = tbl_audit_para.division'
            : 'LEFT JOIN mmt_wings AS grp ON grp.wing_id = tbl_audit_para.wing';
        const [groupId, groupName] = byDivision
            ? ['grp.division_id', "ISNULL(grp.division_name, 'Not specified')"]
            : ['grp.wing_id', "ISNULL(grp.wing_name, 'Not specified')"];
        const split = (open, category) => `SUM(CASE WHEN ${open ? '' : 'NOT '}${IS_OPEN} AND ${CATEGORY_OF} = '${category}' THEN 1 ELSE 0 END)`;
        const breakdown = await query(`
            SELECT ${groupId} AS id, ${groupName} AS name,
                SUM(CASE WHEN ${IS_OPEN} THEN 1 ELSE 0 END) AS total_open,
                ${split(true, 'Audit Para')} AS audit_para,
                ${split(true, 'Draft Para')} AS draft_para,
                ${split(true, 'CAG Report Item')} AS cag_item,
                ${split(false, 'Audit Para')} AS dropped_audit,
                ${split(false, 'Draft Para')} AS dropped_draft,
                ${split(false, 'CAG Report Item')} AS dropped_cag
            FROM tbl_audit_para
            ${groupJoin}
            WHERE 1 = 1 /*SCOPE*/
            GROUP BY ${groupId}, ${groupName}
            ORDER BY total_open DESC, COUNT(*) DESC, ${groupName}`, { byWing: byDivision });

        // Paras received and dropped in each calendar year (CAG reports are numbered by year);
        // a dropped para with no dropped date can't be placed in a year and is counted apart
        const yearly = await query(`
            SELECT y.[year], SUM(y.received) AS received, SUM(y.dropped) AS dropped
            FROM (
                SELECT YEAR(${RECEIVED_ON}) AS [year], 1 AS received, 0 AS dropped
                FROM tbl_audit_para WHERE 1 = 1 /*SCOPE*/
                UNION ALL
                SELECT YEAR(tbl_audit_para.disposed_date), 0, 1
                FROM tbl_audit_para WHERE NOT ${IS_OPEN} AND tbl_audit_para.disposed_date IS NOT NULL /*SCOPE*/
            ) AS y
            WHERE y.[year] IS NOT NULL
            GROUP BY y.[year]
            ORDER BY y.[year]`);
        const [undated = {}] = await query(`
            SELECT COUNT(*) AS n FROM tbl_audit_para
            WHERE NOT ${IS_OPEN} AND tbl_audit_para.disposed_date IS NULL /*SCOPE*/`);

        const longPending = await query(`
            SELECT TOP 10 tbl_audit_para.audit_para_id, tbl_audit_para.para_number, tbl_audit_para.subject,
                tbl_audit_para.category, ISNULL(wings.wing_name, 'Not specified') AS wing_name, ${CURRENT_STAGE} AS stage_id, stage.audit_para_stage_name AS current_stage,
                ${STAGE_SINCE} AS stage_since,
                DATEDIFF(day, ${STAGE_SINCE}, GETDATE()) AS pending_days
            FROM tbl_audit_para
            LEFT JOIN mmt_wings AS wings ON wings.wing_id = tbl_audit_para.wing
            LEFT JOIN mmt_audit_para_stage AS stage ON stage.audit_para_stage_id = ${CURRENT_STAGE}
            WHERE ${IS_OPEN} /*SCOPE*/
            ORDER BY pending_days DESC, tbl_audit_para.audit_para_id`);

        return res.json({
            kpi: {
                total: Number(kpi.total) || 0,
                open: Number(kpi.open_count) || 0,
                dropped: Number(kpi.dropped) || 0,
                openDraft: Number(kpi.open_draft) || 0,
                avgAgeDays: kpi.avg_age_days ?? null,
            },
            lastDataUpdate: kpi.last_update || null,
            stages,
            breakdown: { by: byDivision ? 'division' : 'wing', rows: breakdown },
            yearly,
            droppedWithoutDate: Number(undated.n) || 0,
            longPending,
        });
    } catch (err) {
        console.error('Audit Para dashboard error:', err);
        return res.sendStatus(500);
    }
}

export default { createAuditPara, getAuditPara, updateAuditPara, deleteAuditPara, getAuditParaDashboard };
