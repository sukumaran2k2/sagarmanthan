/* global jest, describe, it, expect, beforeEach, require, global */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  createRenewableEnergyActual,
  createRenewableEnergyTarget,
  deleteRenewableEnergyActual,
  deleteRenewableEnergyTarget,
  fetchRenewableEnergyActual,
  fetchRenewableEnergyActuals,
  fetchRenewableEnergyTargets,
  updateRenewableEnergyActual,
  updateRenewableEnergyTarget,
} from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';

// react-router needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MemoryRouter, Route, Routes } = require('react-router-dom');
const RenewableEnergySection = require('../../pages/RenewableEnergy/RenewableEnergySection').default;

const mockPermissions = { current: {} };
jest.mock('../../hooks/useRenewableEnergyPermissions', () => ({
  useRenewableEnergyPermissions: () => mockPermissions.current,
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
  id: 91, fiscal_year: '2026-2027', month: 8, organisation_id: 11, organisation_name: 'V.O. Chidambaranar Port Authority',
  electrical_energy_consumption: 1389.48, renewable_energy_consumption: 1398.3,
  last_updated: '2026-09-02T00:00:00Z',
};

const TARGET_ROW = {
  id: 4, financial_year: '2026-2027', organisation_id: 11, organisation_name: 'V.O. Chidambaranar Port Authority',
  target_renewable_energy_consumption: 18000, last_updated: '2026-09-01T00:00:00Z',
};

jest.mock('../../api', () => {
  const page = (data = []) => Promise.resolve({ data: { data, pagination: { total: data.length, page: 1, limit: 10, totalPages: data.length ? 1 : 0 } } });
  return {
    fetchRenewableEnergyMasters: jest.fn(() => Promise.resolve({
      data: { organisations: [{ organisation_id: 11, organisation_name: 'V.O. Chidambaranar Port Authority', is_major_port: true }] },
    })),
    fetchRenewableEnergyActuals: jest.fn(() => page()),
    fetchRenewableEnergyActual: jest.fn(),
    createRenewableEnergyActual: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
    updateRenewableEnergyActual: jest.fn(() => Promise.resolve({ data: { success: true } })),
    deleteRenewableEnergyActual: jest.fn(() => Promise.resolve({ data: { success: true } })),
    fetchRenewableEnergyTargets: jest.fn(() => page()),
    createRenewableEnergyTarget: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
    updateRenewableEnergyTarget: jest.fn(() => Promise.resolve({ data: { success: true } })),
    deleteRenewableEnergyTarget: jest.fn(() => Promise.resolve({ data: { success: true } })),
  };
});

const BASE = '/kpi/major-ports/major-ports-input-form/renewable-energy';

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
        <Route path={`${BASE}/*`} element={<RenewableEnergySection triggerNotification={jest.fn()} onBackToSections={jest.fn()} />} />
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
  await waitFor(() => expect(fetchRenewableEnergyActuals).toHaveBeenCalledWith(
    expect.objectContaining({ fiscalYear: currentFinancialYear(), limit: 1 })
  ));
}

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  // clearAllMocks keeps implementations set by an earlier test; start every test with empty lists
  fetchRenewableEnergyActuals.mockImplementation(pageOf([]));
  fetchRenewableEnergyTargets.mockImplementation(pageOf([]));
});

describe('Renewable Energy section — ministry user', () => {
  beforeEach(() => {
    mockPermissions.current = MINISTRY;
  });

  it('opens Targets first, with Input Form / Targets / Actuals tabs', async () => {
    renderAt('');

    await waitFor(() => expect(fetchRenewableEnergyTargets).toHaveBeenCalled());
    expect(tabOrder()).toEqual(['Input Form', 'Targets', 'Actuals']);
  });

  it('lists targets with Update and Delete, and deletes after confirmation', async () => {
    fetchRenewableEnergyTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    expect(await screen.findByRole('button', { name: /update target for v\.o\. chidambaranar/i })).toBeInTheDocument();
    expect(screen.getByTestId('grid-headers').textContent.split(' | ')).toEqual([
      'S.No', 'Financial Year', 'Organisation', 'Target Total Renewable Energy Consumption (MWh)', 'Last Updated Date', 'Update',
    ]);
    fireEvent.click(screen.getByRole('button', { name: /delete target for v\.o\. chidambaranar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteRenewableEnergyTarget).toHaveBeenCalledWith(4));
  });

  it('uses the target form as its Input Form and validates the MWh target', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Renewable Energy Target')).toBeInTheDocument();
    const org = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(org).getByRole('option', { name: 'V.O. Chidambaranar Port Authority' })).toBeInTheDocument());
    fireEvent.change(org, { target: { value: '11' } });
    fireEvent.click(screen.getByRole('button', { name: /submit target/i }));
    expect(await screen.findByText('Required')).toBeInTheDocument();

    fireEvent.change(input('Target Total Renewable Energy Consumption'), { target: { value: '100.125' } });
    fireEvent.click(screen.getByRole('button', { name: /submit target/i }));
    expect(await screen.findByText('Use at most 2 decimal places')).toBeInTheDocument();
    expect(createRenewableEnergyTarget).not.toHaveBeenCalled();

    fireEvent.change(input('Target Total Renewable Energy Consumption'), { target: { value: '18000.5' } });
    fireEvent.click(screen.getByRole('button', { name: /submit target/i }));
    await waitFor(() => expect(createRenewableEnergyTarget).toHaveBeenCalledWith({
      financialYear: currentFinancialYear(),
      organisationId: 11,
      values: { target_renewable_energy_consumption: 18000.5 },
    }));
  });

  it('warns when the organisation and year already have a target', async () => {
    fetchRenewableEnergyTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('input-form');
    const org = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(org).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(screen.getByLabelText(/^financial year/i), { target: { value: '2026-2027' } });
    fireEvent.change(org, { target: { value: '11' } });

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit target/i })).toBeDisabled();
  });

  it('edits a target from the list with the organisation and year locked', async () => {
    fetchRenewableEnergyTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    fireEvent.click(await screen.findByRole('button', { name: /update target for v\.o\. chidambaranar/i }));
    expect(await screen.findByText('Update Renewable Energy Target')).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    const target = input('Target Total Renewable Energy Consumption');
    expect(target).toHaveValue(18000);

    fireEvent.change(target, { target: { value: '19500' } });
    fireEvent.click(screen.getByRole('button', { name: /update target/i }));
    await waitFor(() => expect(updateRenewableEnergyTarget).toHaveBeenCalledWith(4, {
      values: { target_renewable_energy_consumption: 19500 },
    }));
  });

  it('shows the Actuals columns of every organisation, without edit actions', async () => {
    fetchRenewableEnergyActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    expect((await screen.findByTestId('grid-headers')).textContent.split(' | ')).toEqual([
      'S.No', 'Organisation', 'Financial Year', 'Month',
      'Total Electrical Energy (MWh)', 'Total Renewable Energy (MWh)',
      'Last Updated Date',
    ]);
    expect(fetchRenewableEnergyActuals.mock.calls[0][0]).toMatchObject({ fiscalYear: currentFinancialYear(), page: 1 });
    expect(await screen.findByText('V.O. Chidambaranar Port Authority')).toBeInTheDocument();
    expect(screen.getByTestId('grid-cells').textContent).toContain('1,389.48');
    expect(screen.queryByRole('button', { name: /update renewable energy/i })).not.toBeInTheDocument();
  });
});

describe('Renewable Energy section — organisation user', () => {
  beforeEach(() => {
    mockPermissions.current = ORGANISATION;
  });

  it('opens Actuals first, with Input Form / Actuals / Targets tabs and Update / Delete', async () => {
    fetchRenewableEnergyActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('');

    expect(await screen.findByRole('button', { name: /update renewable energy for august 2026-2027/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete renewable energy for august 2026-2027/i })).toBeInTheDocument();
    expect(tabOrder()).toEqual(['Input Form', 'Actuals', 'Targets']);
    // No Organisation column for their own data; actions sit under "Update" as in the earlier portal
    const headers = screen.getByTestId('grid-headers').textContent.split(' | ');
    expect(headers.slice(0, 3)).toEqual(['S.No', 'Financial Year', 'Month']);
    expect(headers.slice(-2)).toEqual(['Last Updated Date', 'Update']);
  });

  it('hides Update and Delete without those permissions', async () => {
    mockPermissions.current = { ...ORGANISATION, canEditActuals: false, canDeleteActuals: false };
    fetchRenewableEnergyActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    expect(await screen.findByText('V.O. Chidambaranar Port Authority')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update renewable energy/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete renewable energy/i })).not.toBeInTheDocument();
    expect(screen.getByTestId('grid-headers').textContent.split(' | ').pop()).toBe('Last Updated Date');
  });

  it('shows only Targets (no Input Form) for a read-only organisation user', async () => {
    mockPermissions.current = { ...ORGANISATION, canEnterActuals: false, canEditActuals: false, canDeleteActuals: false };
    renderAt('input-form');

    await waitFor(() => expect(fetchRenewableEnergyActuals).toHaveBeenCalled());
    expect(tabOrder()).toEqual(['Actuals', 'Targets']);
    expect(screen.queryByText('Add Renewable Energy')).not.toBeInTheDocument();
  });

  it('deletes a month after confirmation', async () => {
    fetchRenewableEnergyActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    fireEvent.click(await screen.findByRole('button', { name: /delete renewable energy for august 2026-2027/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteRenewableEnergyActual).toHaveBeenCalledWith(91));
  });

  it('shows its targets read-only', async () => {
    fetchRenewableEnergyTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    await screen.findByText(/targets are set by the ministry/i);
    await screen.findByTestId('grid');
    expect(screen.queryByRole('button', { name: /update target/i })).not.toBeInTheDocument();
  });

  it('needs both values and submits the MWh values', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Renewable Energy')).toBeInTheDocument();
    expect(screen.getByLabelText(/^financial year/i)).toHaveValue(currentFinancialYear());
    // As in the earlier portal: the source hint sits under both labels, and the PPP / captive note above them
    expect(screen.getAllByText('(Including self-generated + grid procurement)')).toHaveLength(2);
    expect(screen.getByText('Data should include both PPP and captive sources.')).toBeInTheDocument();
    await choosePeriod();

    const submit = screen.getByRole('button', { name: /submit renewable energy/i });
    await waitFor(() => expect(submit).not.toBeDisabled());

    fireEvent.click(submit);
    expect(await screen.findAllByText('Required')).toHaveLength(2);
    expect(createRenewableEnergyActual).not.toHaveBeenCalled();

    fireEvent.change(input('Total Electrical Energy Consumption'), { target: { value: '400' } });
    fireEvent.change(input('Total Renewable Energy Consumption'), { target: { value: '100.5' } });
    expect(screen.queryByLabelText(/renewable energy share/i)).not.toBeInTheDocument();
    fireEvent.click(submit);

    await waitFor(() => expect(createRenewableEnergyActual).toHaveBeenCalledTimes(1));
    const payload = createRenewableEnergyActual.mock.calls[0][0];
    expect(payload).toMatchObject({
      fiscalYear: currentFinancialYear(),
      values: { electrical_energy_consumption: 400, renewable_energy_consumption: 100.5 },
    });
    expect(Object.keys(payload.values)).toEqual(['electrical_energy_consumption', 'renewable_energy_consumption']);
  });

  it('warns, but still saves, when renewable is above the total', async () => {
    renderAt('input-form');
    await choosePeriod();
    const submit = screen.getByRole('button', { name: /submit renewable energy/i });
    await waitFor(() => expect(submit).not.toBeDisabled());

    fireEvent.change(input('Total Electrical Energy Consumption'), { target: { value: '100' } });
    fireEvent.change(input('Total Renewable Energy Consumption'), { target: { value: '120' } });
    expect(screen.getByText(/higher than the total electrical energy consumption/i)).toBeInTheDocument();

    fireEvent.click(submit);
    await waitFor(() => expect(createRenewableEnergyActual).toHaveBeenCalledWith(expect.objectContaining({
      values: { electrical_energy_consumption: 100, renewable_energy_consumption: 120 },
    })));
  });

  it('offers Open for Update when the chosen month already has data', async () => {
    renderAt('input-form');
    fetchRenewableEnergyActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    await choosePeriod();

    expect(await screen.findByText(/has already been entered/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit renewable energy/i })).toBeDisabled();
  });

  it('updates a month from Actuals with the saved values and the period locked', async () => {
    fetchRenewableEnergyActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    fetchRenewableEnergyActual.mockResolvedValue({ data: { data: ACTUAL_ROW } });
    renderAt('actuals');

    fireEvent.click(await screen.findByRole('button', { name: /update renewable energy for august 2026-2027/i }));
    expect(await screen.findByText('Update Renewable Energy', { selector: 'h3' })).toBeInTheDocument();
    expect(fetchRenewableEnergyActual).toHaveBeenCalledWith(91);
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    expect(screen.getByLabelText(/^month/i)).toHaveValue('August');

    const electrical = input('Total Electrical Energy Consumption');
    await waitFor(() => expect(electrical).toHaveValue(1389.48));
    fireEvent.change(electrical, { target: { value: '1400' } });
    fireEvent.click(screen.getByRole('button', { name: /update renewable energy/i }));
    await waitFor(() => expect(updateRenewableEnergyActual).toHaveBeenCalledWith(91, {
      values: { electrical_energy_consumption: 1400, renewable_energy_consumption: 1398.3 },
    }));
  });
});
