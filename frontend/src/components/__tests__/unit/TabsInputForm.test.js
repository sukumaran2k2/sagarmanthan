/* global describe, it, expect, jest, beforeEach */
import React from 'react';
import { render } from '@testing-library/react';
import Tabs from '../../Tabs';
import { setAccessToken, clearAccessToken } from '../../../utils/tabSession';

jest.mock('../../../assets/sagarmanthan_logo.png', () => 'logo.png');
jest.mock('../../../api', () => ({
  axiosInstance: { get: jest.fn(() => Promise.resolve({ data: [] })) },
}));

// Unsigned test token with the given claims
const tokenFor = (claims) => `h.${btoa(JSON.stringify(claims))}.s`;

const MODULES = [
  'CSR_PROJECTS', 'KPI_DGLL', 'KPI_CSL', 'KPI_IMU', 'KPI_SCI', 'KPI_MAJOR_PORTS',
  'CABINET_NOTES_OTHER_MINISTRIES', 'VIP_REFERENCE', 'FOREIGN_VISIT', 'MEDIA_OUTREACH',
  'BILLS_PRE_CONSTITUTION', 'NMP', 'MIV_2030', 'GMIS_IMW_MOU_TRACKING', 'DRISHTI_PORTAL',
];

// An organisation user (role 6) with every module above, Read on, and Create as given
const signIn = (create) => {
  setAccessToken(tokenFor({
    userId: 99,
    roleId: 6,
    roleCode: 'ORG_USER',
    dataScopeCode: 'ORGANISATION',
    organisationId: 1,
    allowedModuleCodes: MODULES,
    modulePermissions: MODULES.map((moduleCode) => ({
      moduleCode, create, read: true, update: false, delete: false,
    })),
  }));
};

const renderMenu = () => render(<Tabs activeTab="landing" setActiveTab={jest.fn()} />);
const count = (view, text) => view.queryAllByText(text).length;

describe('Tabs menu: Input Form follows the Create tick', () => {
  beforeEach(() => clearAccessToken());

  it('hides every Input Form except Major Ports when Create is off', () => {
    signIn(true);
    const withCreate = renderMenu();
    const formsWithCreate = count(withCreate, /Input Form/);
    const listsWithCreate = count(withCreate, /Data List/);
    withCreate.unmount();

    signIn(false);
    const withoutCreate = renderMenu();

    // 14 modules lose their Input Form; Major Ports keeps it (it also opens Targets/Actuals)
    expect(formsWithCreate).toBeGreaterThanOrEqual(15);
    expect(count(withoutCreate, /Input Form/)).toBe(1);
    expect(withoutCreate.container.innerHTML).not.toMatch(/DGLL Input Form|NMP Input Form|CSR Input Form/);
    // Everything else in those modules stays
    expect(count(withoutCreate, /Data List/)).toBe(listsWithCreate);
  });
});
