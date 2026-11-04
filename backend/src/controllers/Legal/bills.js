import { pool } from "../../db.js";

// Bills are kept in 2.0's tbl_bill (3.0 had been writing to a separate copy of it).
// The API and the form keep 3.0's field names; this maps each stage to tbl_bill's columns.
// Each stage has a date and a remark column added for 3.0. A stage is reached when it has a
// date (2.0's Yes/No flags were dropped, see sql/bills/04).
const STAGES = [
    { field: 'draft_bill_prepared_date', column: 'pre_draft_bill_prepared', param: 'draftBillPrepared' },
    { field: 'dcn_draft_bill_approved_minister_date', column: 'pre_draft_bill_approved', param: 'dcnDraftBillApprovedMinister' },
    { field: 'circulated_imc_date', column: 'circulated_imc', param: 'circulatedImc' },
    { field: 'imc_comments_rec_date', column: 'imc_comments_rec', param: 'imcCommentsRec' },
    { field: 'dcn_draft_bill_prepared_date', column: 'dcn_draft_bill_prepared', param: 'dcnDraftBillPrepared' },
    { field: 'dcn_draft_bill_approved_date', column: 'dcn_draft_bill_approved', param: 'dcnDraftBillApproved' },
    { field: 'submitted_legal_vetting_date', column: 'submited_legal_vetting', param: 'submittedLegalVetting' },
    { field: 'legal_vetting_completed_date', column: 'legal_vetting_completed', param: 'legalVettingCompleted' },
    { field: 'final_dcn_draft_approved_date', column: 'final_dcn_approved', param: 'finalDcnDraftApproved' },
    { field: 'advance_copy_date', column: 'advance_copy', param: 'advanceCopy' },
    { field: 'approved_by_cabinet_date', column: 'approved_by_cabinet', param: 'approvedByCabinet' },
    { field: 'bill_introduced_in_parliament_date', column: 'bill_introduced_in_parliament', param: 'billIntroducedInParliament' },
    { field: 'bill_passed_date', column: 'bill_passed', param: 'billPassed' },
    { field: 'bill_notified_date', column: 'bill_notified', param: 'billNotified' },
    { field: 'completed_date', column: 'completed', param: 'completed' },
].map((s) => ({ ...s, remark: s.field.replace(/_date$/, '_remarks') }));

// 2.0's older request names for some stages, still accepted
const LEGACY_PARAMS = {
    draftBillPrepared: 'preDraftBillPrep',
    dcnDraftBillApprovedMinister: 'preDraftBillApproved',
    submittedLegalVetting: 'submitedLegalVetting',
    finalDcnDraftApproved: 'finalDcnApproved',
};
const SUBJECT_MAX = 256;       // tbl_bill.subject nvarchar(256)
const STAGE_REMARK_MAX = 250;  // the *_remarks columns, nvarchar(250)
const REMARKS_MAX_WORDS = 250;

// A bill as the API returns it: tbl_bill's columns under 3.0's field names
const BILL_COLUMNS = `tbl_bill.bill_id, subject, wing, division, stage_id,
            ${STAGES.map((s) => `${s.column}_date AS ${s.field}, ${s.remark}`).join(',\n            ')},
            remarks, tbl_bill.created_by, tbl_bill.updated_by, tbl_bill.created_date, tbl_bill.updated_date`;

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
// Today in India, as YYYY-MM-DD (the server may run in UTC)
const todayInIndia = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

// Reads a bill from the request body. Returns { bill } or { error } (a message for a 400).
// The current stage is the highest stage with a date (0 = no status). The client's
// selectedBillStage is not trusted.
async function readBill(body, conn) {
    const subject = blank(body.subject) ? '' : String(body.subject).trim();
    if (!subject) return { error: 'Subject is required.' };
    if (subject.length > SUBJECT_MAX) return { error: `Subject can be at most ${SUBJECT_MAX} characters.` };

    const wing = Number(body.wing);
    const division = Number(body.division);
    if (!Number.isInteger(wing) || wing <= 0) return { error: 'Wing is required.' };
    if (!Number.isInteger(division) || division <= 0) return { error: 'Division is required.' };
    const check = conn.request();
    check.input("wing", wing);
    check.input("division", division);
    const found = await check.query(`SELECT 1 AS ok FROM mmt_division WHERE division_id = @division AND wing_id = @wing`);
    if (!found.recordset.length) return { error: 'The division does not belong to the selected wing.' };

    const remarks = blank(body.remarks) ? '' : String(body.remarks).trim();
    if (remarks && remarks.split(/\s+/).length > REMARKS_MAX_WORDS) return { error: `Remarks can be at most ${REMARKS_MAX_WORDS} words.` };

    const today = todayInIndia();
    let stageId = 0;
    let lastDate = null;
    const stages = [];
    for (let i = 0; i < STAGES.length; i++) {
        const st = STAGES[i];
        const legacy = LEGACY_PARAMS[st.param];
        const rawDate = body[`${st.param}Date`] ?? (legacy && body[`${legacy}Date`]);
        const rawRemark = body[`${st.param}Remark`] ?? (legacy && body[`${legacy}Remark`]);
        const label = `Stage ${i + 1}`;

        let date = null;
        if (!blank(rawDate)) {
            date = String(rawDate).slice(0, 10);
            // A day that isn't on the calendar (e.g. 30 Feb) rolls over in new Date(), so it must read back the same
            if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(date).getTime())
                || new Date(date).toISOString().slice(0, 10) !== date) return { error: `${label}: the date is not valid.` };
            if (date > today) return { error: `${label}: the date cannot be in the future.` };
            if (lastDate && date < lastDate) return { error: `${label}: the date is before an earlier stage's date. Dates must be in stage order.` };
            lastDate = date;
        }
        const remark = blank(rawRemark) ? null : String(rawRemark).trim();
        if (remark && remark.length > STAGE_REMARK_MAX) return { error: `${label}: the remark can be at most ${STAGE_REMARK_MAX} characters.` };

        if (date) stageId = i + 1;
        stages.push({ ...st, date, remark });
    }
    return { bill: { subject, wing, division, remarks, stageId, stages } };
}

// Binds a bill read by readBill on a request
function bindBill(request, bill) {
    request.input("subject", bill.subject);
    request.input("wing", bill.wing);
    request.input("division", bill.division);
    request.input("remarks", bill.remarks);
    request.input("stageId", bill.stageId);
    bill.stages.forEach((st) => {
        request.input(`${st.param}Date`, st.date);
        request.input(`${st.param}Remark`, st.remark);
    });
}

// A positive whole-number id from the URL or body, or null
const toId = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
};

async function createBill(req, res) {
    const conn = await pool;
    try {
        const { bill, error } = await readBill(req.body, conn);
        if (error) return res.status(400).json({ message: error });

        const request = conn.request();
        bindBill(request, bill);
        request.input("userID", req.user.userId); // the signed-in user, not a form value
        const result = await request.query(`INSERT INTO tbl_bill (
            subject, wing, division,
            ${STAGES.map((st) => `${st.column}_date, ${st.remark}`).join(', ')},
            remarks, stage_id, created_by, created_date, updated_by, updated_date
        ) OUTPUT INSERTED.bill_id VALUES (
            @subject, @wing, @division,
            ${STAGES.map((st) => `@${st.param}Date, @${st.param}Remark`).join(', ')},
            @remarks, @stageId, @userID, GETDATE(), @userID, GETDATE()
        )`);
        res.status(201).json({ billID: result.recordset[0]?.bill_id });
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// The bills a user can see, as a condition on tbl_bill (bound on `request`): never a deleted
// bill; ministry users (data scope MINISTRY: Secretary down to Wing/Division User and View
// Only Admin) and the org nodal officer see every bill; anyone else sees their wing's bills
// and the ones they created. A user with no wing set sees every bill (no wing to limit to;
// none of the ministry users have one). Used by the list, dashboard and reports and for
// reading, changing or deleting one bill.
export async function billScope(request, userID) {
    const notDeleted = 'ISNULL(tbl_bill.is_deleted, 0) = 0';
    if (!userID) return notDeleted;
    request.input("scopeUserId", userID);
    const userResult = await request.query(`SELECT u.role_id, u.wing_id, ds.data_scope_code
        FROM tbl_user u
        LEFT JOIN tbl_rbac_role_data_scope rds ON rds.role_id = u.role_id
        LEFT JOIN mmt_rbac_data_scope ds ON ds.data_scope_id = rds.data_scope_id
        WHERE u.user_id = @scopeUserId`);
    const { role_id, wing_id, data_scope_code } = userResult.recordset[0] || {};
    if (data_scope_code === 'MINISTRY' || role_id === 8 || wing_id === null || wing_id === undefined) return notDeleted;
    request.input("userWingId", wing_id);
    request.input("requestingUserId", userID);
    return `${notDeleted} AND (tbl_bill.wing = @userWingId OR tbl_bill.created_by = @requestingUserId)`;
}

async function getBill(req, res) {
    const conn = await pool;
    try {
        const request = conn.request();
        const scope = await billScope(request, req.user.userId);

        const result = await request.query(`SELECT ${BILL_COLUMNS},
            wing_name, division_name, bill_stage_name
            FROM tbl_bill
            INNER JOIN mmt_division ON tbl_bill.division = mmt_division.division_id
            INNER JOIN mmt_wings ON tbl_bill.wing = mmt_wings.wing_id
            LEFT JOIN mmt_bill_stage ON mmt_bill_stage.bill_stage_id = tbl_bill.stage_id
            WHERE ${scope}
            ORDER BY tbl_bill.bill_id DESC;`);
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// One bill in the user's scope (404 when there is none, or it is outside the scope)
async function getUpdateBill(req, res) {
    const billID = toId(req.params.billID);
    if (!billID) return res.status(400).json({ message: 'Invalid bill id.' });
    const conn = await pool;
    try {
        const request = conn.request();
        request.input("billID", billID);
        const scope = await billScope(request, req.user.userId);
        const result = await request.query(`SELECT ${BILL_COLUMNS} FROM tbl_bill
            WHERE bill_id = @billID AND ${scope};`);
        if (!result.recordset.length) return res.status(404).json({ message: 'Bill not found.' });
        res.json(result.recordset);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// A 2.0 bill can be at a stage that has no date. Its stage is kept until a later stage gets a
// date; otherwise the dates decide. In an UPDATE the columns read are the row's old values.
const KEEP_UNDATED_STAGE = `CASE WHEN @stageId < ISNULL(stage_id, 0) AND CASE stage_id
    ${STAGES.map((s, i) => `WHEN ${i + 1} THEN ${s.column}_date`).join('\n    ')}
  END IS NULL THEN stage_id ELSE @stageId END`;

async function updateBill(req, res) {
    const billID = toId(req.body.billID);
    if (!billID) return res.status(400).json({ message: 'Invalid bill id.' });
    const conn = await pool;
    try {
        const { bill, error } = await readBill(req.body, conn);
        if (error) return res.status(400).json({ message: error });

        const request = conn.request();
        bindBill(request, bill);
        request.input("billID", billID);
        request.input("userID", req.user.userId); // the signed-in user, not a form value
        const scope = await billScope(request, req.user.userId);
        const result = await request.query(`UPDATE tbl_bill SET
            subject = @subject,
            wing = @wing,
            division = @division,
            ${STAGES.map((st) => `${st.column}_date = @${st.param}Date, ${st.remark} = @${st.param}Remark`).join(',\n            ')},
            remarks = @remarks,
            stage_id = ${KEEP_UNDATED_STAGE},
            updated_by = @userID,
            updated_date = GETDATE()
            WHERE bill_id = @billID AND ${scope}`);
        if (!result.rowsAffected[0]) return res.status(404).json({ message: 'Bill not found.' });
        res.sendStatus(200);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Soft delete: the bill is kept, marked deleted with who deleted it and when, and no longer
// shown anywhere (2.0 has no delete; the record stays for audit)
async function deleteBill(req, res) {
    const billID = toId(req.params.billID);
    if (!billID) return res.status(400).json({ message: 'Invalid bill id.' });
    const userID = req.user.userId;

    const conn = await pool;
    const request = conn.request();
    request.input("billID", billID);
    request.input("userID", userID);
    try {
        const scope = await billScope(request, userID);
        const result = await request.query(`UPDATE tbl_bill
            SET is_deleted = 1, deleted_by = @userID, deleted_date = GETDATE()
            WHERE bill_id = @billID AND ${scope};`);
        if (!result.rowsAffected[0]) return res.status(404).json({ message: 'Bill not found.' });
        return res.sendStatus(200);
    }
    catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// Dashboard, as Cabinet Notes MoPSW's: KPI cards, stage-wise heat map, wing-wise active
// bills and the ten longest-pending bills. stage_id is the bill's current stage (1-15 in
// mmt_bill_stage, 0 = no status); a stage's date is its column in STAGES.
// A bill is disposed once passed (Bill Passed, Notified or Completed), the same rule as the
// Data List's Active / Disposed tabs; every other bill is active.
const DISPOSED_FROM_STAGE = 13; // Bill Passed
const CABINET_STAGE = 11; // Approved by Cabinet
const PARLIAMENT_STAGES = '12'; // Introduced (Passed and Notified are disposed)
const IS_DISPOSED = `(ISNULL(tbl_bill.stage_id, 0) >= ${DISPOSED_FROM_STAGE})`;
// When the bill reached its current stage: that stage's date, else the date of the nearest
// earlier stage that has one (2.0 bills often have a stage done without a date), else its
// creation date. Plain expressions only, as it is used inside AVG / MAX.
const STAGE_SINCE = `COALESCE(CASE tbl_bill.stage_id
    ${STAGES.map((s, i) => `WHEN ${i + 1} THEN ${i ? `COALESCE(${STAGES.slice(0, i + 1).reverse().map((e) => `tbl_bill.${e.column}_date`).join(', ')})` : `tbl_bill.${s.column}_date`}`).join('\n    ')}
  END, tbl_bill.created_date)`;

async function getBillDashboard(req, res) {
    const conn = await pool;
    try {
        // Each query gets its own request with the user's scope and the optional wing filter.
        // The wing-wise chart ignores the wing filter: it compares wings.
        const wingId = Number(req.query.wingId);
        const filterWing = Number.isInteger(wingId) && wingId > 0;
        const query = async (sql, { byWing = true } = {}) => {
            const request = conn.request();
            const conditions = [await billScope(request, req.user.userId)];
            if (byWing && filterWing) {
                request.input("filterWingId", wingId);
                conditions.push('tbl_bill.wing = @filterWingId');
            }
            const where = conditions.filter(Boolean).map((c) => `AND ${c}`).join(' ');
            return (await request.query(sql.replace('/*SCOPE*/', where))).recordset;
        };

        const [kpi = {}] = await query(`
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN ${IS_DISPOSED} THEN 0 ELSE 1 END) AS active,
                SUM(CASE WHEN ${IS_DISPOSED} THEN 1 ELSE 0 END) AS disposed,
                CAST(AVG(CASE WHEN ${IS_DISPOSED} THEN NULL
                    ELSE CAST(DATEDIFF(day, tbl_bill.created_date, GETDATE()) AS FLOAT) END) AS INT) AS avg_age_days,
                MAX(tbl_bill.updated_date) AS last_update
            FROM tbl_bill
            WHERE 1 = 1 /*SCOPE*/`);

        // Active bills per stage (every stage listed, empty ones with 0)
        const heatMap = await query(`
            SELECT stage.bill_stage_id AS stage_id, stage.bill_stage_name AS stage_name,
                COUNT(tbl_bill.bill_id) AS bill_count,
                CAST(AVG(CAST(DATEDIFF(day, ${STAGE_SINCE}, GETDATE()) AS FLOAT)) AS INT) AS avg_days,
                MAX(DATEDIFF(day, ${STAGE_SINCE}, GETDATE())) AS max_days
            FROM mmt_bill_stage AS stage
            LEFT JOIN tbl_bill ON tbl_bill.stage_id = stage.bill_stage_id AND NOT ${IS_DISPOSED} /*SCOPE*/
            WHERE stage.bill_stage_id < ${DISPOSED_FROM_STAGE}
            GROUP BY stage.bill_stage_id, stage.bill_stage_name
            ORDER BY stage.bill_stage_id`);

        // Every active wing is listed, those with no active bills with 0
        const wingWise = await query(`
            SELECT wings.wing_id, wings.wing_name,
                COUNT(tbl_bill.bill_id) AS total_active,
                SUM(CASE WHEN tbl_bill.stage_id = ${CABINET_STAGE} THEN 1 ELSE 0 END) AS cabinet_approved,
                SUM(CASE WHEN tbl_bill.stage_id IN (${PARLIAMENT_STAGES}) THEN 1 ELSE 0 END) AS in_parliament,
                SUM(CASE WHEN tbl_bill.bill_id IS NULL OR tbl_bill.stage_id = ${CABINET_STAGE}
                    OR tbl_bill.stage_id IN (${PARLIAMENT_STAGES}) THEN 0 ELSE 1 END) AS in_progress
            FROM mmt_wings AS wings
            LEFT JOIN tbl_bill ON tbl_bill.wing = wings.wing_id AND NOT ${IS_DISPOSED} /*SCOPE*/
            WHERE wings.status = 1
            GROUP BY wings.wing_id, wings.wing_name
            ORDER BY total_active DESC, wings.wing_name`, { byWing: false });

        const longPending = await query(`
            SELECT TOP 10 tbl_bill.bill_id, tbl_bill.subject, wings.wing_name,
                stage.bill_stage_name AS current_stage, tbl_bill.updated_date,
                DATEDIFF(day, ${STAGE_SINCE}, GETDATE()) AS pending_days
            FROM tbl_bill
            INNER JOIN mmt_wings AS wings ON wings.wing_id = tbl_bill.wing
            LEFT JOIN mmt_bill_stage AS stage ON stage.bill_stage_id = tbl_bill.stage_id
            WHERE NOT ${IS_DISPOSED} /*SCOPE*/
            ORDER BY pending_days DESC`);

        return res.json({
            kpi: {
                total: Number(kpi.total) || 0,
                active: Number(kpi.active) || 0,
                disposed: Number(kpi.disposed) || 0,
                avgAgeDays: kpi.avg_age_days ?? null,
            },
            lastDataUpdate: kpi.last_update || null,
            heatMap,
            wingWise,
            longPending,
        });
    } catch (err) {
        console.error("Bills dashboard error:", err);
        return res.sendStatus(500);
    }
}

export default { createBill, getBill, getUpdateBill, updateBill, deleteBill, getBillDashboard };