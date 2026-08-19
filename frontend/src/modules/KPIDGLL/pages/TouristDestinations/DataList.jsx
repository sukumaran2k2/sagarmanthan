import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

// Mirrors the legacy site's two-toggle-button list view: "Lighthouse Table"
// and "KPI Target Details" show one table at a time, not both at once.
export default function TouristDestinationsDataList({
  destinationRows = [],
  targetRows = [],
  loading = false,
  onEditDestination,
  onEditTarget,
  onDeleteDestination,
  onDeleteTarget,
  onAddClick,
  canEdit = true,
  canAdd = true,
  canRemove = false,
}) {
  const [activeTable, setActiveTable] = useState('destination');
  const [yearFilter, setYearFilter] = useState('');

  const destinationYears = useMemo(
    () => [...new Set(destinationRows.map((r) => r.finacial_year))].sort().reverse(),
    [destinationRows]
  );
  const targetYears = useMemo(
    () => [...new Set(targetRows.map((r) => r.year))].sort().reverse(),
    [targetRows]
  );

  const filteredDestinationRows = useMemo(() => {
    if (!yearFilter) return destinationRows;
    return destinationRows.filter((r) => r.finacial_year === yearFilter);
  }, [destinationRows, yearFilter]);

  const filteredTargetRows = useMemo(() => {
    if (!yearFilter) return targetRows;
    return targetRows.filter((r) => r.year === yearFilter);
  }, [targetRows, yearFilter]);

  const destinationColDefs = useMemo(() => [
    { headerName: 'S.No', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'Financial Year', field: 'finacial_year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'No. of Lighthouses Developed as Tourist Destinations', field: 'no_lighthouses_developed_tourist_destination', flex: 1.5, minWidth: 240, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'Annual Tourist Footfall', field: 'annual_tourist_footfall', flex: 1.2, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' },
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'tourist_destination_id', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEditDestination && onEditDestination(params.data)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
              title="Update Entry"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDeleteDestination && onDeleteDestination(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEditDestination, onDeleteDestination]);

  // NOTE: DB column is collection_of_light_dues / footfall_in_the_lighthouses,
  // displayed here as "No. of Target Lighthouses" / "Expected Footfall" to
  // match what the legacy site's own list view shows in production.
  const targetColDefs = useMemo(() => [
    { headerName: 'S.No', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'Target Year', field: 'year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'No. of Target Lighthouses', field: 'collection_of_light_dues', flex: 1.5, minWidth: 200, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'Expected Footfall', field: 'footfall_in_the_lighthouses', flex: 1.2, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' },
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'tourist_destination_target_id', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEditTarget && onEditTarget(params.data)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
              title="Update Entry"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDeleteTarget && onDeleteTarget(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEditTarget, onDeleteTarget]);

  const isDestination = activeTable === 'destination';
  const rows = isDestination ? filteredDestinationRows : filteredTargetRows;
  const years = isDestination ? destinationYears : targetYears;
  const colDefs = isDestination ? destinationColDefs : targetColDefs;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveTable('destination'); setYearFilter(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${isDestination ? 'bg-[#0f417a] text-white' : 'bg-white dark:bg-slate-900 text-[#0f417a] dark:text-blue-400 border border-[#0f417a]/40 dark:border-blue-500/40'}`}
          >
            Lighthouse Table
          </button>
          <button
            onClick={() => { setActiveTable('target'); setYearFilter(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${!isDestination ? 'bg-[#0f417a] text-white' : 'bg-white dark:bg-slate-900 text-[#0f417a] dark:text-blue-400 border border-[#0f417a]/40 dark:border-blue-500/40'}`}
          >
            KPI Target Details
          </button>
        </div>
        {canAdd && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Lighthouse as Tourist Destinations</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {isDestination ? 'Financial Year' : 'Target Year'}
        </span>
        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <option value="">Show All</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {loading ? 'Loading...' : `Showing ${rows.length} entries`}
      </div>

      <div className="ag-theme-quartz rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto">
        <AgGridReact
          theme="legacy"
          rowData={rows}
          columnDefs={colDefs}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          domLayout="autoHeight"
          rowHeight={50}
          headerHeight={42}
          suppressColumnVirtualisation={true}
        />
      </div>
    </div>
  );
}
