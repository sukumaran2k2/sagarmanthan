import { useState, useMemo } from 'react';
import { Plus, Search, Edit } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function LightHouseMasterDataList({
  rowData = [],
  loading = false,
  onEdit,
  onAddClick,
  canEdit = true,
  canAdd = true,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredData = useMemo(() => {
    let data = rowData;
    if (statusFilter !== 'all') data = data.filter((r) => String(r.light_status) === statusFilter);
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((r) =>
      (r.alol || '').toLowerCase().includes(q) ||
      (r.light_house_name || '').toLowerCase().includes(q) ||
      (r.state_name || '').toLowerCase().includes(q) ||
      (r.district_name || '').toLowerCase().includes(q)
    );
  }, [rowData, searchQuery]);

  const colDefs = useMemo(() => [
    { headerName: 'S.No', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'ALOL', field: 'alol', flex: 1, minWidth: 90, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    { headerName: 'Light House Name', field: 'light_house_name', flex: 2, minWidth: 180, cellClass: 'text-slate-700 dark:text-slate-200 flex items-center font-semibold border-r border-slate-100 dark:border-slate-700' },
    {
      headerName: 'Status', field: 'light_status', flex: 1, minWidth: 120,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
      cellRenderer: (params) => {
        const isActive = String(params.value) === '1';
        const label = isActive ? 'Active' : 'Inactive';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800'}`}>
            {label}
          </span>
        );
      }
    },

    ...(canEdit ? [{
      headerName: 'Actions', field: 'lights_house_id', width: 90,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => onEdit && onEdit(params.data)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
          title="Update Entry"
        >
          <Edit className="h-4 w-4" />
        </button>
      )
    }] : []),
  ], [canEdit, onEdit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-row items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="all">Show All</option>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </select>
        </div>
        <div className="flex-1" />
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ALOL, name, state, district..."
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-medium text-slate-700 dark:text-slate-200"
          />
        </div>
        {canAdd && (
          <button
            onClick={onAddClick}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Light House Master Entry</span>
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
