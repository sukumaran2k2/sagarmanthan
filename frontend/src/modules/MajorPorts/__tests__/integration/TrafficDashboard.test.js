/* global jest, describe, it, expect, beforeEach */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { fetchTrafficDashboardPart } from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';
import TrafficDashboard from '../../pages/Traffic/dashboard/TrafficDashboard';
import KpiDrillDown from '../../pages/Traffic/dashboard/KpiDrillDown';

const mockPermissions = { current: {} };
jest.mock('../../hooks/useTrafficPermissions', () => ({
  useTrafficPermissions: () => mockPermissions.current,
}));

jest.mock('../../pages/Traffic/trafficExport', () => ({
  copyRowsToClipboard: jest.fn(),
  downloadExcel: jest.fn(() => 'file.xlsx'),
  downloadPdf: jest.fn(),
}));

// AG Grid does not render in jsdom; list the title, headers, rows (pinned rows too) and formatted cells
jest.mock('../../../../components/ReportTable', () => ({
  __esModule: true,
  default: ({ title, subtitle, toolbarExtra, viewData = [], pinnedBottomRowData = [], columns = [] }) => {
    const headers = (defs) => defs.flatMap((d) => [d.headerName, ...(d.children ? headers(d.children) : [])]);
    const leaves = (defs) => defs.flatMap((d) => (d.children ? leaves(d.children) : [d]));
    const valueCols = leaves(columns).filter((c) => !['organisation_name', 'label', 'sNo'].includes(c.field));
    const text = (col, row) => (col.valueFormatter ? col.valueFormatter({ value: row[col.field], data: row }) : row[col.field]);
    return (
      <div data-testid="grid">
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
        {toolbarExtra}
        <div data-testid="grid-headers">{headers(columns).join(' | ')}</div>
        {[...viewData, ...pinnedBottomRowData].map((row, i) => (
          <div key={i}>
            <div data-testid="grid-row">{row.organisation_name ?? row.label}</div>
            {valueCols.map((col) => <span key={col.field}>{text(col, row)}</span>)}
          </div>
        ))}
      </div>
    );
  },
}));

jest.mock('../../api', () => ({
  fetchTrafficMasters: jest.fn(() => Promise.resolve({
    data: { commodityGroups: [], commodities: [], organisations: [{ organisation_id: 1, organisation_name: 'Chennai Port Authority' }] },
  })),
  fetchTrafficDashboardPart: jest.fn(),
}));

const RESPONSES = {
  traffic: { total_traffic_current: 472.716, total_traffic_last: 437.7, total_traffic_yoy: 8, avg_trt_current: 47.15, avg_trt_last: 47.04, avg_trt_yoy: 0.25 },
  cargo: { total_traffic_container_current: 112.9, total_traffic_container_last: 104.34, total_traffic_yoy_container: 8.21 },
  performance: { total_sailed_vessel_handled_current: 20276, total_sailed_vessel_handled_last: 19697, total_sailed_vessel_handled_yoy: 2.94 },
  coastal: { total_coastal_traffic: { current_total: 105.03, last_total: 91.8, yoy_percent: 14.41 } },
  summary: { organisations: [{ organisation_id: 1, organisation_name: 'Chennai Port Authority', exim_loaded: { last_total: 1, current_total: 2, yoy_percent: 100 } }] },
  'drill/traffic': [
    { organisation_id: 1, organisation_name: 'Chennai Port Authority', target_value: 61.1, achievement_for_last_FY: 50, current_fy_ytd: 28.07, last_fy_ytd: 25, yoy: 12.3 },
    { organisation_id: null, organisation_name: 'Overall Total', target_value: 61.1, achievement_for_last_FY: 50, current_fy_ytd: 28.07, last_fy_ytd: 25, yoy: 12.3 },
  ],
};

beforeEach(() => {
  resetAllStores();
  mockPermissions.current = { canView: true, isMinistryView: true };
  fetchTrafficDashboardPart.mockImplementation((part) => Promise.resolve({ data: RESPONSES[part] ?? {} }));
});

const openPanel = (label) => fireEvent.click(screen.getByRole('button', { name: label }));

describe('Traffic & Port Performance dashboard', () => {
  it('opens on Overall (now first in the sidebar) with the category-wise table', async () => {
    render(<TrafficDashboard triggerNotification={jest.fn()} />);
    expect(screen.getByRole('heading', { name: 'Overall KPI Summary' })).toBeInTheDocument();
    expect(screen.getByText('Cargo Category Wise KPIs (YoY) – Overall')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('472.72').length).toBeGreaterThan(0));
    expect(screen.getByText('Preberthing Detention (PBD) – Non-Port')).toBeInTheDocument();
  });

  it('shows the Traffic cards with FY labels, values and YoY, and opens Detail of KPI', async () => {
    render(<TrafficDashboard triggerNotification={jest.fn()} />);
    openPanel('Traffic');

    const total = (await screen.findByText('Total Traffic (In MMT)')).closest('button');
    await waitFor(() => expect(within(total).getByText('472.72')).toBeInTheDocument());
    expect(within(total).getAllByText(/FY\d\d-\d\d \(YTD\)/)).toHaveLength(2);
    expect(within(total).getByText('8.00%', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Coastal Traffic - Container (In 000 TEUs)')).toBeInTheDocument();

    fireEvent.click(total);
    expect(await screen.findByText('KPI - Total Traffic (in MMT)')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByTestId('grid-row').map((r) => r.textContent)).toEqual(['Chennai Port Authority', 'Overall Total']));
    const headers = screen.getByTestId('grid-headers').textContent;
    expect(headers).toMatch(/S\.No \| Organisation \| Target for FY\d\d-\d\d \(In MMT\) \| Achievement for FY\d\d-\d\d \(In MMT\)/);
    expect(headers).toContain('YOY (%)');
    expect(fetchTrafficDashboardPart).toHaveBeenCalledWith('drill/traffic', expect.objectContaining({ kpi: 'traffic', fy: 'all', months: 'all' }), expect.anything());

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByText('Total Traffic (In MMT)')).toBeInTheDocument();
  });

  it('marks lower-is-better KPIs green when they fall', async () => {
    RESPONSES.traffic.avg_trt_yoy = -3;
    render(<TrafficDashboard triggerNotification={jest.fn()} />);
    openPanel('Turnaround Time');
    const card = (await screen.findByText('Average TRT - Overall (In Hours)')).closest('button');
    await waitFor(() => expect(within(card).getByText('3.00%', { exact: false })).toBeInTheDocument());
    expect(within(card).getByText('▼').parentElement.className).toContain('text-green');
    RESPONSES.traffic.avg_trt_yoy = 0.25;
  });

  it('switches to the Traffic KPI Summary with the commodity filter and no organisation filter', async () => {
    render(<TrafficDashboard triggerNotification={jest.fn()} />);
    expect(screen.getByLabelText('Organisation')).toBeInTheDocument();
    openPanel('Traffic KPI Summary');

    expect(await screen.findByText('Traffic KPI Summary (YoY) - Container(In MMT)')).toBeInTheDocument();
    expect(screen.queryByLabelText('Organisation')).not.toBeInTheDocument();
    await waitFor(() => expect(fetchTrafficDashboardPart).toHaveBeenCalledWith('summary', { fy: 'all', months: 'all', commodity: '4' }, expect.anything()));
    expect(await screen.findByText('Chennai Port Authority')).toBeInTheDocument();
    expect(screen.getByText('Grand Total')).toBeInTheDocument();
    const headers = screen.getByTestId('grid-headers').textContent;
    ['Direct EXIM', 'Total Transshipment', 'Total Cargo', 'RO-Pax Traffic'].forEach((h) => expect(headers).toContain(h));
  });

  it('locks the organisation filter for organisation users', async () => {
    mockPermissions.current = { canView: true, isMinistryView: false };
    render(<TrafficDashboard triggerNotification={jest.fn()} />);
    await waitFor(() => expect(screen.getByLabelText('Organisation')).toBeDisabled());
    await waitFor(() => expect(screen.getByLabelText('Organisation')).toHaveDisplayValue('Chennai Port Authority'));
  });
});

describe('Commodity-wise detail', () => {
  it('keeps the Total group last and shows every number with two decimals', async () => {
    fetchTrafficDashboardPart.mockResolvedValue({
      data: [{
        organisation_id: 1,
        organisation_name: 'Chennai Port Authority',
        'Total - Current FY YTD': 5, 'Total - Last FY YTD': 4, 'Total - YoY (%)': 25,
        'Coal - Current FY YTD': 2.5, 'Coal - Last FY YTD': 2, 'Coal - YoY (%)': 25,
      }],
    });
    render(
      <KpiDrillDown
        drill={{ type: 'cargoWise', cargo: 'btndry' }}
        filters={{ fy: 'all', months: 'all', organisationId: 0 }}
        labels={{ current: 'FY26-27', last: 'FY25-26' }}
        onBack={jest.fn()}
        onOpenCargoWise={jest.fn()}
        triggerNotification={jest.fn()}
      />
    );

    expect(await screen.findByText('Chennai Port Authority')).toBeInTheDocument();
    const headers = screen.getByTestId('grid-headers').textContent.split(' | ');
    expect(headers.indexOf('Coal')).toBeLessThan(headers.indexOf('Total'));
    expect(screen.getByText('5.00')).toBeInTheDocument();
    expect(screen.getByText('2.50')).toBeInTheDocument();
  });
});
