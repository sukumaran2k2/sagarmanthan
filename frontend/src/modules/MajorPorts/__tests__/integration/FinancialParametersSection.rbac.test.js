/* global jest, describe, it, expect, beforeEach, require, global */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  createFinancialParameterActual,
  createFinancialParameterTarget,
  deleteFinancialParameterActual,
  deleteFinancialParameterTarget,
  fetchFinancialParameterActual,
  fetchFinancialParameterActuals,
  fetchFinancialParameterTargets,
  updateFinancialParameterActual,
  updateFinancialParameterTarget,
} from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';
import { TARGET_FIELDS } from '../../pages/FinancialParameters/financialParametersConfig';

// react-router needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MemoryRouter, Route, Routes } = require('react-router-dom');
const FinancialParametersSection = require('../../pages/FinancialParameters/FinancialParametersSection').default;

const mockPermissions = { current: {} };
jest.mock('../../hooks/useFinancialParametersPermissions', () => ({
  useFinancialParametersPermissions: () => mockPermissions.current,
}));

// The PDF helper pulls in amCharts (ESM only), which jest cannot load
jest.mock('../../pages/Traffic/trafficExport', () => ({
  copyRowsToClipboard: jest.fn(),
  downloadExcel: jest.fn(),
  downloadPdf: jest.fn(),
}));

// AG Grid does not render in jsdom; show the rows and action cells instead
jest.mock('../../../../components/Table', () => ({
  __esModule: true,
  default: ({ rowData = [], columnDefs = [] }) => {
    const actionCol = columnDefs.find((c) => c.headerName === 'Action' || c.headerName === 'Update');
    return (
      <div data-testid="grid">
        <div data-testid="grid-headers">{columnDefs.map((c) => c.headerName).join(' | ')}</div>
        {rowData.map((row, i) => (
          <div key={i} data-testid="grid-row">
            {row.organisation_name}
            {actionCol ? actionCol.cellRenderer({ data: row }) : null}
          </div>
        ))}
      </div>
    );
  },
}));

const ACTUAL_ROW = {
  id: 3469, fiscal_year: '2026-2027', month: 5, organisation_id: 10, organisation_name: 'Paradip Port Authority',
  operating_income: 228.05, operating_expenditure: 73.57, total_income: 255.17, total_expenditure: 82,
  operating_surplus: 154.48, net_surplus: 173.17, operating_ratio: 32.26, per_tonne_handling_cost: 52.15,
  operating_profit_tonne: 109.51, teu_container: null, tonne_dry_bulk: 159.45, tonne_break_bulk: 4940.81,
  tonne_liquid_bulk: 443.92, last_updated: '2026-06-19T00:00:00Z',
};

const TARGET_ROW = {
  id: 7, financial_year: '2026-2027', organisation_id: 10, organisation_name: 'Paradip Port Authority',
  target_operating_profit: 100, target_teu_container: 1, target_tonof_drybulk: 2,
  target_tonof_breakbulk: 3, target_tonof_liquidbulk: 4, target_operating_surplus: 500,
  last_updated: '2026-09-01T00:00:00Z',
};

jest.mock('../../api', () => {
  const page = (data = []) => Promise.resolve({ data: { data, pagination: { total: data.length, page: 1, limit: 10, totalPages: data.length ? 1 : 0 } } });
  return {
    fetchFinancialParameterMasters: jest.fn(() => Promise.resolve({
      data: { organisations: [{ organisation_id: 10, organisation_name: 'Paradip Port Authority', is_major_port: true }] },
    })),
    fetchFinancialParameterActuals: jest.fn(() => page()),
    fetchFinancialParameterActual: jest.fn(),
    createFinancialParameterActual: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
    updateFinancialParameterActual: jest.fn(() => Promise.resolve({ data: { success: true } })),
    deleteFinancialParameterActual: jest.fn(() => Promise.resolve({ data: { success: true } })),
    fetchFinancialParameterTargets: jest.fn(() => page()),
    createFinancialParameterTarget: jest.fn(() => Promise.resolve({ data: { id: 1 } })),
    updateFinancialParameterTarget: jest.fn(() => Promise.resolve({ data: { success: true } })),
    deleteFinancialParameterTarget: jest.fn(() => Promise.resolve({ data: { success: true } })),
  };
});

const BASE = '/kpi/major-ports/major-ports-input-form/financial-parameters';

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
        <Route path={`${BASE}/*`} element={<FinancialParametersSection triggerNotification={jest.fn()} onBackToSections={jest.fn()} />} />
      </Routes>
    </MemoryRouter>
  );
}

const SECTION_TABS = ['Input Form', 'Targets', 'Actuals'];
const tabOrder = () => screen.getAllByRole('button')
  .map((b) => b.textContent.trim())
  .filter((name) => SECTION_TABS.includes(name));

const input = (label) => screen.getByLabelText(new RegExp(`^${label.replace(/[()./]/g, '\\$&')}`));

async function choosePeriod() {
  const month = screen.getByLabelText(/^month/i);
  fireEvent.change(month, { target: { value: within(month).getAllByRole('option')[1].value } });
  await waitFor(() => expect(fetchFinancialParameterActuals).toHaveBeenCalledWith(
    expect.objectContaining({ fiscalYear: currentFinancialYear(), limit: 1 })
  ));
}

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  // clearAllMocks keeps implementations set by an earlier test; start every test with empty lists
  fetchFinancialParameterActuals.mockImplementation(pageOf([]));
  fetchFinancialParameterTargets.mockImplementation(pageOf([]));
});

describe('Financial Parameters section — ministry user', () => {
  beforeEach(() => {
    mockPermissions.current = MINISTRY;
  });

  it('opens Targets first, with Input Form / Targets / Actuals tabs', async () => {
    renderAt('');

    await waitFor(() => expect(fetchFinancialParameterTargets).toHaveBeenCalled());
    expect(tabOrder()).toEqual(['Input Form', 'Targets', 'Actuals']);
  });

  it('lists targets with Update and Delete, and deletes after confirmation', async () => {
    fetchFinancialParameterTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    expect(await screen.findByRole('button', { name: /update targets for paradip/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete targets for paradip/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteFinancialParameterTarget).toHaveBeenCalledWith(7));
  });

  it('uses the target form as its Input Form and needs all six targets', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Financial Targets')).toBeInTheDocument();
    const org = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(org).getByRole('option', { name: 'Paradip Port Authority' })).toBeInTheDocument());
    fireEvent.change(org, { target: { value: '10' } });
    fireEvent.change(input('Target Operating Profit / Tonne (in INR Crs/Tonne)'), { target: { value: '12' } });
    fireEvent.click(screen.getByRole('button', { name: /submit targets/i }));

    expect((await screen.findAllByText('Required')).length).toBe(TARGET_FIELDS.length - 1);
    expect(createFinancialParameterTarget).not.toHaveBeenCalled();

    TARGET_FIELDS.forEach((f, i) => fireEvent.change(input(`${f.label} (${f.unit})`), { target: { value: String(i - 1) } }));
    fireEvent.click(screen.getByRole('button', { name: /submit targets/i }));
    await waitFor(() => expect(createFinancialParameterTarget).toHaveBeenCalledWith({
      financialYear: currentFinancialYear(),
      organisationId: 10,
      values: {
        target_operating_profit: -1, target_teu_container: 0, target_tonof_drybulk: 1,
        target_tonof_breakbulk: 2, target_tonof_liquidbulk: 3, target_operating_surplus: 4,
      },
    }));
  });

  it('warns when the organisation and year already have targets', async () => {
    fetchFinancialParameterTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('input-form');
    const org = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(org).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(screen.getByLabelText(/^financial year/i), { target: { value: '2026-2027' } });
    fireEvent.change(org, { target: { value: '10' } });

    expect(await screen.findByText(/already exist/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit targets/i })).toBeDisabled();
  });

  it('edits targets from the list with the organisation and year locked', async () => {
    fetchFinancialParameterTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    fireEvent.click(await screen.findByRole('button', { name: /update targets for paradip/i }));
    expect(await screen.findByText('Update Financial Targets')).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    const surplus = input('Target Operating Surplus (In Cr.)');
    expect(surplus).toHaveValue(500);

    fireEvent.change(surplus, { target: { value: '650' } });
    fireEvent.click(screen.getByRole('button', { name: /update targets/i }));
    await waitFor(() => expect(updateFinancialParameterTarget).toHaveBeenCalledWith(7, {
      values: expect.objectContaining({ target_operating_profit: 100, target_operating_surplus: 650 }),
    }));
  });

  it('shows the Actuals columns with the earlier portal headers, in the same order', async () => {
    renderAt('actuals');

    expect((await screen.findByTestId('grid-headers')).textContent.split(' | ')).toEqual([
      'S.No', 'Organisation', 'Financial Year', 'Month',
      'Operating Income (In Cr.)', 'Operating Expenditure (In Cr.)', 'Total Income (In Cr.)',
      'Total Expenditure (In Cr.)', 'Operating Surplus (In Cr.)', 'Net Surplus (In Cr.)',
      'Operating Ratio (%)', 'Per Tonne Handling Cost (In Rupees)',
      'Operating Profit / Tonne (in INR Crs/Tonne)', 'Operating Profit / TEU of Container (in INR Crs/TEU)',
      'Operating Profit / Tonne of Dry Bulk (in INR Crs/Tonne)', 'Operating Profit / Tonne of Break Bulk (in INR Crs/Tonne)',
      'Operating Profit / Tonne of Liquid Bulk (in INR Crs/Tonne)', 'Last Updated Date',
    ]);
  });

  it('reviews actuals of every organisation without edit actions', async () => {
    fetchFinancialParameterActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    await waitFor(() => expect(fetchFinancialParameterActuals).toHaveBeenCalled());
    expect(fetchFinancialParameterActuals.mock.calls[0][0]).toMatchObject({ fiscalYear: currentFinancialYear(), page: 1 });
    expect(await screen.findByText('Paradip Port Authority')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update financial parameters/i })).not.toBeInTheDocument();
  });
});

describe('Financial Parameters section — organisation user', () => {
  beforeEach(() => {
    mockPermissions.current = ORGANISATION;
  });

  it('opens Actuals first, with Input Form / Actuals / Targets tabs and Update / Delete', async () => {
    fetchFinancialParameterActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('');

    expect(await screen.findByRole('button', { name: /update financial parameters for may 2026-2027/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete financial parameters for may 2026-2027/i })).toBeInTheDocument();
    expect(tabOrder()).toEqual(['Input Form', 'Actuals', 'Targets']);
    // No Organisation column for their own data; actions sit under "Update" as in the earlier portal
    const headers = screen.getByTestId('grid-headers').textContent.split(' | ');
    expect(headers.slice(0, 3)).toEqual(['S.No', 'Financial Year', 'Month']);
    expect(headers.slice(-2)).toEqual(['Last Updated Date', 'Update']);
  });

  it('hides Delete without the delete permission', async () => {
    mockPermissions.current = { ...ORGANISATION, canDeleteActuals: false };
    fetchFinancialParameterActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    expect(await screen.findByRole('button', { name: /update financial parameters/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete financial parameters/i })).not.toBeInTheDocument();
  });

  it('deletes a month after confirmation', async () => {
    fetchFinancialParameterActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    renderAt('actuals');

    fireEvent.click(await screen.findByRole('button', { name: /delete financial parameters for may 2026-2027/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteFinancialParameterActual).toHaveBeenCalledWith(3469));
  });

  it('shows its targets read-only', async () => {
    fetchFinancialParameterTargets.mockImplementation(pageOf([TARGET_ROW]));
    renderAt('targets');

    await screen.findByText(/targets are set by the ministry/i);
    await screen.findByTestId('grid');
    expect(screen.queryByRole('button', { name: /update targets/i })).not.toBeInTheDocument();
  });

  it('calculates the surplus and ratio, checks the values and submits the month', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Financial Parameters')).toBeInTheDocument();
    expect(screen.getByLabelText(/^financial year/i)).toHaveValue(currentFinancialYear());
    await choosePeriod();

    const submit = screen.getByRole('button', { name: /submit financial parameters/i });
    await waitFor(() => expect(submit).not.toBeDisabled());
    fireEvent.change(input('Operating Income (In Cr.)'), { target: { value: '200' } });
    fireEvent.change(input('Operating Expenditure (In Cr.)'), { target: { value: '50' } });
    expect(input('Operating Surplus (In Cr.)')).toHaveValue('150.00');
    expect(input('Operating Ratio (%)')).toHaveValue('25.00');

    fireEvent.change(input('Total Expenditure (In Cr.)'), { target: { value: '-5' } });
    fireEvent.click(submit);
    expect(await screen.findByText('Cannot be negative')).toBeInTheDocument();
    expect(screen.getAllByText('Required')).toHaveLength(3);
    expect(createFinancialParameterActual).not.toHaveBeenCalled();

    fireEvent.change(input('Total Income (In Cr.)'), { target: { value: '220' } });
    fireEvent.change(input('Total Expenditure (In Cr.)'), { target: { value: '60' } });
    fireEvent.change(input('Per Tonne Handling Cost (In Rupees)'), { target: { value: '40' } });
    fireEvent.change(input('Operating Profit / Tonne (in INR Crs/Tonne)'), { target: { value: '-3.5' } });
    fireEvent.click(submit);

    await waitFor(() => expect(createFinancialParameterActual).toHaveBeenCalledTimes(1));
    const payload = createFinancialParameterActual.mock.calls[0][0];
    expect(payload).toMatchObject({
      fiscalYear: currentFinancialYear(),
      values: { operating_income: 200, operating_profit_tonne: -3.5, teu_container: null },
    });
    expect(payload.values).not.toHaveProperty('operating_surplus');
  });

  it('offers Open for Update when the chosen month already has data', async () => {
    renderAt('input-form');
    fetchFinancialParameterActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    await choosePeriod();

    expect(await screen.findByText(/have already been entered/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit financial parameters/i })).toBeDisabled();
  });

  it('updates a month from Actuals with the saved values and the period locked', async () => {
    fetchFinancialParameterActuals.mockImplementation(pageOf([ACTUAL_ROW]));
    fetchFinancialParameterActual.mockResolvedValue({ data: { data: ACTUAL_ROW } });
    renderAt('actuals');

    fireEvent.click(await screen.findByRole('button', { name: /update financial parameters for may 2026-2027/i }));
    expect(await screen.findByText('Update Financial Parameters', { selector: 'h3' })).toBeInTheDocument();
    expect(fetchFinancialParameterActual).toHaveBeenCalledWith(3469);
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    expect(screen.getByLabelText(/^month/i)).toHaveValue('May');

    const income = input('Operating Income (In Cr.)');
    await waitFor(() => expect(income).toHaveValue(228.05));
    fireEvent.change(income, { target: { value: '230' } });
    fireEvent.click(screen.getByRole('button', { name: /update financial parameters/i }));
    await waitFor(() => expect(updateFinancialParameterActual).toHaveBeenCalledWith(3469, {
      values: expect.objectContaining({ operating_income: 230, tonne_break_bulk: 4940.81 }),
    }));
  });
});
