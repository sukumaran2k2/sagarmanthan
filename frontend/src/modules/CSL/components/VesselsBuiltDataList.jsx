import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import DataListToolbar from '../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';

const COLUMN_LABELS = {
  financial_year: 'Financial Year',
  no_of_vessels_built: 'Number Of Vessels Built',
  tonnage_of_vessels_built: 'Tonnage Of Vessels Built (GT)',
  value_of_vessels_built: 'Value Of Vessels Built (INR Cr.)',
};

export default function VesselsBuiltDataList({
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
  years = [],
}) {
  const [visibleCols, setVisibleCols] = useState({
    financial_year: true,
    no_of_vessels_built: true,
    tonnage_of_vessels_built: true,
    value_of_vessels_built: true,
  });
  const gridRef = useRef(null);

  const handleExport = (type) => {
    if (type === 'Copy') {
      const headers = Object.keys(visibleCols).filter((c) => visibleCols[c]).map((c) => COLUMN_LABELS[c]);
      let tsv = ['S.No', ...headers].join('\t') + '\n';
      rowData.forEach((row, i) => {
        const line = [i + 1, ...Object.keys(visibleCols).filter((c) => visibleCols[c]).map((c) => row[c] ?? '')];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv);
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'csl_vessels_built' });
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'CSL Vessels Built Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: rowData,
        fileName: 'csl_vessels_built',
      });
    }
  };

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, minWidth: 90, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.financial_year ? [{ headerName: 'Financial Year', field: 'financial_year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_vessels_built ? [{ headerName: 'Number Of Vessels Built', field: 'no_of_vessels_built', flex: 1, minWidth: 190, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.tonnage_of_vessels_built ? [{ headerName: 'Tonnage Of Vessels Built (GT)', field: 'tonnage_of_vessels_built', flex: 1, minWidth: 200, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.value_of_vessels_built ? [{ headerName: 'Value Of Vessels Built (INR Cr.)', field: 'value_of_vessels_built', flex: 1, minWidth: 210, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'csl_vessel_id', pinned: 'right', minWidth: canEdit && canRemove ? 110 : 70,
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
              title="Delete Vessels Built Entry"
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
      <DataListToolbar
        leftContent={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financial Year</span>
            <select
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="">Show All</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
        searchTerm={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search..."
        totalRows={loading ? '...' : pagination.total}
        onCopy={() => handleExport('Copy')}
        onExportExcel={() => handleExport('Excel')}
        onExportPdf={() => handleExport('PDF')}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
        columnLabels={COLUMN_LABELS}
      />

      <div className="ag-theme-quartz rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto">
        <Table
          ref={gridRef}
          theme="legacy"
          rowData={rowData}
          columnDefs={colDefs}
          pagination={false}
          domLayout="autoHeight"
          rowHeight={50}
          headerHeight={42}
          suppressColumnVirtualisation={true}
          enableExport={false}
          color="#0f417a"
          defaultColDef={{ filter: false, wrapHeaderText: false, autoHeaderHeight: false, sortable: true, resizable: true }}
        />
      </div>

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
