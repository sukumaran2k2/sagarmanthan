import { useMemo, useState } from 'react';
import {
  Filter,
  Search,
  ChevronDown,
  X,
  Edit,
  Plus,
  AlertTriangle,
} from 'lucide-react';

import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { useProjectsPermissions } from '../hooks/useProjectsPermissions';

export default function LumpSumIwai({
  rows = [],
  loading = false,
  onAdd,
  onEdit,
  notify,
}) {
  const permissions = useProjectsPermissions();

  const canView = Boolean(permissions.canView);
  const canAdd = Boolean(
    permissions.canAdd && !permissions.isViewOnlyAdmin
  );
  const canEdit = Boolean(
    permissions.canEdit && !permissions.isViewOnlyAdmin
  );

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [colDropdownOpen, setColDropdownOpen] = useState(false);

  const [visibleCols, setVisibleCols] = useState({
    sno: true,
    project_id: true,
    project_name: true,
    lumpsum_cost: true,
    actions: true,
  });

  // Support common API field-name variations.
  const getProjectId = (row) =>
    row.project_id ?? '';

  const getProjectName = (row) =>
    row.project_name ?? '';

  const getLumpSumCost = (row) =>
    row.activity_cost ?? 0;

  // Filter data
  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return rows.filter((row) => {
      const projectId = String(getProjectId(row)).toLowerCase();
      const projectName = String(getProjectName(row)).toLowerCase();
      const cost = String(getLumpSumCost(row)).toLowerCase();

      if (
        filterProject &&
        !projectId.includes(filterProject.toLowerCase())
      ) {
        return false;
      }

      if (!q) return true;

      return `${projectId} ${projectName} ${cost}`.includes(q);
    });
  }, [rows, searchTerm, filterProject]);

  const handleResetFilters = () => {
    setFilterProject('');
    setSearchTerm('');
  };

  const activeFiltersCount = filterProject ? 1 : 0;

  // Export
  const exportHeaders = useMemo(
    () => [
      'S.No',
      'Project ID',
      'Project Name',
      'Total Lumpsum Cost (In Cr.)',
    ],
    []
  );

  const exportData = useMemo(
    () =>
      filteredRows.map((row, index) => [
        index + 1,
        getProjectId(row) || '-',
        getProjectName(row) || '-',
        getLumpSumCost(row) ?? '-',
      ]),
    [filteredRows]
  );

  // AG Grid columns
  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'S.No',
        width: 90,
        minWidth: 80,
        valueGetter: (params) =>
          (params.node?.rowIndex ?? 0) + 1,
        cellClass: 'text-center',
        headerClass: 'text-center',
        hide: !visibleCols.sno,
      },
      {
        headerName: 'Project ID',
        flex: 1,
        minWidth: 140,
        valueGetter: (params) =>
          getProjectId(params.data),
        cellClass: 'text-center font-semibold text-[#0f417a]',
        headerClass: 'text-center',
        hide: !visibleCols.project_id,
      },
      {
        headerName: 'Project Name',
        flex: 2,
        minWidth: 220,
        valueGetter: (params) =>
          getProjectName(params.data),
        cellClass: 'text-center font-medium',
        headerClass: 'text-center',
        hide: !visibleCols.project_name,
      },
      {
        headerName: 'Total Lumpsum Cost (In Cr.)',
        flex: 1.4,
        minWidth: 200,
        valueGetter: (params) =>
          getLumpSumCost(params.data),
        cellClass: 'text-center font-semibold text-[#0f417a]',
        headerClass: 'text-center',
        hide: !visibleCols.lumpsum_cost,
      },
    ];

    if (canEdit) {
      cols.push({
        headerName: 'Update',
        width: 110,
        pinned: 'right',
        sortable: false,
        filter: false,
        hide: !visibleCols.actions,
        cellClass: 'text-center flex items-center justify-center',
        headerClass: 'text-center',
        cellRenderer: (params) => {
          if (!params.data) return null;

          return (
            <button
              type="button"
              title="Edit LumpSum"
              onClick={() => onEdit?.(params.data)}
              className="p-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <Edit className="h-5 w-5" />
            </button>
          );
        },
      });
    }

    return cols;
  }, [visibleCols, canEdit, onEdit]);

  const visibilityOptions = [
    { key: 'sno', label: 'S.No' },
    { key: 'project_id', label: 'Project ID' },
    { key: 'project_name', label: 'Project Name' },
    { key: 'lumpsum_cost', label: 'Total Lumpsum Cost' },
    ...(canEdit ? [{ key: 'actions', label: 'Update' }] : []),
  ];

  if (!canView) {
    return (
      <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <AlertTriangle className="h-7 w-7 text-amber-500 mx-auto mb-3" />
        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-500 mt-2">
          You do not have permission to view LumpSum-IWAI.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-black text-[#0f417a] dark:text-blue-400 uppercase tracking-wide">
            LumpSum - IWAI
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Project-wise LumpSum cost details.
          </p>
        </div>

      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">

        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowFilterPanel((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              showFilterPanel || activeFiltersCount > 0
                ? 'bg-blue-50 border-blue-300 text-[#0f417a]'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200'
            }`}
          >
            <Filter size={14} />
            Filter
            {activeFiltersCount > 0 && (
              <span className="bg-[#0f417a] text-white text-[10px] rounded-full px-1.5 py-0.5">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`transition-transform ${
                showFilterPanel ? 'rotate-180' : ''
              }`}
            />
          </button>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs font-bold text-rose-600 px-2 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 cursor-pointer"
            >
              <X size={13} />
              Reset Filters
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">

          {/* Search */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search project ID, project name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Rows */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-2 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Rows:
            </span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Total */}
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            TOTAL:{' '}
            <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">
              {filteredRows.length}
            </span>
          </div>

          {/* Column Visibility */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setColDropdownOpen((prev) => !prev)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 dark:border-slate-800 dark:text-slate-200"
            >
              Visibility
              <ChevronDown className="h-3.5 w-3.5" />
            </button>

            {colDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 dark:bg-slate-900 dark:border-slate-800">

                <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Toggle Columns
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleCols({
                        sno: true,
                        project_id: true,
                        project_name: true,
                        lumpsum_cost: true,
                        actions: true,
                      })
                    }
                    className="text-[10px] font-bold text-blue-600 cursor-pointer"
                  >
                    Show All
                  </button>
                </div>

                {visibilityOptions.map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-2 px-2.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(visibleCols[key])}
                      onChange={() =>
                        setVisibleCols((prev) => ({
                          ...prev,
                          [key]: !prev[key],
                        }))
                      }
                      className="h-3.5 w-3.5 rounded text-blue-600 cursor-pointer"
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Copy */}
          <CopyButton
            headers={exportHeaders}
            data={exportData}
            color="#0f417a"
            triggerNotification={(msg) =>
              notify?.(msg, 'success')
            }
          />

          {/* Excel / PDF */}
          <ExportDropdown
            headers={exportHeaders}
            data={exportData}
            fileName="LumpSum_IWAI"
            title="LumpSum IWAI"
            color="#0f417a"
            hoverColor="#1e5ea8"
            triggerNotification={(msg) =>
              notify?.(msg, 'success')
            }
          />
        </div>
      </div>

      {/* Filter Panel */}
      {showFilterPanel && (
        <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="max-w-md">
            <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              Project ID
            </label>
            <input
              type="text"
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              placeholder="Enter Project ID"
              className="w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <Table
        rowData={filteredRows}
        columnDefs={columnDefs}
        loading={loading}
        loadingMessage="Fetching LumpSum-IWAI details..."
        pagination
        paginationPageSize={pageSize}
        color="#0f417a"
        exportFileName="LumpSum_IWAI"
      />

    </div>
  );
}