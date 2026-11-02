import { useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import DataListToolbar from '../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';
import { COMMON_TOASTS } from '../../../utils/notify';

const COLUMN_LABELS = {
  financial_year: 'Financial Year',
  academic_domestic: 'Academic Partnerships/MoUs - Domestic',
  academic_international: 'Academic Partnerships/MoUs - International',
  industry_domestic: 'Industry Partnerships/MoUs - Domestic',
  industry_international: 'Industry Partnerships/MoUs - International',
};

const DEFAULT_VISIBLE_COLS = {
  financial_year: true,
  academic_domestic: true,
  academic_international: true,
  industry_domestic: true,
  industry_international: true,
};

export default function PartnershipDataList({
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
  financialYear = '',
  onFinancialYearChange,
  visibleCols: storedVisibleCols = null,
  onVisibleColsChange,
  notify,
}) {
  // Column visibility is kept in the IMU store per section; null means "not changed yet"
  const visibleCols = storedVisibleCols ?? DEFAULT_VISIBLE_COLS;
  const setVisibleCols = (updater) => onVisibleColsChange?.((prev) => {
    const current = prev ?? DEFAULT_VISIBLE_COLS;
    return typeof updater === 'function' ? updater(current) : updater;
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
      navigator.clipboard.writeText(tsv).then(
        () => notify?.(COMMON_TOASTS.copySuccess(rowData.length)),
        () => notify?.(COMMON_TOASTS.copyFailed()),
      );
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'imu_partnership' });
      notify?.(COMMON_TOASTS.excelExported('imu_partnership.csv'));
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'IMU Partnership Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: rowData,
        fileName: 'imu_partnership',
      });
      notify?.(COMMON_TOASTS.downloadStarted('imu_partnership.pdf'));
    }
  };

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, minWidth: 90, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.financial_year ? [{ headerName: 'Financial Year', field: 'financial_year', wrapText: true, autoHeight: true, flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.academic_domestic ? [{ headerName: 'Academic Partnerships/MoUs - Domestic', field: 'academic_domestic', wrapText: true, autoHeight: true, flex: 1.3, minWidth: 230, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.academic_international ? [{ headerName: 'Academic Partnerships/MoUs - International', field: 'academic_international', wrapText: true, autoHeight: true, flex: 1.3, minWidth: 250, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.industry_domestic ? [{ headerName: 'Industry Partnerships/MoUs - Domestic', field: 'industry_domestic', wrapText: true, autoHeight: true, flex: 1.3, minWidth: 230, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.industry_international ? [{ headerName: 'Industry Partnerships/MoUs - International', field: 'industry_international', wrapText: true, autoHeight: true, flex: 1.3, minWidth: 250, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'partnership_id', pinned: 'right', minWidth: canEdit && canRemove ? 110 : 70,
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
              title="Delete Partnership Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEdit, onDelete, visibleCols]);

  return (
    <div className="module-card space-y-4">
      <DataListToolbar
        leftContent={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Financial Year</span>
            <select
              value={financialYear}
              onChange={(e) => onFinancialYearChange && onFinancialYearChange(e.target.value)}
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

      <div className="module-datalist-grid">
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
