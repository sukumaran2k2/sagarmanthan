import { useState, useMemo } from 'react';
import { FileSpreadsheet, Copy, FileText, Search, ChevronDown } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function Reports({ rowData = [], wings = [], divisions = [] }) {
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Divisions available depend on whether a specific wing is selected.
  const scopedDivisions = useMemo(() => {
    if (selectedWing === 'All') return [];
    const wingObj = wings.find((w) => w.wing_name === selectedWing);
    if (!wingObj) return [];
    return divisions.filter((d) => String(d.wing_id) === String(wingObj.wing_id));
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

  // Abstract (Wing-wise) rows -- default view, one row per wing.
  const wingRows = useMemo(() => {
    const wingNames = wings.length ? wings.map((w) => w.wing_name) : [];
    return wingNames
      .filter((w) => w.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((wing) => {
        const wingParas = rowData.filter((p) => (p.wing || '').toLowerCase() === wing.toLowerCase());
        return { wing, division: '', ...computeCounts(wingParas) };
      });
  }, [rowData, wings, searchQuery]);

  // Division-wise rows -- shown once a specific wing is selected via WING VIEW.
  const divisionRows = useMemo(() => {
    if (selectedWing === 'All') return [];
    let divsToShow = scopedDivisions;
    if (selectedDivision !== 'All') {
      divsToShow = scopedDivisions.filter((d) => d.division_name === selectedDivision);
    }
    return divsToShow
      .filter((d) => d.division_name.toLowerCase().includes(searchQuery.toLowerCase()) || selectedWing.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((d) => {
        const divisionParas = rowData.filter(
          (p) => (p.wing || '').toLowerCase() === selectedWing.toLowerCase() && (p.division || '').toLowerCase() === d.division_name.toLowerCase()
        );
        return { wing: selectedWing, division: d.division_name, ...computeCounts(divisionParas) };
      });
  }, [rowData, selectedWing, selectedDivision, scopedDivisions, searchQuery]);

  const isAbstractView = selectedWing === 'All';
  const rows = isAbstractView ? wingRows : divisionRows;

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

  const colDefs = useMemo(() => {
    const base = [
      {
        headerName: 'S.No',
        valueGetter: (params) => params.node.rowPinned ? '' : params.node.rowIndex + 1,
        width: 70, pinned: 'left',
        cellClass: 'text-center font-bold text-slate-500 dark:text-slate-400 border-r border-slate-100 dark:border-slate-700 bg-slate-50/20 dark:bg-slate-800/40 flex items-center justify-center'
      },
      {
        headerName: 'Wing', field: 'wing', minWidth: 180, pinned: 'left',
        cellClass: (params) =>
          `font-extrabold flex items-center border-r border-slate-100 dark:border-slate-700 ${params.node.rowPinned ? 'text-blue-900 dark:text-blue-300 bg-blue-50/30 dark:bg-blue-950/30' : 'text-slate-800 dark:text-slate-100'}`
      },
    ];
    if (!isAbstractView) {
      base.push({
        headerName: 'Division', field: 'division', minWidth: 180,
        cellClass: 'font-bold text-slate-700 dark:text-slate-200 flex items-center border-r border-slate-100 dark:border-slate-700'
      });
    }
    return [
      ...base,
      { headerName: 'No. of Audit Paras', field: 'total', minWidth: 160, cellClass: 'text-center font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
      { headerName: 'Received at Ministry', field: 'received', minWidth: 180, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
      { headerName: 'Comments Sought from Organisation', field: 'sought', minWidth: 280, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
      { headerName: 'Comments Received from organisation', field: 'receivedOrg', minWidth: 290, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
      { headerName: 'Under Clarification', field: 'clarification', minWidth: 175, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
      { headerName: 'Comments Furnished to CAG', field: 'cag', minWidth: 220, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
      { headerName: 'Accepted by CAG', field: 'accepted', minWidth: 165, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' },
      { headerName: 'Dropped', field: 'dropped', minWidth: 120, cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center border-r border-slate-100 dark:border-slate-700', valueFormatter: (params) => params.value || '' }
    ];
  }, [isAbstractView]);

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
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 font-display flex items-center gap-1.5 uppercase">
            Report No.: 4.2A - Abstract ( Wing & Division Wise ) - Audit Paras
          </h2>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 tracking-wider">
            As On date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' })}
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 tracking-wider">
            (Report for the Month - {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })})
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleExport('Excel')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[10px] font-bold uppercase hover:bg-emerald-100/50 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Export to Excel</span>
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-[10px] font-bold uppercase hover:bg-red-100/50 transition cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Export to PDF</span>
          </button>
        </div>
      </div>

      {/* Search + Wing/Division view selectors */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wing, division..."
            className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0f417a] font-medium text-slate-700 dark:text-slate-200"
          />
        </div>

        <div className="relative">
          <select
            value={selectedWing}
            onChange={(e) => handleWingChange(e.target.value)}
            className="appearance-none text-xs pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0f417a] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="All">WING VIEW: All Wings (Abstract View)</option>
            {wings.map((w) => <option key={w.wing_id} value={w.wing_name}>WING VIEW: {w.wing_name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            disabled={isAbstractView}
            className="appearance-none text-xs pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0f417a] font-bold text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="All">DIVISION VIEW: All Divisions</option>
            {scopedDivisions.map((d) => <option key={d.division_id} value={d.division_name}>DIVISION VIEW: {d.division_name}</option>)}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-1.5">
          <button onClick={() => handleExport('Clipboard')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <Copy className="h-3.5 w-3.5" /><span>Copy</span>
          </button>
          <button onClick={() => handleExport('Excel')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" /><span>Excel</span>
          </button>
          <button onClick={() => handleExport('PDF')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileText className="h-3.5 w-3.5" /><span>PDF</span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>Total Rows: <strong className="text-slate-800 dark:text-slate-100">{rows.length}</strong></span>
        </div>
      </div>

      <div className="ag-theme-quartz rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact
          theme="legacy"
          rowData={rows}
          columnDefs={colDefs}
          pinnedBottomRowData={pinnedBottomRowData}
          domLayout="autoHeight"
          rowHeight={46}
          headerHeight={38}
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
