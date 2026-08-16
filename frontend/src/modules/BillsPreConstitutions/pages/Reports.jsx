import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { fetchBillWingWiseReport, fetchBillDivisionWiseReport, fetchBillWingWiseDetail, fetchBillDivisionWiseDetail } from '../api';
import ReportTable from '../../../components/ReportTable';

const COLUMN_STAGE_MAP = {
  "Draft Bill Prepared": 1,
  "DCN And Draft Bill Approved by Minister": 2,
  "Circulated for IMC": 3,
  "IMC comments received": 4,
  "DCN & Draft Bill prepared": 5,
  "DCN & draft bill Approved by Minister": 6,
  "Submitted for Legal Vetting": 7,
  "Legal Vetting to be Completed": 8,
  "Final DCN & draft bill Approved by Minister": 9,
  "Advance Copy to be Sent to PMO & Cab Sectt": 10,
  "Approved By Cabinet": 11,
  "Bill introduced in parliament": 12,
  "Bill Passed": 13,
  "Bill Notified": 14,
  "Completed": 15
};

const ABSTRACT_TITLE = 'Report No. 1.1 - Abstract ( Wing & Division Wise ) - Bills/Pre-Constitutions Act';

export default function Reports({ triggerNotification, wings = [] }) {
  const [drillDownPath, setDrillDownPath] = useState([{ type: 'combined' }]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [wingFilter, setWingFilter] = useState('All');
  const [divisionFilter, setDivisionFilter] = useState('All');

  const currentView = drillDownPath[drillDownPath.length - 1];
  const isAbstractLevel = currentView.type === 'combined';

  const sortedWings = useMemo(
    () => [...wings].sort((a, b) => a.wing_name.localeCompare(b.wing_name)),
    [wings]
  );

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const handleWingChange = (val) => {
    setWingFilter(val);
    setDivisionFilter('All');
  };

  // Stage-count column renderer shared by both the combined abstract table
  // and the (legacy) single-wing division-summary table.
  const buildStageCellRenderer = (stageId, getDivisionId) => (p) => {
    const val = p.value;
    if (val > 0 && p.data && p.data.Division !== 'Total') {
      return (
        <button
          onClick={() => {
            const divisionId = getDivisionId(p.data);
            const divisionName = p.data.Division;
            setDrillDownPath(prev => [
              ...prev,
              { type: 'detail-division', divisionId, stageId, title: `Bills - Division: ${divisionName} | Stage: ${p.colDef.field}` }
            ]);
          }}
          style={{ background: 'none', border: 'none', color: '#0f417a', fontWeight: 800, textDecoration: 'underline', cursor: 'pointer', fontSize: '11px' }}
        >
          {val}
        </button>
      );
    }
    return val > 0 ? val : <span style={{ color: '#94a3b8', fontWeight: 650 }}>—</span>;
  };

  const fetchCombinedAbstract = useCallback(async () => {
    // No single backend endpoint returns Wing+Division together, so fetch
    // each wing's division breakdown in parallel and merge client-side.
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

    const mappedCols = [
      { field: 'Wing', headerName: 'Wing', pinned: 'left', cellClass: 'text-left font-bold border-r border-slate-150' },
      ...referenceCols
        .filter((col) => col.field !== 'division_id' && col.field !== 'Division')
        .filter((col) => col.field !== 'S No'),
    ];
    const divisionCol = referenceCols.find((col) => col.field === 'Division');
    if (divisionCol) {
      mappedCols.splice(1, 0, { ...divisionCol, pinned: 'left', cellClass: 'text-left font-bold border-r border-slate-150' });
    }

    const finalCols = mappedCols.map((col) => {
      const stageId = COLUMN_STAGE_MAP[col.field];
      if (stageId) {
        return { ...col, cellRenderer: buildStageCellRenderer(stageId, (row) => row.division_id) };
      }
      return col;
    });

    setColumnDefs(finalCols);
    setData(mergedRows.map((r, idx) => ({ ...r, 'S No': idx + 1 })));
  }, [wings]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'combined') {
        await fetchCombinedAbstract();
      } else if (currentView.type === 'detail-wing') {
        const response = await fetchBillWingWiseDetail(currentView.wingId, currentView.stageId);
        setColumnDefs(response.data?.columnDefs || []);
        setData((response.data?.rowData || []).map((r, idx) => ({ ...r, 'S No': idx + 1 })));
      } else if (currentView.type === 'detail-division') {
        const response = await fetchBillDivisionWiseDetail(currentView.divisionId, currentView.stageId);
        setColumnDefs(response.data?.columnDefs || []);
        setData((response.data?.rowData || []).map((r, idx) => ({ ...r, 'S No': idx + 1 })));
      }
    } catch (err) {
      console.error("Error loading Bills reports:", err);
      setData([]);
      setColumnDefs([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, fetchCombinedAbstract]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const availableDivisions = useMemo(() => {
    if (!isAbstractLevel) return [];
    const pool = wingFilter === 'All' ? data : data.filter((r) => r.Wing === wingFilter);
    return [...new Set(pool.map((r) => r.Division).filter(Boolean))].sort();
  }, [data, wingFilter, isAbstractLevel]);

  const filteredData = useMemo(() => {
    if (!isAbstractLevel) return data;
    let rows = data;
    if (wingFilter !== 'All') rows = rows.filter((r) => r.Wing === wingFilter);
    if (divisionFilter !== 'All') rows = rows.filter((r) => r.Division === divisionFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter((r) => (r.Wing || '').toLowerCase().includes(q) || (r.Division || '').toLowerCase().includes(q));
    }
    return rows;
  }, [data, wingFilter, divisionFilter, searchQuery, isAbstractLevel]);

  return (
    <div className="space-y-6">
      {isAbstractLevel && (
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
              value={wingFilter}
              onChange={(e) => handleWingChange(e.target.value)}
              className="appearance-none text-xs pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0f417a] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="All">WING VIEW: All Wings (Abstract View)</option>
              {sortedWings.map((w) => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              className="appearance-none text-xs pl-3 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0f417a] font-bold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              <option value="All">DIVISION VIEW: All Divisions</option>
              {availableDivisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      )}

      <ReportTable
        rawData={filteredData}
        viewData={filteredData}
        columns={columnDefs}
        loading={loading}
        title={isAbstractLevel ? ABSTRACT_TITLE : currentView.title}
        showBackButton={drillDownPath.length > 1}
        onBack={handleBack}
      />
    </div>
  );
}
