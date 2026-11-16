/* global describe, it, expect, jest, beforeEach */
import { getSessionClaims, isSuperAdmin, isViewOnlyAdmin } from '../../authSession';
import {
  canAccessMenuItem,
  filterMenuByAccess,
  hasModuleAccess,
  hasModuleReadAccess,
} from '../../moduleAccess';

jest.mock('../../authSession', () => ({
  getSessionClaims: jest.fn(),
  isOrgSeniorOfficer: jest.fn(() => false),
  isSuperAdmin: jest.fn(() => false),
  isViewOnlyAdmin: jest.fn(() => false),
}));

const perm = (moduleCode, flags) => ({
  moduleCode,
  create: false,
  read: false,
  update: false,
  delete: false,
  ...flags,
});

const setClaims = (allowedModuleCodes, modulePermissions) => {
  getSessionClaims.mockReturnValue({ allowedModuleCodes, modulePermissions });
};

describe('hasModuleReadAccess', () => {
  beforeEach(() => {
    isSuperAdmin.mockReturnValue(false);
    isViewOnlyAdmin.mockReturnValue(false);
  });

  it('allows a module the org has when the user has Read', () => {
    setClaims(['CAPEX'], [perm('CAPEX', { read: true })]);
    expect(hasModuleReadAccess('CAPEX')).toBe(true);
  });

  it('denies when Read is off, even with Create on', () => {
    setClaims(['CAPEX'], [perm('CAPEX', { create: true, update: true })]);
    expect(hasModuleReadAccess('CAPEX')).toBe(false);
  });

  it('denies when the user has no permission row', () => {
    setClaims(['CAPEX'], []);
    expect(hasModuleReadAccess('CAPEX')).toBe(false);
  });

  it('denies when the org does not have the module, even with Read', () => {
    setClaims([], [perm('CAPEX', { read: true })]);
    expect(hasModuleReadAccess('CAPEX')).toBe(false);
  });

  it('lets View Only Admin read any module the org has', () => {
    isViewOnlyAdmin.mockReturnValue(true);
    setClaims(['CAPEX'], []);
    expect(hasModuleReadAccess('CAPEX')).toBe(true);
  });

  it('matches the Read row under another spelling of the code', () => {
    setClaims(['GMIS_IMW_MOU_TRACKING'], [perm('GMIS_MOU', { read: true })]);
    expect(hasModuleReadAccess('GMIS_IMW_MOU_TRACKING')).toBe(true);

    setClaims(['DRISHTI_PORTAL'], [perm('DRISHTI_PORTAL', { read: true })]);
    expect(hasModuleReadAccess('OVOD')).toBe(true);
    expect(hasModuleAccess('ONE_VISION_ONE_DOCUMENT')).toBe(true);
  });
});

describe('menu filtering', () => {
  beforeEach(() => {
    isSuperAdmin.mockReturnValue(false);
    isViewOnlyAdmin.mockReturnValue(false);
  });

  it('drops items and whole menus for modules without Read', () => {
    setClaims(
      ['CAPEX', 'PROJECTS'],
      [perm('CAPEX', { read: true }), perm('PROJECTS', { create: true })]
    );

    const menu = filterMenuByAccess([
      { id: 'capex', items: [{ label: 'Capex', moduleCode: 'CAPEX' }] },
      { id: 'projects', items: [{ label: 'Projects', moduleCode: 'PROJECTS' }] },
      { id: 'contact' },
    ]);

    expect(menu.map((m) => m.id)).toEqual(['capex', 'contact']);
    expect(canAccessMenuItem({ moduleCode: 'PROJECTS' })).toBe(false);
  });
});
