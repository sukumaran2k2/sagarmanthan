export const SNAPSHOT_TIME_ZONE = 'Asia/Kolkata';
// Snapshot runs on the 10th at 23:00 IST for the previous month
export const SNAPSHOT_DAY = 10;
export const SNAPSHOT_HOUR = 23;

// Current date parts in India time
export function istParts(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: SNAPSHOT_TIME_ZONE,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        hourCycle: 'h23',
    }).formatToParts(now);
    const part = (type) => Number(parts.find((p) => p.type === type).value);
    return { year: part('year'), month: part('month'), day: part('day'), hour: part('hour') };
}

export function istYearMonth(now = new Date()) {
    const { year, month } = istParts(now);
    return { year, month };
}

const monthBefore = ({ year, month }) => (month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 });

export function previousMonth(now = new Date()) {
    return monthBefore(istYearMonth(now));
}

// Previous month once the 10th, 23:00 has passed; otherwise null
export function dueSnapshotMonth(now = new Date()) {
    const { year, month, day, hour } = istParts(now);
    const deadlinePassed = day > SNAPSHOT_DAY || (day === SNAPSHOT_DAY && hour >= SNAPSHOT_HOUR);
    return deadlinePassed ? monthBefore({ year, month }) : null;
}

export function parseSnapshotPeriod(yearValue, monthValue) {
    const year = Number.parseInt(yearValue, 10);
    const month = Number.parseInt(monthValue, 10);
    if (!(year >= 2000 && year <= 2100) || !(month >= 1 && month <= 12)) return null;
    return { year, month };
}
