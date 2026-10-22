import {
  columnsForOrg,
  dropEmptyRows,
  dropMetaColumns,
  exportMatrix,
  headerRows,
  normaliseOrgName,
  orgNamesIn,
  searchRows,
  sortColumns,
  totalRow,
  trimLabels,
  yearMonthOptions,
  zeroToBlank,
} from '../../reports/reportUtils';
import { indexRows, sectionOf, visibleReports } from '../../reports/reportCatalog';

const ministry = { isOrgUser: false, orgId: 1 };
const majorPortUser = { isOrgUser: true, orgId: 7 };
const nonMajorPortUser = { isOrgUser: true, orgId: 21 };

describe('HR reports catalog', () => {
  it('lists the eleven live reports of the legacy index, in order', () => {
    expect(visibleReports(ministry).map((r) => r.coding)).toEqual([
      'H-2.0.1', 'H-2.1.1', 'H-2.1.2', 'H-2.2.1', 'H-2.2.2', 'H-2.3.1', 'H-2.3.2',
      'H-2.4.1', 'H-2.4.2', 'H-3.1', 'H-4.1',
    ]);
  });

  it('hides the Major Ports vacancy history from non-major-port organisation users only', () => {
    expect(visibleReports(majorPortUser).map((r) => r.id)).toContain('vacancy-history');
    expect(visibleReports(nonMajorPortUser).map((r) => r.id)).not.toContain('vacancy-history');
    expect(indexRows(nonMajorPortUser)[0]).toMatchObject({ isSection: true, sNo: '1', title: 'Manpower Overview' });
    expect(indexRows(ministry).filter((r) => r.report).map((r) => r.report.id)).toEqual(visibleReports(ministry).map((r) => r.id));
    expect(sectionOf(nonMajorPortUser, 'vacancy-history')).toBeNull();
    expect(sectionOf(ministry, 'gender-wise-non-major').reports.map((r) => r.id))
      .toEqual(['gender-wise-major', 'gender-wise-non-major']);
  });
});

describe('report shaping', () => {
  it('blanks zeros and totals numeric fields under the label column', () => {
    const rows = zeroToBlank([
      { Department: 'Civil', A_Sanctioned: 3, A_Actual: 0 },
      { Department: 'Marine', A_Sanctioned: '2', A_Actual: 1 },
    ]);
    expect(rows[0].A_Actual).toBeNull();
    expect(totalRow(rows, { labelKey: 'Department' })).toEqual({
      Department: 'Total', __total: true, A_Sanctioned: 5, A_Actual: 1,
    });
    expect(totalRow([], { labelKey: 'Department' })).toBeNull();
  });

  it('drops the backend-only columns', () => {
    const cols = dropMetaColumns([{ field: 'Organisation' }, { field: 'organisationId' }, { headerName: 'Organisation Category', field: 'x' }]);
    expect(cols).toEqual([{ field: 'Organisation' }]);
  });

  it('matches organisations across punctuation differences', () => {
    expect(normaliseOrgName('V.O. Chidambaranar Port Authority')).toBe(normaliseOrgName('V O  Chidambaranar Port Authority'));
  });

  it('keeps only the selected organisation group or column', () => {
    const grouped = [
      { field: 'Department' },
      { headerName: 'Chennai Port Authority', children: [{ field: 'Chennai Port Authority_Sanctioned' }] },
      { headerName: 'Cochin Port Authority', children: [{ field: 'Cochin Port Authority_Sanctioned' }] },
    ];
    expect(columnsForOrg(grouped, 'Cochin Port Authority', { mode: 'group', keep: ['Department'] }).map((c) => c.field || c.headerName))
      .toEqual(['Department', 'Cochin Port Authority']);

    const flat = [{ field: 'CLASS' }, { field: 'GENDER' }, { headerName: 'Chennai Port Authority', field: 'c' }, { headerName: 'Cochin Port Authority', field: 'k' }];
    expect(columnsForOrg(flat, 'Chennai Port Authority', { mode: 'column', keep: ['CLASS', 'GENDER'] }).map((c) => c.field))
      .toEqual(['CLASS', 'GENDER', 'c']);
    expect(columnsForOrg(flat, '', { mode: 'column' })).toBe(flat);
  });

  it('drops rows empty in the visible columns and sorts organisation columns', () => {
    expect(dropEmptyRows([{ a: null, b: '' }, { a: 1 }], ['a', 'b'])).toEqual([{ a: 1 }]);
    const sorted = sortColumns([{ headerName: 'Zeta' }, { field: 'CLASS', headerName: 'CLASS' }, { headerName: 'Alpha' }], ['CLASS']);
    expect(sorted.map((c) => c.headerName)).toEqual(['CLASS', 'Alpha', 'Zeta']);
  });

  it('builds distinct year and month options from the vacancy log', () => {
    expect(yearMonthOptions([
      { log_year: 2025, log_month: 4 },
      { log_year: 2025, log_month: 5 },
      { log_year: 2026, log_month: 4 },
    ])).toEqual({
      years: [{ value: '2025', label: '2025' }, { value: '2026', label: '2026' }],
      months: [{ value: '4', label: 'April' }, { value: '5', label: 'May' }],
    });
  });
});

describe('grouped report table', () => {
  const columns = [
    { headerName: 'S.No', value: (_r, i) => i + 1 },
    { headerName: 'Organisation', field: 'org' },
    {
      headerName: 'Regular',
      children: [
        { headerName: 'Officers', children: [{ headerName: 'Sanctioned', field: 'os' }, { headerName: 'Actual', field: 'oa' }] },
        { headerName: 'Total', field: 'rt' },
      ],
    },
  ];

  it('spans groups over their leaves and leaves down to the last header row', () => {
    const rows = headerRows(columns).map((r) => r.map((c) => [c.col.headerName, c.colSpan, c.rowSpan]));
    expect(rows).toEqual([
      [['S.No', 1, 3], ['Organisation', 1, 3], ['Regular', 3, 1]],
      [['Officers', 2, 1], ['Total', 1, 2]],
      [['Sanctioned', 1, 1], ['Actual', 1, 1]],
    ]);
  });

  it('exports labelled leaves, serials and the total row', () => {
    const rows = [{ org: 'Chennai', os: 2, oa: null, rt: 2 }];
    expect(exportMatrix(columns, rows, { org: 'Total', os: 2, rt: 2 })).toEqual({
      headers: ['S.No', 'Organisation', 'Regular - Officers - Sanctioned', 'Regular - Officers - Actual', 'Regular - Total'],
      body: [[1, 'Chennai', 2, '', 2], ['', 'Total', 2, '', 2]],
    });
  });

  it('searches every leaf field', () => {
    const rows = [{ org: 'Chennai', os: 2 }, { org: 'Cochin', os: 15 }];
    expect(searchRows(columns, rows, 'coch')).toEqual([rows[1]]);
    expect(searchRows(columns, rows, '15')).toEqual([rows[1]]);
    expect(searchRows(columns, rows, '')).toBe(rows);
  });
});

describe('report filter options', () => {
  it('trims department labels sent with trailing whitespace', () => {
    expect(trimLabels([{ Department: 'Civil Engineering\n' }, { Department: 'Finance and Accounts ' }], 'Department'))
      .toEqual([{ Department: 'Civil Engineering' }, { Department: 'Finance and Accounts' }]);
  });

  it('lists the organisations present in the report for each layout', () => {
    const grouped = [{ field: 'Department' }, { headerName: 'Chennai Port Authority', children: [{ field: 'a' }] }];
    expect(orgNamesIn(grouped, [], { mode: 'group' })).toEqual(['Chennai Port Authority']);
    const flat = [{ field: 'CLASS', headerName: 'CLASS' }, { field: 'GENDER', headerName: 'GENDER' }, { field: 'k', headerName: 'Cochin Port Authority' }];
    expect(orgNamesIn(flat, [], { mode: 'column', keep: ['CLASS', 'GENDER'] })).toEqual(['Cochin Port Authority']);
    expect(orgNamesIn([], [{ Organisation: ' Paradip ' }, { Organisation: 'Paradip' }], { mode: 'rows', labelKey: 'Organisation' }))
      .toEqual(['Paradip']);
  });
});
