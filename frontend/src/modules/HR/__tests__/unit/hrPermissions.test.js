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

  it('offers the input form to organisation users who can create or update', () => {
    expect(canUseHrInputForm(org, crud({ create: true }))).toBe(true);
    expect(canUseHrInputForm(org, crud({ update: true }))).toBe(true);
    expect(canUseHrInputForm(org, crud())).toBe(false);
    expect(canUseHrInputForm(ministry, crud({ create: true, update: true }))).toBe(false);
  });
});
