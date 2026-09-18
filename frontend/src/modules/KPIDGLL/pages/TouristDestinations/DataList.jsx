import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import DataListToolbar from '../../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../../utils/exportReportPdf';

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

// Mirrors the legacy site's two-toggle-button list view: "Lighthouse Table"
// and "KPI Target Details" show one table at a time, not both at once.
export default function TouristDestinationsDataList({
  destinationRows = [],
  targetRows = [],
  loading = false,
  onEditDestination,
  onEditTarget,
  onDeleteDestination,
  onDeleteTarget,
  canEdit = true,
  canRemove = false,
}) {
  const [activeTable, setActiveTable] = useState('destination');
  const [yearFilter, setYearFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [destVisibleCols, setDestVisibleCols] = useState({
    finacial_year: true,
    no_lighthouses_developed_tourist_destination: true,
    annual_tourist_footfall: true,
  });
  const [targetVisibleCols, setTargetVisibleCols] = useState({
    year: true,
    collection_of_light_dues: true,
    footfall_in_the_lighthouses: true,
  });
  const gridRef = useRef(null);

  const isDestination = activeTable === 'destination';
  const visibleCols = isDestination ? destVisibleCols : targetVisibleCols;
  const setVisibleCols = isDestination ? setDestVisibleCols : setTargetVisibleCols;
  const columnLabels = isDestination ? DEST_COLUMN_LABELS : TARGET_COLUMN_LABELS;

  const destinationYears = useMemo(
    () => [...new Set(destinationRows.map((r) => r.finacial_year))].sort().reverse(),
    [destinationRows]
  );
  const targetYears = useMemo(
    () => [...new Set(targetRows.map((r) => r.year))].sort().reverse(),
    [targetRows]
  );

  const filteredDestinationRows = useMemo(() => {
    let data = yearFilter ? destinationRows.filter((r) => r.finacial_year === yearFilter) : destinationRows;
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((r) =>
      (r.finacial_year || '').toLowerCase().includes(q) ||
      String(r.no_lighthouses_developed_tourist_destination ?? '').includes(q) ||
      String(r.annual_tourist_footfall ?? '').includes(q)
    );
  }, [destinationRows, yearFilter, searchQuery]);

  const filteredTargetRows = useMemo(() => {
    let data = yearFilter ? targetRows.filter((r) => r.year === yearFilter) : targetRows;
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((r) =>
      (r.year || '').toLowerCase().includes(q) ||
      String(r.collection_of_light_dues ?? '').includes(q) ||
      String(r.footfall_in_the_lighthouses ?? '').includes(q)
    );
  }, [targetRows, yearFilter, searchQuery]);

  const destinationColDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(destVisibleCols.finacial_year ? [{ headerName: 'Financial Year', field: 'finacial_year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(destVisibleCols.no_lighthouses_developed_tourist_destination ? [{ headerName: 'No. of Lighthouses Developed as Tourist Destinations', field: 'no_lighthouses_developed_tourist_destination', flex: 1.5, minWidth: 240, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(destVisibleCols.annual_tourist_footfall ? [{ headerName: 'Annual Tourist Footfall', field: 'annual_tourist_footfall', flex: 1.2, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'tourist_destination_id', pinned: 'right', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEditDestination && onEditDestination(params.data)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
              title="Update Entry"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDeleteDestination && onDeleteDestination(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEditDestination, onDeleteDestination, destVisibleCols]);

  const targetColDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(targetVisibleCols.year ? [{ headerName: 'Target Year', field: 'year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(targetVisibleCols.collection_of_light_dues ? [{ headerName: 'No. of Target Lighthouses', field: 'collection_of_light_dues', flex: 1.5, minWidth: 200, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(targetVisibleCols.footfall_in_the_lighthouses ? [{ headerName: 'Expected Footfall', field: 'footfall_in_the_lighthouses', flex: 1.2, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'tourist_destination_target_id', pinned: 'right', width: canEdit && canRemove ? 90 : 60,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              onClick={() => onEditTarget && onEditTarget(params.data)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
              title="Update Entry"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              onClick={() => onDeleteTarget && onDeleteTarget(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
              title="Delete Entry"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      )
    }] : []),
  ], [canEdit, canRemove, onEditTarget, onDeleteTarget, targetVisibleCols]);

  const rows = isDestination ? filteredDestinationRows : filteredTargetRows;
  const years = isDestination ? destinationYears : targetYears;
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
      navigator.clipboard.writeText(tsv);
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: fileNameBase });
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: isDestination ? 'Tourist Destinations Data List' : 'Tourist Destinations Target Details Data List',
        columnLabels,
        visibleCols,
        rowData: rows,
        fileName: fileNameBase,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => { setActiveTable('destination'); setYearFilter(''); setSearchQuery(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${isDestination ? 'bg-[#0f417a] text-white' : 'bg-white dark:bg-slate-900 text-[#0f417a] dark:text-blue-400 border border-[#0f417a]/40 dark:border-blue-500/40'}`}
        >
          Lighthouse Table
        </button>
        <button
          onClick={() => { setActiveTable('target'); setYearFilter(''); setSearchQuery(''); }}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${!isDestination ? 'bg-[#0f417a] text-white' : 'bg-white dark:bg-slate-900 text-[#0f417a] dark:text-blue-400 border border-[#0f417a]/40 dark:border-blue-500/40'}`}
        >
          KPI Target Details
        </button>
      </div>

      <DataListToolbar
        leftContent={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {isDestination ? 'Financial Year' : 'Target Year'}
            </span>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="">Show All</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        }
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search"
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        totalRows={loading ? '...' : rows.length}
        onCopy={() => handleExport('Copy')}
        onExportExcel={() => handleExport('Excel')}
        onExportPdf={() => handleExport('PDF')}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
        columnLabels={columnLabels}
      />

      <Table
        ref={gridRef}
        rowData={rows}
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
