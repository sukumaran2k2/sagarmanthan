import { Edit, Trash2 } from 'lucide-react';
import { monthName } from '../data/periodOptions';

// Data List columns for K-2.6.1 (Flag State Inspection - MMD Wise) and K-2.6.2
// (Flag State Inspection & GI Performance - Vessel Wise). The single Action column hosts the
// Update and Delete buttons side by side; each button only renders when the signed-in user
// has the matching permission.

const centerCell = 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold';

const serialColumn = {
  headerName: 'S.No', valueGetter: (p) => p.node.rowIndex + 1, minWidth: 80, maxWidth: 100,
  cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
};

function actionColumn({ canEdit, canDelete, onEdit, onDelete }) {
  return {
    // 'Action' keeps it out of the table's column-visibility list
    headerName: 'Action', colId: 'action', pinned: 'right', minWidth: 110, maxWidth: 140,
    sortable: false, filter: false,
    cellClass: 'text-center flex items-center justify-center',
    cellRenderer: (p) => (
      <div className="flex items-center justify-center gap-1.5">
        {canEdit && (
          <button
            type="button"
            onClick={() => onEdit(p.data)}
            className="inline-flex items-center justify-center h-7 w-7 bg-amber-400 hover:bg-amber-500 text-white rounded transition cursor-pointer"
            title="Update entry"
          >
            <Edit className="h-3.5 w-3.5" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(p.data)}
            className="inline-flex items-center justify-center h-7 w-7 bg-red-500 hover:bg-red-600 text-white rounded transition cursor-pointer"
            title="Delete entry"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    ),
  };
}

// K-2.6.1 — backend returns { mmd_year, mmd_month, mmd_id, mmd_name, mmd_ship_inspected }.
export function flagStateMmdWiseColumns({ canEdit, canDelete, onEdit, onDelete }) {
  return [
    serialColumn,
    { headerName: 'Year', field: 'mmd_year', flex: 1, minWidth: 110,
      cellClass: `${centerCell} text-[#0f417a] dark:text-blue-400 font-bold` },
    { headerName: 'Month', field: 'mmd_month', flex: 1, minWidth: 130, cellClass: centerCell,
      valueFormatter: (p) => monthName(p.value),
      comparator: (a, b) => Number(a) - Number(b),
      useValueFormatterForExport: true },
    { headerName: 'Name of MMD', field: 'mmd_name', flex: 1.3, minWidth: 180, cellClass: centerCell },
    { headerName: 'Number of Ships Inspected', field: 'mmd_ship_inspected', flex: 1.3, minWidth: 220, cellClass: centerCell },
    ...(canEdit || canDelete ? [actionColumn({ canEdit, canDelete, onEdit, onDelete })] : []),
  ];
}

// K-2.6.2 — backend returns { year, month, uptoFiveYears, fiveToFifteenYears,
// sixteenToTwentyFiveYears, aboveTwentyFiveYears } with pre-summed counts per age band.
export function flagStateVesselWiseColumns({ canEdit, canDelete, onEdit, onDelete }) {
  return [
    serialColumn,
    { headerName: 'Year', field: 'year', flex: 1, minWidth: 110,
      cellClass: `${centerCell} text-[#0f417a] dark:text-blue-400 font-bold` },
    { headerName: 'Month', field: 'month', flex: 1, minWidth: 130, cellClass: centerCell,
      valueFormatter: (p) => monthName(p.value),
      comparator: (a, b) => Number(a) - Number(b),
      useValueFormatterForExport: true },
    { headerName: '<= 5 Years', field: 'uptoFiveYears', flex: 1, minWidth: 130, cellClass: centerCell },
    { headerName: '5-15 Years', field: 'fiveToFifteenYears', flex: 1, minWidth: 130, cellClass: centerCell },
    { headerName: '16-25 Years', field: 'sixteenToTwentyFiveYears', flex: 1, minWidth: 140, cellClass: centerCell },
    { headerName: '> 25 Years', field: 'aboveTwentyFiveYears', flex: 1, minWidth: 130, cellClass: centerCell },
    ...(canEdit || canDelete ? [actionColumn({ canEdit, canDelete, onEdit, onDelete })] : []),
  ];
}
