/* global jest, describe, it, expect, beforeEach, require, global */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { fetchFinancialDashboardPart } from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';
import { shortFiscalYear } from '../../pages/Traffic/dashboard/dashboardConfig';
import FinancialDashboard from '../../pages/FinancialParameters/dashboard/FinancialDashboard';

// react-router needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MemoryRouter } = require('react-router-dom');
const PortsDashboardView = require('../../PortsDashboardView').default;

const mockPermissions = { current: {} };
jest.mock('../../hooks/useFinancialParametersPermissions', () => ({
  useFinancialParametersPermissions: () => mockPermissions.current,
}));
jest.mock('../../hooks/useTrafficPermissions', () => ({
  useTrafficPermissions: () => mockPermissions.current,
}));

// AG Grid does not render in jsdom; list the title, headers, rows (pinned rows too) and formatted cells
jest.mock('../../../../components/ReportTable', () => ({
  __esModule: true,
  default: ({ title, subtitle, viewData = [], pinnedBottomRowData = [], columns = [], reportExport }) => {
    const text = (col, row) => (col.valueFormatter ? col.valueFormatter({ value: row[col.field], data: row }) : row[col.field]);
    return (
      <div data-testid="grid" data-report-export={String(Boolean(reportExport))}>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
        <div data-testid="grid-headers">{columns.map((c) => c.headerName).join(' | ')}</div>
        {[...viewData, ...pinnedBottomRowData].map((row, i) => (
          <div key={i} data-testid="grid-row">
            {columns.map((col) => <span key={col.field}>{text(col, row)}</span>)}
          </div>
        ))}
      </div>
    );
  },
}));

jest.mock('../../api', () => ({
  fetchFinancialParameterMasters: jest.fn(() => Promise.resolve({
    data: {
      organisations: [
        { organisation_id: 10, organisation_name: 'Paradip Port Authority', is_major_port: true },
        { organisation_id: 54, organisation_name: 'Tamil Nadu Maritime Board', is_major_port: false },
      ],
    },
  })),
  fetchFinancialDashboardPart: jest.fn(),
  // The Traffic dashboard (other tab) is not opened in these tests
  fetchTrafficMasters: jest.fn(() => Promise.resolve({ data: { organisations: [], commodities: [], commodityGroups: [] } })),
  fetchTrafficDashboardPart: jest.fn(() => Promise.resolve({ data: {} })),
}));

const SUMMARY = {
  op_income_current: 11060.02, op_income_last: 10454.35, op_income_yoy: 5.793473,
  operating_expenditure_current: 4522.41, operating_expenditure_last: 4438.06, operating_expenditure_yoy: 1.900605,
  total_income_current: 12118.27, total_income_last: 11318.01, total_income_yoy: 7.070677,
  total_expenditure_current: 6987.24, total_expenditure_last: 7799.53, total_expenditure_yoy: -10.414601,
  operating_surplus_current: 6537.61, operating_surplus_last: 6016.29, operating_surplus_yoy: 8.66,
  net_surplus_current: 5131.03, net_surplus_last: 3518.48, net_surplus_yoy: 45.83,
  op_ratio_current: 43.18, op_ratio_last: 47.69, op_ratio_yoy: -9.44,
  per_tonne_handling_cost_current: 2957.16, per_tonne_handling_cost_last: 2961.03, per_tonne_handling_cost_yoy: -0.13,
};

const DRILL = [
  { organisation_id: 1, organisation_name: 'Chennai Port Authority', last_fy_full: 1014.84, current_fy_ytd: 592.84, last_fy_ytd: 523.25, yoy_ytd: 13.3 },
  { organisation_id: 0, organisation_name: 'Overall Total', last_fy_full: 2000, current_fy_ytd: 1200, last_fy_ytd: 1100, yoy_ytd: 9.09 },
  { organisation_id: 10, organisation_name: 'Paradip Port Authority', last_fy_full: 985.16, current_fy_ytd: 607.16, last_fy_ytd: 576.75, yoy_ytd: -5.27 },
  { organisation_id: 0, organisation_name: 'SMPA Total', last_fy_full: null, current_fy_ytd: null, last_fy_ytd: null, yoy_ytd: 0 },
  { organisation_id: 54, organisation_name: 'Tamil Nadu Maritime Board', last_fy_full: null, current_fy_ytd: null, last_fy_ytd: null, yoy_ytd: 0 },
];

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  mockPermissions.current = { canView: true, isMinistryView: true };
  fetchFinancialDashboardPart.mockImplementation((part) => Promise.resolve({ data: part === 'drill' ? DRILL : SUMMARY }));
});

const cardFor = (title) => screen.getByRole('button', { name: new RegExp(`^${title.replace(/[().]/g, '\\$&')}`) });

describe('Financial dashboard', () => {
  it('shows the eight cards with current FY, last FY and YoY', async () => {
    render(<FinancialDashboard triggerNotification={jest.fn()} />);

    await waitFor(() => expect(fetchFinancialDashboardPart).toHaveBeenCalledWith('summary', { fy: 'all', months: 'all' }, expect.anything()));
    const income = cardFor('Operating Income (In Cr.)');
    expect(await within(income).findByText('11060.02')).toBeInTheDocument();
    expect(within(income).getByText('10454.35')).toBeInTheDocument();
    expect(within(income).getByText('5.79%')).toBeInTheDocument();
    expect(within(income).getByText(`${shortFiscalYear(currentFinancialYear())} (YTD)`)).toBeInTheDocument();

    ['Operating Expenditure (In Cr.)', 'Total Income (In Cr.)', 'Total Expenditure (In Cr.)', 'Operating Surplus (In Cr.)',
      'Net Surplus (In Cr.)', 'Operating Ratio (%)', 'Per Tonne Handling Cost (In Cr.)']
      .forEach((title) => expect(cardFor(title)).toBeInTheDocument());
    // As on the earlier page: a fall in the operating ratio shows red, a fall in total expenditure green
    expect(within(cardFor('Operating Ratio (%)')).getByText('9.44%').closest('span[class*="text-red"]')).not.toBeNull();
    expect(within(cardFor('Total Expenditure (In Cr.)')).getByText('10.41%').closest('span[class*="text-green"]')).not.toBeNull();
  });

  it('filters by organisation and financial year', async () => {
    render(<FinancialDashboard triggerNotification={jest.fn()} />);
    const org = screen.getByRole('combobox', { name: 'Organisation' });
    await waitFor(() => expect(within(org).getByRole('option', { name: 'Paradip Port Authority' })).toBeInTheDocument());

    fireEvent.change(org, { target: { value: '10' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Financial Year' }), { target: { value: '2025-2026' } });
    await waitFor(() => expect(fetchFinancialDashboardPart).toHaveBeenLastCalledWith(
      'summary', { fy: '2025-2026', months: 'all', organisationId: '10' }, expect.anything()
    ));
  });

  it('opens the Detail of KPI with organisations first and the SMPA dock and totals below', async () => {
    render(<FinancialDashboard triggerNotification={jest.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: /^Net Surplus \(In Cr\.\)/ }));

    expect(await screen.findByText('Detail of KPI Financial Dashboard')).toBeInTheDocument();
    expect(fetchFinancialDashboardPart).toHaveBeenCalledWith(
      'drill', { fy: 'all', months: 'all', organisationId: 0, kpi: 'net_surplus' }, expect.anything()
    );
    expect(screen.getByText('Financial - Net Surplus (In Cr.)')).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-report-export', 'true');
    const labels = fiscalYearHeader();
    expect(screen.getByTestId('grid-headers').textContent).toBe(
      `S.No | Organisation | Achievement for ${labels.last} (In Cr.) | ${labels.current} (YTD) (In Cr.) | ${labels.last} (YTD) (In Cr.) | YOY (%)`
    );
    const rows = screen.getAllByTestId('grid-row').map((r) => r.textContent);
    expect(rows.map((t) => t.match(/[A-Za-z][A-Za-z .,]+/)[0].trim())).toEqual([
      'Chennai Port Authority', 'Paradip Port Authority', 'Tamil Nadu Maritime Board', 'SMPA Total', 'Overall Total',
    ]);
    expect(rows[1]).toContain('-5.27 %');

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('button', { name: /^Net Surplus/ })).toBeInTheDocument();
  });

  it('keeps organisation users on their own organisation', async () => {
    mockPermissions.current = { canView: true, isMinistryView: false };
    render(<FinancialDashboard triggerNotification={jest.fn()} />);

    const org = screen.getByRole('combobox', { name: 'Organisation' });
    expect(org).toBeDisabled();
    await waitFor(() => expect(fetchFinancialDashboardPart).toHaveBeenCalled());
    expect(fetchFinancialDashboardPart.mock.calls.every(([, params]) => !('organisationId' in params))).toBe(true);
  });

  it('shows Restricted Access without read permission', () => {
    mockPermissions.current = { canView: false, isMinistryView: true };
    render(<FinancialDashboard triggerNotification={jest.fn()} />);
    expect(fetchFinancialDashboardPart).not.toHaveBeenCalled();
  });
});

describe('KPI Major Ports dashboard switch', () => {
  it('has the earlier portal\'s two dashboards and opens Financial from the switch', async () => {
    render(
      <MemoryRouter initialEntries={['/kpi/major-ports/major-ports-dashboard']}>
        <PortsDashboardView triggerNotification={jest.fn()} />
      </MemoryRouter>
    );

    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Traffic & Port Performance Dashboard', 'Financial Dashboard']);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('KPI Traffic & Port Performance Dashboard');

    fireEvent.click(screen.getByRole('tab', { name: 'Financial Dashboard' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('KPI Financial Dashboard');
    expect(await screen.findByRole('button', { name: /^Operating Income/ })).toBeInTheDocument();
    expect(screen.queryByText(/sample data/i)).not.toBeInTheDocument();
  });
});

function fiscalYearHeader() {
  const start = Number(currentFinancialYear().slice(0, 4));
  return { current: shortFiscalYear(`${start}-${start + 1}`), last: shortFiscalYear(`${start - 1}-${start}`) };
}
