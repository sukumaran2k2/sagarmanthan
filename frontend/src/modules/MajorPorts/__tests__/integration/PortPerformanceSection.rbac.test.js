/* global jest, describe, it, expect, beforeEach, require, global */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  deletePortPerformanceTargetRecord,
  fetchPortPerformanceActuals,
  fetchPortPerformanceEntryStatus,
  fetchPortPerformancePeriod,
  fetchPortPerformanceTargetRecord,
  fetchPortPerformanceTargets,
  savePortPerformancePeriod,
  savePortPerformanceTargetRecord,
} from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';
import { PORT_PERFORMANCE_SECTIONS, sectionFields } from '../../pages/PortPerformance/portPerformanceConfig';

// react-router needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MemoryRouter, Route, Routes } = require('react-router-dom');
const PortPerformanceSection = require('../../pages/PortPerformance/PortPerformanceSection').default;

const mockPermissions = { current: {} };
jest.mock('../../hooks/usePortPerformancePermissions', () => ({
  usePortPerformancePermissions: () => mockPermissions.current,
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

jest.mock('../../api', () => {
  const page = (data = []) => Promise.resolve({ data: { data, pagination: { total: data.length, page: 1, limit: 10, totalPages: data.length ? 1 : 0 } } });
  return {
    fetchPortPerformanceMasters: jest.fn(() => Promise.resolve({
      data: {
        organisations: [{ organisation_id: 9, organisation_name: 'Jawaharlal Nehru Port Authority', is_major_port: true }],
        kpiTypes: [
          { kpi_type_id: 1, kpi_name: 'Target Avg Vessel TRT (In Hours)' },
          { kpi_type_id: 11, kpi_name: 'Target Idle Time to Total Time (in %)' },
        ],
      },
    })),
    fetchPortPerformanceActuals: jest.fn(() => page([{
      fiscal_year: '2026-2027', month: 5, organisation_id: 9, organisation_name: 'Jawaharlal Nehru Port Authority',
      average_trt_overall: 36.25, sections_saved: 14, sections_total: 14,
    }])),
    fetchPortPerformanceTargets: jest.fn(() => page()),
    fetchPortPerformanceTargetRecord: jest.fn(() => Promise.resolve({ data: { exists: false, values: {} } })),
    fetchPortPerformanceEntryStatus: jest.fn(() => Promise.resolve({ data: { windowOpen: true, grants: [], windowLastDay: 8 } })),
    fetchPortPerformancePeriod: jest.fn(() => Promise.resolve({
      data: { exists: false, values: {}, savedSections: [], entryAccess: { open: true } },
    })),
    savePortPerformancePeriod: jest.fn(() => Promise.resolve({ data: { action: 'create' } })),
    deletePortPerformancePeriod: jest.fn(),
    savePortPerformanceTargetRecord: jest.fn(() => Promise.resolve({ data: { action: 'create' } })),
    deletePortPerformanceTargetRecord: jest.fn(),
  };
});

const BASE = '/kpi/major-ports/major-ports-input-form/port-performance';

const MINISTRY = {
  canView: true, isOrgScope: false, isMinistryView: true,
  canEnterActuals: false, canEditActuals: false, canDeleteActuals: false,
  canAddTarget: true, canEditTarget: true, canDeleteTarget: true,
};

const ORGANISATION = {
  canView: true, isOrgScope: true, isMinistryView: false,
  canEnterActuals: true, canEditActuals: true, canDeleteActuals: false,
  canAddTarget: false, canEditTarget: false, canDeleteTarget: false,
};

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[`${BASE}/${path}`]}>
      <Routes>
        <Route path={`${BASE}/*`} element={<PortPerformanceSection triggerNotification={jest.fn()} onBackToSections={jest.fn()} />} />
      </Routes>
    </MemoryRouter>
  );
}

const SECTION_TABS = ['Input Form', 'Targets', 'Actuals'];
const tabOrder = () => screen.getAllByRole('button')
  .map((b) => b.textContent.trim())
  .filter((name) => SECTION_TABS.includes(name));

const TARGET_ROW = {
  row_key: 'org-9',
  organisation_id: 9,
  organisation_name: 'Jawaharlal Nehru Port Authority',
  financial_year: '2026-2027',
  kpi_1: 20,
  kpi_11: 12,
  targets_set: 2,
  last_updated: '2026-09-01T00:00:00Z',
};
const targetsPage = () => Promise.resolve({
  data: { data: [TARGET_ROW], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } },
});

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
});

describe('Port Performance section — ministry user', () => {
  beforeEach(() => {
    mockPermissions.current = MINISTRY;
  });

  it('opens Targets first, with Input Form / Targets / Actuals tabs', async () => {
    renderAt('');

    await waitFor(() => expect(fetchPortPerformanceTargets).toHaveBeenCalled());
    expect(tabOrder()).toEqual(['Input Form', 'Targets', 'Actuals']);
  });

  it('lists targets with Update and Delete, and deletes after confirmation', async () => {
    fetchPortPerformanceTargets.mockImplementation(targetsPage);
    deletePortPerformanceTargetRecord.mockResolvedValue({ data: { success: true } });
    renderAt('targets');

    expect(await screen.findByRole('button', { name: /update targets for jawaharlal/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete targets for jawaharlal/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deletePortPerformanceTargetRecord).toHaveBeenCalledWith({ financialYear: '2026-2027', rowKey: 'org-9' }));
  });

  it('uses the target form as its Input Form, with Total SMPA and Overall rows and one input per KPI', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Port Performance Targets')).toBeInTheDocument();
    const rowSelect = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(rowSelect).getByRole('option', { name: 'Overall' })).toBeInTheDocument());
    expect(within(rowSelect).getByRole('option', { name: 'Total SMPA' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Avg Vessel TRT (In Hours)')).toBeInTheDocument();
    expect(screen.getByLabelText('Idle Time to Total Time (in %)')).toBeInTheDocument();
    expect(screen.queryByText('Add Port Performance')).not.toBeInTheDocument();
  });

  it('adds targets for Overall with only the filled KPIs set', async () => {
    renderAt('input-form');
    const rowSelect = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(rowSelect).getByRole('option', { name: 'Overall' })).toBeInTheDocument());

    fireEvent.change(rowSelect, { target: { value: 'overall' } });
    await waitFor(() => expect(fetchPortPerformanceTargetRecord).toHaveBeenCalledWith({ financialYear: currentFinancialYear(), rowKey: 'overall' }));
    fireEvent.change(await screen.findByLabelText('Avg Vessel TRT (In Hours)'), { target: { value: '25' } });
    fireEvent.click(screen.getByRole('button', { name: /submit targets/i }));

    await waitFor(() => expect(savePortPerformanceTargetRecord).toHaveBeenCalledWith({
      financialYear: currentFinancialYear(), rowKey: 'overall', values: { 1: 25, 11: null },
    }));
  });

  it('refuses an empty target sheet and an idle-time target over 100%', async () => {
    renderAt('input-form');
    const rowSelect = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(rowSelect).getAllByRole('option').length).toBeGreaterThan(1));
    fireEvent.change(rowSelect, { target: { value: 'org-9' } });

    fireEvent.click(await screen.findByRole('button', { name: /submit targets/i }));
    expect(await screen.findByText('Enter at least one target')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Idle Time to Total Time (in %)'), { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /submit targets/i }));
    expect(await screen.findByText('Cannot exceed 100%')).toBeInTheDocument();
    expect(savePortPerformanceTargetRecord).not.toHaveBeenCalled();
  });

  it('warns when the chosen row and year already have targets', async () => {
    fetchPortPerformanceTargetRecord.mockResolvedValue({ data: { exists: true, values: { 1: 20 } } });
    renderAt('input-form');
    const rowSelect = screen.getByLabelText(/organisation name/i);
    await waitFor(() => expect(within(rowSelect).getAllByRole('option').length).toBeGreaterThan(1));

    fireEvent.change(rowSelect, { target: { value: 'org-9' } });
    expect(await screen.findByText(/already exist/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit targets/i })).toBeDisabled();
  });

  it('edits targets from the list with the row and year locked, and can clear a KPI', async () => {
    fetchPortPerformanceTargets.mockImplementation(targetsPage);
    fetchPortPerformanceTargetRecord.mockResolvedValue({ data: { exists: true, values: { 1: 20, 11: 12 } } });
    savePortPerformanceTargetRecord.mockResolvedValue({ data: { action: 'update' } });
    renderAt('targets');

    fireEvent.click(await screen.findByRole('button', { name: /update targets for jawaharlal/i }));
    expect(await screen.findByText('Update Port Performance Targets')).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    const trt = await screen.findByLabelText('Avg Vessel TRT (In Hours)');
    await waitFor(() => expect(trt).toHaveValue(20));

    fireEvent.change(trt, { target: { value: '21' } });
    fireEvent.change(screen.getByLabelText('Idle Time to Total Time (in %)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /update targets/i }));
    await waitFor(() => expect(savePortPerformanceTargetRecord).toHaveBeenCalledWith({
      financialYear: '2026-2027', rowKey: 'org-9', values: { 1: 21, 11: null },
    }));
  });

  it('reviews actuals of every organisation without edit actions', async () => {
    renderAt('actuals');

    await waitFor(() => expect(fetchPortPerformanceActuals).toHaveBeenCalled());
    expect(fetchPortPerformanceActuals.mock.calls[0][0]).toMatchObject({ view: 'turnaround', fiscalYear: currentFinancialYear() });
    expect(await screen.findByText('Jawaharlal Nehru Port Authority')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update port performance/i })).not.toBeInTheDocument();
  });

  it('switches the Actuals view', async () => {
    renderAt('actuals');
    await waitFor(() => expect(fetchPortPerformanceActuals).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('tab', { name: 'CONTAINER CALL SIZE' }));
    await waitFor(() => expect(fetchPortPerformanceActuals).toHaveBeenLastCalledWith(
      expect.objectContaining({ view: 'callSize', page: 1 }), expect.anything()
    ));
  });
});

describe('Port Performance section — organisation user', () => {
  beforeEach(() => {
    mockPermissions.current = ORGANISATION;
  });

  it('opens Actuals first, with Input Form / Actuals / Targets tabs, Update but not Delete', async () => {
    renderAt('');

    expect(await screen.findByRole('button', { name: /update port performance for may 2026-2027/i })).toBeInTheDocument();
    expect(tabOrder()).toEqual(['Input Form', 'Actuals', 'Targets']);
    expect(screen.queryByRole('button', { name: /delete port performance/i })).not.toBeInTheDocument();
  });

  it('shows its targets read-only', async () => {
    fetchPortPerformanceTargets.mockImplementation(targetsPage);
    renderAt('targets');

    await screen.findByText(/targets are set by the ministry/i);
    await screen.findByTestId('grid');
    expect(screen.queryByRole('button', { name: /update targets/i })).not.toBeInTheDocument();
  });

  it('opens the 14-step form with the entry window and the current year', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Port Performance')).toBeInTheDocument();
    expect(await screen.findByText(/data entry is open until the 8th/i)).toBeInTheDocument();
    expect(fetchPortPerformanceEntryStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/financial year/i)).toHaveValue(currentFinancialYear());
    const steps = within(screen.getByRole('navigation', { name: /port performance entry steps/i })).getAllByRole('button');
    expect(steps).toHaveLength(14);
    expect(fetchPortPerformancePeriod).not.toHaveBeenCalled();
  });

  it('saves a step only when every value is entered, then moves to the next step', async () => {
    renderAt('input-form');
    await screen.findByText(/data entry is open until the 8th/i);
    const month = screen.getByLabelText(/^month/i);
    fireEvent.change(month, { target: { value: within(month).getAllByRole('option')[1].value } });
    await waitFor(() => expect(fetchPortPerformancePeriod).toHaveBeenCalled());

    const step = PORT_PERFORMANCE_SECTIONS[0];
    const fields = sectionFields(step);
    // Wait for the period lookup to enable the inputs
    const first = await screen.findByLabelText(new RegExp(`^${fields[0].label}`));
    await waitFor(() => expect(first).not.toBeDisabled());
    fireEvent.change(first, { target: { value: '10' } });

    fireEvent.click(screen.getByRole('button', { name: /save step/i }));
    expect(savePortPerformancePeriod).not.toHaveBeenCalled();
    // Cargo-type inputs show "Required" each; the call-size row shows one message
    const cargoFields = step.groups[0].fields;
    expect((await screen.findAllByText('Required')).length).toBe(cargoFields.length - 1);
    expect(screen.getByText(/every call size needs a valid value/i)).toBeInTheDocument();

    // Call-size cells are named by aria-label, cargo inputs carry the full label as title
    fields.forEach((f, i) => {
      const input = screen.queryByLabelText(f.fullLabel) ?? screen.getByTitle(f.fullLabel);
      fireEvent.change(input, { target: { value: String(i + 1) } });
    });
    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));

    await waitFor(() => expect(savePortPerformancePeriod).toHaveBeenCalledTimes(1));
    const payload = savePortPerformancePeriod.mock.calls[0][0];
    expect(payload).toMatchObject({ fiscalYear: currentFinancialYear(), section: 'avgTrt' });
    expect(Object.keys(payload.values)).toHaveLength(fields.length);
    expect(payload.values[fields[0].key]).toBe(1);
    expect(await screen.findByText(PORT_PERFORMANCE_SECTIONS[1].label, { selector: 'h3' })).toBeInTheDocument();
  });

  it('offers Open for Update when the chosen period already has data', async () => {
    fetchPortPerformancePeriod.mockResolvedValue({
      data: { exists: true, values: { average_trt_overall: 30 }, savedSections: ['avgTrt'], entryAccess: { open: true } },
    });
    renderAt('input-form');
    await screen.findByText(/data entry is open until the 8th/i);
    const month = screen.getByLabelText(/^month/i);
    fireEvent.change(month, { target: { value: within(month).getAllByRole('option')[1].value } });

    expect(await screen.findByText(/has already been entered/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save step/i })).toBeDisabled();
  });

  it('shows a locked period read-only', async () => {
    fetchPortPerformancePeriod.mockResolvedValue({
      data: { exists: true, values: {}, savedSections: [], entryAccess: { open: false } },
    });
    renderAt('actuals');
    fireEvent.click(await screen.findByRole('button', { name: /update port performance for may 2026-2027/i }));

    expect(await screen.findByText(/are closed\. The values are shown read-only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save step/i })).toBeDisabled();
  });
});
