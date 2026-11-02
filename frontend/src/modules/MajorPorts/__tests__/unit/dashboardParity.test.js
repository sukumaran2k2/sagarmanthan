/* global jest, describe, it, expect */
import * as XLSX from 'xlsx';
import { allMonthsFor } from '../../pages/Traffic/dashboard/dashboardConfig';
import { splitDrillRows, yoyCellStyle } from '../../pages/Traffic/dashboard/drillConfig';
import { exportGridToExcel } from '../../../../utils/exportGridReport';

jest.mock('xlsx', () => {
  const actual = jest.requireActual('xlsx');
  return { ...actual, writeFile: jest.fn() };
});
jest.mock('jspdf', () => jest.fn());
jest.mock('jspdf-autotable', () => jest.fn());

const row = (organisation_id, organisation_name) => ({ organisation_id, organisation_name });

describe('dashboard behaviour kept from the earlier portal', () => {
  it('shows only the SMPA docks and SMPA Total when organisation 4 (the SMPA group) is chosen', () => {
    const rows = [
      row(1, 'Chennai Port Authority'), row(54, 'Tamil Nadu Maritime Board'), row(55, 'PWD, GOA'),
      row(null, 'SMPA Total'), row(null, 'Overall Total'),
    ];
    const { rows: list, pinned } = splitDrillRows(rows, { type: 'traffic', kpi: 'traffic', organisationId: 4 });
    expect(list.map((r) => r.organisation_name)).toEqual(['Tamil Nadu Maritime Board', 'PWD, GOA', 'SMPA Total']);
    expect(pinned).toEqual([]);
  });

  it('selects no months for "All Months" in April, when no month is complete yet', () => {
    expect(allMonthsFor('', new Date(2026, 3, 15))).toEqual([]);
    expect(allMonthsFor('', new Date(2026, 4, 15))).toEqual([4]);
  });
});

describe('report grid Excel export', () => {
  it('writes title, period, export date, merged group headers, body and total rows', () => {
    const columns = [
      { field: 'sNo', headerName: 'S.No' },
      { field: 'organisation_name', headerName: 'Organisation' },
      {
        headerName: 'Total',
        children: [
          { field: 'cy', headerName: 'FY26-27 (YTD)', valueFormatter: (p) => Number(p.value).toFixed(2) },
          { field: 'yoy', headerName: 'YoY (%)', valueFormatter: (p) => `${p.value} %`, cellStyle: yoyCellStyle },
          { field: 'hidden', headerName: 'Hidden', hide: true },
        ],
      },
    ];
    const name = exportGridToExcel({
      title: 'Detail of KPI',
      subtitle: 'Apr to Sep 2025 & Apr to Sep 2026',
      columns,
      rows: [{ sNo: 1, organisation_name: 'Chennai', cy: 1234.5, yoy: 12.3 }],
      pinnedRows: [{ sNo: 2, organisation_name: 'Overall Total', cy: 2000, yoy: -1 }],
    });

    expect(name).toMatch(/^Detail_of_KPI_\d{4}-\d{2}-\d{2}_\d{4}\.xlsx$/);
    const [book] = XLSX.writeFile.mock.calls[0];
    const sheet = book.Sheets[book.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    expect(aoa[0][0]).toBe('Detail of KPI');
    expect(aoa[1][0]).toBe('Apr to Sep 2025 & Apr to Sep 2026');
    expect(aoa[2][0]).toMatch(/^Exported on /);
    expect(aoa[4]).toEqual(['S.No', 'Organisation', 'Total', '']);
    expect(aoa[5]).toEqual(['', '', 'FY26-27 (YTD)', 'YoY (%)']);
    expect(aoa[6]).toEqual([1, 'Chennai', 1234.5, '12.3 %']);
    expect(aoa[7]).toEqual([2, 'Overall Total', 2000, '-1 %']);
    // "Total" spans its two visible columns; S.No and Organisation span both header rows
    expect(sheet['!merges']).toEqual(expect.arrayContaining([
      { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },
      { s: { r: 4, c: 0 }, e: { r: 5, c: 0 } },
    ]));
  });
});
