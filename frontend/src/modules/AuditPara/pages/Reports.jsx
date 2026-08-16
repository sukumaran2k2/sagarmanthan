import { useState, useMemo } from 'react';
import { FileSpreadsheet, Copy, FileText, Search, ChevronDown, TrendingUp, Layers, GitBranch, RefreshCw } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function Reports({ rowData = [], wings = [], divisions = [] }) {
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedWings = useMemo(
    () => [...wings].sort((a, b) => a.wing_name.localeCompare(b.wing_name)),
    [wings]
  );

  // Division options depend on the current wing selection: when a wing is
  // chosen, only show its divisions; when "All Wings", show every division.
  const divisionOptions = useMemo(() => {
    const pool = selectedWing === 'All'
      ? divisions
      : divisions.filter((d) => {
          const wingObj = wings.find((w) => w.wing_name === selectedWing);
          return wingObj && String(d.wing_id) === String(wingObj.wing_id);
        });
    return [...pool].sort((a, b) => a.division_name.localeCompare(b.division_name));
  }, [selectedWing, wings, divisions]);

  const handleWingChange = (val) => {
    setSelectedWing(val);
    setSelectedDivision('All');
  };

  const computeCounts = (paras) => ({
    total: paras.length,
    received: paras.filter((p) => p.statusSteps[1] === 'Yes').length,
    sought: paras.filter((p) => p.statusSteps[2] === 'Yes').length,
    receivedOrg: paras.filter((p) => p.statusSteps[3] === 'Yes').length,
    clarification: paras.filter((p) => p.statusSteps[4] === 'Yes').length,
    cag: paras.filter((p) => p.statusSteps[5] === 'Yes').length,
    accepted: paras.filter((p) => p.statusSteps[6] === 'Yes').length,
    dropped: paras.filter((p) => p.statusSteps[7] === 'Yes').length,
  });

  // Combined Wing+Division rows -- one row per division, always shown together
  // (default "All Wings (Abstract View)" state included), matching the
  // real Young Professionals report pattern.
  const rows = useMemo(() => {
    let divsToShow = divisions;
    if (selectedWing !== 'All') {
      const wingObj = wings.find((w) => w.wing_name === selectedWing);
      divsToShow = divisions.filter((d) => wingObj && String(d.wing_id) === String(wingObj.wing_id));
    }
    if (selectedDivision !== 'All') {
      divsToShow = divsToShow.filter((d) => d.division_name === selectedDivision);
    }

    return divsToShow
      .map((d) => {
        const wingObj = wings.find((w) => String(w.wing_id) === String(d.wing_id));
        const wingName = wingObj?.wing_name || '';
        const paras = rowData.filter(
          (p) => (p.wing || '').toLowerCase() === wingName.toLowerCase() && (p.division || '').toLowerCase() === d.division_name.toLowerCase()
        );
        return { wing: wingName, division: d.division_name, ...computeCounts(paras) };
      })
      .filter((r) =>
        r.wing.toLowerCase().includes(searchQuery.toLowerCase()) || r.division.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => a.wing.localeCompare(b.wing) || a.division.localeCompare(b.division));
  }, [rowData, wings, divisions, selectedWing, selectedDivision, searchQuery]);

  const pinnedBottomRowData = useMemo(() => {
    const totals = {
      wing: 'Total', division: '',
      total: rows.reduce((sum, r) => sum + r.total, 0),
      received: rows.reduce((sum, r) => sum + r.received, 0),
      sought: rows.reduce((sum, r) => sum + r.sought, 0),
      receivedOrg: rows.reduce((sum, r) => sum + r.receivedOrg, 0),
      clarification: rows.reduce((sum, r) => sum + r.clarification, 0),
      cag: rows.reduce((sum, r) => sum + r.cag, 0),
      accepted: rows.reduce((sum, r) => sum + r.accepted, 0),
      dropped: rows.reduce((sum, r) => sum + r.dropped, 0),
    };
    return [totals];
  }, [rows]);

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowPinned ? '' : params.node.rowIndex + 1,
      width: 70, pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-800/40 flex items-center justify-center'
    },
    {
      headerName: 'Wing', field: 'wing', minWidth: 180, pinned: 'left',
      cellClass: (params) =>
        `font-extrabold flex items-center border-r border-slate-100 dark:border-slate-700 ${params.node.rowPinned ? 'text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/30' : 'text-[#0f417a] dark:text-blue-400 underline'}`
    },
    {
      headerName: 'Division', field: 'division', minWidth: 180,
      cellClass: 'font-bold text-[#0f417a] dark:text-blue-400 underline flex items-center border-r border-slate-100 dark:border-slate-700'
    },
    { headerName: 'No. of Audit Paras', field: 'total', minWidth: 160, cellClass: 'text-center font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
    { headerName: 'Received at Ministry', field: 'received', minWidth: 180, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
    { headerName: 'Comments Sought from Organisation', field: 'sought', minWidth: 280, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
    { headerName: 'Comments Received from organisation', field: 'receivedOrg', minWidth: 290, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
    { headerName: 'Under Clarification', field: 'clarification', minWidth: 175, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
    { headerName: 'Comments Furnished to CAG', field: 'cag', minWidth: 220, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
    { headerName: 'Accepted by CAG', field: 'accepted', minWidth: 165, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
    { headerName: 'Dropped', field: 'dropped', minWidth: 120, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' }
  ], []);

  const handleGridWheel = (e) => {
    const container = e.currentTarget;
    if (container) {
      const gridBodyViewport = container.querySelector('.ag-body-viewport');
      if (gridBodyViewport && gridBodyViewport.scrollWidth > gridBodyViewport.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          gridBodyViewport.scrollLeft += e.deltaY;
          const isAtStart = gridBodyViewport.scrollLeft <= 0 && e.deltaY < 0;
          const isAtEnd = gridBodyViewport.scrollLeft + gridBodyViewport.clientWidth >= gridBodyViewport.scrollWidth && e.deltaY > 0;
          if (!isAtStart && !isAtEnd) e.preventDefault();
        }
      }
    }
  };

  const handleExport = (type) => {
    console.log(`${type} exported.`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-[#8b3a4a] dark:text-rose-400">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Audit Paras Report</span>
      </div>

      <div>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 font-display">
          Report No. 4.2A - Abstract ( Wing & Division Wise ) - Audit Paras
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
          As on date: <span className="font-bold text-slate-700 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          <span className="mx-1.5">•</span>
          Report for the month — <span className="font-bold text-slate-700 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</span>
        </p>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wing, division..."
            className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full focus:outline-none focus:border-[#0f417a] font-medium text-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 pl-3 pr-8 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-full">
            <Layers className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <span className="text-[11px] font-black text-indigo-700 dark:text-indigo-300 uppercase tracking-wide whitespace-nowrap">Wing View:</span>
            <select
              value={selectedWing}
              onChange={(e) => handleWingChange(e.target.value)}
              className="appearance-none bg-transparent text-xs font-bold text-indigo-800 dark:text-indigo-200 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="All">All Wings (Abstract View)</option>
              {sortedWings.map((w) => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
            </select>
          </div>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-indigo-500 pointer-events-none" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-1.5 pl-3 pr-8 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-full">
            <GitBranch className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wide whitespace-nowrap">Division View:</span>
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="appearance-none bg-transparent text-xs font-bold text-emerald-800 dark:text-emerald-200 focus:outline-none cursor-pointer max-w-[140px] truncate"
            >
              <option value="All">All Divisions</option>
              {divisionOptions.map((d) => <option key={d.division_id} value={d.division_name}>{d.division_name}</option>)}
            </select>
          </div>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-500 pointer-events-none" />
        </div>

        <div className="flex-1" />

        <button
          onClick={() => handleExport('Clipboard')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
        >
          <Copy className="h-3.5 w-3.5" /><span>Copy</span>
        </button>

        <div className="relative group">
          <button className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5c2a3a] hover:bg-[#6d3346] text-white rounded-full text-xs font-bold transition cursor-pointer">
            <span>Export</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg py-1 z-10 hidden group-hover:block">
            <button onClick={() => handleExport('Excel')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
              <FileSpreadsheet className="h-3.5 w-3.5" /><span>Export to Excel</span>
            </button>
            <button onClick={() => handleExport('PDF')} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
              <FileText className="h-3.5 w-3.5" /><span>Export to PDF</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="p-2.5 bg-white dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div
        className="ag-theme-quartz rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto"
        style={{
          '--ag-header-background-color': '#5c2a3a',
          '--ag-header-foreground-color': '#ffffff',
          '--ag-header-column-separator-color': 'rgba(255,255,255,0.25)',
          '--ag-header-column-separator-display': 'block',
          '--ag-odd-row-background-color': '#f0fdf4',
          '--ag-row-hover-color': '#e6f9ee',
        }}
        onWheel={handleGridWheel}
      >
        <AgGridReact
          theme="legacy"
          rowData={rows}
          columnDefs={colDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          domLayout="autoHeight"
          rowHeight={46}
          headerHeight={40}
          suppressColumnVirtualisation={true}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          autoSizeStrategy={{ type: 'fitCellContents' }}
          onFirstDataRendered={(params) => {
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const gridRoot = document.querySelector(`.ag-root-wrapper[grid-id="${params.api.getGridId()}"]`);
            const containerWidth = gridRoot?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) params.api.sizeColumnsToFit();
          }}
          onGridSizeChanged={(params) => {
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const gridRoot = document.querySelector(`.ag-root-wrapper[grid-id="${params.api.getGridId()}"]`);
            const containerWidth = gridRoot?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) params.api.sizeColumnsToFit();
          }}
        />
      </div>
    </div>
  );
}
