import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function NAISIntegrationDataList({
  rowData = [],
  loading = false,
  onEdit,
  onDelete,
  onAddClick,
  canEdit = true,
  canAdd = true,
  canRemove = false,
}) {
  const [yearFilter, setYearFilter] = useState('');

  const years = useMemo(
    () => [...new Set(rowData.map((r) => r.financial_year))].sort().reverse(),
    [rowData]
  );

  const filteredData = useMemo(() => {
    if (!yearFilter) return rowData;
    return rowData.filter((r) => r.financial_year === yearFilter);
  }, [rowData, yearFilter]);

  const colDefs = useMemo(() => [
    { headerName: 'S.No', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'Financial Year', field: 'financial_year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    {
      headerName: 'NAIS Integrated with NMDA (%)', field: 'nais_integrated_with_nmda', flex: 1.5, minWidth: 200,
      cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700',
      valueFormatter: (params) => params.value != null ? `${params.value}%` : '',
    },
    {
      headerName: 'Number of NAIS System Upgraded', field: 'no_of_nais_upgraded', flex: 1.5, minWidth: 200,
      cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700',
    },

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'nais_integration_id', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEdit && onEdit(params.data)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
              title="Update Entry"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDelete && onDelete(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete NAIS Integration Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEdit, onDelete]);

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financial Year</span>
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">Show All</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        {canAdd && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add NAIS Integration</span>
          </button>
        )}
      </div>

      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
        {loading ? 'Loading...' : `Showing ${filteredData.length} entries`}
      </div>

      <div className="ag-theme-quartz rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto">
        <AgGridReact
          theme="legacy"
          rowData={filteredData}
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
