import cron from 'node-cron';
import sql from 'mssql';
import { pool } from '../db.js';
import { dueSnapshotMonth, SNAPSHOT_DAY, SNAPSHOT_HOUR, SNAPSHOT_TIME_ZONE } from './hrSnapshotPeriod.js';

const CRON_EXPRESSION = `0 ${SNAPSHOT_HOUR} ${SNAPSHOT_DAY} * *`;
const CATCH_UP_DELAY_MS = 60 * 1000;

const label = ({ year, month }) => `${year}-${String(month).padStart(2, '0')}`;

// Returns { result: TAKEN | ALREADY_TAKEN | BUSY, snapshot_rows, contract_rows }
export async function runHrMonthlySnapshot({ year, month, source = 'SCHEDULED', force = false, userId = null }) {
    const conn = await pool;
    const request = conn.request();
    request.input('year', sql.Int, year);
    request.input('month', sql.Int, month);
    request.input('source', sql.NVarChar(20), source);
    request.input('force', sql.Bit, force ? 1 : 0);
    request.input('userId', sql.Int, userId);
    const result = await request.execute('dbo.usp_hr_monthly_snapshot');
    return result.recordset?.[0] ?? { result: 'UNKNOWN' };
}

// Run row for the month, or null
export async function getHrSnapshotRun({ year, month }) {
    const conn = await pool;
    const result = await conn.request()
        .input('year', sql.Int, year)
        .input('month', sql.Int, month)
        .query(`
            SELECT snapshot_year, snapshot_month, status, source, snapshot_rows, contract_rows,
                   started_at, finished_at, message
            FROM dbo.tbl_hr_snapshot_run
            WHERE snapshot_year = @year AND snapshot_month = @month
        `);
    return result.recordset[0] ?? null;
}

export async function listHrSnapshotRuns() {
    const conn = await pool;
    const result = await conn.request().query(`
        SELECT snapshot_year, snapshot_month, status, source, snapshot_rows, contract_rows,
               started_at, finished_at, message, triggered_by
        FROM dbo.tbl_hr_snapshot_run
        ORDER BY snapshot_year DESC, snapshot_month DESC
    `);
    return result.recordset;
}

async function takeDueMonth(reason) {
    const period = dueSnapshotMonth();
    if (!period) return; // nothing due before the 10th, 23:00
    try {
        // Skip a month already taken
        const run = await getHrSnapshotRun(period);
        if (run?.status === 'SUCCESS') {
            console.log(`HR snapshot ${label(period)} already taken (${run.source}); skipped (${reason})`);
            return;
        }

        const outcome = await runHrMonthlySnapshot({ ...period, source: 'SCHEDULED' });
        if (outcome.result === 'TAKEN') {
            console.log(`HR snapshot ${label(period)} taken (${reason}): ${outcome.snapshot_rows} rows, ${outcome.contract_rows} contract rows`);
        } else if (outcome.result === 'ALREADY_TAKEN') {
            console.log(`HR snapshot ${label(period)} already taken by another server; skipped (${reason})`);
        } else if (outcome.result === 'BUSY') {
            console.log(`HR snapshot ${label(period)} skipped (${reason}): another run holds the lock`);
        }
    } catch (err) {
        // Log only; a failed month is retried on the next start-up
        console.error(`HR snapshot ${label(period)} failed (${reason}):`, err.message);
    }
}

export function scheduleHrMonthlySnapshot() {
    if (String(process.env.HR_SNAPSHOT_ENABLED ?? 'true').toLowerCase() === 'false') {
        console.log('HR monthly snapshot is switched off (HR_SNAPSHOT_ENABLED=false)');
        return;
    }

    cron.schedule(CRON_EXPRESSION, () => takeDueMonth('monthly schedule'), { timezone: SNAPSHOT_TIME_ZONE });

    // Catch up if this month's run was missed
    setTimeout(() => takeDueMonth('start-up catch-up'), CATCH_UP_DELAY_MS).unref();
}
