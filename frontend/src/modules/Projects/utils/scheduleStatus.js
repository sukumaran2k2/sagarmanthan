/** Days before target when an open step is considered at risk. */
export const SCHEDULE_AT_RISK_DAYS = 7;

export const SCHEDULE_STATUS = Object.freeze({
  PENDING: 'pending',
  TARGET_MISSING: 'target_missing',
  NOT_APPLICABLE: 'not_applicable',
  ON_TRACK: 'on_track',
  AT_RISK: 'at_risk',
  OVERDUE: 'overdue',
  COMPLETED_ON_TIME: 'completed_on_time',
  COMPLETED_LATE: 'completed_late',
  /** @deprecated Use COMPLETED_ON_TIME — kept for older imports. */
  ON_TIME: 'completed_on_time',
});

const OPEN_STATUS_KEYS = new Set([
  SCHEDULE_STATUS.OVERDUE,
  SCHEDULE_STATUS.AT_RISK,
  SCHEDULE_STATUS.ON_TRACK,
]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDateOnly(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const iso = text.includes('T') ? text.slice(0, 10) : text.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return null;
  // Guard against JS date overflow (e.g. 2024-02-31 → Mar 2).
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysBetween(fromDate, toDate) {
  if (!fromDate || !toDate) return null;
  return Math.round((toDate.getTime() - fromDate.getTime()) / MS_PER_DAY);
}

function pluralDays(count, suffix) {
  return `${count} day${count === 1 ? '' : 's'} ${suffix}`;
}

function formatDisplayDate(date) {
  if (!date) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/** Prefer revised target when present; otherwise planned. */
export function getEffectiveTargetDate({ plannedDate, revisedDate } = {}) {
  const revised = String(revisedDate || '').trim();
  if (revised) return revised;
  return String(plannedDate || '').trim();
}

function buildStatus({ key, label, shortLabel = label, days = null, tone, description }) {
  return { key, label, shortLabel, days, tone, description };
}

/**
 * Compare a target date against an actual date (or today when actual is empty).
 *
 * Completed rules (when actual is set):
 * - actual > target  → Completed Late
 * - actual <= target → Completed On Time
 */
export function getScheduleStatus({
  targetDate,
  actualDate,
  now = new Date(),
  atRiskDays = SCHEDULE_AT_RISK_DAYS,
} = {}) {
  const target = toDateOnly(targetDate);
  const actual = toDateOnly(actualDate);
  const today = startOfToday(now);

  if (!target && !actual) {
    return buildStatus({
      key: SCHEDULE_STATUS.PENDING,
      label: 'Pending',
      tone: 'neutral',
      description: 'Target and actual dates not set',
    });
  }

  if (!target && actual) {
    return buildStatus({
      key: SCHEDULE_STATUS.TARGET_MISSING,
      label: 'No Target',
      shortLabel: 'No Target',
      tone: 'neutral',
      description: 'Actual date entered without a target date to compare',
    });
  }

  if (actual) {
    const slip = daysBetween(target, actual);

    if (slip > 0) {
      return buildStatus({
        key: SCHEDULE_STATUS.COMPLETED_LATE,
        label: 'Completed Late',
        days: slip,
        tone: 'warning',
        description: `Completed ${pluralDays(slip, 'after target')}`,
      });
    }

    return buildStatus({
      key: SCHEDULE_STATUS.COMPLETED_ON_TIME,
      label: 'Completed On Time',
      days: slip === 0 ? 0 : Math.abs(slip),
      tone: 'success',
      description:
        slip === 0
          ? 'Completed on target date'
          : `Completed ${pluralDays(Math.abs(slip), 'before target')}`,
    });
  }

  const remaining = daysBetween(today, target);

  if (remaining < 0) {
    const overdueDays = Math.abs(remaining);
    return buildStatus({
      key: SCHEDULE_STATUS.OVERDUE,
      label: 'Overdue',
      days: overdueDays,
      tone: 'danger',
      description: `Overdue by ${pluralDays(overdueDays, '').trim()}`,
    });
  }

  if (remaining <= atRiskDays) {
    const targetLabel = formatDisplayDate(target);
    return buildStatus({
      key: SCHEDULE_STATUS.AT_RISK,
      label: 'At Risk',
      days: remaining,
      tone: 'caution',
      description:
        remaining === 0
          ? `Due today (${targetLabel})`
          : `Due in ${pluralDays(remaining, '').trim()} (target ${targetLabel})`,
    });
  }

  return buildStatus({
    key: SCHEDULE_STATUS.ON_TRACK,
    label: 'On Track',
    days: remaining,
    tone: 'info',
    description: `${pluralDays(remaining, 'remaining')}`,
  });
}

const NOT_APPLICABLE_STATUS = Object.freeze(
  buildStatus({
    key: SCHEDULE_STATUS.NOT_APPLICABLE,
    label: 'Not Applicable',
    shortLabel: 'N/A',
    tone: 'neutral',
    description: 'Step marked as not applicable',
  })
);

/**
 * Schedule status for an Under Tendering step row.
 * Effective target = revised date when set, otherwise planned date.
 */
export function getTenderStepScheduleStatus(
  row = {},
  { nominationMode = false, now = new Date(), atRiskDays = SCHEDULE_AT_RISK_DAYS } = {}
) {
  const skipped =
    Boolean(row.notApplicable) || (nominationMode && Number(row.id) >= 1 && Number(row.id) <= 6);

  if (skipped) return NOT_APPLICABLE_STATUS;

  const targetDate = getEffectiveTargetDate({
    plannedDate: row.plannedDate,
    revisedDate: row.revisedDate,
  });

  const status = getScheduleStatus({
    targetDate,
    actualDate: row.actualDate,
    now,
    atRiskDays,
  });

  if (status.key === SCHEDULE_STATUS.PENDING) {
    return buildStatus({
      key: SCHEDULE_STATUS.TARGET_MISSING,
      label: 'No Target',
      shortLabel: 'No Target',
      tone: 'neutral',
      description: 'Target date not set for this tendering step',
    });
  }

  return status;
}

export function summarizeScheduleStatuses(statuses = []) {
  const counts = {
    pending: 0,
    target_missing: 0,
    not_applicable: 0,
    on_track: 0,
    at_risk: 0,
    overdue: 0,
    completed_on_time: 0,
    completed_late: 0,
    total: statuses.length,
  };

  statuses.forEach((item) => {
    const key = item?.key;
    if (key && Object.prototype.hasOwnProperty.call(counts, key)) {
      counts[key] += 1;
    }
  });

  return counts;
}

function resolveBottleneckLabel(row = {}) {
  return row.label || row.milestone || row.name || 'Current step';
}

const ATTENTION_STATUS_KEYS = new Set([
  SCHEDULE_STATUS.OVERDUE,
  SCHEDULE_STATUS.AT_RISK,
  SCHEDULE_STATUS.COMPLETED_LATE,
]);

/**
 * First open step that still has work remaining (current bottleneck).
 * @param {Array} rows
 * @param {(row: object) => object|null} [getStatus]
 */
export function findCurrentBottleneck(rows = [], getStatus) {
  const resolveStatus =
    typeof getStatus === 'function'
      ? getStatus
      : (row) =>
          getScheduleStatus({
            targetDate: row.targetedEndDate,
            actualDate: row.actualEndDate,
          });

  for (const row of rows) {
    const status = resolveStatus(row);
    if (!status) continue;
    if (OPEN_STATUS_KEYS.has(status.key)) {
      return { row, status, label: resolveBottleneckLabel(row) };
    }
  }
  return null;
}

export function findTenderBottleneck(rows = [], options = {}) {
  return findCurrentBottleneck(rows, (row) => {
    const status = getTenderStepScheduleStatus(row, options);
    if (status.key === SCHEDULE_STATUS.NOT_APPLICABLE) return null;
    return status;
  });
}

/**
 * All tendering steps that need review (Overdue / At Risk / Completed Late).
 */
export function listTenderAttentionItems(rows = [], options = {}) {
  const items = [];

  rows.forEach((row) => {
    const status = getTenderStepScheduleStatus(row, options);
    if (!status || status.key === SCHEDULE_STATUS.NOT_APPLICABLE) return;
    if (!ATTENTION_STATUS_KEYS.has(status.key)) return;
    items.push({
      row,
      status,
      label: resolveBottleneckLabel(row),
    });
  });

  return items;
}
