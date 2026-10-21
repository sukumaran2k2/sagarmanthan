/* global jest, describe, it, expect, beforeEach, require, global */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  deleteTrafficTarget,
  fetchTrafficActuals,
  fetchTrafficEntryStatus,
  fetchTrafficPeriod,
  fetchTrafficTargets,
  updateTrafficTarget,
} from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { currentFinancialYear } from '../../pages/Traffic/trafficConstants';

// react-router needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MemoryRouter, Route, Routes } = require('react-router-dom');
const TrafficSection = require('../../pages/Traffic/TrafficSection').default;

const mockPermissions = { current: {} };
jest.mock('../../hooks/useTrafficPermissions', () => ({
  useTrafficPermissions: () => mockPermissions.current,
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
    fetchTrafficMasters: jest.fn(() => Promise.resolve({
      data: {
        commodityGroups: [{ commodity_group_id: 4, commodity_group_name: 'Container' }],
        commodities: [{ commodity_id: 28, commodity_group_id: 4, commodity_name: 'Container (In 000 TEUs)' }],
        organisations: [{ organisation_id: 9, organisation_name: 'Jawaharlal Nehru Port Authority' }],
      },
    })),
    fetchTrafficActuals: jest.fn(() => page([{
      fiscal_year: '2026-2027', month: 5, organisation_id: 9, organisation_name: 'Jawaharlal Nehru Port Authority', total_tonnes: 10,
    }])),
    fetchTrafficTargets: jest.fn(() => page()),
    fetchTrafficDashboard: jest.fn(),
    fetchTrafficDashboardSummary: jest.fn(),
    fetchTrafficAccessGrants: jest.fn(() => page()),
    fetchTrafficEntryStatus: jest.fn(() => Promise.resolve({ data: { windowOpen: true, grants: [], windowLastDay: 8 } })),
    fetchTrafficPeriod: jest.fn(() => Promise.resolve({
      data: { commodityData: [], trafficData: {}, savedGroupIds: [], roroSaved: false, exists: false, entryAccess: { open: true } },
    })),
    saveTrafficPeriod: jest.fn(),
    deleteTrafficPeriod: jest.fn(),
    createTrafficTarget: jest.fn(),
    updateTrafficTarget: jest.fn(),
    deleteTrafficTarget: jest.fn(),
    createTrafficAccessGrant: jest.fn(),
    revokeTrafficAccessGrant: jest.fn(),
  };
});

const BASE = '/kpi/major-ports/major-ports-input-form/traffic';

const MINISTRY = {
  canView: true, isOrgScope: false, isMinistryView: true,
  canEnterActuals: false, canEditActuals: false, canDeleteActuals: false,
  canAddTarget: true, canEditTarget: true, canDeleteTarget: true,
  canViewEntryAccess: true, canGrantAccess: true, canRevokeAccess: true,
};

const ORGANISATION = {
  canView: true, isOrgScope: true, isMinistryView: false,
  canEnterActuals: true, canEditActuals: true, canDeleteActuals: false,
  canAddTarget: false, canEditTarget: false, canDeleteTarget: false,
  canViewEntryAccess: false, canGrantAccess: false, canRevokeAccess: false,
};

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[`${BASE}/${path}`]}>
      <Routes>
        <Route path={`${BASE}/*`} element={<TrafficSection triggerNotification={jest.fn()} onBackToSections={jest.fn()} />} />
      </Routes>
    </MemoryRouter>
  );
}

const SECTION_TABS = ['Input Form', 'Targets', 'Actuals', 'Entry Access'];
const tabOrder = () => screen.getAllByRole('button')
  .map((b) => b.textContent.trim())
  .filter((name) => SECTION_TABS.includes(name));

const TARGET_ROW = {
  id: 41,
  organisation_id: 9,
  organisation_name: 'Jawaharlal Nehru Port Authority',
  financial_year: '2026-2027',
  fiscal_year_target: 108.4,
  ro_ro_target: 1.2,
  ro_pax_target: 0.5,
  container_target_mteu: 7.1,
  fiscal_year_actual: 56262.683,
  last_updated: '2026-09-01T00:00:00Z',
};
const targetsPage = () => Promise.resolve({
  data: { data: [TARGET_ROW], pagination: { total: 1, page: 1, limit: 10, totalPages: 1 } },
});

beforeEach(() => resetAllStores());

describe('Traffic section — ministry user', () => {
  beforeEach(() => {
    mockPermissions.current = MINISTRY;
  });

  it('opens Targets first, with Input Form / Targets / Actuals tabs and no Entry Access tab', async () => {
    renderAt('');

    await waitFor(() => expect(fetchTrafficTargets).toHaveBeenCalled());
    expect(tabOrder()).toEqual(['Input Form', 'Targets', 'Actuals']);
    expect(screen.queryByRole('button', { name: /add target/i })).not.toBeInTheDocument();
  });

  it('lists targets with the earlier portal columns and offers Update and Delete', async () => {
    fetchTrafficTargets.mockImplementation(targetsPage);
    renderAt('targets');

    expect(await screen.findByRole('button', { name: /update target for jawaharlal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete target for jawaharlal/i })).toBeInTheDocument();
  });

  it('deletes a target after confirmation', async () => {
    fetchTrafficTargets.mockImplementation(targetsPage);
    deleteTrafficTarget.mockResolvedValue({ data: { success: true } });
    renderAt('targets');

    fireEvent.click(await screen.findByRole('button', { name: /delete target for jawaharlal/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(deleteTrafficTarget).toHaveBeenCalledWith(41));
  });

  it('uses the target form as its Input Form, with the four target fields', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Financial Year Target')).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation name/i)).toBeInTheDocument();
    ['Total Traffic Target (In MMT)', 'Ro-Ro Target (In MMT)', 'Ro-Pax Target (In MMT/Number)', 'Container Target (In MTEUs)']
      .forEach((label) => expect(screen.getByLabelText(label, { exact: false })).toBeInTheDocument());
    expect(screen.queryByText('Add Traffic Data')).not.toBeInTheDocument();
  });

  it('edits a target from the Targets page in the form, with organisation and year locked', async () => {
    fetchTrafficTargets.mockImplementation(targetsPage);
    updateTrafficTarget.mockResolvedValue({ data: { success: true } });
    renderAt('targets');

    fireEvent.click(await screen.findByRole('button', { name: /update target for jawaharlal/i }));

    expect(await screen.findByText('Update Financial Year Target')).toBeInTheDocument();
    expect(screen.getByLabelText(/organisation name/i)).toBeDisabled();
    expect(screen.getByLabelText(/^financial year/i)).toBeDisabled();
    const total = screen.getByLabelText(/total traffic target/i);
    expect(total).toHaveValue(108.4);

    fireEvent.change(total, { target: { value: '110' } });
    fireEvent.click(screen.getByRole('button', { name: /update target/i }));
    await waitFor(() => expect(updateTrafficTarget).toHaveBeenCalledWith(41, {
      fiscalYearTarget: 110, roRoTarget: 1.2, roPaxTarget: 0.5, containerTargetMteu: 7.1,
    }));
  });

  it('warns when the chosen organisation and year already have a target', async () => {
    fetchTrafficTargets.mockImplementation(targetsPage);
    renderAt('input-form');
    await waitFor(() => expect(screen.getByLabelText(/organisation name/i).querySelectorAll('option').length).toBeGreaterThan(1));

    fireEvent.change(screen.getByLabelText(/organisation name/i), { target: { value: '9' } });
    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open for update/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit target/i })).toBeDisabled();
  });

  it('reviews actuals without edit actions, and old list links still work', async () => {
    renderAt('list-view');

    await waitFor(() => expect(fetchTrafficActuals).toHaveBeenCalled());
    expect(fetchTrafficActuals.mock.calls[0][0]).toMatchObject({ view: 'period', fiscalYear: currentFinancialYear() });
    expect(await screen.findByText('Jawaharlal Nehru Port Authority')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /update traffic/i })).not.toBeInTheDocument();
  });
});

describe('Traffic section — organisation user', () => {
  beforeEach(() => {
    mockPermissions.current = ORGANISATION;
  });

  it('opens Actuals first, with Input Form / Actuals / Targets tabs, Update but not Delete', async () => {
    renderAt('');

    expect(await screen.findByRole('button', { name: /update traffic for may 2026-2027/i })).toBeInTheDocument();
    expect(tabOrder()).toEqual(['Input Form', 'Actuals', 'Targets']);
    expect(screen.queryByRole('button', { name: /delete traffic/i })).not.toBeInTheDocument();
  });

  it('shows its targets read-only', async () => {
    fetchTrafficTargets.mockImplementation(targetsPage);
    renderAt('targets');

    await screen.findByText(/targets are set by the ministry/i);
    const grid = await screen.findByTestId('grid');
    await within(grid).findByText(/jawaharlal/i);
    expect(screen.queryByRole('button', { name: /update target/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add target/i })).not.toBeInTheDocument();
  });

  it('no longer has an Entry Access tab inside Traffic', async () => {
    renderAt('entry-access');
    expect(screen.queryByRole('button', { name: 'Entry Access' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlock entry/i })).not.toBeInTheDocument();
  });

  it('opens the commodity input form with the entry window', async () => {
    renderAt('input-form');

    expect(screen.getByText('Add Traffic Data')).toBeInTheDocument();
    expect(await screen.findByText(/data entry is open until the 8th/i)).toBeInTheDocument();
    expect(fetchTrafficEntryStatus).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText(/financial year/i)).toHaveValue(currentFinancialYear());
    expect(fetchTrafficPeriod).not.toHaveBeenCalled();
    // Each page moves on with Save & Next; there is no Save & Finish any more
    expect(screen.getByRole('button', { name: /save & next/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /save & finish/i })).not.toBeInTheDocument();
  });
});
