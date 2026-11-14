import { test } from 'node:test';
import assert from 'node:assert/strict';
import { istParts, previousMonth, dueSnapshotMonth, parseSnapshotPeriod } from './hrSnapshotPeriod.js';

test('the run on 10 November at 23:00 IST records October (month 10)', () => {
    // 2026-11-10 23:00 IST = 2026-11-10 17:30 UTC
    const run = new Date('2026-11-10T17:30:00Z');
    assert.deepEqual(istParts(run), { year: 2026, month: 11, day: 10, hour: 23 });
    assert.deepEqual(dueSnapshotMonth(run), { year: 2026, month: 10 });
});

test('before 10 November 23:00 IST nothing is due (October data entry is still open)', () => {
    // 2026-11-10 22:59 IST and 2026-11-01 00:30 IST
    assert.equal(dueSnapshotMonth(new Date('2026-11-10T17:29:00Z')), null);
    assert.equal(dueSnapshotMonth(new Date('2026-10-31T19:00:00Z')), null);
});

test('after the 10th the previous month stays due until the month ends', () => {
    assert.deepEqual(dueSnapshotMonth(new Date('2026-11-25T06:00:00Z')), { year: 2026, month: 10 });
    // 2026-11-30 23:59 IST
    assert.deepEqual(dueSnapshotMonth(new Date('2026-11-30T18:29:00Z')), { year: 2026, month: 10 });
});

test('January records December of the year before', () => {
    // 2027-01-10 23:30 IST
    assert.deepEqual(dueSnapshotMonth(new Date('2027-01-10T18:00:00Z')), { year: 2026, month: 12 });
    assert.equal(dueSnapshotMonth(new Date('2027-01-05T06:00:00Z')), null);
});

test('the month is read in India time, not the server time zone', () => {
    // 2026-10-31 19:00 UTC is already 1 November in India
    assert.deepEqual(previousMonth(new Date('2026-10-31T19:00:00Z')), { year: 2026, month: 10 });
});

test('request periods are validated', () => {
    assert.deepEqual(parseSnapshotPeriod('2026', '10'), { year: 2026, month: 10 });
    assert.equal(parseSnapshotPeriod('2026', '13'), null);
    assert.equal(parseSnapshotPeriod('abc', '1'), null);
    assert.equal(parseSnapshotPeriod('1999', '5'), null);
});
