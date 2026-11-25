import { centerCell, serialColumn, periodColumns, lastUpdatedColumn, editColumn } from './examPerformanceColumns';

// Data List columns and filters for K-2.4 Entry and Exit of Candidates. The Edit action opens the
// input form with the row in route state; it is only added when the user has edit rights.

export function entryExitColumns({ canEdit, onEdit }) {
  return [
    serialColumn,
    ...periodColumns,
    { headerName: 'Type', field: 'type_name', flex: 1, minWidth: 130, cellClass: centerCell },
    { headerName: 'Grade', field: 'grade_name', flex: 1.5, minWidth: 170, wrapText: true, autoHeight: true, cellClass: centerCell },
    {
      headerName: 'Candidates Entered', field: 'no_of_candidates_entered', flex: 1.2, minWidth: 170, cellClass: centerCell,
      headerTooltip: 'No. of candidates entered the system, i.e. assessments done',
    },
    {
      headerName: 'Candidates Exited', field: 'no_of_candidates_exited', flex: 1.2, minWidth: 165, cellClass: centerCell,
      headerTooltip: 'No. of candidates exited the system, i.e. CoC issued',
    },
    lastUpdatedColumn,
    ...(canEdit ? [editColumn(onEdit)] : []),
  ];
}

// Choices of a row field, one per value, sorted
const uniqueSorted = (rows, pick, by) => [...new Map(rows.filter((r) => pick(r) != null).map((r) => [String(pick(r)), r])).values()].sort(by);

// Type tabs (Nautical / Engineering) above the table, like the E-Office sheet tabs
export const ENTRY_EXIT_TABS = {
  key: 'type', label: 'Type',
  value: (r) => r.type_id,
  options: (rows) => uniqueSorted(rows, (r) => r.type_id, (a, b) => a.type_id - b.type_id).map((r) => ({ value: String(r.type_id), label: r.type_name })),
};
