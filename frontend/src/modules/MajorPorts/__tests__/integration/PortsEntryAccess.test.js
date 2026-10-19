/* global jest, describe, it, expect, beforeEach, require, global */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  createPortPerformanceAccessGrant,
  createTrafficAccessGrant,
  fetchPortPerformanceAccessGrants,
  fetchTrafficAccessGrants,
  revokePortPerformanceAccessGrant,
} from '../../api';
import { resetAllStores } from '../../../../stores/resetRegistry';

// react-router needs TextEncoder, which jsdom does not provide
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { MemoryRouter, Route, Routes } = require('react-router-dom');
const PortsEntryAccessView = require('../../PortsEntryAccessView').default;

const mockPermissions = { current: {} };
jest.mock('../../hooks/useTrafficPermissions', () => ({
  useTrafficPermissions: () => mockPermissions.current,
}));

jest.mock('../../pages/Traffic/trafficExport', () => ({
  copyRowsToClipboard: jest.fn(),
  downloadExcel: jest.fn(),
  downloadPdf: jest.fn(),
}));

jest.mock('../../../../components/Table', () => ({
  __esModule: true,
  default: ({ rowData = [], columnDefs = [] }) => {
    const actionCol = columnDefs.find((c) => c.headerName === 'Action');
    return (
      <div data-testid="grid">
        {rowData.map((row, i) => (
          <div key={i}>
            {row.organisation_name}
            {actionCol ? actionCol.cellRenderer({ data: row }) : null}
          </div>
        ))}
      </div>
    );
  },
}));

const GRANT = {
  access_id: 7, organisation_id: 9, organisation_name: 'Jawaharlal Nehru Port Authority',
  financial_year: '2026-2027', months: [7], status: 'ACTIVE', created_at: '2026-10-10T00:00:00Z',
};

jest.mock('../../api', () => {
  const page = (data = []) => Promise.resolve({ data: { data, pagination: { total: data.length, page: 1, limit: 10, totalPages: data.length ? 1 : 0 } } });
  const masters = () => Promise.resolve({ data: { organisations: [{ organisation_id: 9, organisation_name: 'Jawaharlal Nehru Port Authority' }], commodityGroups: [], commodities: [{ commodity_id: 1 }], kpiTypes: [] } });
  return {
    fetchTrafficMasters: jest.fn(masters),
    fetchPortPerformanceMasters: jest.fn(masters),
    fetchTrafficAccessGrants: jest.fn(() => page()),
    fetchPortPerformanceAccessGrants: jest.fn(() => page([{
      access_id: 7, organisation_id: 9, organisation_name: 'Jawaharlal Nehru Port Authority',
      financial_year: '2026-2027', months: [7], status: 'ACTIVE', created_at: '2026-10-10T00:00:00Z',
    }])),
    createTrafficAccessGrant: jest.fn(),
    createPortPerformanceAccessGrant: jest.fn(() => Promise.resolve({ data: { granted: 1 } })),
    revokeTrafficAccessGrant: jest.fn(),
    revokePortPerformanceAccessGrant: jest.fn(() => Promise.resolve({ data: { success: true } })),
  };
});

const MINISTRY = { canViewEntryAccess: true, canGrantAccess: true, canRevokeAccess: true };

function renderAt(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/kpi/major-ports/major-ports-entry-access${search}`]}>
      <Routes>
        <Route path="/kpi/major-ports/major-ports-entry-access" element={<PortsEntryAccessView triggerNotification={jest.fn()} />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  resetAllStores();
  jest.clearAllMocks();
  mockPermissions.current = MINISTRY;
});

describe('Entry Access — sections', () => {
  it('opens on Traffic and switches to Port Performance, each with its own grants', async () => {
    renderAt();
    await waitFor(() => expect(fetchTrafficAccessGrants).toHaveBeenCalled());
    expect(screen.getByText('Entry Access · Traffic')).toBeInTheDocument();
    expect(fetchPortPerformanceAccessGrants).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Port Performance' }));
    expect(await screen.findByText('Entry Access · Port Performance')).toBeInTheDocument();
    await waitFor(() => expect(fetchPortPerformanceAccessGrants).toHaveBeenCalled());
    expect(await screen.findByText('Jawaharlal Nehru Port Authority')).toBeInTheDocument();
  });

  it('grants and revokes through the Port Performance API when that section is open', async () => {
    renderAt('?section=port-performance');
    fireEvent.click(await screen.findByRole('button', { name: /revoke access for jawaharlal/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    await waitFor(() => expect(revokePortPerformanceAccessGrant).toHaveBeenCalledWith(GRANT.access_id));

    fireEvent.click(screen.getByRole('button', { name: /unlock entry/i }));
    expect(screen.getByText(/allow organisations to change port performance data/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('checkbox', { name: /jawaharlal/i }));
    fireEvent.click(screen.getByRole('button', { name: 'July' }));
    fireEvent.click(screen.getAllByRole('button', { name: /unlock entry/i }).at(-1));
    await waitFor(() => expect(createPortPerformanceAccessGrant).toHaveBeenCalledWith(expect.objectContaining({
      organisationIds: [9], months: [7],
    })));
    expect(createTrafficAccessGrant).not.toHaveBeenCalled();
  });

  it('is closed to users without entry access', () => {
    mockPermissions.current = { canViewEntryAccess: false };
    renderAt();
    expect(fetchTrafficAccessGrants).not.toHaveBeenCalled();
    expect(screen.queryByText(/Entry Access ·/)).not.toBeInTheDocument();
  });
});
