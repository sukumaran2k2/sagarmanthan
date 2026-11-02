/* global describe, it, expect, jest */
// The hook reads the organisation master from the HR store; these rules do not need it
jest.mock('../../store/useHrStore', () => ({ useHrStore: () => [] }));
import {
  canUseHrInputForm,
  canViewHrAdministration,
  canViewVacancyManagement,
} from '../../hooks/useHRPermissions';

const org = { isOrgUser: true, uiViewCode: 'STANDARD' };
const ministry = { isOrgUser: false, uiViewCode: 'STANDARD' };
const crud = (patch) => ({ create: false, read: true, update: false, delete: false, ...patch });

describe('HR page rules', () => {
  it('offers Vacancy Management to organisation users outside the Secretary/JS view', () => {
    expect(canViewVacancyManagement(org)).toBe(true);
    expect(canViewVacancyManagement({ ...org, uiViewCode: 'SECRETARY_JS' })).toBe(false);
    expect(canViewVacancyManagement(ministry)).toBe(false);
  });

  it('offers HR Administration to organisation users only', () => {
    expect(canViewHrAdministration(org)).toBe(true);
    expect(canViewHrAdministration(ministry)).toBe(false);
  });

  it('keeps Vacancy Management and HR Administration from non-port organisations', () => {
    const port = { ...org, organisationCategoryId: 1 };
    const nonPort = { ...org, organisationCategoryId: 3 };
    expect(canViewVacancyManagement(port)).toBe(true);
    expect(canViewVacancyManagement(nonPort)).toBe(false);
    expect(canViewHrAdministration(port)).toBe(true);
    expect(canViewHrAdministration(nonPort)).toBe(false);
  });

  it('offers the input form to organisation users who can create or update', () => {
    expect(canUseHrInputForm(org, crud({ create: true }))).toBe(true);
    expect(canUseHrInputForm(org, crud({ update: true }))).toBe(true);
    expect(canUseHrInputForm(org, crud())).toBe(false);
    expect(canUseHrInputForm(ministry, crud({ create: true, update: true }))).toBe(false);
  });
});
