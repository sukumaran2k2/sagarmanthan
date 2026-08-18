import { useState, useMemo, useRef } from 'react';
import { ChevronLeft, Search, RefreshCw, X, TrendingUp, Building2 } from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';

export default function Reports({ rowData = [], wings = [], divisions = [] }) {
  const gridRef = useRef(null);
  const [reportView, setReportView] = useState('all');
  const [quickFilter, setQuickFilter] = useState('');
  const [loading] = useState(false);

  const title = 'Report No. 4.2A - Abstract ( Wing & Division Wise ) - Audit Paras';

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

  /* ── Aggregation by current report view ─────────────────────── */
  const aggregatedData = useMemo(() => {
    if (reportView === 'wing') {
      return wings
        .map((w) => {
          const paras = rowData.filter((p) => (p.wing || '').toLowerCase() === w.wing_name.toLowerCase());
          return { Wing: w.wing_name, ...computeCounts(paras) };
        })
        .sort((a, b) => a.Wing.localeCompare(b.Wing));
    }
    if (reportView === 'division') {
      return divisions
        .map((d) => {
          const paras = rowData.filter((p) => (p.division || '').toLowerCase() === d.division_name.toLowerCase());
          return { Division: d.division_name, ...computeCounts(paras) };
        })
        .sort((a, b) => a.Division.localeCompare(b.Division));
    }
    // 'all' -- combined Wing + Division rows
    return divisions
      .map((d) => {
        const wingObj = wings.find((w) => String(w.wing_id) === String(d.wing_id));
        const wingName = wingObj?.wing_name || '';
        const paras = rowData.filter(
          (p) => (p.wing || '').toLowerCase() === wingName.toLowerCase() && (p.division || '').toLowerCase() === d.division_name.toLowerCase()
        );
        return { Wing: wingName, Division: d.division_name, ...computeCounts(paras) };
      })
      .sort((a, b) => a.Wing.localeCompare(b.Wing) || a.Division.localeCompare(b.Division))
      .map((r, idx) => ({ ...r, 'S No': idx + 1 }));
  }, [rowData, wings, divisions, reportView]);

  const pinnedBottomRowData = useMemo(() => {
    const sum = (key) => aggregatedData.reduce((acc, r) => acc + (r[key] || 0), 0);
    return [{
      Wing: 'Total', Division: 'Total', isTotalRow: true,
      total: sum('total'), received: sum('received'), sought: sum('sought'),
      receivedOrg: sum('receivedOrg'), clarification: sum('clarification'),
      cag: sum('cag'), accepted: sum('accepted'), dropped: sum('dropped'),
    }];
  }, [aggregatedData]);

  const columns = useMemo(() => {
    const cols = [];
    if (reportView === 'wing' || reportView === 'all') {
      cols.push({
        field: 'Wing', headerName: 'Wing', flex: 1.5, minWidth: 180, pinned: 'left',
        cellRenderer: (p) => p.data?.isTotalRow
          ? <span style={{ fontWeight: 850 }} className="text-slate-900 dark:text-white">Total</span>
          : <span style={{ fontWeight: 600 }} className="text-slate-800 dark:text-slate-200">{p.value || '—'}</span>
      });
    }
    if (reportView === 'division' || reportView === 'all') {
      cols.push({
        field: 'Division', headerName: 'Division', flex: 1.5, minWidth: 180, pinned: 'left',
        cellRenderer: (p) => p.data?.isTotalRow
          ? <span style={{ fontWeight: 850 }} className="text-slate-900 dark:text-white">Total</span>
          : <span style={{ fontWeight: 600 }} className="text-slate-800 dark:text-slate-200">{p.value || '—'}</span>
      });
    }

    const numCol = (field, headerName, minWidth) => ({
      field, headerName, minWidth,
      cellRenderer: (p) => (p.value || 0) > 0
        ? <span style={{ fontWeight: p.data?.isTotalRow ? 850 : 700 }} className="text-[#4b2424] dark:text-blue-400">{p.value}</span>
        : <span style={{ color: '#94a3b8', fontWeight: 600 }}>—</span>
    });

    cols.push(
      numCol('total', 'No. of Audit Paras', 155),
      numCol('received', 'Received at Ministry', 175),
      numCol('sought', 'Comments Sought', 165),
      numCol('receivedOrg', 'Comments Received', 170),
      numCol('clarification', 'Under Clarification', 165),
      numCol('cag', 'Furnished to CAG', 155),
      numCol('accepted', 'Accepted by CAG', 150),
      numCol('dropped', 'Dropped', 110),
    );
    return cols;
  }, [reportView]);

  const defaultColDef = useMemo(() => ({
    sortable: true, filter: true, resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const handleCopy = () => {
    let tsv = columns.map((c) => c.headerName).join('\t') + '\n';
    aggregatedData.forEach((row) => {
      tsv += columns.map((c) => row[c.field] ?? '').join('\t') + '\n';
    });
    navigator.clipboard.writeText(tsv);
  };

  const handleExport = (type) => {
    if (type === 'Excel' && gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({ fileName: `${title.replace(/\s+/g, '_')}_export.csv` });
    } else if (type === 'PDF') {
      window.print();
    }
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-4 relative rounded-t-2xl">
        <div className="flex items-center gap-3 min-w-[260px]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
              <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">
                Audit Paras Report
              </span>
            </div>
            <h3 className="m-0 text-xl font-semibold text-slate-900 dark:text-slate-100 tracking-tight">{title}</h3>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>As on date: <strong className="text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</strong></span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Report for the month — <strong className="text-slate-800 dark:text-slate-200">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2.5 flex-wrap w-full">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative w-56">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search wing, division..."
                value={quickFilter}
                onChange={(e) => setQuickFilter(e.target.value)}
                className="w-full py-2 pl-9 pr-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
              />
              {quickFilter && (
                <button onClick={() => setQuickFilter('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-0.5">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border-2 border-indigo-400/60 dark:border-indigo-500/60 text-xs shadow-sm">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-800 dark:text-indigo-300 whitespace-nowrap">Report View:</span>
              </div>
              <select
                value={reportView}
                onChange={(e) => setReportView(e.target.value)}
                className="bg-transparent border-none text-xs font-extrabold text-indigo-950 dark:text-indigo-100 outline-none cursor-pointer pr-1 max-w-[200px]"
              >
                <option value="wing">Wing</option>
                <option value="division">Division</option>
                <option value="all">Wing and Division</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <CopyButton onCopy={handleCopy} color="#4b2424" className="!rounded-xl !py-2 !px-4" />
            <ExportDropdown onExportExcel={() => handleExport('Excel')} onExportPdf={() => handleExport('PDF')} />
            <button
              onClick={() => {}}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      <div className="ag-theme-quartz audit-pro-grid" style={{ width: '100%' }}>
        <Table
          ref={gridRef}
          theme="legacy"
          rowData={aggregatedData}
          columnDefs={columns}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={15}
          domLayout="autoHeight"
          suppressColumnVirtualisation={true}
          quickFilterText={quickFilter}
          animateRows={true}
          headerHeight={46}
          autoSizeStrategy={{ type: 'fitCellContents', skipHeader: false, scaleUpToFitGridWidth: true }}
          pinnedBottomRowData={pinnedBottomRowData}
          enableExport={false}
          color="#4b2424"
        />
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .audit-pro-grid.ag-theme-quartz {
          --ag-font-family: 'Inter', system-ui, -apple-system, sans-serif;
          --ag-font-size: 13.5px;
          --ag-border-color: #B9BDC2;
          --ag-row-border-color: #D3D6D9;
          --ag-row-height: 52px;
          --ag-active-color: #4b2424;
          --ag-checkbox-checked-color: #4b2424;
          --ag-input-focus-border-color: #4b2424;
          --ag-selected-row-background-color: #f7f3f3;
        }
        .audit-pro-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
        .audit-pro-grid .ag-header { background: #4b2424ff !important; border-bottom: 2px solid !important; }
        .audit-pro-grid .ag-header-row { background: transparent !important; }
        .audit-pro-grid .ag-header-cell {
          color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important;
          text-transform: uppercase !important; letter-spacing: 0.05em !important;
          border-right: 1px solid #4b2424ff !important; padding-left: 14px !important; padding-right: 14px !important;
        }
        .audit-pro-grid .ag-header-cell-label { justify-content: center !important; text-align: center !important; }
        .audit-pro-grid .ag-header-cell:hover { background: #6b3535ff !important; }
        .audit-pro-grid .ag-header-cell-label .ag-header-cell-text { color: #ffffff !important; }
        .audit-pro-grid .ag-row { border-bottom: 1px solid #D3D6D9 !important; }
        .audit-pro-grid .ag-row-even { background: #ffffff !important; }
        .audit-pro-grid .ag-row-odd { background: #f8faf6 !important; }
        .audit-pro-grid .ag-row:hover { background: #f6f8f5 !important; }
        .audit-pro-grid .ag-cell { display: flex; align-items: center; padding-left: 14px !important; padding-right: 14px !important; border-right: 1px solid #D3D6D9 !important; }
        .audit-pro-grid .ag-paging-panel { border-top: 1px solid #D3D6D9 !important; background: #f8faf6 !important; padding: 10px 20px !important; font-size: 12.5px !important; font-weight: 600 !important; color: #657386 !important; }

        .dark .audit-pro-grid.ag-theme-quartz { --ag-background-color: #090d16; --ag-foreground-color: #f1f5f9; --ag-border-color: #1e293b; --ag-row-border-color: #1e293b; }
        .dark .audit-pro-grid .ag-root-wrapper { background-color: #090d16 !important; }
        .dark .audit-pro-grid .ag-header { background: #0f172a !important; border-bottom: 2px solid #1e293b !important; }
        .dark .audit-pro-grid .ag-header-cell { color: #f1f5f9 !important; border-right: 1px solid #1e293b !important; }
        .dark .audit-pro-grid .ag-header-cell:hover { background: #1e293b !important; }
        .dark .audit-pro-grid .ag-row { border-bottom: 1px solid #1e293b !important; color: #e2e8f0 !important; }
        .dark .audit-pro-grid .ag-row-even { background: #090d16 !important; }
        .dark .audit-pro-grid .ag-row-odd { background: #0f172a !important; }
        .dark .audit-pro-grid .ag-row:hover { background: #1e293b !important; }
        .dark .audit-pro-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
        .dark .audit-pro-grid .ag-paging-panel { border-top: 1px solid #1e293b !important; background: #0f172a !important; color: #94a3b8 !important; }
        .dark .audit-pro-grid .ag-floating-bottom { background: #0f172a !important; color: #f8fafc !important; border-top: 2px solid #334155 !important; }
        .dark .audit-pro-grid .ag-floating-bottom .ag-row { background: #0f172a !important; }
      `}} />
    </div>
  );
}
