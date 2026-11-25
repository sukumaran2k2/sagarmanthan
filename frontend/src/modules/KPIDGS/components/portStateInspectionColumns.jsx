import { Edit, Trash2 } from 'lucide-react';
import { monthName } from '../data/periodOptions';

// Data List columns for K-2.7.1 (Port State Inspection - MMD Wise) and K-2.7.2 (Port State
// Inspection & GI Performance - Vessel Wise). Mirrors the K-2.6 columns but with the three
// K-2.7 age bands (<= 10 Years / 10-20 Years / > 20 Years). The combined Action column hosts
// Update and Delete buttons; each one only renders when the signed-in user has that permission.

const centerCell = 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold';

const serialColumn = {
  headerName: 'S.No', valueGetter: (p) => p.node.rowIndex + 1, minWidth: 80, maxWidth: 100,
  cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
};

function actionColumn({ canEdit, canDelete, onEdit, onDelete }) {
  return {
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

// K-2.7.1 — backend returns { mmd_year, mmd_month, mmd_id, mmd_name, mmd_ship_inspected }.
export function portStateMmdWiseColumns({ canEdit, canDelete, onEdit, onDelete }) {
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

// K-2.7.2 — backend returns { year, month, uptoTenYears, belowTwentyYears, aboveTwentyYears }
// with age-band totals already summed per month.
export function portStateVesselWiseColumns({ canEdit, canDelete, onEdit, onDelete }) {
  return [
    serialColumn,
    { headerName: 'Year', field: 'year', flex: 1, minWidth: 110,
      cellClass: `${centerCell} text-[#0f417a] dark:text-blue-400 font-bold` },
    { headerName: 'Month', field: 'month', flex: 1, minWidth: 130, cellClass: centerCell,
      valueFormatter: (p) => monthName(p.value),
      comparator: (a, b) => Number(a) - Number(b),
      useValueFormatterForExport: true },
    { headerName: '<= 10 Years', field: 'uptoTenYears', flex: 1, minWidth: 130, cellClass: centerCell },
    { headerName: '10-20 Years', field: 'belowTwentyYears', flex: 1, minWidth: 140, cellClass: centerCell },
    { headerName: '> 20 Years', field: 'aboveTwentyYears', flex: 1, minWidth: 130, cellClass: centerCell },
    ...(canEdit || canDelete ? [actionColumn({ canEdit, canDelete, onEdit, onDelete })] : []),
  ];
}
