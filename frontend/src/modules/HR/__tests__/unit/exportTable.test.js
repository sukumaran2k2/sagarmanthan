/* global describe, it, expect, jest, beforeEach, require */
import { createTableExporter, fetchAllRows, rowsToSheetObjects, rowsToTsv, safeFileName } from '../../utils/exportTable';

jest.mock('xlsx', () => ({
  utils: { book_new: jest.fn(() => ({})), book_append_sheet: jest.fn(), json_to_sheet: jest.fn((rows) => rows) },
  writeFile: jest.fn(),
}));
jest.mock('../../../../utils/exportReportPdf', () => ({ exportDataListToPdf: jest.fn() }));

const XLSX = require('xlsx');
const { exportDataListToPdf } = require('../../../../utils/exportReportPdf');

const columns = [
  { field: 'post_code', label: 'Post Code' },
  { field: 'emp_name', label: 'Employee' },
  { field: 'emp_dor', label: 'Retirement', value: (r) => (r.emp_dor ? 'formatted' : '') },
];
const rows = [
  { post_code: 'P-1', emp_name: 'Asha\tRao', emp_dor: '2030-01-01' },
  { post_code: 'P-2', emp_name: null, emp_dor: null },
];

describe('rowsToTsv', () => {
  it('numbers rows, keeps column order and flattens tabs/newlines', () => {
    expect(rowsToTsv(rows, columns)).toBe(
      'S.No\tPost Code\tEmployee\tRetirement\n1\tP-1\tAsha Rao\tformatted\n2\tP-2\t\t'
    );
  });
});

describe('rowsToSheetObjects', () => {
  it('keys cells by label and uses value() when given', () => {
    expect(rowsToSheetObjects(rows, columns)[0]).toEqual({
      'S.No': 1, 'Post Code': 'P-1', Employee: 'Asha\tRao', Retirement: 'formatted',
    });
  });
});

describe('safeFileName', () => {
  it('replaces unsafe characters', () => {
    expect(safeFileName('Vacancy Overview - Port / Trust')).toBe('Vacancy_Overview_Port_Trust');
  });
});

describe('createTableExporter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('warns instead of reporting success when there is nothing to export', async () => {
    const notify = jest.fn();
    const ex = createTableExporter({ loadRows: async () => [], getColumns: () => columns, notify });
    await ex.copy();
    await ex.excel();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'warning', title: 'Nothing to Export' }));
    expect(notify).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
    expect(XLSX.writeFile).not.toHaveBeenCalled();
  });

  it('reports a failed load', async () => {
    const notify = jest.fn();
    const err = { response: { data: { message: 'Forbidden' } } };
    await createTableExporter({ loadRows: () => Promise.reject(err), getColumns: () => columns, notify }).pdf();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'error', title: 'Could Not Load Data' }));
    expect(exportDataListToPdf).not.toHaveBeenCalled();
  });

  it('writes the loaded rows to Excel and PDF with the visible columns', async () => {
    const ex = createTableExporter({ loadRows: async () => rows, getColumns: () => columns, fileName: 'HR list', title: 'T' });
    await ex.excel();
    expect(XLSX.writeFile).toHaveBeenCalledWith(expect.anything(), 'HR_list.xlsx');
    await ex.pdf();
    const arg = exportDataListToPdf.mock.calls[0][0];
    expect(arg.columnLabels).toEqual({ post_code: 'Post Code', emp_name: 'Employee', emp_dor: 'Retirement' });
    expect(arg.rowData[1]).toEqual({ post_code: 'P-2', emp_name: '', emp_dor: '' });
  });

  it('copies TSV to the clipboard and reports the row count', async () => {
    const writeText = jest.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    const notify = jest.fn();
    await createTableExporter({ loadRows: () => rows, getColumns: () => columns, notify, label: 'List' }).copy();
    expect(writeText).toHaveBeenCalledWith(rowsToTsv(rows, columns));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ type: 'success', title: 'Copied to Clipboard' }));
  });
});

describe('fetchAllRows', () => {
  it('requests every page with the filters and joins the rows', async () => {
    const request = jest.fn(({ page }) => Promise.resolve({
      data: { data: page === 3 ? [{ id: 5 }] : [{ id: page * 2 - 1 }, { id: page * 2 }], pagination: { totalPages: 3 } },
    }));
    const all = await fetchAllRows(request, { search: 'Pilot' });
    expect(all.map(r => r.id)).toEqual([1, 2, 3, 4, 5]);
    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenLastCalledWith({ search: 'Pilot', page: 3, limit: 100 });
  });

  it('stops on an empty page even without pagination info', async () => {
    const request = jest.fn(() => Promise.resolve({ data: { data: [] } }));
    expect(await fetchAllRows(request, {})).toEqual([]);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
