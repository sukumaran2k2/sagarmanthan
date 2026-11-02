/* global describe, it, expect, jest, beforeEach, require, global */
import { TextEncoder, TextDecoder } from 'util';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Every backend call is mocked: nothing is saved anywhere.
jest.mock('../../../../api', () => ({ axiosInstance: { get: jest.fn(), post: jest.fn() } }));
jest.mock('../../../../config/api', () => ({ API_BASE_URL: '' }));
jest.mock('../../../../utils/authSession', () => ({
  ...jest.requireActual('../../../../utils/authSession'),
  isOrganisationUser: () => true,
  getSessionClaims: () => ({ userId: 5, organisationId: 1, roleId: 7 }),
  getSessionOrganisationId: () => 1,
}));

const EMPLOYEE = {
  emp_master_id: 5925, current_employee_id: '01EMP2522', emp_name: 'P.Sankar', emp_reference_id: '59389', emp_status: 1,
  emp_dob: '1970-05-02T00:00:00.000Z', emp_dor: '2030-05-31T00:00:00.000Z', emp_curr_org_join_date: '2026-04-09T00:00:00.000Z',
  emp_aadhar_number: '883112504761', emp_gender: 'Male', emp_religion: 'Hindu', emp_ethnic_origin: 'UR', emp_domicile_state: 18,
  emp_disability: 'NA', ex_service_or_not: 0, emp_highest_edu: 'below SSLC', ug_discipline: '3', pg_discipline: '',
  emp_department_name: 'Traffic', emp_post_name: 'Winch Driver', emp_post_code: '01007051113 ', method_of_appointment: 'Deputation In',
  emp_parent_org_joined_date: '1900-01-01T00:00:00.000Z',
};
const HISTORY = [
  { transaction_id: 26128, emp_post_code: '01007051113', emp_post_name: 'Winch Driver', emp_department_name: 'Traffic',
    method_of_appointment: 'Deputation In', emp_post_join_date: '2026-10-01T00:00:00.000Z' },
  { transaction_id: 24509, emp_post_code: '01007023045', emp_post_name: 'Mazdoor CHD', emp_department_name: 'Traffic',
    method_of_appointment: 'Direct Recruitment', activity_name: 'Deputation Out', org_to_be_deputed: 1,
    emp_post_join_date: '2026-04-09T00:00:00.000Z', emp_post_end_date: '2026-09-30T00:00:00.000Z' },
];

jest.mock('../../api', () => ({
  fetchHrEmployeeById: jest.fn(),
  fetchEmployeeServiceHistory: jest.fn(),
  fetchMmtDropdown: jest.fn((table) => Promise.resolve({
    data: {
      mmt_state: [{ state_id: 18, state_name: 'Madhya Pradesh' }],
      mmt_organisation: [{ organisation_id: 1, organisation_name: 'Chennai Port Authority' }],
    }[table] || [],
  })),
}));

const hrApi = require('../../api');
const React = require('react');
const { render, screen, fireEvent } = require('@testing-library/react');
const { MemoryRouter, Routes, Route, useLocation } = require('react-router-dom');
const EmployeeDetails = require('../../pages/EmployeeDetails').default;

const h = (...args) => React.createElement(...args);
function EditTarget() {
  const location = useLocation();
  return h('div', null, `Edit form for ${location.state?.item?.employee_id}`);
}
function renderAt(props = {}) {
  render(
    h(MemoryRouter, { initialEntries: ['/hr/hr-management/employee-details/5925'] },
      h(Routes, null,
        h(Route, { path: '/hr/hr-management/employee-details/:empMasterId', element: h(EmployeeDetails, { notify: jest.fn(), ...props }) }),
        h(Route, { path: '/hr/hr-management/input-form/employee-data', element: h(EditTarget) })
      )
    )
  );
}

describe('Employee Details page', () => {
  beforeEach(() => {
    hrApi.fetchHrEmployeeById.mockReset().mockResolvedValue({ data: { employee: EMPLOYEE, profileImage: null } });
    hrApi.fetchEmployeeServiceHistory.mockReset().mockResolvedValue({ data: HISTORY });
  });

  it('shows the profile, details and service history', async () => {
    renderAt();
    expect(await screen.findByRole('heading', { name: 'P.Sankar' })).toBeInTheDocument();
    expect(hrApi.fetchHrEmployeeById).toHaveBeenCalledWith('5925');
    expect(hrApi.fetchEmployeeServiceHistory).toHaveBeenCalledWith('5925', 1, 7);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getAllByText('09-04-2026').length).toBeGreaterThan(0); // joined the organisation
    expect(await screen.findByText('Madhya Pradesh')).toBeInTheDocument(); // state id named
    expect(screen.getByText('Below SSLC')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();

    // Aadhaar masked until revealed
    expect(screen.getByText('XXXX XXXX 4761')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Show Aadhaar number'));
    expect(screen.getByText('883112504761')).toBeInTheDocument();

    // History: legacy header and columns, as on today; the current posting runs to today
    const d = new Date();
    const today = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    expect(screen.getByRole('heading', { name: `Employee Service History (as on ${today})` })).toBeInTheDocument();
    ['S.No', 'From Date', 'To Date', 'Department', 'Post Name', 'Post Code', 'Method of Appointment / Activity'].forEach((col) =>
      expect(screen.getByRole('columnheader', { name: col })).toBeInTheDocument()
    );
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent(`01-10-2026${today}`);
    expect(rows[1].className).not.toMatch(/emerald|green/);
    expect(screen.getByText('Direct Recruitment / Deputation Out')).toBeInTheDocument();
    expect(await screen.findByText('to Chennai Port Authority')).toBeInTheDocument();
    // No edit button without permission
    expect(screen.queryByText('Edit Details')).toBeNull();
  });

  it('opens the edit form for the current posting', async () => {
    renderAt({ canEdit: true });
    fireEvent.click(await screen.findByText('Edit Details'));
    expect(await screen.findByText('Edit form for 01EMP2522')).toBeInTheDocument();
  });

  it('explains when the employee belongs to another organisation', async () => {
    hrApi.fetchHrEmployeeById.mockRejectedValue({ response: { status: 403 } });
    renderAt();
    expect(await screen.findByText(/belongs to another organisation/)).toBeInTheDocument();
  });
});
