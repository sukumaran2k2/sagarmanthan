/* global describe, it, expect */
import {
  toDate, formatDate, formatDuration, retirementStatus, maskAadhaar, pwbdLabel, disciplineNames, serviceHistoryRows,
} from '../../utils/employeeDetails';

const TODAY = new Date(2026, 9, 26);

describe('Employee details formatting', () => {
  it('reads calendar dates and hides 1900 placeholders', () => {
    expect(formatDate('2026-04-09T00:00:00.000Z')).toBe('09-04-2026');
    expect(formatDate('1900-01-01T00:00:00.000Z')).toBe('--');
    expect(toDate(null)).toBeNull();
  });

  it('describes durations and retirement', () => {
    expect(formatDuration('2014-08-04', '2026-04-09')).toBe('11 yrs 8 mos');
    expect(formatDuration('2026-10-01', TODAY)).toBe('25 days');
    expect(formatDuration('2026-01-26', TODAY)).toBe('9 mos');
    expect(retirementStatus('2030-05-31', TODAY)).toBe('Retires in 3 yrs 7 mos');
    expect(retirementStatus('2020-01-31', TODAY)).toBe('Retired');
  });

  it('masks Aadhaar and names codes', () => {
    expect(maskAadhaar('8831 1250 4761')).toBe('XXXX XXXX 4761');
    expect(pwbdLabel('OH')).toBe('Orthopedically Handicapped (OH)');
    expect(disciplineNames('3, 5')).toEqual(['Engineering', 'Management']);
  });
});

describe('Service history rows', () => {
  const rows = serviceHistoryRows([
    { transaction_id: 3, emp_post_code: null, method_of_appointment: 'Deputation In', emp_post_join_date: null },
    { transaction_id: 2, emp_post_code: '01007051113', emp_post_name: 'Winch Driver', emp_department_name: 'Traffic',
      method_of_appointment: 'Deputation In', emp_post_join_date: '2026-10-01T00:00:00.000Z', working_organisation_name: 'Chennai Port Authority' },
    { transaction_id: 1, emp_post_code: '01007023045', emp_post_name: 'Mazdoor CHD', method_of_appointment: 'Direct Recruitment',
      activity_name: 'Deputation Out', org_to_be_deputed: 1, deputation_start_date: '2026-10-01', deputation_end_date: '2029-09-30',
      emp_post_join_date: '2026-04-09', emp_post_end_date: '2026-09-30' },
    { transaction_id: 0, emp_post_code: 'X', method_of_appointment: 'Promotion', activity_name: 'Separation',
      separation_reason: 'Redeployment-out', emp_post_join_date: '2014-08-04', emp_post_end_date: '2026-04-09' },
  ], (id) => (id === 1 ? 'Chennai Port Authority' : ''), TODAY);

  it('marks pending, current and closed postings', () => {
    expect(rows.map((r) => [r.pending, r.isCurrent])).toEqual([[true, false], [false, true], [false, false], [false, false]]);
    expect(rows[1]).toMatchObject({ post: 'Winch Driver', duration: '25 days', organisation: 'Chennai Port Authority' });
  });

  it('explains each activity', () => {
    expect(rows[2].activityDetail).toBe('to Chennai Port Authority · 01-10-2026 – 30-09-2029');
    expect(rows[3].activityDetail).toBe('Redeployment-out');
    expect(rows[3].duration).toBe('11 yrs 8 mos');
  });
});
