import { pool } from "../../db.js";

/*
 * K-2.1.1 & K-2.1.2 — Flagging of Vessels (Addition / Deletion) report.
 *
 * Both reports share the same MMD-wise shape. Only the column set changes
 * (addition_* vs deletion_*). Each MMD row carries:
 *   - previous FY sums   (Apr <FY-1> → Mar <FY>)
 *   - current  FY sums   (Apr <FY>   → last reported month of current FY)
 *
 * The response includes:
 *   - rowData        : one row per MMD + a Total row
 *   - prevFyLabel    : e.g. "2025-2026"
 *   - currFyUpto     : e.g. "30/09/2026"  (last day of the most recent month
 *                      that has at least one row in the current FY)
 *   - asOnDate       : dd-MM-yyyy (same date used for currFyUpto)
 *   - reportMonth    : current month name + year (e.g. "November 2026")
 */

// Build the Indian FY window around GETDATE() and the "upto" date based on the
// latest reported month in the current FY. All totals are MMD-wise sums.
async function runFlaggingReport(req, res, kind /* 'addition' | 'deletion' */) {
  const conn = await pool;
  const request = conn.request();

  const prefix = kind === 'deletion' ? 'deletion' : 'addition';
  const colReceived   = `${prefix}_application_received`;
  const colRegistered = `${prefix}_registered_ship`;
  const colPending    = `${prefix}_pending_application`;
  const colTonnage    = `${prefix}_total_tonnage`;

  try {
    const sql = `
      DECLARE @today DATE = GETDATE();
      DECLARE @m INT = MONTH(@today);
      DECLARE @y INT = YEAR(@today);

      -- Indian FY: April to March. If we're in Jan–Mar, current FY started last calendar year.
      DECLARE @currFyStartYear INT = CASE WHEN @m >= 4 THEN @y ELSE @y - 1 END;
      DECLARE @currFyEndYear   INT = @currFyStartYear + 1;
      DECLARE @prevFyStartYear INT = @currFyStartYear - 1;
      DECLARE @prevFyEndYear   INT = @currFyStartYear;

      -- The row carries the FY in its own 'year' column; 'month' is a 1-12 int.
      -- A record is in FY X-(X+1) when (year = X AND month >= 4) OR (year = X+1 AND month <= 3).

      -- Find the latest reported (year, month) in the current FY so we can label
      -- the "upto" column header. If nothing has been filed yet, the "upto"
      -- falls back to the last day of March of the current FY start.
      DECLARE @uptoYear INT;
      DECLARE @uptoMonth INT;
      SELECT TOP 1 @uptoYear = year, @uptoMonth = month
      FROM tbl_kpi_dgs_2_1
      WHERE (year = @currFyStartYear AND month >= 4)
         OR (year = @currFyEndYear   AND month <= 3)
      ORDER BY year DESC, month DESC;

      IF @uptoYear IS NULL BEGIN
        SET @uptoYear = @currFyStartYear;
        SET @uptoMonth = 3;
      END

      -- Last day of (@uptoYear, @uptoMonth):
      DECLARE @uptoDate DATE = EOMONTH(DATEFROMPARTS(@uptoYear, @uptoMonth, 1));

      SELECT
        m.mmd_id,
        m.mmd_name,
        -- Previous FY
        ISNULL(SUM(CASE WHEN (f.year = @prevFyStartYear AND f.month >= 4)
                         OR (f.year = @prevFyEndYear   AND f.month <= 3)
                        THEN f.${colReceived}   ELSE 0 END), 0) AS prev_received,
        ISNULL(SUM(CASE WHEN (f.year = @prevFyStartYear AND f.month >= 4)
                         OR (f.year = @prevFyEndYear   AND f.month <= 3)
                        THEN f.${colRegistered} ELSE 0 END), 0) AS prev_registered,
        ISNULL(SUM(CASE WHEN (f.year = @prevFyStartYear AND f.month >= 4)
                         OR (f.year = @prevFyEndYear   AND f.month <= 3)
                        THEN f.${colPending}    ELSE 0 END), 0) AS prev_pending,
        ISNULL(SUM(CASE WHEN (f.year = @prevFyStartYear AND f.month >= 4)
                         OR (f.year = @prevFyEndYear   AND f.month <= 3)
                        THEN f.${colTonnage}    ELSE 0 END), 0) AS prev_tonnage,
        -- Current FY (up to and including the "upto" month)
        ISNULL(SUM(CASE WHEN ((f.year = @currFyStartYear AND f.month >= 4)
                           OR (f.year = @currFyEndYear   AND f.month <= 3))
                        AND (f.year < @uptoYear OR (f.year = @uptoYear AND f.month <= @uptoMonth))
                        THEN f.${colReceived}   ELSE 0 END), 0) AS curr_received,
        ISNULL(SUM(CASE WHEN ((f.year = @currFyStartYear AND f.month >= 4)
                           OR (f.year = @currFyEndYear   AND f.month <= 3))
                        AND (f.year < @uptoYear OR (f.year = @uptoYear AND f.month <= @uptoMonth))
                        THEN f.${colRegistered} ELSE 0 END), 0) AS curr_registered,
        ISNULL(SUM(CASE WHEN ((f.year = @currFyStartYear AND f.month >= 4)
                           OR (f.year = @currFyEndYear   AND f.month <= 3))
                        AND (f.year < @uptoYear OR (f.year = @uptoYear AND f.month <= @uptoMonth))
                        THEN f.${colPending}    ELSE 0 END), 0) AS curr_pending,
        ISNULL(SUM(CASE WHEN ((f.year = @currFyStartYear AND f.month >= 4)
                           OR (f.year = @currFyEndYear   AND f.month <= 3))
                        AND (f.year < @uptoYear OR (f.year = @uptoYear AND f.month <= @uptoMonth))
                        THEN f.${colTonnage}    ELSE 0 END), 0) AS curr_tonnage
      FROM mmt_mmd_name m
      -- tbl_kpi_dgs_2_1.type stores the MMD *name* string (e.g. 'Kolkata'),
      -- not the numeric mmd_id, so the join is on the name column.
      LEFT JOIN tbl_kpi_dgs_2_1 f ON f.type = m.mmd_name
      WHERE ISNULL(m.status, 1) = 1
      GROUP BY m.mmd_id, m.mmd_name
      ORDER BY m.mmd_name;

      SELECT
        @prevFyStartYear AS prevFyStart,
        @prevFyEndYear   AS prevFyEnd,
        @currFyStartYear AS currFyStart,
        @currFyEndYear   AS currFyEnd,
        @uptoDate        AS uptoDate,
        @today           AS today;
    `;

    const result = await request.query(sql);
    const rowData = result.recordsets[0] || [];
    const meta    = (result.recordsets[1] || [])[0] || {};

    const prevFyLabel = `${meta.prevFyStart}-${meta.prevFyEnd}`;
    const currFyUpto  = formatDdMmYyyy(meta.uptoDate, '/');
    const asOnDate    = formatDdMmYyyy(meta.uptoDate, '-');
    const reportMonth = formatReportMonth(meta.today);

    res.json({
      kind,
      prevFyLabel,
      currFyUpto,
      asOnDate,
      reportMonth,
      rowData,
    });
  } catch (err) {
    console.error(`Flagging ${kind} report error:`, err);
    return res.sendStatus(500);
  }
}

function pad2(n) { return String(n).padStart(2, '0'); }

function formatDdMmYyyy(value, sep) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad2(d.getDate())}${sep}${pad2(d.getMonth() + 1)}${sep}${d.getFullYear()}`;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
                     'July', 'August', 'September', 'October', 'November', 'December'];
function formatReportMonth(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export const getFlaggingAdditionReport = (req, res) => runFlaggingReport(req, res, 'addition');
export const getFlaggingDeletionReport = (req, res) => runFlaggingReport(req, res, 'deletion');

export default { getFlaggingAdditionReport, getFlaggingDeletionReport };
