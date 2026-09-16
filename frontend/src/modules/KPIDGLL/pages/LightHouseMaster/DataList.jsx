import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import DataListToolbar from '../../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../../utils/exportReportPdf';

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
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [pageSize, setPageSize] = useState(10);
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
      filteredData.forEach((row, i) => {
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
        rowData: filteredData,
        fileName: 'light_house_master',
      });
    }
  };

  const activeCount = useMemo(() => rowData.filter((r) => String(r.light_status) === '1').length, [rowData]);
  const inactiveCount = useMemo(() => rowData.filter((r) => String(r.light_status) === '0').length, [rowData]);

  const filteredData = useMemo(() => {
    let data = rowData.filter((r) => String(r.light_status) === (statusFilter === 'active' ? '1' : '0'));
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((r) =>
      (r.alol || '').toLowerCase().includes(q) ||
      (r.light_house_name || '').toLowerCase().includes(q) ||
      (r.state_name || '').toLowerCase().includes(q) ||
      (r.district_name || '').toLowerCase().includes(q)
    );
  }, [rowData, statusFilter, searchQuery]);

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.alol ? [{ headerName: 'ALOL', field: 'alol', flex: 1, minWidth: 90, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.light_house_name ? [{ headerName: 'Light House Name', field: 'light_house_name', flex: 2, minWidth: 180, cellClass: 'text-slate-700 dark:text-slate-200 flex items-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.light_status ? [{
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
    }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'lights_house_id', pinned: 'right', width: canEdit && canRemove ? 90 : 60,
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
          onClick={() => setStatusFilter('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${statusFilter === 'active'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          ACTIVE ({activeCount})
        </button>
        <button
          onClick={() => setStatusFilter('inactive')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${statusFilter === 'inactive'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          INACTIVE ({inactiveCount})
        </button>
      </div>

      <DataListToolbar
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search"
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        totalRows={loading ? '...' : filteredData.length}
        onCopy={() => handleExport('Copy')}
        onExportExcel={() => handleExport('Excel')}
        onExportPdf={() => handleExport('PDF')}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
        columnLabels={COLUMN_LABELS}
      />

      <Table
        ref={gridRef}
        rowData={filteredData}
        columnDefs={colDefs}
        loading={loading}
        pagination={true}
        paginationPageSize={pageSize}
        domLayout="autoHeight"
        rowHeight={50}
        headerHeight={42}
        color="#0f417a"
      />
    </div>
  );
}
