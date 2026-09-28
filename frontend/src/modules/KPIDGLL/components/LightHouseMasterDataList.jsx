import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import DataListToolbar from '../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';

const COLUMN_LABELS = {
  alol: 'ALOL',
  light_house_name: 'Light House Name',
  light_status: 'Status',
};

export default function LightHouseMasterDataList({
  rowData = [],
  loading = false,
  onEdit,
  onDelete,
  canEdit = true,
  canRemove = false,
  pagination = { total: 0, page: 1, limit: 10, totalPages: 0 },
  onPageChange,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'active',
  onStatusChange,
  counts = { active: 0, inactive: 0 },
}) {
  const [visibleCols, setVisibleCols] = useState({
    alol: true,
    light_house_name: true,
    light_status: true,
  });
  const gridRef = useRef(null);

  const handleExport = (type) => {
    if (type === 'Copy') {
      const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
      let tsv = ['S.No', ...cols.map((c) => COLUMN_LABELS[c])].join('\t') + '\n';
      rowData.forEach((row, i) => {
        const line = [i + 1, ...cols.map((c) => c === 'light_status' ? (String(row[c]) === '1' ? 'Active' : 'Inactive') : (row[c] ?? ''))];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv);
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'light_house_master' });
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'Light House Master Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: rowData,
        fileName: 'light_house_master',
      });
    }
  };


  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, minWidth: 90, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.alol ? [{ headerName: 'ALOL', field: 'alol', wrapText: true, autoHeight: true, flex: 1, minWidth: 90, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.light_house_name ? [{ headerName: 'Light House Name', field: 'light_house_name', wrapText: true, autoHeight: true, flex: 2, minWidth: 180, cellClass: 'text-slate-700 dark:text-slate-200 flex items-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.light_status ? [{
      headerName: 'Status', field: 'light_status', wrapText: true, autoHeight: true, flex: 1, minWidth: 120,
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
    }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'lights_house_id', pinned: 'right', minWidth: canEdit && canRemove ? 110 : 70,
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
              title="Delete Light House Master Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEdit, onDelete, visibleCols]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 select-none">
        <button
          onClick={() => onStatusChange && onStatusChange('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${statusFilter === 'active'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          ACTIVE ({counts.active})
        </button>
        <button
          onClick={() => onStatusChange && onStatusChange('inactive')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${statusFilter === 'inactive'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          INACTIVE ({counts.inactive})
        </button>
      </div>

      <DataListToolbar
        searchTerm={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search"
        totalRows={loading ? '...' : pagination.total}
        onCopy={() => handleExport('Copy')}
        onExportExcel={() => handleExport('Excel')}
        onExportPdf={() => handleExport('PDF')}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
        columnLabels={COLUMN_LABELS}
      />

      <Table
        ref={gridRef}
        rowData={rowData}
        columnDefs={colDefs}
        loading={loading}
        pagination={false}
        domLayout="autoHeight"
        rowHeight={50}
        headerHeight={42}
        color="#0f417a"
      />

      {pagination.totalPages > 1 && (
        <TablePagination
          currentPage={Math.max(0, pagination.page - 1)}
          totalPages={pagination.totalPages}
          totalRows={pagination.total}
          pageSize={pagination.limit}
          onPageChange={(pageIndex) => onPageChange?.(pageIndex + 1)}
          color="#0f417a"
        />
      )}
    </div>
  );
}
