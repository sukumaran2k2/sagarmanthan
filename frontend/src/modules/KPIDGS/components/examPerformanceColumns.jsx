import { Edit } from 'lucide-react';
import { monthName } from '../data/periodOptions';
import { lastUpdatedText } from '../../../utils/cellText';

// Data List columns for K-2.3.1 / K-2.3.2 (the shared S.No / period / Last Updated / Edit columns
// are also used by K-2.4, see entryExitColumns.jsx). The Edit action opens the matching input form
// with the row in route state; it is only added when the user has edit rights.

export const centerCell = 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold';

export const serialColumn = {
  // Pinned left so it stays in view when the table scrolls sideways (Action is pinned right)
  headerName: 'S.No', valueGetter: (p) => p.node.rowIndex + 1, minWidth: 80, maxWidth: 100,
  pinned: 'left', lockPosition: 'left',
  cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
};

export const periodColumns = [
  { headerName: 'Year', field: 'year', flex: 1, minWidth: 110, cellClass: `${centerCell} text-[#0f417a] dark:text-blue-400 font-bold` },
  {
    headerName: 'Month', field: 'month', flex: 1, minWidth: 130, cellClass: centerCell,
    valueFormatter: (p) => monthName(p.value),
    comparator: (a, b) => Number(a) - Number(b),
    useValueFormatterForExport: true,
  },
];

// Latest edit in the month (or month + type); '--' when never edited.
// Hidden at first; it can be shown under Visibility.
export const lastUpdatedColumn = {
  headerName: 'Last Updated Date', field: 'updated_date', minWidth: 150, hide: true,
  cellClass: 'text-center text-slate-600 dark:text-slate-300 flex items-center justify-center',
  valueFormatter: (p) => lastUpdatedText(p.value),
  useValueFormatterForExport: true,
};

export function editColumn(onEdit) {
  return {
    // 'Action' keeps it out of the table's column-visibility list
    headerName: 'Action', colId: 'action', pinned: 'right', minWidth: 90, maxWidth: 110,
    sortable: false, filter: false,
    cellClass: 'text-center flex items-center justify-center',
    cellRenderer: (p) => (
      <button
        type="button"
        onClick={() => onEdit(p.data)}
        className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
        title="Update Entry"
      >
        <Edit className="h-4 w-4" />
      </button>
    ),
  };
}

export function examMonthlyColumns({ canEdit, onEdit }) {
  return [
    serialColumn,
    ...periodColumns,
    { headerName: 'Total Exam Conducted - Nautical', field: 'total_exam_nautical', flex: 1.5, minWidth: 220, cellClass: centerCell },
    { headerName: 'Total Exam Conducted - Engineering', field: 'total_exam_engineering', flex: 1.5, minWidth: 230, cellClass: centerCell },
    lastUpdatedColumn,
    ...(canEdit ? [editColumn(onEdit)] : []),
  ];
}

export function examOverallColumns({ canEdit, onEdit }) {
  return [
    serialColumn,
    ...periodColumns,
    { headerName: 'Type', field: 'type_name', flex: 1, minWidth: 130, cellClass: centerCell },
    { headerName: 'No. of Candidates Appeared', field: 'candidatesAppeared', flex: 1.5, minWidth: 210, cellClass: centerCell },
    { headerName: 'No. of Candidates Passed', field: 'candidatesPassed', flex: 1.5, minWidth: 200, cellClass: centerCell },
    {
      headerName: 'Pass Percentage', field: 'passPercentage', flex: 1, minWidth: 160, cellClass: centerCell,
      headerTooltip: '(Candidates Passed / Candidates Appeared) x 100',
      valueFormatter: (p) => (p.value === null || p.value === undefined ? '' : `${Number(p.value).toFixed(2)}%`),
      useValueFormatterForExport: true,
    },
    lastUpdatedColumn,
    ...(canEdit ? [editColumn(onEdit)] : []),
  ];
}
