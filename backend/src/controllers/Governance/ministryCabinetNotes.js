
import { pool } from "../../db.js";
import { applyDataScope } from "../../middleware/dataScope.js";
import { STAGE_FIELDS, WING_FIELDS, MAX_LENGTH } from "./cabinetNotesMinistryFields.js";

const DATE_REMARK_FIELDS = [...STAGE_FIELDS, ...WING_FIELDS];

// Listed explicitly: "n.*" plus the resolved ministry_name made mssql return ministry_name as an array
const LIST_COLUMNS = `
    n.cabinet_notes_ministry_id, n.stage_id, n.subject, n.eoffice_file_number, n.ministry_id,
    ISNULL(mmt_ministry.ministry_name, n.ministry_name) AS ministry_name,
    n.deadline, n.sent_for_comments_wings, n.remarks,
    ${DATE_REMARK_FIELDS.map(f => `n.${f.column}_date, n.${f.column}_remarks`).join(',\n    ')},
    n.created_by, n.updated_by, n.created_date, n.updated_date,
    stage.cab_ministry_stage_name AS stage_name`;

const FROM_NOTES = `
    FROM tbl_cabinet_notes_ministry AS n
    LEFT JOIN mmt_ministry ON mmt_ministry.ministry_id = n.ministry_id
    LEFT JOIN mmt_cabinet_ministry_stage AS stage ON n.stage_id = stage.cab_ministry_stage_id`;

// Notes have no organisation_id; organisation users see notes created by their organisation
function noteScope(request, user) {
    return applyDataScope(request, user, { strategy: 'viaCreatedBy', alias: 'n' });
}

function serverError(res, action, err) {
    console.error(`[CabinetNotesMinistry] ${action}:`, err);
    return res.status(500).json({ error: `Could not ${action}. Please try again.` });
}

function parseId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------- request validation ----------

function readText(value, label, maxLength, errors, { required = false } = {}) {
    const text = value === undefined || value === null ? '' : String(value).trim();
    if (!text) {
        if (required) errors.push(`${label} is required.`);
        return null;
    }
    if (maxLength && text.length > maxLength) {
        errors.push(`${label} cannot exceed ${maxLength} characters.`);
    }
    return text;
}

// Dates arrive from <input type="date"> as YYYY-MM-DD; '' means not entered
function readDate(value, label, errors) {
    if (value === undefined || value === null || value === '') return null;
    const text = String(value).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) {
        errors.push(`${label} is not a valid date.`);
        return null;
    }
    return text;
}

// Wing ids from mmt_wings, stored comma-separated
function readWings(value, errors) {
    const items = Array.isArray(value) ? value : String(value ?? '').split(',');
    const ids = [...new Set(items.map(parseId).filter(Boolean))];
    const joined = ids.join(',');
    if (joined.length > MAX_LENGTH.sentForCommentsWings) {
        errors.push('Too many wings selected.');
    }
    return joined || null;
}

// Column values for INSERT/UPDATE, or the validation errors to show the user
function readNoteBody(body) {
    const errors = [];
    const values = {
        subject: readText(body.cabinetSubject ?? body.subject, 'Subject', MAX_LENGTH.subject, errors, { required: true }),
        eoffice_file_number: readText(body.eofficeFileNumber, 'E-Office file number', MAX_LENGTH.eofficeFileNumber, errors, { required: true }),
        deadline: readDate(body.deadline, 'Deadline', errors),
        remarks: readText(body.remarks, 'Remarks', null, errors),
        sent_for_comments_wings: readWings(body.wings, errors),
    };

    for (const field of DATE_REMARK_FIELDS) {
        values[`${field.column}_date`] = readDate(body[field.date], `${field.label} date`, errors);
        values[`${field.column}_remarks`] = readText(body[field.remarks], `${field.label} remarks`, MAX_LENGTH.stageRemarks, errors);
    }

    // The current stage is the latest stage with a date
    values.stage_id = STAGE_FIELDS.reduce((stage, field, i) => (values[`${field.column}_date`] ? i + 1 : stage), 0);
    if (!values.stage_id) errors.push('Enter the date for at least one stage.');

    return { values, errors };
}

// The ministry is mandatory in the form; its name comes from the master, not from the request
async function findMinistry(conn, ministryId) {
    const id = parseId(ministryId);
    if (!id) return null;
    const result = await conn.request()
        .input('ministryId', id)
        .query(`SELECT ministry_id, ministry_name FROM mmt_ministry WHERE ministry_id = @ministryId`);
    return result.recordset[0] ?? null;
}

// Validated column values for create/edit; sends the 400 itself and returns null when invalid
async function validateNote(conn, req, res) {
    const { values, errors } = readNoteBody(req.body);
    const ministry = await findMinistry(conn, req.body.cabinetMinistryName ?? req.body.ministry_id);
    if (!ministry) errors.unshift('Please select a valid ministry.');

    if (errors.length) {
        res.status(400).json({ error: errors[0], errors });
        return null;
    }
    values.ministry_id = ministry.ministry_id;
    values.ministry_name = ministry.ministry_name;
    return values;
}

function bindValues(request, values) {
    for (const [column, value] of Object.entries(values)) request.input(column, value);
}

// ---------- handlers ----------

async function createMinistryCabinet(req, res) {
    try {
        const conn = await pool;
        const values = await validateNote(conn, req, res);
        if (!values) return;

        const request = conn.request();
        bindValues(request, values);
        request.input('userID', req.user.userId); // created_by is the signed-in user, not a form value

        const columns = Object.keys(values);
        const result = await request.query(`
            INSERT INTO tbl_cabinet_notes_ministry (${columns.join(', ')}, created_by, created_date)
            OUTPUT INSERTED.cabinet_notes_ministry_id
            VALUES (${columns.map(c => `@${c}`).join(', ')}, @userID, GETDATE())
        `);
        return res.status(201).json({ cabinet_notes_ministry_id: result.recordset[0].cabinet_notes_ministry_id });
    } catch (err) {
        return serverError(res, 'save the cabinet note', err);
    }
}

async function editMinistryCabinet(req, res) {
    const id = parseId(req.body.ministryCabinetID ?? req.body.cabinet_notes_ministry_id);
    if (!id) return res.status(400).json({ error: 'Invalid cabinet note.' });

    try {
        const conn = await pool;
        const values = await validateNote(conn, req, res);
        if (!values) return;

        const request = conn.request();
        bindValues(request, values);
        request.input('id', id);
        request.input('userID', req.user.userId); // updated_by is the signed-in user, not a form value
        const scope = noteScope(request, req.user);

        const result = await request.query(`
            UPDATE n SET
                ${Object.keys(values).map(c => `${c} = @${c}`).join(',\n                ')},
                updated_by = @userID,
                updated_date = GETDATE()
            FROM tbl_cabinet_notes_ministry AS n
            ${scope.joinSql}
            WHERE n.cabinet_notes_ministry_id = @id ${scope.whereSql}
        `);
        // Missing, or outside the user's data scope
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Cabinet note not found.' });

        return res.status(200).json({ cabinet_notes_ministry_id: id });
    } catch (err) {
        return serverError(res, 'update the cabinet note', err);
    }
}

async function getCabinetMinistry(req, res) {
    const page = parseId(req.query.page);
    const limit = parseId(req.query.limit);
    const search = req.query.search ? String(req.query.search).trim() : '';

    try {
        const conn = await pool;
        const request = conn.request();
        const scope = noteScope(request, req.user);

        let where = `WHERE 1 = 1 ${scope.whereSql}`;
        if (search) {
            request.input('search', `%${search}%`);
            where += ` AND (n.subject LIKE @search OR ISNULL(mmt_ministry.ministry_name, n.ministry_name) LIKE @search OR n.eoffice_file_number LIKE @search)`;
        }
        const from = `${FROM_NOTES} ${scope.joinSql} ${where}`;

        if (page && limit) {
            request.input('offset', (page - 1) * limit);
            request.input('limit', limit);

            const countResult = await request.query(`SELECT COUNT(1) AS total ${from}`);
            const total = countResult.recordset[0]?.total || 0;
            const result = await request.query(`
                SELECT ${LIST_COLUMNS} ${from}
                ORDER BY n.cabinet_notes_ministry_id DESC
                OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
            `);
            return res.json({
                data: result.recordset,
                pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
            });
        }

        const result = await request.query(`SELECT ${LIST_COLUMNS} ${from} ORDER BY n.cabinet_notes_ministry_id DESC`);
        return res.json(result.recordset);
    } catch (err) {
        return serverError(res, 'load cabinet notes', err);
    }
}

async function getUpdateCabinetMinistryData(req, res) {
    const id = parseId(req.params.ministryCabinetID);
    if (!id) return res.status(400).json({ error: 'Invalid cabinet note.' });

    try {
        const conn = await pool;
        const request = conn.request();
        request.input('id', id);
        const scope = noteScope(request, req.user);

        const result = await request.query(`
            SELECT ${LIST_COLUMNS} ${FROM_NOTES} ${scope.joinSql}
            WHERE n.cabinet_notes_ministry_id = @id ${scope.whereSql}
        `);
        if (!result.recordset.length) return res.status(404).json({ error: 'Cabinet note not found.' });

        return res.json(result.recordset);
    } catch (err) {
        return serverError(res, 'load the cabinet note', err);
    }
}

async function deleteCabinetNotesMinistry(req, res) {
    const id = parseId(req.params.cabinet_notes_ministry_id);
    if (!id) return res.status(400).json({ error: 'Invalid cabinet note.' });

    try {
        const conn = await pool;
        const request = conn.request();
        request.input('id', id);
        const scope = noteScope(request, req.user);

        const result = await request.query(`
            DELETE n FROM tbl_cabinet_notes_ministry AS n
            ${scope.joinSql}
            WHERE n.cabinet_notes_ministry_id = @id ${scope.whereSql}
        `);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Cabinet note not found.' });

        return res.sendStatus(204);
    } catch (err) {
        return serverError(res, 'delete the cabinet note', err);
    }
}

export default {
    createMinistryCabinet,
    getCabinetMinistry,
    editMinistryCabinet,
    getUpdateCabinetMinistryData,
    deleteCabinetNotesMinistry
};
