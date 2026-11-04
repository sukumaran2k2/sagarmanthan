import { pool } from "../../db.js";
import { billScope, BILL_WING } from "../Legal/bills.js";

// Bills by current stage (tbl_bill.stage_id), one column per stage, named as 2.0's reports.
// Every report counts only the bills the user can see (billScope: the same rule as the Data
// List and Dashboard, deleted bills left out).
const STAGE_COLUMNS = [
    'Draft Bill Prepared', 'Pre-DCN & Draft Bill Approved by Minister', 'Circulated for IMC',
    'IMC comments received', 'DCN & Draft Bill prepared', 'DCN & draft bill Approved by Minister',
    'Submitted for Legal Vetting', 'Legal Vetting to be Completed', 'Final DCN & draft bill Approved by Minister',
    'Advance Copy to be Sent to PMO & Cab Sectt', 'Approved By Cabinet', 'Bill introduced in parliament',
    'Bill Passed', 'Bill Notified', 'Completed',
];
const TOTAL_COLUMN = 'No of Bills/PreConstitutions Act';
const STAGE_COUNTS = `COUNT(tbl_bill.bill_id) AS [${TOTAL_COLUMN}],
    ${STAGE_COLUMNS.map((name, i) => `SUM(CASE WHEN tbl_bill.stage_id = ${i + 1} THEN 1 ELSE 0 END) AS [${name}]`).join(',\n    ')}`;

// One bill per row with each stage's date (the drill-down from a count)
const DETAIL_COLUMNS = `subject AS Subject, pre_draft_bill_prepared_date AS [Draft Bill Prepared], pre_draft_bill_approved_date AS [Pre-DCN & Draft Bill Approved by Minister],
    circulated_imc_date AS [Circulated For IMC], imc_comments_rec_date AS [IMC Comments Received], dcn_draft_bill_prepared_date AS [DCN & Draft Bill prepared], dcn_draft_bill_approved_date AS [DCN & Draft Bill Approved by Minister], submited_legal_vetting_date AS [Submitted for Legal Vetting],
    legal_vetting_completed_date AS [Legal Vetting to be Completed], final_dcn_approved_date AS [Final DCN & draft bill Approved by Minister], advance_copy_date AS [Advance Copy to be Sent to PMO & Cab Sectt], approved_by_cabinet_date AS [Approved By Cabinet],
    bill_introduced_in_parliament_date AS [Bill Introduced In Parliament], bill_passed_date AS [Bill Passed], bill_notified_date AS [Bill Notified], completed_date AS [Completed], updated_date AS [Last Updated Date]`;
const DETAIL_FIELDS = ['Subject', 'Draft Bill Prepared', 'Pre-DCN & Draft Bill Approved by Minister', 'Circulated For IMC',
    'IMC Comments Received', 'DCN & Draft Bill prepared', 'DCN & Draft Bill Approved by Minister', 'Submitted for Legal Vetting',
    'Legal Vetting to be Completed', 'Final DCN & draft bill Approved by Minister', 'Advance Copy to be Sent to PMO & Cab Sectt',
    'Approved By Cabinet', 'Bill Introduced In Parliament', 'Bill Passed', 'Bill Notified', 'Completed', 'Last Updated Date'];

// The grid's columns: the result's fields, or the given ones when there are no rows
// (an empty result is 200 with no rows, not an error)
function sendGrid(res, rowData, fields) {
    const keys = rowData.length ? Object.keys(rowData[0]) : fields;
    const columnDefs = keys.map((key) => ({
        headerName: key.charAt(0).toUpperCase() + key.slice(1),
        field: key,
    }));
    res.json({ columnDefs, rowData });
}

// A positive whole-number id from the URL, or null
const toId = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n > 0 ? n : null;
};
// A stage number from the URL (0 = no status ... 15), or null
const toStage = (v) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= STAGE_COLUMNS.length ? n : null;
};

async function billWingWiseData (req, res) {
    const conn = await pool;
    try {
        const request = conn.request();
        const scope = await billScope(request, req.user.userId);
        const result = await request.query(`SELECT
            mmt_wings.wing_id,
            mmt_wings.wing_name AS Wing,
            ${STAGE_COUNTS}
        FROM mmt_wings
        LEFT JOIN tbl_bill ON ${BILL_WING} = mmt_wings.wing_id AND ${scope}
        GROUP BY mmt_wings.wing_id, mmt_wings.wing_name
        ORDER BY wing_id;`);
        sendGrid(res, result.recordset, ['wing_id', 'Wing', TOTAL_COLUMN, ...STAGE_COLUMNS]);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function billDivisionWiseData (req, res) {
    const wingID = toId(req.params.wingID);
    if (!wingID) return res.status(400).json({ message: 'Invalid wing id.' });
    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    try {
        const scope = await billScope(request, req.user.userId);
        const result = await request.query(`SELECT
            mmt_division.division_id,
            mmt_division.division_name AS Division,
            ${STAGE_COUNTS}
        FROM mmt_division
        LEFT JOIN tbl_bill ON tbl_bill.division = mmt_division.division_id AND ${scope}
        WHERE mmt_division.wing_id = @wingID
        GROUP BY mmt_division.division_id, mmt_division.division_name
        ORDER BY division_id;`);
        sendGrid(res, result.recordset, ['division_id', 'Division', TOTAL_COLUMN, ...STAGE_COLUMNS]);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

// The abstract (wing and division wise) in one query: every wing with each of its divisions,
// and a wing with no divisions as one row (Division NULL) so it is not left out
async function billAbstractData (req, res) {
    const conn = await pool;
    try {
        const request = conn.request();
        const scope = await billScope(request, req.user.userId);
        const result = await request.query(`SELECT
            mmt_wings.wing_id,
            mmt_wings.wing_name AS Wing,
            mmt_division.division_id,
            mmt_division.division_name AS Division,
            ${STAGE_COUNTS}
        FROM mmt_wings
        LEFT JOIN mmt_division ON mmt_division.wing_id = mmt_wings.wing_id
        LEFT JOIN tbl_bill ON tbl_bill.division = mmt_division.division_id AND ${scope}
        GROUP BY mmt_wings.wing_id, mmt_wings.wing_name, mmt_division.division_id, mmt_division.division_name
        ORDER BY mmt_wings.wing_name, mmt_division.division_name;`);
        sendGrid(res, result.recordset, ['wing_id', 'Wing', 'division_id', 'Division', TOTAL_COLUMN, ...STAGE_COLUMNS]);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getDetailBillWingWise (req, res) {
    const wingID = toId(req.params.wingID);
    const billStage = toStage(req.params.billStage);
    if (!wingID || billStage === null) return res.status(400).json({ message: 'Invalid wing or stage.' });
    const conn = await pool;
    const request = conn.request();
    request.input("wingID", wingID);
    request.input("billStage", billStage);
    try {
        const scope = await billScope(request, req.user.userId);
        const result = await request.query(`SELECT ${DETAIL_COLUMNS}
            FROM tbl_bill
            WHERE ${BILL_WING} = @wingID AND tbl_bill.stage_id = @billStage AND ${scope}
            ORDER BY subject;`);
        sendGrid(res, result.recordset, DETAIL_FIELDS);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

async function getDetailBillDivisionWise (req, res) {
    const divisionID = toId(req.params.divisionID);
    const billStage = toStage(req.params.billStage);
    if (!divisionID || billStage === null) return res.status(400).json({ message: 'Invalid division or stage.' });
    const conn = await pool;
    const request = conn.request();
    request.input("divisionID", divisionID);
    request.input("billStage", billStage);
    try {
        const scope = await billScope(request, req.user.userId);
        const result = await request.query(`SELECT ${DETAIL_COLUMNS}
            FROM tbl_bill
            WHERE division = @divisionID AND tbl_bill.stage_id = @billStage AND ${scope}
            ORDER BY subject;`);
        sendGrid(res, result.recordset, DETAIL_FIELDS);
    } catch (err) {
        console.log(err);
        return res.sendStatus(500);
    }
}

export default { billWingWiseData, billDivisionWiseData, billAbstractData, getDetailBillWingWise, getDetailBillDivisionWise };
