/* global describe, it, expect */
import { readGridForExport, toClipboardText } from '../../utils/gridExport';

// Minimal stand-in for an ag-Grid api: displayed columns, rows after filter / sort, formatted cells
function fakeGrid(columns, nodes) {
  return {
    getAllDisplayedColumns: () => columns.map((c) => ({ getColDef: () => c })),
    forEachNodeAfterFilterAndSort: (fn) => nodes.forEach(fn),
    getCellValue: ({ rowNode, colKey }) => {
      const def = colKey.getColDef();
      const raw = rowNode.data[def.field];
      return def.valueFormatter ? def.valueFormatter({ value: raw }) : raw;
    },
  };
}

const COLUMNS = [
  { headerName: 'S.No' },
  { headerName: 'Year', field: 'year' },
  { headerName: 'Month', field: 'month', valueFormatter: (p) => ['', 'January', 'February'][p.value] },
  { headerName: 'Last Updated Date', field: 'updated_date', valueFormatter: (p) => p.value || '--' },
  { headerName: 'Action' },
];

describe('DGS Data List export', () => {
  it('returns null until the grid is ready', () => {
    expect(readGridForExport(null)).toBeNull();
  });

  it('exports every row as shown: own S.No, cells as displayed, no Action column', () => {
    const grid = readGridForExport(fakeGrid(COLUMNS, [
      { data: { year: 2026, month: 2, updated_date: null } },
      { data: { year: 2026, month: 1, updated_date: '2026-11-21' } },
      { data: null }, // group / filler rows are skipped
    ]));
    expect(grid.headers).toEqual(['S.No', 'Year', 'Month', 'Last Updated Date']);
    expect(grid.rows).toEqual([
      [1, 2026, 'February', '--'],
      [2, 2026, 'January', '2026-11-21'],
    ]);
  });

  it('builds tab-separated text for the clipboard', () => {
    expect(toClipboardText({ headers: ['S.No', 'Year'], rows: [[1, 2026], [2, 2025]] }))
      .toBe('S.No\tYear\n1\t2026\n2\t2025');
  });
});
