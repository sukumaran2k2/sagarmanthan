/* global describe, it, expect */
import { HR_VIEWS, resolveHrView, hrViewAllows, hrInputForms, hrPageFromPath } from '../../utils/hrViews';
import {
  nonPortDataMonth, monthName, nonPortTotals, nonPortExServiceSlices, nonPortPwbdSlices, nonPortCommunitySlices,
} from '../../utils/nonPortDashboard';

const MENU = ['hr-dashboard', 'non-port-monthly-upload', 'organisation-structure', 'vacancy-management', 'abolished-posts',
  'employee-database', 'administration', 'contractual-employment', 'training-details', 'input-form', 'reports'];
const menuOf = (view) => MENU.filter((page) => hrViewAllows(view, page));

describe('resolveHrView', () => {
  it('splits organisation users by organisation category (1 = Major Ports)', () => {
    expect(resolveHrView({ isOrgUser: true, organisationCategoryId: 1 })).toBe(HR_VIEWS.PORT);
    expect(resolveHrView({ isOrgUser: true, organisationCategoryId: 3 })).toBe(HR_VIEWS.NON_PORT);
    expect(resolveHrView({ isOrgUser: true, organisationCategoryId: '1' })).toBe(HR_VIEWS.PORT);
  });

  it('treats an uncategorised organisation as non-port, and an unknown category (old token) as a port', () => {
    expect(resolveHrView({ isOrgUser: true, organisationCategoryId: null })).toBe(HR_VIEWS.NON_PORT);
    expect(resolveHrView({ isOrgUser: true })).toBe(HR_VIEWS.PORT);
  });

  it('gives Secretary / Joint Secretary their own view and every other ministry user the ministry view', () => {
    expect(resolveHrView({ isOrgUser: false, uiViewCode: 'SECRETARY_JS' })).toBe(HR_VIEWS.SECRETARY);
    expect(resolveHrView({ isOrgUser: false, uiViewCode: 'STANDARD' })).toBe(HR_VIEWS.MINISTRY);
    expect(resolveHrView({ isOrgUser: false, uiViewCode: 'DIRECTOR', organisationCategoryId: 1 })).toBe(HR_VIEWS.MINISTRY);
  });
});

describe('pages per view', () => {
  it('Major Ports keep every page except the non-port upload', () => {
    expect(menuOf(HR_VIEWS.PORT)).toEqual(MENU.filter((p) => p !== 'non-port-monthly-upload'));
  });

  it('non-port organisations: dashboard, monthly upload, contractual & training, input forms, reports', () => {
    expect(menuOf(HR_VIEWS.NON_PORT)).toEqual(
      ['hr-dashboard', 'non-port-monthly-upload', 'contractual-employment', 'training-details', 'input-form', 'reports']);
    expect(hrViewAllows(HR_VIEWS.NON_PORT, 'employee-details')).toBe(false);
    expect(hrViewAllows(HR_VIEWS.NON_PORT, 'add-post')).toBe(false);
  });

  it('Secretary: dashboard, abolished posts, contractual & training, reports', () => {
    expect(menuOf(HR_VIEWS.SECRETARY)).toEqual(
      ['hr-dashboard', 'abolished-posts', 'contractual-employment', 'training-details', 'reports']);
  });

  it('other ministry users: everything except Organisation Structure and the organisation-only pages', () => {
    expect(menuOf(HR_VIEWS.MINISTRY)).toEqual(['hr-dashboard', 'abolished-posts',
      'employee-database', 'contractual-employment', 'training-details', 'reports']);
    expect(hrViewAllows(HR_VIEWS.MINISTRY, 'organisation-structure')).toBe(false);
  });

  it('offers non-port organisations the contractual, training and monthly upload forms', () => {
    expect(hrInputForms(HR_VIEWS.PORT)).toEqual(['contractual-data', 'training-data', 'employee-data', 'add-post']);
    expect(hrInputForms(HR_VIEWS.NON_PORT)).toEqual(['contractual-data', 'training-data', 'non-port-upload']);
    expect(hrInputForms(HR_VIEWS.SECRETARY)).toEqual([]);
  });

  it('reads the page from the URL', () => {
    expect(hrPageFromPath('/hr/hr-management/reports/training-details')).toBe('reports');
    expect(hrPageFromPath('/hr/hr-management/Non-Port-Monthly-Upload/upload')).toBe('non-port-monthly-upload');
    expect(hrPageFromPath('/hr/hr-management')).toBe('hr-dashboard');
  });
});

describe('non-port dashboard data', () => {
  it('shows the previous month (the server reads last month\'s upload)', () => {
    expect(nonPortDataMonth(new Date(2026, 9, 28))).toEqual({ year: 2026, month: 9, label: 'September 2026' });
    expect(nonPortDataMonth(new Date(2026, 0, 5))).toEqual({ year: 2025, month: 12, label: 'December 2025' });
    expect(monthName('03')).toBe('March');
    expect(monthName('x')).toBe('x');
  });

  it('maps the other-org totals', () => {
    expect(nonPortTotals({
      totalSanctionedAndFilledPost: { total_sanctioned_strength: 120, filled_post: 90 },
      totalLiveVacantPost: { totalLivePost: 25 },
      totalAbolishedVacantPost: { totalAbolishedPost: 5 },
    })).toEqual({ sanctioned: 120, filled: 90, live: 25, abolished: 5 });
    expect(nonPortTotals(undefined)).toEqual({ sanctioned: 0, filled: 0, live: 0, abolished: 0 });
  });

  it('maps ex-service, PwBD and community counts to donut slices', () => {
    expect(nonPortExServiceSlices([
      { whether_ex_serviceman: 1, gender: 'Male', emp_count: 3 },
      { whether_ex_serviceman: 0, gender: 'Female', emp_count: 7 },
    ])).toEqual([
      { category: 'Ex-service', value: 3, male: 3, female: 0, unknown: 0 },
      { category: 'Non Ex-service', value: 7, male: 0, female: 7, unknown: 0 },
    ]);
    expect(nonPortPwbdSlices([{ whether_pwbd: 'No', male_count: 4, female_count: 1, transgender_count: 0, total_count: 5 }]))
      .toEqual([{ category: 'No', value: 5, male: 4, female: 1, transgender: 0 }]);
    expect(nonPortCommunitySlices([{ sc_count: 2, st_count: 0, ur_count: 5, ob_count: 1, obc_count: 3, ews_count: 0, total_count: 13 }]))
      .toEqual([
        { category: 'SC', value: 2 },
        { category: 'OBC', value: 4 },
        { category: 'UR', value: 5 },
        { category: 'Other', value: 2 },
      ]);
  });
});
