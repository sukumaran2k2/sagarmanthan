import { useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import DataListToolbar from '../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';
import { COMMON_TOASTS } from '../../../utils/notify';

const COLUMN_LABELS = {
  programme: 'Programme',
  batch: 'Batch',
  appeared: 'Appeared',
  passed: 'Passed',
  pass_percentage: 'Pass Percentage',
};

const DEFAULT_VISIBLE_COLS = {
  programme: true,
  batch: true,
  appeared: true,
  passed: true,
  pass_percentage: true,
};

// This section returns every row, so search and paging happen here in the browser;
// the search text, page, page size and columns are kept in the IMU store.
export default function FinalYearPassPercentageDataList({
  rowData = [],
  loading = false,
  onEdit,
  onDelete,
  canEdit = true,
  canRemove = false,
  searchQuery = '',
  onSearchChange,
  currentPage = 1,
  onPageChange,
  pageSize = 10,
  onPageSizeChange,
  visibleCols: storedVisibleCols = null,
  onVisibleColsChange,
  notify,
}) {
  // Column visibility is kept in the IMU store; null means "not changed yet"
  const visibleCols = storedVisibleCols ?? DEFAULT_VISIBLE_COLS;
  const setVisibleCols = (updater) => onVisibleColsChange?.((prev) => {
    const current = prev ?? DEFAULT_VISIBLE_COLS;
    return typeof updater === 'function' ? updater(current) : updater;
  });
  const gridRef = useRef(null);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return rowData;
    const q = searchQuery.toLowerCase();
    return rowData.filter((r) =>
      (r.programme || '').toLowerCase().includes(q) ||
      String(r.batch ?? '').includes(q)
    );
  }, [rowData, searchQuery]);

  const handleExport = (type) => {
    if (type === 'Copy') {
      const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
      let tsv = ['S.No', ...cols.map((c) => COLUMN_LABELS[c])].join('\t') + '\n';
      filteredData.forEach((row, i) => {
        const line = [i + 1, ...cols.map((c) => row[c] ?? '')];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv).then(
        () => notify?.(COMMON_TOASTS.copySuccess(filteredData.length)),
        () => notify?.(COMMON_TOASTS.copyFailed()),
      );
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'imu_final_year_pass_percentage' });
      notify?.(COMMON_TOASTS.excelExported('imu_final_year_pass_percentage.csv'));
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'IMU Final Year Pass Percentage Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: filteredData,
        fileName: 'imu_final_year_pass_percentage',
      });
      notify?.(COMMON_TOASTS.downloadStarted('imu_final_year_pass_percentage.pdf'));
    }
  };


  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  // A stored page can be past the end once the data or search changes
  const page = Math.min(currentPage, totalPages);
  const pageRows = useMemo(() => filteredData.slice((page - 1) * pageSize, page * pageSize), [filteredData, page, pageSize]);

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1 + (page - 1) * pageSize, minWidth: 90, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.programme ? [{ headerName: 'Programme', field: 'programme', wrapText: true, autoHeight: true, flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.batch ? [{ headerName: 'Batch', field: 'batch', wrapText: true, autoHeight: true, flex: 1, minWidth: 110, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.appeared ? [{ headerName: 'Appeared', field: 'appeared', wrapText: true, autoHeight: true, flex: 1, minWidth: 130, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.passed ? [{ headerName: 'Passed', field: 'passed', wrapText: true, autoHeight: true, flex: 1, minWidth: 120, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.pass_percentage ? [{ headerName: 'Pass Percentage', field: 'pass_percentage', wrapText: true, autoHeight: true, flex: 1, minWidth: 160, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700', valueFormatter: (p) => p.value != null ? `${p.value}%` : '' }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'id', pinned: 'right', minWidth: canEdit && canRemove ? 110 : 70,
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
              title="Delete Final Year Pass Percentage Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEdit, onDelete, visibleCols, page, pageSize]);

  return (
    <div className="module-card space-y-4">
      <DataListToolbar
        searchTerm={searchQuery}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search programme or batch..."
        pageSize={pageSize}
        onPageSizeChange={onPageSizeChange}
        totalRows={loading ? '...' : filteredData.length}
        onCopy={() => handleExport('Copy')}
        onExportExcel={() => handleExport('Excel')}
        onExportPdf={() => handleExport('PDF')}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
        columnLabels={COLUMN_LABELS}
      />

      <div className="module-datalist-grid">
        <Table
          ref={gridRef}
          rowData={pageRows}
          columnDefs={colDefs}
          loading={loading}
          pagination={false}
          domLayout="autoHeight"
          rowHeight={50}
          headerHeight={42}
          color="#0f417a"
        />
      </div>

      {totalPages > 1 && (
        <TablePagination
          currentPage={page - 1}
          totalPages={totalPages}
          totalRows={filteredData.length}
          pageSize={pageSize}
          onPageChange={(pageIndex) => onPageChange?.(pageIndex + 1)}
          color="#0f417a"
        />
      )}
    </div>
  );
}
