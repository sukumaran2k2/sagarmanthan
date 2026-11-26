import { centerCell, serialColumn, lastUpdatedColumn, editColumn } from './examPerformanceColumns';
import { YEAR_WISE_COUNTS } from '../data/marineCasualty';

// Data List columns for K-2.5 Marine Casualty. The Edit action opens the input form with the row in
// route state; it is only added when the user has edit rights.

const yearColumn = { headerName: 'Year', field: 'year', flex: 1, minWidth: 110, cellClass: `${centerCell} text-[#0f417a] dark:text-blue-400 font-bold` };
const numberCell = { cellClass: centerCell, valueFormatter: (p) => (p.value == null ? '' : Number(p.value).toLocaleString('en-IN')) };

// K-2.5.1 / 2.5.3 / 2.5.4: one line per year + casualty type
export function marineSheetColumns({ rowLabel, canEdit, onEdit }) {
  return [
    serialColumn,
    yearColumn,
    { headerName: 'Casualty Type', field: 'casualty_type', flex: 1.2, minWidth: 160, cellClass: centerCell },
    { headerName: `${rowLabel} Rows`, field: 'row_count', flex: 1, minWidth: 150, ...numberCell },
    { headerName: 'Total Incidents', field: 'total_incidents', flex: 1, minWidth: 150, ...numberCell, cellClass: `${centerCell} font-bold` },
    lastUpdatedColumn,
    ...(canEdit ? [editColumn(onEdit)] : []),
  ];
}

// K-2.5.2: one line per year with its seven counts
export function marineYearWiseColumns({ canEdit, onEdit }) {
  return [
    serialColumn,
    yearColumn,
    ...YEAR_WISE_COUNTS.map((c) => ({ headerName: c.label, field: c.column, flex: 1, minWidth: 140, ...numberCell })),
    { headerName: 'Total Incidents', field: 'total_incidents', flex: 1, minWidth: 140, ...numberCell, cellClass: `${centerCell} font-bold` },
    lastUpdatedColumn,
    ...(canEdit ? [editColumn(onEdit)] : []),
  ];
}
