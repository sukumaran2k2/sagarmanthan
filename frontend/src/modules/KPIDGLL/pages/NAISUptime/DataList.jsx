import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../../components/Table';
import DataListToolbar from '../../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../../utils/exportReportPdf';

const COLUMN_LABELS = {
  financial_year: 'Financial Year',
  availability_of_nais: 'Availability / Uptime of NAIS (%)',
};

export default function NAISUptimeDataList({
  rowData = [],
  loading = false,
  onEdit,
  onDelete,
  canEdit = true,
  canRemove = false,
}) {
  const [yearFilter, setYearFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [visibleCols, setVisibleCols] = useState({
    financial_year: true,
    availability_of_nais: true,
  });
  const gridRef = useRef(null);

  const handleExport = (type) => {
    if (type === 'Copy') {
      const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
      let tsv = ['S.No', ...cols.map((c) => COLUMN_LABELS[c])].join('\t') + '\n';
      filteredData.forEach((row, i) => {
        const line = [i + 1, ...cols.map((c) => c === 'availability_of_nais' && row[c] != null ? `${row[c]}%` : (row[c] ?? ''))];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv);
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'nais_uptime' });
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'NAIS Uptime Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: filteredData,
        fileName: 'nais_uptime',
      });
    }
  };

  const years = useMemo(
    () => [...new Set(rowData.map((r) => r.financial_year))].sort().reverse(),
    [rowData]
  );

  const filteredData = useMemo(() => {
    let data = yearFilter ? rowData.filter((r) => r.financial_year === yearFilter) : rowData;
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((r) =>
      (r.financial_year || '').toLowerCase().includes(q) ||
      String(r.availability_of_nais ?? '').includes(q)
    );
  }, [rowData, yearFilter, searchQuery]);

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.financial_year ? [{ headerName: 'Financial Year', field: 'financial_year', flex: 1, minWidth: 140, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.availability_of_nais ? [{
      headerName: 'Availability / Uptime of NAIS (%)', field: 'availability_of_nais', flex: 2, minWidth: 220,
      cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700',
      valueFormatter: (params) => params.value != null ? `${params.value}%` : '',
    }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'nais_id', pinned: 'right', width: canEdit && canRemove ? 90 : 60,
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
              title="Delete NAIS Uptime Entry"
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
