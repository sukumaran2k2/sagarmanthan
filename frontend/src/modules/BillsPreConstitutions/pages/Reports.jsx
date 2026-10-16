import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronLeft, Search, RefreshCw, X, TrendingUp, Building2 } from 'lucide-react';
import { fetchBillWingWiseReport, fetchBillDivisionWiseReport, fetchBillWingWiseDetail, fetchBillDivisionWiseDetail } from '../api';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import ReportTable from '../../../components/ReportTable';

const COLUMN_STAGE_MAP = {
  "Draft Bill Prepared": 1, "DCN And Draft Bill Approved by Minister": 2, "Circulated for IMC": 3,
  "IMC comments received": 4, "DCN & Draft Bill prepared": 5, "DCN & draft bill Approved by Minister": 6,
  "Submitted for Legal Vetting": 7, "Legal Vetting to be Completed": 8,
  "Final DCN & draft bill Approved by Minister": 9, "Advance Copy to be Sent to PMO & Cab Sectt": 10,
  "Approved By Cabinet": 11, "Bill introduced in parliament": 12, "Bill Passed": 13,
  "Bill Notified": 14, "Completed": 15
};

const ABSTRACT_TITLE = 'Report No. 1.1 - Abstract ( Wing & Division Wise ) - Bills/Pre-Constitutions Act';

export default function Reports({ triggerNotification, wings = [] }) {
  const gridRef = useRef(null);
  const [reportView, setReportView] = useState('wing');
  const [drillDownPath, setDrillDownPath] = useState([{ type: 'combined' }]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [quickFilter, setQuickFilter] = useState('');

  const currentView = drillDownPath[drillDownPath.length - 1];
  const isAbstractLevel = currentView.type === 'combined';

  const handleBack = () => {
    if (drillDownPath.length > 1) setDrillDownPath((prev) => prev.slice(0, -1));
  };

  const stageCellRenderer = (stageId, getDivisionId) => (p) => {
    const val = p.value;
    if (val > 0 && p.data && p.data.Division !== 'Total' && p.data.Wing !== 'Total') {
      return (
        <button
          onClick={() => {
            const divisionId = getDivisionId(p.data);
            const divisionName = p.data.Division;
            setDrillDownPath((prev) => [...prev, { type: 'detail-division', divisionId, stageId, title: `Bills - Division: ${divisionName} | Stage: ${p.colDef.field}` }]);
          }}
          style={{ background: 'none', border: 'none', color: '#4b2424', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontSize: '12px' }}
        >
          {val}
        </button>
      );
    }
    return val > 0 ? <span style={{ fontWeight: 700 }}>{val}</span> : <span style={{ color: '#94a3b8', fontWeight: 600 }}>—</span>;
  };

  const fetchAbstract = useCallback(async () => {
    const results = await Promise.all(
      wings.map(async (w) => {
        try {
          const res = await fetchBillDivisionWiseReport(w.wing_id);
          const rows = (res.data?.rowData || []).filter((r) => r.Division !== 'Total');
          return { wing: w, cols: res.data?.columnDefs || [], rows: rows.map((r) => ({ ...r, Wing: w.wing_name })) };
        } catch {
          return { wing: w, cols: [], rows: [] };
        }
      })
    );
    const mergedRows = results.flatMap((r) => r.rows);
    const referenceCols = results.find((r) => r.cols.length)?.cols || [];
    setColumnDefs(referenceCols);
    setData(mergedRows);
  }, [wings]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'combined') {
        await fetchAbstract();
      } else if (currentView.type === 'detail-wing') {
        const response = await fetchBillWingWiseDetail(currentView.wingId, currentView.stageId);
        setColumnDefs(response.data?.columnDefs || []);
        setData(response.data?.rowData || []);
      } else if (currentView.type === 'detail-division') {
        const response = await fetchBillDivisionWiseDetail(currentView.divisionId, currentView.stageId);
        setColumnDefs(response.data?.columnDefs || []);
        setData(response.data?.rowData || []);
      }
    } catch (err) {
      console.error('Error loading Bills reports:', err);
      setData([]);
      setColumnDefs([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, fetchAbstract]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  /* ── Aggregation by report view (wing / division / all) ──────── */
  const aggregatedData = useMemo(() => {
    if (!isAbstractLevel) return data.map((r, idx) => ({ ...r, 'S No': idx + 1 }));

    const stageFields = Object.keys(COLUMN_STAGE_MAP);
    const sumStages = (rows) => {
      const out = {};
      stageFields.forEach((f) => { out[f] = rows.reduce((s, r) => s + Number(r[f] || 0), 0); });
      return out;
    };

    if (reportView === 'wing') {
      const map = {};
      data.forEach((row) => {
        if (!map[row.Wing]) map[row.Wing] = [];
        map[row.Wing].push(row);
      });
      return Object.entries(map).map(([Wing, rows]) => ({ Wing, division_id: rows[0]?.division_id, ...sumStages(rows) }))
        .sort((a, b) => a.Wing.localeCompare(b.Wing));
    }
    if (reportView === 'division') {
      const map = {};
      data.forEach((row) => {
        if (!map[row.Division]) map[row.Division] = [];
        map[row.Division].push(row);
      });
      return Object.entries(map).map(([Division, rows]) => ({ Division, division_id: rows[0]?.division_id, ...sumStages(rows) }))
        .sort((a, b) => a.Division.localeCompare(b.Division));
    }
    return data.sort((a, b) => (a.Wing || '').localeCompare(b.Wing || '') || (a.Division || '').localeCompare(b.Division || ''));
  }, [data, reportView, isAbstractLevel]);

  const pinnedBottomRowData = useMemo(() => {
    if (!isAbstractLevel) return undefined;
    const stageFields = Object.keys(COLUMN_STAGE_MAP);
    const totals = { Wing: 'Total', Division: 'Total', isTotalRow: true };
    stageFields.forEach((f) => { totals[f] = aggregatedData.reduce((s, r) => s + Number(r[f] || 0), 0); });
    return [totals];
  }, [aggregatedData, isAbstractLevel]);

  const columns = useMemo(() => {
    if (!isAbstractLevel) return columnDefs;

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
    Object.keys(COLUMN_STAGE_MAP).forEach((field) => {
      const stageId = COLUMN_STAGE_MAP[field];
      cols.push({
        field, headerName: field, minWidth: 150,
        cellRenderer: reportView === 'all' ? stageCellRenderer(stageId, (row) => row.division_id) : (p) => (p.value || 0) > 0
          ? <span style={{ fontWeight: p.data?.isTotalRow ? 850 : 700 }}>{p.value}</span>
          : <span style={{ color: '#94a3b8', fontWeight: 600 }}>—</span>
      });
    });
    return cols;
  }, [isAbstractLevel, columnDefs, reportView]);

  const defaultColDef = useMemo(() => ({
    sortable: true, filter: true, resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const handleCopy = () => {
    let tsv = columns.filter((c) => c.headerName).map((c) => c.headerName).join('\t') + '\n';
    aggregatedData.forEach((row) => {
      tsv += columns.filter((c) => c.headerName).map((c) => row[c.field] ?? '').join('\t') + '\n';
    });
    navigator.clipboard.writeText(tsv);
    triggerNotification?.('Report copied to clipboard!');
  };

  const handleExport = (type) => {
    if (type === 'Excel' && gridRef.current?.api) {
      gridRef.current.api.exportDataAsCsv({ fileName: `bills_report_export.csv` });
    } else if (type === 'PDF') {
      window.print();
    }
  };

  return (
    <div className="rounded-2xl shadow-lg">
    <div className="rounded-2xl overflow-hidden">
      <div className="relative flex flex-wrap items-center justify-between gap-4 px-6 py-6 bg-gradient-to-r from-[#fdfcfc] to-slate-50 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-800 rounded-t-2xl">
        <div className="flex items-center gap-3 flex-1 min-w-[260px]">
          {drillDownPath.length > 1 && (
            <button onClick={handleBack} className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer shadow-sm">
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-[#8c4242] dark:text-blue-400" strokeWidth={2.5} />
              <span className="text-[10.5px] font-black text-[#8c4242] dark:text-blue-400 uppercase tracking-widest">Bills/PreConstitutions Act Report</span>
            </div>
            <h3 className="m-0 text-xl font-bold text-[#4b2424] dark:text-blue-400 tracking-wide">
              {isAbstractLevel ? ABSTRACT_TITLE : currentView.title}
            </h3>
            {isAbstractLevel && (
              <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span>As on date: <strong className="text-[#4b2424] dark:text-blue-400">{new Date().toISOString().split('T')[0]}</strong></span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span>Report for the month — <strong className="text-[#4b2424] dark:text-blue-400">{new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong></span>
              </div>
            )}
          </div>
        </div>

        {isAbstractLevel && (
          <div className="flex items-center justify-between gap-2.5 flex-wrap">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="relative w-56">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" placeholder="Search wing, division..." value={quickFilter}
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
                  value={reportView} onChange={(e) => setReportView(e.target.value)}
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
              <button onClick={fetchReportData} className="flex items-center justify-center w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        )}
      </div>

      {isAbstractLevel ? (
        <>
          <div className="ag-theme-quartz bills-pro-grid" style={{ width: '100%' }}>
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
            .bills-pro-grid.ag-theme-quartz { --ag-font-family: 'Inter', system-ui, sans-serif; --ag-font-size: 13.5px; --ag-border-color: #B9BDC2; --ag-row-border-color: #D3D6D9; --ag-row-height: 52px; --ag-active-color: #4b2424; }
            .bills-pro-grid .ag-root-wrapper { border: none !important; border-radius: 0 !important; }
            .bills-pro-grid .ag-header { background: #4b2424ff !important; border-bottom: 2px solid !important; }
            .bills-pro-grid .ag-header-cell { color: #ffffff !important; font-weight: 600 !important; font-size: 11px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; border-right: 1px solid #4b2424ff !important; }
            .bills-pro-grid .ag-header-cell-label { justify-content: center !important; text-align: center !important; }
            .bills-pro-grid .ag-header-cell:hover { background: #6b3535ff !important; }
            .bills-pro-grid .ag-header-cell-label .ag-header-cell-text { color: #ffffff !important; }
            .bills-pro-grid .ag-row { border-bottom: 1px solid #D3D6D9 !important; }
            .bills-pro-grid .ag-row-even { background: #ffffff !important; }
            .bills-pro-grid .ag-row-odd { background: #f8faf6 !important; }
            .bills-pro-grid .ag-cell { display: flex; align-items: center; padding-left: 14px !important; padding-right: 14px !important; border-right: 1px solid #D3D6D9 !important; }
            .bills-pro-grid .ag-paging-panel { border-top: 1px solid #D3D6D9 !important; background: #f8faf6 !important; font-size: 12.5px !important; font-weight: 600 !important; color: #657386 !important; }
            .dark .bills-pro-grid.ag-theme-quartz { --ag-background-color: #090d16; --ag-foreground-color: #f1f5f9; --ag-border-color: #1e293b; }
            .dark .bills-pro-grid .ag-header { background: #0f172a !important; border-bottom: 2px solid #1e293b !important; }
            .dark .bills-pro-grid .ag-header-cell { color: #f1f5f9 !important; border-right: 1px solid #1e293b !important; }
            .dark .bills-pro-grid .ag-row-even { background: #090d16 !important; }
            .dark .bills-pro-grid .ag-row-odd { background: #0f172a !important; }
            .dark .bills-pro-grid .ag-cell { border-right: 1px solid #1e293b !important; color: #e2e8f0 !important; }
            .dark .bills-pro-grid .ag-paging-panel { border-top: 1px solid #1e293b !important; background: #0f172a !important; color: #94a3b8 !important; }
          `}} />
        </>
      ) : (
        <ReportTable
          rawData={aggregatedData}
          viewData={aggregatedData}
          columns={columns}
          loading={loading}
          title={currentView.title}
          showBackButton={true}
          onBack={handleBack}
        />
      )}
    </div>
    </div>
  );
}
