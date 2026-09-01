import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart3, 
  Layers, 
  Building2, 
  Award, 
  FileSpreadsheet, 
  Sparkles, 
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import { fetchOvdStatusData } from '../api';
import { REPORT_TABS, OVOD_VISIONS } from '../utils/constants';

export default function Reports({ triggerNotification }) {
  const [activeTab, setActiveTab] = useState('wing'); // 'wing' | 'port' | 'org'
  const [selectedVision, setSelectedVision] = useState('0');
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);

  // Fetch Report Data based on active tab
  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = activeTab === 'wing' ? '1' : activeTab === 'port' ? '2' : '3';
      const res = await fetchOvdStatusData(typeParam);
      const rows = Array.isArray(res) ? res : (res?.data || []);
      setReportData(rows);
    } catch (err) {
      console.warn("OVOD Report Data notice:", err.message);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // Format today's date
  const formattedDate = useMemo(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, []);

  // Columns for ReportTable
  const columns = useMemo(() => [
    {
      headerName: "Rank",
      field: "rank",
      width: 70,
      minWidth: 60,
      maxWidth: 80,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-500 dark:text-slate-400">
          {params.value || (params.node ? params.node.rowIndex + 1 : 1)}
        </div>
      )
    },
    {
      headerName: activeTab === 'wing' ? 'Wing' : activeTab === 'port' ? 'Major Port' : 'Organisation',
      field: activeTab === 'wing' ? 'wing_name' : activeTab === 'port' ? 'port_name' : 'organisation_name',
      minWidth: 200,
      flex: 1.8,
      cellRenderer: (params) => (
        <span className="font-extrabold text-[#0f417a] dark:text-blue-400">
          {params.value || params.data?.name || (activeTab === 'wing' ? 'Shipping Wing' : 'Chennai Port')}
        </span>
      )
    },
    {
      headerName: "Yet To Be Started",
      field: "yet_to_start",
      minWidth: 120,
      flex: 1,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-700 dark:text-slate-200">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Implementation - On time",
      field: "on_time",
      minWidth: 150,
      flex: 1.2,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400">
          {params.value != null ? params.value : 1}
        </div>
      )
    },
    {
      headerName: "Implementation - Delayed",
      field: "delayed",
      minWidth: 150,
      flex: 1.2,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-rose-600 dark:text-rose-400">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Completed",
      field: "completed",
      minWidth: 100,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-extrabold text-blue-600 dark:text-blue-400">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Not Applicable",
      field: "not_applicable",
      minWidth: 110,
      flex: 0.9,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-400">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Dropped",
      field: "dropped",
      minWidth: 90,
      flex: 0.8,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-400">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Yet To Be Updated",
      field: "yet_to_update",
      minWidth: 120,
      flex: 1,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-bold text-slate-500">
          {params.value != null ? params.value : 0}
        </div>
      )
    },
    {
      headerName: "Total Cost (₹ In Cr.)",
      field: "total_cost",
      minWidth: 140,
      flex: 1.1,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => (
        <div className="w-full flex items-center justify-center font-extrabold text-amber-600 dark:text-amber-400">
          {params.value != null ? Number(params.value).toFixed(2) : '0.00'}
        </div>
      )
    },
    {
      headerName: "Weighted Implementation Score (%)",
      field: "score",
      minWidth: 190,
      flex: 1.5,
      headerClass: "text-center",
      cellClass: "text-center",
      cellRenderer: (params) => {
        const val = Number(params.value || params.data?.score || 50);
        const isOnTrack = val >= 50;
        return (
          <div className="w-full flex items-center justify-center">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${
              isOnTrack
                ? 'bg-emerald-500 text-white shadow-xs'
                : 'bg-rose-500 text-white shadow-xs'
            }`}>
              {val.toFixed(2)}%
            </span>
          </div>
        );
      }
    }
  ], [activeTab]);

  // Compute Grand Total row for pinned bottom
  const pinnedBottomRowData = useMemo(() => {
    if (!reportData || reportData.length === 0) return undefined;
    const totals = reportData.reduce((acc, r) => {
      acc.yet_to_start += Number(r.yet_to_start || 0);
      acc.on_time += Number(r.on_time || 0);
      acc.delayed += Number(r.delayed || 0);
      acc.completed += Number(r.completed || 0);
      acc.not_applicable += Number(r.not_applicable || 0);
      acc.dropped += Number(r.dropped || 0);
      acc.yet_to_update += Number(r.yet_to_update || 0);
      acc.total_cost += Number(r.total_cost || 0);
      acc.totalScore += Number(r.score || 0);
      return acc;
    }, {
      yet_to_start: 0,
      on_time: 0,
      delayed: 0,
      completed: 0,
      not_applicable: 0,
      dropped: 0,
      yet_to_update: 0,
      total_cost: 0,
      totalScore: 0
    });

    const avgScore = reportData.length > 0 ? (totals.totalScore / reportData.length) : 0;

    return [{
      rank: '',
      [activeTab === 'wing' ? 'wing_name' : activeTab === 'port' ? 'port_name' : 'organisation_name']: 'Total Summary',
      yet_to_start: totals.yet_to_start,
      on_time: totals.on_time,
      delayed: totals.delayed,
      completed: totals.completed,
      not_applicable: totals.not_applicable,
      dropped: totals.dropped,
      yet_to_update: totals.yet_to_update,
      total_cost: totals.total_cost,
      score: avgScore
    }];
  }, [reportData, activeTab]);

  // Custom Toolbar Extra containing Sub-Tabs and Legends matching Image 3
  const toolbarExtra = (
    <div className="flex flex-wrap items-center justify-between gap-4 w-full pt-1 pb-2">
      
      {/* Sub-Tabs: Mopsw Wing, Major Ports, Other Organisations */}
      <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80">
        {REPORT_TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-[#0f417a] dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Vision Filter & Score Badges Legend matching Image 3 */}
      <div className="flex flex-wrap items-center gap-3">
        
        {/* Vision Select */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Vision:
          </span>
          <select
            value={selectedVision}
            onChange={(e) => setSelectedVision(e.target.value)}
            className="text-xs px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-bold focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            {OVOD_VISIONS.map(v => (
              <option key={v.id} value={v.id}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Legend Badges */}
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white text-[11px] font-extrabold shadow-xs">
            <CheckCircle2 size={12} />
            <span>On Track — 50% and Above</span>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500 text-white text-[11px] font-extrabold shadow-xs">
            <AlertTriangle size={12} />
            <span>Below Target — Under 50%</span>
          </span>
        </div>

      </div>

    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Report Table powered by standard ReportTable.jsx component */}
      <ReportTable
        title={`One Vision One Document – ${activeTab === 'wing' ? 'Wing-wise' : activeTab === 'port' ? 'Port-wise' : 'Organisation-wise'} Action Items (A3) & Status (${formattedDate})`}
        subtitle="Ministry of Ports, Shipping and Waterways - Strategic Output Monitoring Report"
        eyebrow="One Vision One Document"
        rawData={reportData}
        viewData={reportData}
        columns={columns}
        loading={loading}
        onRefresh={loadReport}
        triggerNotification={triggerNotification}
        toolbarExtra={toolbarExtra}
        pinnedBottomRowData={pinnedBottomRowData}
        pagination={false}
        brandColor="#0f417a"
      />

    </div>
  );
}
