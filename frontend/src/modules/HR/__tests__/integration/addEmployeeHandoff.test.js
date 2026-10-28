/* global describe, it, expect, jest, beforeEach, require, global */
import { TextEncoder, TextDecoder } from 'util';

// react-router needs TextEncoder, which jsdom does not provide
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Every backend call is mocked: nothing is saved anywhere.
jest.mock('../../../../api', () => ({
  axiosInstance: {
    get: jest.fn((url) => {
      if (url.includes('/get-all-organisations')) {
        return Promise.resolve({ data: [{ organisation_id: 1, organisation_name: 'Chennai Port Authority' }, { organisation_id: 73, organisation_name: 'Other Organisation' }] });
      }
      return Promise.resolve({ data: [] });
    }),
    post: jest.fn(() => Promise.resolve({ status: 201, data: {} })),
  },
}));

jest.mock('../../../../config/api', () => ({ API_BASE_URL: '' }));

// Signed in to organisation 1
jest.mock('../../../../utils/authSession', () => ({
  ...jest.requireActual('../../../../utils/authSession'),
  getSessionClaims: () => ({ userId: 5, organisationId: 1 }),
  getSessionOrganisationId: () => 1,
}));

// The vacancy as stored: note the lower-case / hyphenated spellings found in the data
const VACANT_DEPUTATION = {
  post_code: 'P1', post_id: '77', department_id: '005', department_name: 'Marine Department', post_name: 'Pilot',
  method_of_appointment: 'Deputation-in', date_of_arise_in_vacancy: '2024-03-05', vacant_or_filled: 'vacant', organisation_id: 1,
};

jest.mock('../../api', () => ({
  fetchPostByPostCode: jest.fn(),
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

// Loaded after the TextEncoder polyfill above (require is not hoisted like import)
const React = require('react');
const { render, screen, fireEvent, waitFor } = require('@testing-library/react');
const { MemoryRouter, Routes, Route } = require('react-router-dom');
const EmployeeDataForm = require('../../components/EmployeeDataForm').default;
const { buildAddEmployeeUrl, vacancyDetailsPath } = require('../../utils/addEmployeeHandoff');

const h = (...args) => React.createElement(...args);
const HANDOFF_URL = buildAddEmployeeUrl({ postCode: 'P1', returnTo: vacancyDetailsPath(42, 1) });

function renderAt(url, notify = jest.fn()) {
  const utils = render(
    h(MemoryRouter, { initialEntries: [url] },
      h(Routes, null,
        h(Route, { path: '/hr/hr-management/input-form/employee-data', element: h(EmployeeDataForm, { notify }) }),
        h(Route, { path: '/hr/hr-management/vacancy-details/:postId/:isLive', element: h('div', null, 'Vacancy details page') }),
        h(Route, { path: '/hr/hr-management/employee-database', element: h('div', null, 'Employee database page') })
      )
    )
  );
  return { ...utils, notify };
}

const change = (el, value) => fireEvent.change(el, { target: { value } });

// Fills Basic Details and Education, then opens Designation & Post
async function goToDesignation(container) {
  await screen.findByRole('option', { name: 'Madhya Pradesh' }); // state master loaded
  change(screen.getByPlaceholderText('Enter Name of Employee'), 'Asha Rao');
  change(screen.getByPlaceholderText('Enter Reference Number'), 'REF-9');
  change(container.querySelectorAll('input[type="date"]')[0], '1990-06-15'); // DOB fills retirement
  screen.getAllByRole('combobox').forEach((select) => change(select, select.options[1].value));
  fireEvent.click(screen.getByText('Next Stage (Educational Qualification)'));
  change(screen.getByRole('combobox'), screen.getByRole('combobox').options[1].value);
  fireEvent.click(screen.getByText('Next Stage (Designation & Post)'));
  await screen.findByText('Submit Employee Data');
}

describe('Add Employee hand-off from Vacant Details', () => {
  beforeEach(() => {
    http.post.mockClear();
    hrApi.fetchPostByPostCode.mockReset();
    hrApi.fetchPostByPostCode.mockResolvedValue({ data: [VACANT_DEPUTATION] });
  });

  it('reads the vacancy from the backend, locks it, requires the other organisation name, and returns to the vacancy', async () => {
    const { container } = renderAt(HANDOFF_URL);

    expect(await screen.findByText(/Adding the employee for vacant post/)).toHaveTextContent('vacant post P1 through Deputation In');
    expect(hrApi.fetchPostByPostCode).toHaveBeenCalledWith('P1');

    await goToDesignation(container);

    // Read from the backend and shown read-only
    expect(screen.getByLabelText('Department')).toHaveValue('Marine Department');
    expect(screen.getByLabelText('Post Name')).toHaveValue('Pilot');
    expect(screen.getByLabelText('Method Of Appointment')).toHaveValue('Deputation In');
    expect(screen.getByLabelText('Post Code')).toHaveValue('P1');
    expect(screen.getByLabelText('Date of Arise in Vacancy')).toHaveValue('2024-03-05');
    expect(screen.getByLabelText('Parent Organisation')).toHaveValue('Other Organisation');
    ['Department', 'Post Name', 'Method Of Appointment', 'Post Code', 'Date of Arise in Vacancy', 'Parent Organisation'].forEach((label) =>
      expect(screen.getByLabelText(label)).toHaveAttribute('readonly')
    );

    // Joining date is the first editable date on this stage
    change(container.querySelectorAll('input[type="date"]:not([readonly])')[0], '2024-04-01');

    // The other organisation's name is mandatory
    fireEvent.click(screen.getByText('Submit Employee Data'));
    expect(await screen.findByText('Name of the organisation is required')).toBeInTheDocument();
    expect(http.post).not.toHaveBeenCalled();

    change(screen.getByPlaceholderText('Enter other organisation name'), 'Cochin Shipyard');
    fireEvent.click(screen.getByText('Submit Employee Data'));

    await waitFor(() => expect(http.post).toHaveBeenCalledTimes(1));
    expect(http.post.mock.calls[0][1]).toMatchObject({
      postCode: 'P1',
      appoinmentMethod: 'Deputation In',
      vacancyAriseDate: '2024-03-05',
      department: '005',
      empPostId: '77',
      empPostName: 'Pilot',
      parentOrganisation: '73',
      otherParentOrg: 'Cochin Shipyard',
      joiningDate: '2024-04-01',
      domicileState: '18', // the state_id, not the name (emp_domicile_state is an int)
      dateOfBirth: '1990-06-15',
      retirementDate: '2050-06-30', // end of the month at 60, in local time (not a day early via UTC)
      whethVhorOh: 'NA',
      empHighestEdu: 'Below SSLC',
    });
    expect(await screen.findByText('Vacancy details page')).toBeInTheDocument();
  });

  it.each([
    ['an already filled post', { ...VACANT_DEPUTATION, vacant_or_filled: 'Filled' }, 'Post Already Filled'],
    ['a post of another organisation', { ...VACANT_DEPUTATION, organisation_id: 9 }, 'Not Your Organisation'],
  ])('refuses %s', async (_case, row, title) => {
    hrApi.fetchPostByPostCode.mockResolvedValue({ data: [row] });
    const { notify } = renderAt(HANDOFF_URL);
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title })));
    expect(screen.getByRole('status')).toHaveTextContent('P1');
  });

  it('refuses an unknown post code', async () => {
    hrApi.fetchPostByPostCode.mockResolvedValue({ data: [] });
    const { notify } = renderAt(HANDOFF_URL);
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.objectContaining({ title: 'Post Not Found' })));
  });

  it('offers only the methods the post-code lookup supports when opened normally', async () => {
    const { container } = renderAt('/hr/hr-management/input-form/employee-data');
    // Text is capped at the column sizes (emp_name and emp_reference_id are nvarchar(50))
    expect(screen.getByPlaceholderText('Enter Name of Employee')).toHaveAttribute('maxLength', '50');
    expect(screen.getByPlaceholderText('Enter Reference Number')).toHaveAttribute('maxLength', '50');
    await goToDesignation(container);
    const methodSelect = screen.getAllByRole('combobox').find((s) =>
      [...s.options].some((o) => o.value === 'Composite Method')
    );
    expect([...methodSelect.options].map((o) => o.value).filter(Boolean)).toEqual([
      'Direct Recruitment', 'Direct Recruitment (Compassionate Method)', 'Composite Method', 'Transfer In',
    ]);
  });

  it('leaves the form untouched when opened normally', () => {
    renderAt('/hr/hr-management/input-form/employee-data');
    expect(screen.queryByRole('status')).toBeNull();
    expect(hrApi.fetchPostByPostCode).not.toHaveBeenCalled();
  });
});
