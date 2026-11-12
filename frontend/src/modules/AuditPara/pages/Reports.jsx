import { useMemo, useRef, useState } from 'react';
import { Search, RefreshCw, X, TrendingUp, Building2, Tag, ArrowLeft } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { CATEGORIES } from '../constants';
import { useAuditParaStore } from '../store/useAuditParaStore';

// Report columns -> stage (as in 2.0, each para is counted once, in its current stage)
const STAGE_OF = { received: 1, sought: 2, receivedOrg: 3, clarification: 4, cag: 5, accepted: 6, dropped: 7 };
const STAGE_LABEL = {
  received: 'Received at Ministry', sought: 'Comments Sought', receivedOrg: 'Comments Received', clarification: 'Under Clarification',
  cag: 'Furnished to CAG', accepted: 'Accepted by CAG', dropped: 'Dropped',
};
// A para's current stage: the last step reached (0 when none is)
const currentStage = (p) => [7, 6, 5, 4, 3, 2, 1].find((i) => p.statusSteps?.[i] === 'Yes') || 0;
const sameName = (a, b) => (a || '').toLowerCase() === (b || '').toLowerCase();
const formatDay = (v) => (v ? v.split('-').reverse().join('/') : '—');

export default function Reports({ rowData = [], wings = [], divisions = [], loading = false, onRefresh }) {
  const gridRef = useRef(null);
  // Drill-down, as in 2.0: a wing name opens that wing's divisions; a count opens the list of those
  // paras. drillWing: the wing whose divisions are shown; detail: { title, wing, division, column }.
  const [drillWing, setDrillWing] = useState(null);
  const [detail, setDetail] = useState(null);
  // View, category and search are kept in the store across tab switches
  const {
    reportView, setReportView,
    category, setCategory,
    quickFilter, setQuickFilter,
  } = useAuditParaStore(useShallow((state) => ({
    reportView: state.reportView,
    setReportView: state.setReportView,
    category: state.reportCategory,
    setCategory: state.setReportCategory,
    quickFilter: state.reportSearch,
    setQuickFilter: state.setReportSearch,
  })));

  // Title (and export file name) names the selected category, e.g. "... - Draft Paras".
  const title = `Report No. 4.2A - Abstract ( Wing & Division Wise ) - ${category === 'all' ? 'Audit Paras (All Categories)' : `${category}s`}`;

  const computeCounts = (paras) => {
    const counts = { total: paras.length };
    Object.entries(STAGE_OF).forEach(([key, stage]) => { counts[key] = paras.filter((p) => currentStage(p) === stage).length; });
    return counts;
  };

  // Paras of the selected category ('all' = every category).
  const categoryParas = useMemo(
    () => (category === 'all' ? rowData : rowData.filter((p) => (p.category || '').toLowerCase() === category.toLowerCase())),
    [rowData, category]
  );

  /* ── Aggregation by current report view ─────────────────────── */
  const aggregatedData = useMemo(() => {
    if (reportView === 'wing') {
      return wings
        .map((w) => {
          const paras = categoryParas.filter((p) => (p.wing || '').toLowerCase() === w.wing_name.toLowerCase());
          return { Wing: w.wing_name, ...computeCounts(paras) };
        })
        .sort((a, b) => a.Wing.localeCompare(b.Wing));
    }
    if (reportView === 'division') {
      const drillWingId = drillWing && wings.find((w) => sameName(w.wing_name, drillWing))?.wing_id;
      return divisions
        .filter((d) => !drillWing || String(d.wing_id) === String(drillWingId))
        .map((d) => {
          const paras = categoryParas.filter((p) => (p.division || '').toLowerCase() === d.division_name.toLowerCase());
          return { Division: d.division_name, ...computeCounts(paras) };
        })
        .sort((a, b) => a.Division.localeCompare(b.Division));
    }
    // 'all' -- combined Wing + Division rows
    return divisions
      .map((d) => {
        const wingObj = wings.find((w) => String(w.wing_id) === String(d.wing_id));
        const wingName = wingObj?.wing_name || '';
        const paras = categoryParas.filter(
          (p) => (p.wing || '').toLowerCase() === wingName.toLowerCase() && (p.division || '').toLowerCase() === d.division_name.toLowerCase()
        );
        return { Wing: wingName, Division: d.division_name, ...computeCounts(paras) };
      })
      .sort((a, b) => a.Wing.localeCompare(b.Wing) || a.Division.localeCompare(b.Division))
      .map((r, idx) => ({ ...r, 'S No': idx + 1 }));
  }, [categoryParas, wings, divisions, reportView, drillWing]);

  // The paras behind a clicked count
  const detailRows = useMemo(() => {
    if (!detail) return [];
    return categoryParas
      .filter((p) => (!detail.wing || sameName(p.wing, detail.wing))
        && (!detail.division || sameName(p.division, detail.division))
        && (detail.column === 'total' || currentStage(p) === STAGE_OF[detail.column]))
      .sort((a, b) => (a.subject || '').localeCompare(b.subject || ''))
      .map((p, i) => ({ ...p, sno: i + 1 }));
  }, [detail, categoryParas]);

  const openDetail = (row, column) => {
    const where = row.Division ? `${row.Division}${row.Wing ? ` (${row.Wing})` : ''}` : row.Wing;
    setDetail({
      wing: row.Wing || (reportView === 'division' ? drillWing : null),
      division: row.Division || null,
      column,
      title: `${where} - ${column === 'total' ? 'All Audit Paras' : STAGE_LABEL[column]}`,
    });
  };
  const changeView = (view) => { setDrillWing(null); setDetail(null); setReportView(view); };
  const openWing = (wing) => { setDetail(null); setDrillWing(wing); setReportView('division'); };
  const back = () => {
    if (detail) { setDetail(null); return; }
    setDrillWing(null);
    setReportView('wing');
  };

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
        cellRenderer: (p) => {
          if (p.data?.isTotalRow) return <span style={{ fontWeight: 850 }} className="text-slate-900 dark:text-white">Total</span>;
          // Wing view: the wing name opens its divisions
          if (reportView === 'wing' && p.value) {
            return (
              <button type="button" onClick={() => openWing(p.value)} title="Show this wing's divisions"
                className="font-semibold text-[#4b2424] dark:text-blue-400 underline decoration-dotted underline-offset-2 hover:decoration-solid cursor-pointer bg-transparent border-none p-0">
                {p.value}
              </button>
            );
          }
          return <span style={{ fontWeight: 600 }} className="text-slate-800 dark:text-slate-200">{p.value || '—'}</span>;
        }
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

    // A count opens the list of those paras (not on the Total row, as in 2.0)
    const numCol = (field, headerName, minWidth) => ({
      field, headerName, minWidth,
      cellRenderer: (p) => {
        if (!((p.value || 0) > 0)) return <span style={{ color: '#94a3b8', fontWeight: 600 }}>—</span>;
        if (p.data?.isTotalRow) return <span style={{ fontWeight: 850 }} className="text-[#4b2424] dark:text-blue-400">{p.value}</span>;
        return (
          <button type="button" onClick={() => openDetail(p.data, field)} title="Show these paras"
            className="font-bold text-[#4b2424] dark:text-blue-400 underline decoration-dotted underline-offset-2 hover:decoration-solid cursor-pointer bg-transparent border-none p-0">
            {p.value}
          </button>
        );
      }
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
    // openWing / openDetail only use state setters and the current view
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportView, drillWing]);

  // The list of paras behind a count (2.0's getAuditPara pages)
  const detailColumns = useMemo(() => [
    { field: 'sno', headerName: 'S No', maxWidth: 80 },
    { field: 'paraNumber', headerName: 'Audit Para No', minWidth: 140, wrapText: true, autoHeight: true },
    { field: 'subject', headerName: 'Subject', minWidth: 260, flex: 2, wrapText: true, autoHeight: true, cellStyle: { textAlign: 'left' } },
    { field: 'category', headerName: 'Category', minWidth: 120 },
    { field: 'wing', headerName: 'Wing', minWidth: 120 },
    { field: 'division', headerName: 'Division', minWidth: 120 },
    ...[[1, 'Received at Ministry'], [2, 'Comments Sought'], [3, 'Comments Received'], [5, 'Furnished to CAG'], [6, 'Accepted by CAG'], [7, 'Dropped']]
      .map(([i, name]) => ({ colId: `d${i}`, headerName: name, minWidth: 130, valueGetter: (p) => formatDay(p.data?.statusDates?.[i]) })),
    { field: 'lastUpdated', headerName: 'Last Updated', minWidth: 120, valueFormatter: (p) => formatDay(p.value) },
  ], []);

  // What the grid, Copy and Excel show: the summary or the para list
  const gridColumns = detail ? detailColumns : columns;
  const gridRows = detail ? detailRows : aggregatedData;

  const defaultColDef = useMemo(() => ({
    sortable: true, filter: true, resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const handleCopy = () => {
    const cell = (c, row) => (c.valueGetter ? c.valueGetter({ data: row }) : c.valueFormatter ? c.valueFormatter({ value: row[c.field] }) : row[c.field] ?? '');
    let tsv = gridColumns.map((c) => c.headerName).join('\t') + '\n';
    gridRows.forEach((row) => {
      tsv += gridColumns.map((c) => cell(c, row)).join('\t') + '\n';
    });
    navigator.clipboard.writeText(tsv);
  };

  const handleExport = (type) => {
    if (type === 'Excel' && gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({ fileName: `${(detail ? `${title} - ${detail.title}` : title).replace(/\s+/g, '_')}_export.csv` });
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
                <Tag className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-800 dark:text-indigo-300 whitespace-nowrap">Category:</span>
              </div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-transparent border-none text-xs font-extrabold text-indigo-950 dark:text-indigo-100 outline-none cursor-pointer pr-1 max-w-[200px]"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border-2 border-indigo-400/60 dark:border-indigo-500/60 text-xs shadow-sm">
              <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
                <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-800 dark:text-indigo-300 whitespace-nowrap">Report View:</span>
              </div>
              <select
                value={reportView}
                onChange={(e) => changeView(e.target.value)}
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
            <ExportDropdown onExportExcel={() => handleExport('Excel')} onExportPdf={() => handleExport('PDF')} color="#4b2424" hoverColor="#6b3535" />
            <button
              type="button"
              onClick={() => onRefresh?.()}
              disabled={loading}
              title="Reload audit paras"
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {(detail || drillWing) && (
        <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button type="button" onClick={back}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
            <ArrowLeft size={14} /> {detail ? 'Back to the report' : 'Back to wing-wise'}
          </button>
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {detail ? <>{detail.title} <span className="text-slate-500 dark:text-slate-400">({detailRows.length} {detailRows.length === 1 ? 'para' : 'paras'})</span></> : <>Divisions of <strong>{drillWing}</strong></>}
          </span>
        </div>
      )}

      <div className="ag-theme-quartz module-report-grid" style={{ width: '100%' }}>
        <Table
          key={detail ? 'detail' : 'summary'}
          ref={gridRef}
          theme="legacy"
          rowData={gridRows}
          columnDefs={gridColumns}
          defaultColDef={defaultColDef}
          pagination={true}
          paginationPageSize={15}
          domLayout="autoHeight"
          suppressColumnVirtualisation={true}
          quickFilterText={quickFilter}
          animateRows={true}
          headerHeight={46}
          autoSizeStrategy={{ type: 'fitCellContents', skipHeader: false, scaleUpToFitGridWidth: true }}
          pinnedBottomRowData={detail ? undefined : pinnedBottomRowData}
          enableExport={false}
          color="#4b2424"
        />
      </div>

    </div>
  );
}
