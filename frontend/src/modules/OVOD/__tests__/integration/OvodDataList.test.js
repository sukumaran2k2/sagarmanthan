/* global jest, describe, it, expect, beforeEach, afterEach */
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DataList from '../../pages/DataList';
import { useOvodStore } from '../../store/useOvodStore';
import { resetAllStores } from '../../../../stores/resetRegistry';
import { fetchOvdOrgListData } from '../../api';

// Icons, the spreadsheet library and the AG Grid wrapper are irrelevant to the wiring under test
jest.mock('lucide-react', () => new Proxy({}, { get: (_t, name) => (name === '__esModule' ? true : () => null) }));
jest.mock('xlsx', () => ({ utils: { json_to_sheet: jest.fn(), book_new: jest.fn(), book_append_sheet: jest.fn() }, writeFile: jest.fn() }));
jest.mock('../../../../components/Table', () => ({ rowData = [] }) => (
  <div>{rowData.map((r) => <div key={r.id} data-testid="row">{r.organisation_name}</div>)}</div>
));
jest.mock('../../../../components/CopyButton', () => ({ onCopy }) => <button onClick={onCopy}>copy-rows</button>);
jest.mock('../../../../components/ExportDropdown', () => ({ onExportExcel, onExportPdf }) => (
  <>
    <button onClick={onExportExcel}>export-excel</button>
    <button onClick={onExportPdf}>export-pdf</button>
  </>
));
jest.mock('../../api', () => ({
  fetchOvdOrgListData: jest.fn(),
  deleteOvdAction: jest.fn(),
  getUserIdFromToken: () => '1',
  fetchOrganisations: jest.fn(),
}));

// 25 rows: 17 completed + 8 under implementation, across two wings
const makeRows = () => Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  ia_name: `Organisation ${i + 1}`,
  'Goal (A1)': 'Goal A1',
  'Current Status': i < 17 ? 'Completed' : 'Under Implementation',
  Wing: i % 2 === 0 ? 'Ports' : 'Shipping',
}));

const mountList = (trigger) => render(<DataList triggerNotification={trigger} onEdit={jest.fn()} onAddNew={jest.fn()} />);
const showing = (text) => screen.getByText((_c, el) => el?.textContent === text && el.tagName === 'DIV');

beforeEach(() => {
  resetAllStores();
  fetchOvdOrgListData.mockResolvedValue(makeRows());
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  jest.restoreAllMocks();
});

describe('OVOD Data List wired to the store', () => {
  it('pages forward with the Next button', async () => {
    mountList(jest.fn());
    expect(await screen.findAllByTestId('row')).toHaveLength(10);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    expect(await screen.findByText('Organisation 11')).toBeTruthy();
    expect(useOvodStore.getState().dataList.currentPage).toBe(2);
  });

  it('keeps the page when the list is closed and opened again (switching tabs)', async () => {
    const first = mountList(jest.fn());
    await screen.findAllByTestId('row');
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Organisation 11');
    first.unmount();

    // Reopen: rows are empty while loading, which must not push the page back to 1
    mountList(jest.fn());
    expect(await screen.findByText('Organisation 11')).toBeTruthy();
    expect(useOvodStore.getState().dataList.currentPage).toBe(2);
  });

  it('still clamps to page 1 when the data shrinks below the saved page', async () => {
    useOvodStore.getState().setDataListPage(3);
    fetchOvdOrgListData.mockResolvedValue(makeRows().slice(0, 5)); // only one page of data

    mountList(jest.fn());
    await screen.findAllByTestId('row');

    await waitFor(() => expect(useOvodStore.getState().dataList.currentPage).toBe(1));
  });

  it('remembers the status tab and filters across a reopen', async () => {
    const first = mountList(jest.fn());
    await screen.findAllByTestId('row');
    fireEvent.click(screen.getByRole('button', { name: /^Completed \(17\)/ }));
    first.unmount();

    mountList(jest.fn());
    await screen.findAllByTestId('row');
    expect(useOvodStore.getState().dataList.activeTab).toBe('completed');
    expect(screen.getByRole('button', { name: /^Completed \(17\)/ }).className).toContain('active');
  });

  it('filters rows from the panel and clears them with a standard "Filters Cleared" toast', async () => {
    const trigger = jest.fn();
    mountList(trigger);
    await screen.findAllByTestId('row');

    fireEvent.click(screen.getByRole('button', { name: /filter/i }));
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'Ports' } }); // Ministry Wing
    await waitFor(() => expect(showing('Total: 13')).toBeTruthy());
    expect(useOvodStore.getState().dataList.filters.wing).toBe('Ports');

    fireEvent.click(screen.getByRole('button', { name: /^reset$/i }));

    expect(useOvodStore.getState().dataList.filters.wing).toBe('0');
    expect(trigger).toHaveBeenCalledWith(
      expect.stringContaining('The list now shows every record'),
      'info',
      'Filters Cleared',
      { variant: 'standard', duration: 4000 }
    );
  });

  it('copies the filtered rows and says how many', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: jest.fn().mockResolvedValue() }, configurable: true });
    const trigger = jest.fn();
    mountList(trigger);
    await screen.findAllByTestId('row');

    fireEvent.click(screen.getByText('copy-rows'));

    await waitFor(() => expect(trigger).toHaveBeenCalledWith(
      expect.stringContaining('25 rows matching the current filters copied'),
      'success',
      'Copied to Clipboard',
      expect.any(Object)
    ));
  });

  it('tells the user when the browser blocks the PDF window', async () => {
    window.open = jest.fn(() => null);
    const trigger = jest.fn();
    mountList(trigger);
    await screen.findAllByTestId('row');

    fireEvent.click(screen.getByText('export-pdf'));

    expect(trigger).toHaveBeenCalledWith(expect.stringContaining('Allow pop-ups'), 'warning', 'Pop-up Blocked', expect.any(Object));
  });

  it('shows a load-failed toast instead of failing silently', async () => {
    fetchOvdOrgListData.mockRejectedValue(new Error('network'));
    const trigger = jest.fn();
    mountList(trigger);

    await waitFor(() => expect(trigger).toHaveBeenCalledWith(
      expect.stringContaining('The action item list could not be loaded'),
      'error',
      'Could Not Load Data',
      expect.any(Object)
    ));
  });
});
