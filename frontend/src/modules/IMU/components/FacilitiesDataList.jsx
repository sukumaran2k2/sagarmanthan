import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import DataListToolbar from '../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';

const COLUMN_LABELS = {
  financial_year: 'Financial Year',
  no_of_classrooms: 'Number of Classrooms',
  no_of_labs: 'Number of Labs',
  no_of_simulators: 'Number of Simulators',
  no_of_workshops: 'Number of Workshops',
  no_of_library_books: 'Number of Library Books',
  no_of_e_books: 'Number of E-Books',
  no_of_e_journals: 'Number of E-Journals',
  no_of_e_database: 'Number of E-Databases',
  no_of_acadamic_software: 'Number of Academic Software',
  total_e_resources: 'Total E-Resources',
};

export default function FacilitiesDataList({
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
    no_of_classrooms: true,
    no_of_labs: true,
    no_of_simulators: true,
    no_of_workshops: true,
    no_of_library_books: true,
    no_of_e_books: true,
    no_of_e_journals: true,
    no_of_e_database: true,
    no_of_acadamic_software: true,
    total_e_resources: true,
  });
  const gridRef = useRef(null);

  const handleExport = (type) => {
    if (type === 'Copy') {
      const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
      let tsv = ['S.No', ...cols.map((c) => COLUMN_LABELS[c])].join('\t') + '\n';
      rowData.forEach((row, i) => {
        const line = [i + 1, ...cols.map((c) => row[c] ?? '')];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv);
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'imu_facilities' });
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'IMU Facilities Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: rowData,
        fileName: 'imu_facilities',
      });
    }
  };

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, minWidth: 90, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.financial_year ? [{ headerName: 'Financial Year', field: 'financial_year', wrapText: true, autoHeight: true, flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_classrooms ? [{ headerName: 'Number of Classrooms', field: 'no_of_classrooms', wrapText: true, autoHeight: true, flex: 1, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_labs ? [{ headerName: 'Number of Labs', field: 'no_of_labs', wrapText: true, autoHeight: true, flex: 1, minWidth: 140, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_simulators ? [{ headerName: 'Number of Simulators', field: 'no_of_simulators', wrapText: true, autoHeight: true, flex: 1, minWidth: 170, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_workshops ? [{ headerName: 'Number of Workshops', field: 'no_of_workshops', wrapText: true, autoHeight: true, flex: 1, minWidth: 170, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_library_books ? [{ headerName: 'Number of Library Books', field: 'no_of_library_books', wrapText: true, autoHeight: true, flex: 1.2, minWidth: 190, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_e_books ? [{ headerName: 'Number of E-Books', field: 'no_of_e_books', wrapText: true, autoHeight: true, flex: 1, minWidth: 160, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_e_journals ? [{ headerName: 'Number of E-Journals', field: 'no_of_e_journals', wrapText: true, autoHeight: true, flex: 1, minWidth: 170, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_e_database ? [{ headerName: 'Number of E-Databases', field: 'no_of_e_database', wrapText: true, autoHeight: true, flex: 1.1, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.no_of_acadamic_software ? [{ headerName: 'Number of Academic Software', field: 'no_of_acadamic_software', wrapText: true, autoHeight: true, flex: 1.3, minWidth: 210, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.total_e_resources ? [{ headerName: 'Total E-Resources', field: 'total_e_resources', wrapText: true, autoHeight: true, flex: 1, minWidth: 160, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'facilities_id', pinned: 'right', minWidth: canEdit && canRemove ? 110 : 70,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEdit && onEdit(params.data)}
              className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
              title="Update Entry"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDelete && onDelete(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete Facilities Entry"
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
