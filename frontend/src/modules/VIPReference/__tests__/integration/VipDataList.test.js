/* global jest, describe, it, expect, beforeEach, afterEach */
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import DataList from '../../pages/DataList';
import { useVipStore } from '../../store/useVipStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchVIPReferences, deleteVIPReference } from '../../api';
import { exportRowsToFile } from '../../../../utils/exportGridReport';

// Icons and the AG Grid wrapper are irrelevant to the wiring under test. The grid stand-in
// renders each row's action cell so the Edit/Delete buttons can still be asserted on.
jest.mock('lucide-react', () => new Proxy({}, { get: (_t, name) => (name === '__esModule' ? true : () => null) }));
jest.mock('../../../../components/Table', () => ({ rowData = [], columnDefs = [] }) => {
  const action = columnDefs.find((c) => c.headerName === 'Action');
  return (
    <div>
      {rowData.map((r) => (
        <div key={r.id} data-testid="row">
          <span>{r.subject}</span>
          {action && !action.hide ? action.cellRenderer({ data: r, value: r.id }) : null}
        </div>
      ))}
    </div>
  );
});
jest.mock('../../../../components/CopyButton', () => ({ onCopy }) => <button onClick={onCopy}>copy-rows</button>);
jest.mock('../../../../components/ExportDropdown', () => ({ onExportExcel, onExportPdf }) => (
  <>
    <button onClick={onExportExcel}>export-excel</button>
    <button onClick={onExportPdf}>export-pdf</button>
  </>
));
jest.mock('../../../../components/ConfirmModal', () => ({ isOpen, onConfirm, onClose, message }) => (
  isOpen ? (
    <div role="dialog">
      <p>{message}</p>
      <button onClick={onConfirm}>confirm-delete</button>
      <button onClick={onClose}>cancel-delete</button>
    </div>
  ) : null
));
jest.mock('../../api', () => ({
  fetchVIPReferences: jest.fn(),
  deleteVIPReference: jest.fn(),
}));
jest.mock('../../../../utils/exportGridReport', () => ({
  exportRowsToFile: jest.fn(() => 'VIP_References_active.xlsx'),
}));
jest.mock('../../../../utils/authSession', () => ({
  getCurrentUserId: () => 42,
}));

// Two active references and one disposed one
const apiRows = [
  {
    vip_reference_id: 1,
    subject: 'Dredging query from MP',
    wing_name: 'Ports',
    division_name: 'PD-I',
    ref_letter_num: 'REF-1',
    received_from: 'Shri A',
    remarks: 'first',
    received_at_ministry_date: '2026-01-05',
    updated_date: '2026-02-01',
  },
  {
    vip_reference_id: 2,
    subject: 'Port connectivity reference',
    wing_name: 'Shipping',
    division_name: 'Shipping-I',
    ref_letter_num: 'REF-2',
    received_from: 'Smt B',
    received_at_ministry_date: '2026-01-07',
    updated_date: '2026-02-02',
  },
  {
    vip_reference_id: 3,
    subject: 'Closed matter',
    wing_name: 'Ports',
    division_name: 'PD-I',
    received_at_ministry_date: '2025-10-01',
    disposed_date: '2025-12-01',
    updated_date: '2025-12-02',
  },
];

const mount = (props = {}) => render(
  <DataList triggerNotification={jest.fn()} onEdit={jest.fn()} {...props} />
);

beforeEach(() => {
  resetAllStores();
  fetchVIPReferences.mockResolvedValue({ data: apiRows });
  deleteVIPReference.mockResolvedValue({});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('VIP Reference Data List — permissions', () => {
  it('shows neither Edit nor Delete without the permissions', async () => {
    mount();
    await screen.findAllByTestId('row');
    expect(screen.queryByTitle('Update VIP Letter status')).toBeNull();
    expect(screen.queryByTitle('Delete VIP Reference')).toBeNull();
  });

  it('shows only Edit when the user cannot delete', async () => {
    mount({ canEdit: true });
    await screen.findAllByTestId('row');
    expect(screen.getAllByTitle('Update VIP Letter status').length).toBe(2);
    expect(screen.queryByTitle('Delete VIP Reference')).toBeNull();
  });

  it('shows the Delete button when the user may remove records', async () => {
    mount({ canEdit: true, canRemove: true });
    await screen.findAllByTestId('row');
    expect(screen.getAllByTitle('Delete VIP Reference').length).toBe(2);
  });
});

describe('VIP Reference Data List — delete', () => {
  it('asks for confirmation, calls the API with the user id, and reloads', async () => {
    const trigger = jest.fn();
    mount({ canRemove: true, triggerNotification: trigger });
    await screen.findAllByTestId('row');

    fireEvent.click(screen.getAllByTitle('Delete VIP Reference')[0]);

    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('Dredging query from MP');
    expect(deleteVIPReference).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('confirm-delete'));

    await waitFor(() => expect(deleteVIPReference).toHaveBeenCalledWith(1, 42));
    // the list is refetched so the deleted row disappears
    await waitFor(() => expect(fetchVIPReferences).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('does not call the API when the confirmation is cancelled', async () => {
    mount({ canRemove: true });
    await screen.findAllByTestId('row');

    fireEvent.click(screen.getAllByTitle('Delete VIP Reference')[0]);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByText('cancel-delete'));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deleteVIPReference).not.toHaveBeenCalled();
  });
});

describe('VIP Reference Data List — export columns', () => {
  const headersOf = (call) => call[1].headers;

  it('Excel and PDF export the same columns', async () => {
    mount();
    await screen.findAllByTestId('row');

    fireEvent.click(screen.getByText('export-excel'));
    fireEvent.click(screen.getByText('export-pdf'));

    expect(exportRowsToFile).toHaveBeenCalledTimes(2);
    const [excelCall, pdfCall] = exportRowsToFile.mock.calls;
    expect(excelCall[0]).toBe('excel');
    expect(pdfCall[0]).toBe('pdf');
    expect(headersOf(pdfCall)).toEqual(headersOf(excelCall));
  });

  it('leaves a hidden column out of the export', async () => {
    mount();
    await screen.findAllByTestId('row');

    expect(useVipStore.getState().visibleCols.wing).toBe(true);
    fireEvent.click(screen.getByText('export-excel'));
    expect(headersOf(exportRowsToFile.mock.calls[0])).toContain('Wing');

    exportRowsToFile.mockClear();
    // Through act(), so React has re-rendered with the column hidden before the next click
    act(() => useVipStore.getState().setVisibleCols((prev) => ({ ...prev, wing: false })));

    fireEvent.click(screen.getByText('export-excel'));
    expect(headersOf(exportRowsToFile.mock.calls[0])).not.toContain('Wing');
  });

  it('copies the rows matching the filters, not just one page', async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });

    mount();
    await screen.findAllByTestId('row');
    fireEvent.click(screen.getByText('copy-rows'));

    await waitFor(() => expect(writeText).toHaveBeenCalled());
    const lines = writeText.mock.calls[0][0].trim().split('\n');
    // header + the two active references (the disposed one is on the other tab)
    expect(lines).toHaveLength(3);
    expect(lines[0]).toContain('Subject');
  });
});
