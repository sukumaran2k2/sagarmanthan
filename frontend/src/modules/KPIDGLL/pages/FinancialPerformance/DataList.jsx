import { useState, useMemo, useRef } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import DataListToolbar from '../../../../components/DataListToolbar';
import { exportDataListToPdf } from '../../../../utils/exportReportPdf';

ModuleRegistry.registerModules([AllCommunityModule]);

const COLUMN_LABELS = {
  organisation_name: 'Organisation Name',
  financialyear: 'Financial Year',
  revenue_light_dues_collection: 'Revenue from Light Dues Collection (Head: 1051)',
  revenue_from_tourism: 'Revenue from Tourism/Heritage Sites (LKRB)',
  subsidies_from_govt: 'Grants/Subsidies from Government',
  operating_costs: 'Operating Costs (Head: 3051)',
  capital_expenditure: 'Capital Expenditure (Head: 5051)',
  tourism_develop_cost: 'Tourism Development Costs (included in 5051)',
};

export default function FinancialPerformanceDataList({
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
    organisation_name: true,
    financialyear: true,
    revenue_light_dues_collection: true,
    revenue_from_tourism: true,
    subsidies_from_govt: true,
    operating_costs: true,
    capital_expenditure: true,
    tourism_develop_cost: true,
  });
  const gridRef = useRef(null);

  const moneyFmt = (params) => params.value != null ? `₹${Number(params.value).toLocaleString('en-IN')} Cr` : '';
  const MONEY_FIELDS = ['revenue_light_dues_collection', 'revenue_from_tourism', 'subsidies_from_govt', 'operating_costs', 'capital_expenditure', 'tourism_develop_cost'];

  const handleExport = (type) => {
    if (type === 'Copy') {
      const cols = Object.keys(visibleCols).filter((c) => visibleCols[c]);
      let tsv = ['S.No', ...cols.map((c) => COLUMN_LABELS[c])].join('\t') + '\n';
      filteredData.forEach((row, i) => {
        const line = [i + 1, ...cols.map((c) => MONEY_FIELDS.includes(c) && row[c] != null ? `₹${Number(row[c]).toLocaleString('en-IN')} Cr` : (row[c] ?? ''))];
        tsv += line.join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv);
    } else if (type === 'Excel') {
      gridRef.current?.api?.exportDataAsCsv({ fileName: 'financial_performance' });
    } else if (type === 'PDF') {
      exportDataListToPdf({
        title: 'Financial Performance Data List',
        columnLabels: COLUMN_LABELS,
        visibleCols,
        rowData: filteredData,
        fileName: 'financial_performance',
      });
    }
  };

  const years = useMemo(
    () => [...new Set(rowData.map((r) => r.financialyear))].sort().reverse(),
    [rowData]
  );

  const filteredData = useMemo(() => {
    let data = yearFilter ? rowData.filter((r) => r.financialyear === yearFilter) : rowData;
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((r) =>
      (r.organisation_name || '').toLowerCase().includes(q) ||
      (r.financialyear || '').toLowerCase().includes(q)
    );
  }, [rowData, yearFilter, searchQuery]);

  const colDefs = useMemo(() => [
    { headerName: 'S.No', pinned: 'left', valueGetter: (params) => params.node.rowIndex + 1, width: 70, cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' },
    ...(visibleCols.organisation_name ? [{ headerName: 'Organisation Name', pinned: 'left', field: 'organisation_name', flex: 1, minWidth: 180, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.financialyear ? [{ headerName: 'Financial Year', field: 'financialyear', flex: 1, minWidth: 130, cellClass: 'text-center font-bold text-[#0f417a] dark:text-blue-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.revenue_light_dues_collection ? [{ headerName: 'Revenue from Light Dues Collection (Head: 1051)', field: 'revenue_light_dues_collection', flex: 1, minWidth: 200, valueFormatter: moneyFmt, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.revenue_from_tourism ? [{ headerName: 'Revenue from Tourism/Heritage Sites (LKRB)', field: 'revenue_from_tourism', flex: 1, minWidth: 200, valueFormatter: moneyFmt, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.subsidies_from_govt ? [{ headerName: 'Grants/Subsidies from Government', field: 'subsidies_from_govt', flex: 1, minWidth: 170, valueFormatter: moneyFmt, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.operating_costs ? [{ headerName: 'Operating Costs (Head: 3051)', field: 'operating_costs', flex: 1, minWidth: 180, valueFormatter: moneyFmt, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.capital_expenditure ? [{ headerName: 'Capital Expenditure (Head: 5051)', field: 'capital_expenditure', flex: 1, minWidth: 190, valueFormatter: moneyFmt, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),
    ...(visibleCols.tourism_develop_cost ? [{ headerName: 'Tourism Development Costs (included in 5051)', field: 'tourism_develop_cost', flex: 1, minWidth: 210, valueFormatter: moneyFmt, cellClass: 'text-center text-slate-700 dark:text-slate-200 flex items-center justify-center font-semibold border-r border-slate-100 dark:border-slate-700' }] : []),

    ...(canEdit || canRemove ? [{
      headerName: 'Actions', field: 'financial_id', pinned: 'right', width: canEdit && canRemove ? 90 : 60,
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
              title="Delete Financial Performance Entry"
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
        searchPlaceholder="Search..."
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

      <div className="ag-theme-quartz rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto">
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={filteredData}
          columnDefs={colDefs}
          pagination={true}
          paginationPageSize={pageSize}
          paginationPageSizeSelector={[10, 20, 50]}
          domLayout="autoHeight"
          rowHeight={50}
          headerHeight={42}
          suppressColumnVirtualisation={true}
        />
      </div>
    </div>
  );
}
