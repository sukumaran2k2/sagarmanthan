/* global describe, it, expect */
import {
  EMPLOYEE_DATA_PATH,
  buildAddEmployeeUrl,
  canonicalAppointmentMethod,
  readAddEmployeeHandoff,
  vacancyDetailsPath,
  vacancyFromPostRow,
} from '../../utils/addEmployeeHandoff';

const read = (url) => readAddEmployeeHandoff(new URLSearchParams(url.split('?')[1] || ''));

describe('Add Employee hand-off URL', () => {
  it('carries only the post code and the page to return to', () => {
    const url = buildAddEmployeeUrl({ postCode: '01001002002', returnTo: vacancyDetailsPath(42, 1) });
    expect(url).toBe(`${EMPLOYEE_DATA_PATH}?postCode=01001002002&returnTo=%2Fhr%2Fhr-management%2Fvacancy-details%2F42%2F1`);
    expect(read(url)).toEqual({ postCode: '01001002002', returnTo: '/hr/hr-management/vacancy-details/42/1' });
  });

  it('is absent when the form is opened normally', () => {
    expect(readAddEmployeeHandoff(new URLSearchParams(''))).toBeNull();
    expect(readAddEmployeeHandoff(new URLSearchParams('postCode=%20%20'))).toBeNull();
  });

  it('only returns to pages inside the HR module', () => {
    const returnTo = (value) =>
      readAddEmployeeHandoff(new URLSearchParams({ postCode: 'P1', returnTo: value })).returnTo;
    expect(returnTo('/hr/hr-management/vacancy-details/7/1')).toBe('/hr/hr-management/vacancy-details/7/1');
    expect(returnTo('https://evil.example/hr/hr-management/')).toBeNull();
    expect(returnTo('//evil.example/hr/hr-management/x')).toBeNull();
    expect(returnTo('/hr/hr-management//evil.example')).toBeNull();
    expect(returnTo('/projects/list')).toBeNull();
    expect(buildAddEmployeeUrl({ postCode: 'P1', returnTo: 'https://evil.example' })).not.toContain('returnTo');
  });

  it('points abolished vacancies back to the abolished view', () => {
    expect(vacancyDetailsPath('12', 0)).toBe('/hr/hr-management/vacancy-details/12/0');
    expect(vacancyDetailsPath('12')).toBe('/hr/hr-management/vacancy-details/12/1');
  });
});

describe('vacancy read from the backend', () => {
  it('maps stored method spellings onto the form\'s list', () => {
    expect(canonicalAppointmentMethod('promotion')).toBe('Promotion');
    expect(canonicalAppointmentMethod('Deputation-in')).toBe('Deputation In');
    expect(canonicalAppointmentMethod('direct recruitment (compassionate method)')).toBe('Direct Recruitment (Compassionate Method)');
    expect(canonicalAppointmentMethod('Reversion')).toBeNull();
    expect(canonicalAppointmentMethod(null)).toBeNull();
  });

  const row = {
    post_code: 'P1', post_id: '01001002', department_id: '001', department_name: 'Civil', post_name: 'AE',
    method_of_appointment: 'Composite Method', date_of_arise_in_vacancy: '2025-05-01', vacant_or_filled: 'vacant', organisation_id: 1,
  };

  it('reads a vacant post of the user\'s organisation', () => {
    expect(vacancyFromPostRow(row, 1)).toEqual({
      department: '001', departmentName: 'Civil', postId: '01001002', postName: 'AE',
      method: 'Composite Method', vacancyDate: '2025-05-01', status: 'vacant',
    });
  });

  it('flags a filled post (any case) and a post of another organisation', () => {
    expect(vacancyFromPostRow({ ...row, vacant_or_filled: 'Filled' }, 1).status).toBe('filled');
    expect(vacancyFromPostRow(row, 2).status).toBe('otherOrganisation');
  });

  it('never guesses "filled" when the status is missing (e.g. a backend without these fields)', () => {
    const oldBackendRow = { post_code: 'P1', post_id: '01001002', department_id: '001', department_name: 'Civil', post_name: 'AE' };
    expect(vacancyFromPostRow(oldBackendRow, 1)).toMatchObject({ status: 'unverified', method: null, vacancyDate: '' });
    expect(vacancyFromPostRow({ ...row, vacant_or_filled: 'Vacant ' }, 1).status).toBe('vacant');
  });

  it('is null for an unknown post code and drops a malformed date', () => {
    expect(vacancyFromPostRow(undefined, 1)).toBeNull();
    expect(vacancyFromPostRow({ ...row, date_of_arise_in_vacancy: '01/05/2025' }, 1).vacancyDate).toBe('');
  });
});
