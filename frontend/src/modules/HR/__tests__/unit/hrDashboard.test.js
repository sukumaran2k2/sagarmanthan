/* global describe, it, expect, require */
import {
  dashboardAsOnDate, toDdMmYyyy, readDashboardTotals, genderSlices, exServiceSlices, pwbdSlices,
  communitySlices, optionsFrom, classOptionsFrom, vacancyTotals,
} from '../../utils/hrDashboard';
import { employeeFormFromRecord, readEmployeeEditIds } from '../../utils/employeeEdit';

describe('HR dashboard data', () => {
  it('uses the as-on date of each organisation category', () => {
    const today = new Date(2026, 9, 26);
    expect(toDdMmYyyy(dashboardAsOnDate('1', today))).toBe('26-10-2026');
    expect(toDdMmYyyy(dashboardAsOnDate('2', today))).toBe('30-09-2026');
    expect(toDdMmYyyy(dashboardAsOnDate('3', today))).toBe('15-10-2026');
  });

  it('reads flat and nested totals', () => {
    expect(readDashboardTotals({
      combinedTotals: { totalSanctionedAndFilledPost: 4249, filled_post: 1997, totalLiveVacantPost: 1913, totalAbolishedVacantPost: 338 },
    })).toEqual({ sanctioned: 4249, filled: 1997, live: 1913, abolished: 338 });
    expect(readDashboardTotals({
      clusterTotals: {
        totalSanctionedAndFilledPost: { total_sanctioned_strength: 10, filled_post: 6 },
        totalLiveVacantPost: { totalLiveVacantPost: 3 },
        totalAbolishedVacantPost: { totalAbolishedVacantPost: 1 },
      },
    })).toEqual({ sanctioned: 10, filled: 6, live: 3, abolished: 1 });
    expect(readDashboardTotals(undefined)).toEqual({ sanctioned: 0, filled: 0, live: 0, abolished: 0 });
  });

  it('groups blank genders, communities and statuses', () => {
    expect(genderSlices([
      { gender: 'Female', count_of_emp: 340 }, { gender: 'Male', count_of_emp: 1600 },
      { gender: ' ', count_of_emp: 34 }, { gender: null, count_of_emp: 6 },
    ])).toEqual([{ category: 'Male', value: 1600 }, { category: 'Female', value: 340 }, { category: 'Not Specified', value: 40 }]);
    expect(communitySlices([{ community: 'SC', total: 5 }, { community: '', total: 2 }, { community: null, total: 1 }]))
      .toEqual([{ category: 'SC', value: 5 }, { category: 'Other', value: 3 }]);
    expect(exServiceSlices([
      { experience_status: 1, gender: 'Male', emp_count: 18 },
      { experience_status: 1, gender: 'Female', emp_count: 2 },
      { experience_status: 0, gender: 'Male', emp_count: 100 },
      { experience_status: 'Unknown', gender: 'Unknown', emp_count: 5 },
    ])).toEqual([
      { category: 'Ex-service', value: 20, male: 18, female: 2, unknown: 0 },
      { category: 'Non Ex-service', value: 100, male: 100, female: 0, unknown: 0 },
      { category: 'No Data', value: 5, male: 0, female: 0, unknown: 5 },
    ]);
    expect(pwbdSlices([{ pwbd_status: 'PH', male_count: 5, female_count: 0, transgender_count: 0, total_count: 5 }]))
      .toEqual([{ category: 'PH', value: 5, male: 5, female: 0, transgender: 0 }]);
  });

  it('builds filter options and vacancy totals from the rows', () => {
    const rows = [
      { department_id: '007', departmentname: 'Traffic', class: 'III/C', total_sanctioned_strength: 553, filled_post: 351, totalLivePost: 178, totalAbolishedPost: 24 },
      { department_id: '001', departmentname: 'Civil', class: 'I/A', total_sanctioned_strength: 10, filled_post: 5, totalLivePost: 5, totalAbolishedPost: 0 },
      { department_id: '007', departmentname: 'Traffic', class: null, total_sanctioned_strength: 1, filled_post: 0, totalLivePost: 1, totalAbolishedPost: 0 },
    ];
    expect(optionsFrom(rows, 'department_id', 'departmentname')).toEqual([{ value: '001', label: 'Civil' }, { value: '007', label: 'Traffic' }]);
    expect(classOptionsFrom(rows)).toEqual(['I/A', 'III/C']);
    expect(vacancyTotals(rows)).toEqual({ sanctioned: 564, actual: 356, live: 184, abolished: 24 });
  });
});

describe('Edit employee mapping', () => {
  it('needs both the master id and the employee id', () => {
    expect(readEmployeeEditIds({ emp_master_id: 5925, employee_id: '01EMP2522' })).toEqual({ masterId: '5925', employeeId: '01EMP2522' });
    expect(readEmployeeEditIds({ emp_master_id: 5925 })).toBeNull();
    expect(readEmployeeEditIds(null)).toBeNull();
  });

  it('fills the form from the record, keeping one discipline per degree', () => {
    const form = employeeFormFromRecord({
      emp_name: 'P.Sankar', emp_reference_id: '59389', emp_dob: '1970-05-10T00:00:00.000Z', emp_aadhar_number: null,
      emp_disability: 'No', emp_religion: 'Hindu', emp_ethnic_origin: 'OBC', emp_domicile_state: 21, emp_gender: 'Male',
      ex_service_or_not: 0, emp_dor: '2030-05-31T00:00:00.000Z', emp_highest_edu: 'UG', ug_count: 1, ug_discipline: '3', pg_discipline: '',
      emp_department_id: '007', emp_department_name: 'Traffic', emp_post_id: '01007051', emp_post_name: 'Winch Driver',
      method_of_appointment: 'Deputation In', emp_post_code: '01007051113 ', date_of_arise_in_vacancy: '2023-11-09T00:00:00.000Z',
      emp_post_join_date: '2026-10-01T00:00:00.000Z', emp_parent_org_id: 73, emp_other_parent_org: 'Cochin Shipyard',
    });
    expect(form).toMatchObject({
      employeeName: 'P.Sankar', dateOfBirth: '1970-05-10', employeeAadhar: '', domicileState: '21', exService: '0',
      ugCount: '1', ugDisciplines: ['3'], pgCount: '', pgDisciplines: [],
      department: '007', empPostId: '01007051', appoinmentMethod: 'Deputation In', postCode: '01007051113',
      vacancyAriseDate: '2023-11-09', joiningDate: '2026-10-01', parentOrganisation: '73', otherParentOrg: 'Cochin Shipyard',
    });
  });
});

describe('Stored highest education', () => {
  it('matches an option ignoring case and keeps other legacy values', () => {
    const { canonicalEducation } = require('../../utils/employeeEdit');
    expect(canonicalEducation('below SSLC')).toBe('Below SSLC');
    expect(canonicalEducation(' ug ')).toBe('UG');
    expect(canonicalEducation('B. Tech. (Civil)')).toBe('B. Tech. (Civil)');
    expect(canonicalEducation(null)).toBe('');
  });
});

describe('Dashboard department filter', () => {
  it('uses the department master, trimmed, de-duplicated and sorted by name', () => {
    const { departmentOptions } = require('../../utils/hrDashboard');
    expect(departmentOptions([
      { department_id: '007', department_name: 'Traffic' },
      { department_id: '001 ', department_name: ' Civil Engineering ' },
      { department_id: '007', department_name: 'Traffic' },
      { department_id: '', department_name: 'No id' },
    ])).toEqual([{ value: '001', label: 'Civil Engineering' }, { value: '007', label: 'Traffic' }]);
    expect(departmentOptions(undefined)).toEqual([]);
  });
});
