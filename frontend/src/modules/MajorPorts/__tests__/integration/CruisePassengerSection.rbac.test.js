/* global jest, describe, it, expect, beforeEach, require, global */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  createCruisePassengerActual,
  createCruisePassengerTarget,
  deleteCruisePassengerActual,
  deleteCruisePassengerTarget,
  fetchCruisePassengerActual,
  fetchCruisePassengerActuals,
  fetchCruisePassengerTargets,
  updateCruisePassengerActual,
  updateCruisePassengerTarget,
} from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';

// react-router needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MemoryRouter, Route, Routes } = require('react-router-dom');
const CruisePassengerSection = require('../../pages/CruisePassengerTraffic/CruisePassengerSection').default;

const mockPermissions = { current: {} };
jest.mock('../../hooks/useCruisePassengerPermissions', () => ({
  useCruisePassengerPermissions: () => mockPermissions.current,
}));

// The PDF helper pulls in amCharts (ESM only), which jest cannot load
jest.mock('../../pages/Traffic/trafficExport', () => ({
  copyRowsToClipboard: jest.fn(),
  downloadExcel: jest.fn(),
  downloadPdf: jest.fn(),
}));

// AG Grid does not render in jsdom; show the rows, formatted cells and action cells instead
jest.mock('../../../../components/Table', () => ({
  __esModule: true,
  default: ({ rowData = [], columnDefs = [] }) => {
    const actionCol = columnDefs.find((c) => c.headerName === 'Update');
    const cell = (col, row) => (col.valueFormatter ? col.valueFormatter({ value: row[col.field], data: row }) : null);
    return (
      <div data-testid="grid">
        <div data-testid="grid-headers">{columnDefs.map((c) => c.headerName).join(' | ')}</div>
        {rowData.map((row, i) => (
          <div key={i} data-testid="grid-row">
            {row.organisation_name}
            <span data-testid="grid-cells">{columnDefs.map((c) => cell(c, row)).filter(Boolean).join(' | ')}</span>
            {actionCol ? actionCol.cellRenderer({ data: row }) : null}
          </div>
        ))}
      </div>
    );
  },
}));

const ACTUAL_ROW = {
  id: 175, fiscal_year: '2026-2027', month: 8, organisation_id: 1, organisation_name: 'Chennai Port Authority',
  handles_passenger_ferry: false,
  total_cruise_vessel_domestic: 6, total_cruise_vessel_international: 2,
  total_cruise_passengers_domestic: 17129, total_cruise_passengers_international: 5184,
  total_ferry_calls: null, total_ferry_passengers: null,
  total_cruise_vessel_calls: 8, total_cruise_passengers: 22313,
  last_updated: '2026-09-05T00:00:00Z',
};

const TARGET_ROW = {
  id: 7, financial_year: '2026-2027', organisation_id: 1, organisation_name: 'Chennai Port Authority',
  target_cruise_vessel_calls: 40, target_ferry_calls: 0, last_updated: '2026-09-01T00:00:00Z',
};

jest.mock('../../api', () => {
  const page = (data = []) => Promise.resolve({ data: { data, pagination: { total: data.length, page: 1, limit: 10, totalPages: data.length ? 1 : 0 } } });
  return {
    fetchCruisePassengerMasters: jest.fn(() => Promise.resolve({
      data: { organisations: [{ organisation_id: 1, organisation_name: 'Chennai Port Authority', is_major_port: true }] },
    })),
    fetchCruisePassengerActuals: jest.fn(() => page()),
    fetchCruisePassengerActual: jest.fn(),
    createCruisePassengerActual: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
    updateCruisePassengerActual: jest.fn(() => Promise.resolve({ data: { success: true } })),
    deleteCruisePassengerActual: jest.fn(() => Promise.resolve({ data: { success: true } })),
    fetchCruisePassengerTargets: jest.fn(() => page()),
    createCruisePassengerTarget: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
    updateCruisePassengerTarget: jest.fn(() => Promise.resolve({ data: { success: true } })),
    deleteCruisePassengerTarget: jest.fn(() => Promise.resolve({ data: { success: true } })),
  };
});

const BASE = '/kpi/major-ports/major-ports-input-form/cruise-passenger-traffic';

const MINISTRY = {
  canView: true, isOrgScope: false, isMinistryView: true,
  canEnterActuals: false, canEditActuals: false, canDeleteActuals: false,
  canAddTarget: true, canEditTarget: true, canDeleteTarget: true,
};

const ORGANISATION = {
  canView: true, isOrgScope: true, isMinistryView: false,
  canEnterActuals: true, canEditActuals: true, canDeleteActuals: true,
  canAddTarget: false, canEditTarget: false, canDeleteTarget: false,
};

const pageOf = (rows) => () => Promise.resolve({
  data: { data: rows, pagination: { total: rows.length, page: 1, limit: 10, totalPages: rows.length ? 1 : 0 } },
});

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[`${BASE}/${path}`]}>
      <Routes>
        <Route path={`${BASE}/*`} element={<CruisePassengerSection triggerNotification={jest.fn()} onBackToSections={jest.fn()} />} />
      </Routes>
    </MemoryRouter>
  );
}

const SECTION_TABS = ['Input Form', 'Targets', 'Actuals'];
const tabOrder = () => screen.getAllByRole('button')
  .map((b) => b.textContent.trim())
  .filter((name) => SECTION_TABS.includes(name));

const input = (label) => screen.getByLabelText(new RegExp(`^${label.replace(/[()./-]/g, '\\$&')}`));

async function choosePeriod() {
  const month = screen.getByLabelText(/^month/i);
  fireEvent.change(month, { target: { value: within(month).getAllByRole('option')[1].value } });
  await waitFor(() => expect(fetchCruisePassengerActuals).toHaveBeenCalledWith(
    expect.objectContaining({ fiscalYear: currentFinancialYear(), limit: 1 })
  ));
}

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  // clearAllMocks keeps implementations set by an earlier test; start every test with empty lists
  fetchCruisePassengerActuals.mockImplementation(pageOf([]));
  fetchCruisePassengerTargets.mockImplementation(pageOf([]));
});

describe('Cruise and Passenger Traffic section — ministry user', () => {
  beforeEach(() => {
    mockPermissions.current = MINISTRY;
  });

  it('opens Targets first, with Input Form / Targets / Actuals tabs', async () => {
    renderAt('');

    await waitFor(() => expect(fetchCruisePassengerTargets).toHaveBeenCalled());
    expect(tabOrder()).toEqual(['Input Form', 'Targets', 'Actuals']);
  });

  it('lists targets with Update and Delete, and deletes after confirmation', async () => {
    fetchCruisePassengerTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    expect(await screen.findByRole('button', { name: /update targets for chennai/i })).toBeInTheDocument();
    expect(screen.getByTestId('grid-headers').textContent.split(' | ')).toEqual([
      'S.No', 'Financial Year', 'Organisation', 'Target Cruise Vessel Calls', 'Target Ferry Calls', 'Last Updated Date', 'Update',
    ]);
    fireEvent.click(screen.getByRole('button', { name: /delete targets for chennai/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteCruisePassengerTarget).toHaveBeenCalledWith(7));
  });

  it('uses the target form as its Input Form and needs both whole-number targets', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Cruise and Ferry Targets')).toBeInTheDocument();
    const org = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(org).getByRole('option', { name: 'Chennai Port Authority' })).toBeInTheDocument());
    fireEvent.change(org, { target: { value: '1' } });
    fireEvent.change(input('Target Cruise Vessel Calls'), { target: { value: '12.5' } });
    fireEvent.click(screen.getByRole('button', { name: /submit targets/i }));

    expect(await screen.findByText('Enter a whole number')).toBeInTheDocument();
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(createCruisePassengerTarget).not.toHaveBeenCalled();

    fireEvent.change(input('Target Cruise Vessel Calls'), { target: { value: '40' } });
    fireEvent.change(input('Target Ferry Calls'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /submit targets/i }));
    await waitFor(() => expect(createCruisePassengerTarget).toHaveBeenCalledWith({
      financialYear: currentFinancialYear(),
      organisationId: 1,
      values: { target_cruise_vessel_calls: 40, target_ferry_calls: 0 },
    }));
  });

  it('warns when the organisation and year already have targets', async () => {
    fetchCruisePassengerTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('input-form');
    const org = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(org).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(screen.getByLabelText(/^financial year/i), { target: { value: '2026-2027' } });
    fireEvent.change(org, { target: { value: '1' } });

    expect(await screen.findByText(/already exist/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit targets/i })).toBeDisabled();
  });

  it('edits targets from the list with the organisation and year locked', async () => {
    fetchCruisePassengerTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    fireEvent.click(await screen.findByRole('button', { name: /update targets for chennai/i }));
    expect(await screen.findByText('Update Cruise and Ferry Targets')).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    const calls = input('Target Cruise Vessel Calls');
    expect(calls).toHaveValue(40);

    fireEvent.change(calls, { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: /update targets/i }));
    await waitFor(() => expect(updateCruisePassengerTarget).toHaveBeenCalledWith(7, {
      values: { target_cruise_vessel_calls: 45, target_ferry_calls: 0 },
    }));
  });

  it('shows the Actuals columns of every organisation, without edit actions', async () => {
    fetchCruisePassengerActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    expect((await screen.findByTestId('grid-headers')).textContent.split(' | ')).toEqual([
      'S.No', 'Organisation', 'Financial Year', 'Month', 'Handles Passenger Ferries',
      'Total Cruise Vessel Calls - Domestic', 'Total Cruise Vessel Calls - International',
      'Total Cruise Passengers - Domestic', 'Total Cruise Passengers - International',
      'Total Ferry Calls', 'Total Ferry Passengers', 'Last Updated Date',
    ]);
    expect(fetchCruisePassengerActuals.mock.calls[0][0]).toMatchObject({ fiscalYear: currentFinancialYear(), page: 1 });
    expect(await screen.findByText('Chennai Port Authority')).toBeInTheDocument();
    expect(screen.getByTestId('grid-cells').textContent).toContain('17,129');
    expect(screen.queryByRole('button', { name: /update cruise and passenger traffic/i })).not.toBeInTheDocument();
  });
});

describe('Cruise and Passenger Traffic section — organisation user', () => {
  beforeEach(() => {
    mockPermissions.current = ORGANISATION;
  });

  it('opens Actuals first, with Input Form / Actuals / Targets tabs and Update / Delete', async () => {
    fetchCruisePassengerActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('');

    expect(await screen.findByRole('button', { name: /update cruise and passenger traffic for august 2026-2027/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete cruise and passenger traffic for august 2026-2027/i })).toBeInTheDocument();
    expect(tabOrder()).toEqual(['Input Form', 'Actuals', 'Targets']);
    // No Organisation column for their own data; actions sit under "Update" as in the earlier portal
    const headers = screen.getByTestId('grid-headers').textContent.split(' | ');
    expect(headers.slice(0, 3)).toEqual(['S.No', 'Financial Year', 'Month']);
    expect(headers.slice(-2)).toEqual(['Last Updated Date', 'Update']);
  });

  it('hides Update and Delete without those permissions', async () => {
    mockPermissions.current = { ...ORGANISATION, canEditActuals: false, canDeleteActuals: false };
    fetchCruisePassengerActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    expect(await screen.findByText('Chennai Port Authority')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update cruise and passenger traffic/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete cruise and passenger traffic/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('grid-headers').textContent.split(' | ').pop()).toBe('Last Updated Date');
  });

  it('deletes a month after confirmation', async () => {
    fetchCruisePassengerActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    fireEvent.click(await screen.findByRole('button', { name: /delete cruise and passenger traffic for august 2026-2027/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteCruisePassengerActual).toHaveBeenCalledWith(175));
  });

  it('shows its targets read-only', async () => {
    fetchCruisePassengerTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    await screen.findByText(/targets are set by the ministry/i);
    await screen.findByTestId('grid');
    expect(screen.queryByRole('button', { name: /update targets/i })).not.toBeInTheDocument();
  });

  it('needs the ferry answer, totals the cruise values and submits without ferry values for "No"', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Cruise and Passenger Traffic')).toBeInTheDocument();
    expect(screen.getByLabelText(/^financial year/i)).toHaveValue(currentFinancialYear());
    await choosePeriod();

    const submit = screen.getByRole('button', { name: /submit cruise traffic/i });
    await waitFor(() => expect(submit).not.toBeDisabled());
    // Ferry values wait for the ferry answer
    expect(input('Total Ferry Calls')).toBeDisabled();

    fireEvent.change(input('Total Cruise Vessel Calls - Domestic'), { target: { value: '2' } });
    fireEvent.change(input('Total Cruise Vessel Calls - International'), { target: { value: '3' } });
    // The calculated total (exact label: the regex helper would also match "- Domestic")
    expect(screen.getByLabelText('Total Cruise Vessel Calls')).toHaveValue('5');

    fireEvent.click(submit);
    expect(await screen.findByText('Answer Yes or No')).toBeInTheDocument();
    expect(screen.getAllByText('Required')).toHaveLength(2);
    expect(createCruisePassengerActual).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('No'));
    fireEvent.change(input('Total Cruise Passengers - Domestic'), { target: { value: '900' } });
    fireEvent.change(input('Total Cruise Passengers - International'), { target: { value: '100' } });
    fireEvent.click(submit);

    await waitFor(() => expect(createCruisePassengerActual).toHaveBeenCalledTimes(1));
    const payload = createCruisePassengerActual.mock.calls[0][0];
    expect(payload).toMatchObject({
      fiscalYear: currentFinancialYear(),
      handlesPassengerFerry: false,
      values: {
        total_cruise_vessel_domestic: 2, total_cruise_vessel_international: 3,
        total_cruise_passengers_domestic: 900, total_cruise_passengers_international: 100,
      },
    });
    expect(payload.values).not.toHaveProperty('total_ferry_calls');
    expect(payload.values).not.toHaveProperty('total_cruise_vessel_calls');
  });

  it('asks for the ferry values when the port handles passenger ferries', async () => {
    renderAt('input-form');
    await choosePeriod();
    const submit = screen.getByRole('button', { name: /submit cruise traffic/i });
    await waitFor(() => expect(submit).not.toBeDisabled());

    fireEvent.click(screen.getByLabelText('Yes'));
    expect(input('Total Ferry Calls')).not.toBeDisabled();
    ['Total Cruise Vessel Calls - Domestic', 'Total Cruise Vessel Calls - International',
      'Total Cruise Passengers - Domestic', 'Total Cruise Passengers - International'].forEach((label) => {
      fireEvent.change(input(label), { target: { value: '0' } });
    });
    fireEvent.click(submit);
    expect(await screen.findAllByText('Required')).toHaveLength(2);

    fireEvent.change(input('Total Ferry Calls'), { target: { value: '60' } });
    fireEvent.change(input('Total Ferry Passengers'), { target: { value: '21154' } });
    fireEvent.click(submit);
    await waitFor(() => expect(createCruisePassengerActual).toHaveBeenCalledWith(expect.objectContaining({
      handlesPassengerFerry: true,
      values: expect.objectContaining({ total_ferry_calls: 60, total_ferry_passengers: 21154 }),
    })));
  });

  it('offers Open for Update when the chosen month already has data', async () => {
    renderAt('input-form');
    fetchCruisePassengerActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    await choosePeriod();

    expect(await screen.findByText(/has already been entered/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit cruise traffic/i })).toBeDisabled();
  });

  it('updates a month from Actuals with the saved values and the period locked', async () => {
    fetchCruisePassengerActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    fetchCruisePassengerActual.mockResolvedValue({ data: { data: ACTUAL_ROW } });
    renderAt('actuals');

    fireEvent.click(await screen.findByRole('button', { name: /update cruise and passenger traffic for august 2026-2027/i }));
    expect(await screen.findByText('Update Cruise and Passenger Traffic', { selector: 'h3' })).toBeInTheDocument();
    expect(fetchCruisePassengerActual).toHaveBeenCalledWith(175);
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    expect(screen.getByLabelText(/^month/i)).toHaveValue('August');

    const domestic = input('Total Cruise Vessel Calls - Domestic');
    await waitFor(() => expect(domestic).toHaveValue(6));
    expect(screen.getByLabelText('No')).toBeChecked();
    fireEvent.change(domestic, { target: { value: '7' } });
    fireEvent.click(screen.getByRole('button', { name: /update cruise traffic/i }));
    await waitFor(() => expect(updateCruisePassengerActual).toHaveBeenCalledWith(175, {
      handlesPassengerFerry: false,
      values: expect.objectContaining({ total_cruise_vessel_domestic: 7, total_cruise_passengers_international: 5184 }),
    }));
  });
});
