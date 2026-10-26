import { useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import DataListToolbar from '../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../utils/exportReportPdf';
import { COMMON_TOASTS } from '../../../utils/notify';

const DEST_COLUMN_LABELS = {
  finacial_year: 'Financial Year',
  no_lighthouses_developed_tourist_destination: 'No. of Lighthouses Developed as Tourist Destinations',
  annual_tourist_footfall: 'Annual Tourist Footfall',
};

// NOTE: DB column is collection_of_light_dues / footfall_in_the_lighthouses,
// displayed here as "No. of Target Lighthouses" / "Expected Footfall" to
// match what the legacy site's own list view shows in production.
const TARGET_COLUMN_LABELS = {
  year: 'Target Year',
  collection_of_light_dues: 'No. of Target Lighthouses',
  footfall_in_the_lighthouses: 'Expected Footfall',
};

const DEST_DEFAULT_VISIBLE_COLS = {
  finacial_year: true,
  no_lighthouses_developed_tourist_destination: true,
  annual_tourist_footfall: true,
};
const TARGET_DEFAULT_VISIBLE_COLS = {
  year: true,
  collection_of_light_dues: true,
  footfall_in_the_lighthouses: true,
};

// Mirrors the legacy site's two-toggle-button list view: "Lighthouse Table"
// and "KPI Target Details" show one table at a time, not both at once.
export default function TouristDestinationsDataList({
  activeTable = 'destination',
  onTableChange,
  rowData: rows = [],
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
  const gridRef = useRef(null);

  // Each table has its own list in the DGLL store (search, year, page, columns);
  // the props belong to the table on show. null columns means "not changed yet".
  const isDestination = activeTable === 'destination';
  const defaultVisibleCols = isDestination ? DEST_DEFAULT_VISIBLE_COLS : TARGET_DEFAULT_VISIBLE_COLS;
  const visibleCols = storedVisibleCols ?? defaultVisibleCols;
  const setVisibleCols = (updater) => onVisibleColsChange?.((prev) => {
    const current = prev ?? defaultVisibleCols;
    return typeof updater === 'function' ? updater(current) : updater;
  });
  const destVisibleCols = isDestination ? visibleCols : DEST_DEFAULT_VISIBLE_COLS;
  const targetVisibleCols = isDestination ? TARGET_DEFAULT_VISIBLE_COLS : visibleCols;
  const columnLabels = isDestination ? DEST_COLUMN_LABELS : TARGET_COLUMN_LABELS;

  const destinationColDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, minWidth: 90, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(destVisibleCols.finacial_year ? [{ headerName: 'Financial Year', field: 'finacial_year', wrapText: true, autoHeight: true, flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(destVisibleCols.no_lighthouses_developed_tourist_destination ? [{ headerName: 'No. of Lighthouses Developed as Tourist Destinations', field: 'no_lighthouses_developed_tourist_destination', wrapText: true, autoHeight: true, flex: 1.5, minWidth: 240, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(destVisibleCols.annual_tourist_footfall ? [{ headerName: 'Annual Tourist Footfall', field: 'annual_tourist_footfall', wrapText: true, autoHeight: true, flex: 1.2, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'tourist_destination_id', pinned: 'right', minWidth: canEdit && canRemove ? 110 : 70,
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
              title="Delete Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEdit, onDelete, destVisibleCols]);

  const targetColDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, minWidth: 90, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(targetVisibleCols.year ? [{ headerName: 'Target Year', field: 'year', wrapText: true, autoHeight: true, flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(targetVisibleCols.collection_of_light_dues ? [{ headerName: 'No. of Target Lighthouses', field: 'collection_of_light_dues', wrapText: true, autoHeight: true, flex: 1.5, minWidth: 200, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(targetVisibleCols.footfall_in_the_lighthouses ? [{ headerName: 'Expected Footfall', field: 'footfall_in_the_lighthouses', wrapText: true, autoHeight: true, flex: 1.2, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'tourist_destination_target_id', pinned: 'right', minWidth: canEdit && canRemove ? 110 : 70,
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
              title="Delete Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEdit, onDelete, targetVisibleCols]);

  const colDefs = isDestination ? destinationColDefs : targetColDefs;
  const fileNameBase = isDestination ? 'tourist_destinations' : 'tourist_destinations_target_details';

  const handleExport = (type) => {
    if (type === 'Copy') {
      const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
      let tsv = ['S.No', ...cols.map((c) => columnLabels[c])].join('\t') + '\n';
      rows.forEach((row, i) => {
        const line = [i + 1, ...cols.map((c) => row[c] ?? '')];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv).then(
        () => notify?.(COMMON_TOASTS.copySuccess(rows.length)),
        () => notify?.(COMMON_TOASTS.copyFailed()),
      );
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: fileNameBase });
      notify?.(COMMON_TOASTS.excelExported(`${fileNameBase}.csv`));
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: isDestination ? 'Tourist Destinations Data List' : 'Tourist Destinations Target Details Data List',
        columnLabels,
        visibleCols,
        rowData: rows,
        fileName: fileNameBase,
      });
      notify?.(COMMON_TOASTS.downloadStarted(`${fileNameBase}.pdf`));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800 select-none">
        <button
          type="button"
          onClick={() => onTableChange && onTableChange('destination')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            isDestination
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Lighthouse Table
        </button>
        <button
          type="button"
          onClick={() => onTableChange && onTableChange('target')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            !isDestination
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          KPI Target Details
        </button>
      </div>
      <div className="module-card space-y-4">

        <DataListToolbar
          leftContent={
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {isDestination ? 'Financial Year' : 'Target Year'}
              </span>
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
          columnLabels={columnLabels}
        />

        <div className="module-datalist-grid">
          <Table
            ref={gridRef}
            rowData={rows}
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
    </div>
  );
}
