/* global describe, it, expect, jest, beforeEach, require, global */
import { TextEncoder, TextDecoder } from 'util';

// react-router needs TextEncoder, which jsdom does not provide
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Every backend call is mocked: nothing is saved anywhere.
jest.mock('../../../../api', () => ({
  axiosInstance: {
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ status: 201, data: {} })),
  },
}));

jest.mock('../../../../config/api', () => ({ API_BASE_URL: '' }));

jest.mock('../../../../utils/authSession', () => ({
  ...jest.requireActual('../../../../utils/authSession'),
  getSessionClaims: () => ({ userId: 5, organisationId: 1 }),
  getSessionOrganisationId: () => 1,
}));

// The record as get-hr-employee-by-id returns it (employee master + current posting)
const RECORD = {
  emp_master_id: 5925, current_employee_id: '01EMP2522', emp_name: 'P.Sankar', emp_reference_id: '59389',
  emp_dob: '1970-05-10T00:00:00.000Z', emp_aadhar_number: '123456789012', emp_disability: 'NA', emp_religion: 'Hindu',
  emp_ethnic_origin: 'OBC', emp_domicile_state: 18, emp_gender: 'Male', ex_service_or_not: 0,
  emp_dor: '2030-05-31T00:00:00.000Z', emp_division_name: '', emp_highest_edu: 'UG', ug_count: 1, ug_discipline: '3',
  pg_count: null, pg_discipline: null, emp_discipline: 'Mechanical',
  emp_department_id: '007', emp_department_name: 'Traffic', emp_post_id: '01007051', emp_post_name: 'Winch Driver',
  method_of_appointment: 'Deputation In', emp_post_code: '01007051113', date_of_arise_in_vacancy: '2023-11-09T00:00:00.000Z',
  emp_post_join_date: '2026-10-01T00:00:00.000Z', emp_curr_org_join_date: '2026-04-09T00:00:00.000Z', emp_parent_org_id: null, emp_other_parent_org: null,
};

jest.mock('../../api', () => ({
  fetchPostByPostCode: jest.fn(),
  fetchHrEmployeeById: jest.fn(),
  updateHrEmployee: jest.fn(() => Promise.resolve({ status: 200, data: {} })),
  checkAadhaarExists: jest.fn(() => Promise.resolve({ data: { exists: 1 } })), // would be a duplicate if asked
  checkReferenceNumberExists: jest.fn(() => Promise.resolve({ data: { exists: 1 } })),
  fetchMmtDropdown: jest.fn((table) =>
    Promise.resolve({
      data: {
        mmt_state: [{ state_id: 18, state_name: 'Madhya Pradesh' }],
        mmt_organisation: [{ organisation_id: 1, organisation_name: 'Chennai Port Authority' }, { organisation_id: 73, organisation_name: 'Other Organisation' }],
      }[table] || [],
    })
  ),
}));

const http = require('../../../../api').axiosInstance;
const hrApi = require('../../api');
const React = require('react');
const { render, screen, fireEvent, waitFor } = require('@testing-library/react');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const EmployeeDataForm = require('../../components/EmployeeDataForm').default;

const h = (...args) => React.createElement(...args);
const ROW = { emp_master_id: 5925, employee_id: '01EMP2522', emp_name: 'P.Sankar' };

function renderEdit(notify = jest.fn()) {
  render(
    h(MemoryRouter, { initialEntries: ['/hr/hr-management/input-form/employee-data'] },
      h(Routes, null,
        h(Route, { path: '/hr/hr-management/input-form/employee-data', element: h(EmployeeDataForm, { notify, editData: ROW }) }),
        h(Route, { path: '/hr/hr-management/employee-details/:id', element: h('div', null, 'Employee details page') })
      )
    )
  );
  return notify;
}

describe('Edit employee from Employee Database', () => {
  beforeEach(() => {
    http.post.mockClear();
    hrApi.updateHrEmployee.mockClear();
    hrApi.checkAadhaarExists.mockClear();
    hrApi.checkReferenceNumberExists.mockClear();
    hrApi.fetchHrEmployeeById.mockReset();
    hrApi.fetchHrEmployeeById.mockResolvedValue({ data: { employee: RECORD } });
  });

  it('loads the record, keeps the posting read-only and updates with PUT (not add)', async () => {
    renderEdit();

    expect(await screen.findByText(/Updating/)).toHaveTextContent('Updating P.Sankar (01EMP2522)');
    expect(hrApi.fetchHrEmployeeById).toHaveBeenCalledWith('5925');
    expect(screen.getByText('Update Employee Data', { selector: 'h2' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Name of Employee')).toHaveValue('P.Sankar');

    // Through the stages to Designation & Post
    await screen.findByRole('option', { name: 'Madhya Pradesh' });
    fireEvent.click(screen.getByText('Next Stage (Educational Qualification)'));
    fireEvent.click(await screen.findByText('Next Stage (Designation & Post)'));
    await screen.findByText('Update Employee Data', { selector: 'span' });

    ['Department', 'Post Name', 'Method Of Appointment', 'Post Code', 'Date of Arise in Vacancy', 'Date of Joining in Current Organisation'].forEach((label) =>
      expect(screen.getByLabelText(label)).toHaveAttribute('readonly')
    );
    expect(screen.getByLabelText('Post Name')).toHaveValue('Winch Driver');
    expect(screen.getByLabelText('Post Code')).toHaveValue('01007051113');
    expect(screen.getByLabelText('Date of Joining in Current Organisation')).toHaveValue('2026-04-09');

    fireEvent.click(screen.getByText('Update Employee Data', { selector: 'span' }));

    await waitFor(() => expect(hrApi.updateHrEmployee).toHaveBeenCalledTimes(1));
    const [masterId, employeeId, payload] = hrApi.updateHrEmployee.mock.calls[0];
    expect([masterId, employeeId]).toEqual(['5925', '01EMP2522']);
    expect(payload).toMatchObject({
      employeeName: 'P.Sankar',
      referenceNumber: '59389',
      employeeAadhar: '123456789012',
      domicileState: '18',
      ugCount: 1,
      ugDisciplines: ['3'],
      empDiscipline: 'Mechanical', // not on the form: sent back so the update does not clear it
    });
    // The organisation joining date is shown (read-only above) but never sent
    expect(payload).not.toHaveProperty('joiningDate');
    // Own unchanged Aadhaar / reference are not "duplicates"; nothing goes to Add Employee
    expect(hrApi.checkAadhaarExists).not.toHaveBeenCalled();
    expect(hrApi.checkReferenceNumberExists).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    expect(await screen.findByText('Employee details page')).toBeInTheDocument(); // back to the employee
  });

  it('cannot submit when the record could not be loaded', async () => {
    hrApi.fetchHrEmployeeById.mockRejectedValue(new Error('Network Error'));
    const notify = renderEdit();
    expect(await screen.findByText(/could not be loaded, so it cannot be updated now/)).toBeInTheDocument();
    expect(notify).toHaveBeenCalled();
    expect(hrApi.updateHrEmployee).not.toHaveBeenCalled();
  });
});
