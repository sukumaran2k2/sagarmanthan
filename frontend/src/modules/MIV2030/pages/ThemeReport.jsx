import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderTree, FileText, Download, Eye, Layers, 
  CheckCircle, Clock, AlertTriangle, RefreshCw, X, Search, 
  TrendingUp, DollarSign, Target 
} from 'lucide-react';
import Loader from '../../../components/Loader';
import { getCurrentUserId } from '../../../utils/authSession';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import MIVDetailModal from '../components/MIVDetailModal';
import { fetchThemeWiseMIVAbstractReport, fetchThemeWiseMIVDetailedReport } from '../api';

export default function MIVThemeReport({ triggerNotification }) {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedThemeDrilldown, setSelectedThemeDrilldown] = useState(null);
  const [drilldownRows, setDrilldownRows] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [selectedInitiative, setSelectedInitiative] = useState(null);

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  }, []);

  const currentMonthYearStr = useMemo(() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const fetchThemeData = () => {
    setLoading(true);
    const userId = getCurrentUserId() || 1;

    fetchThemeWiseMIVAbstractReport(userId)
      .then(res => {
        const rows = Array.isArray(res.data) ? res.data : (res.data?.rowData || []);
        setReportData(rows);
      })
      .catch(err => {
        console.error("Error fetching MIV Theme Wise Report:", err);
        setReportData([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchThemeData();
  }, []);

  const handleOpenThemeDrilldown = (theme, statusCurrentFilter = null) => {
    const themeId = theme.InitiativeId;
    setSelectedThemeDrilldown(theme);
    setDrilldownLoading(true);

    fetchThemeWiseMIVDetailedReport({
      themeNumber: themeId,
      statusOn: null,
      statusCurrent: statusCurrentFilter,
      category: null,
    })
      .then(res => {
        setDrilldownRows(res.data || []);
      })
      .catch(err => {
        console.error("Error fetching detailed theme report:", err);
        setDrilldownRows([]);
      })
      .finally(() => setDrilldownLoading(false));
  };

  // Grand totals
  const totals = useMemo(() => {
    return reportData.reduce((acc, row) => {
      acc.totalIniCount += Number(row.TotalIniCount || 0);
      acc.totalInitiativeCost += Number(row.TotalInitiativeCost || 0);
      acc.noOfInitiativeUI += Number(row.NoOfInitiativeUI || 0);
      acc.completed += Number(row.Completed || 0);
      acc.noOfInitiativeToBeCompleted += Number(row.NoOfInitiativeToBeCompleted || 0);
      acc.currentUIOnTime += Number(row.CurrentUnderImplementationOnTime || 0);
      acc.currentUIDelayed += Number(row.CurrentUnderImplementationDelayed || 0);
      acc.currentCompleted += Number(row.CurrentCompleted || 0);
      acc.currentYetToBeStarted += Number(row.CurrentYetToBeStarted || 0);
      acc.currentDropped += Number(row.CurrentDropped || 0);
      return acc;
    }, {
      totalIniCount: 0,
      totalInitiativeCost: 0,
      noOfInitiativeUI: 0,
      completed: 0,
      noOfInitiativeToBeCompleted: 0,
      currentUIOnTime: 0,
      currentUIDelayed: 0,
      currentCompleted: 0,
      currentYetToBeStarted: 0,
      currentDropped: 0,
    });
  }, [reportData]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return reportData;
    const q = searchTerm.toLowerCase();
    return reportData.filter(r => 
      (r.InitiativeName || '').toLowerCase().includes(q) ||
      String(r.InitiativeId || '').toLowerCase().includes(q) ||
      (r.TotalInitiativeCategory || '').toLowerCase().includes(q)
    );
  }, [reportData, searchTerm]);

  const exportData = useMemo(() => {
    const headers = [
      "Theme ID",
      "Theme Name",
      "Categories",
      "Total Number of Initiatives",
      "Total Cost of Initiatives (In Cr.)",
      "Status 1 Apr 2023 - Under Implementation",
      "Status 1 Apr 2023 - Completed",
      "Status Current - To Be Completed",
      "Status Current - Under Implementation On Time",
      "Status Current - Under Implementation Delayed",
      "Status Current - Completed",
      "Status Current - Yet to be Started",
      "Status Current - Dropped"
    ];

    const rows = filteredRows.map((r) => [
      `Theme ${r.InitiativeId}`,
      r.InitiativeName || '',
      r.TotalInitiativeCategory || '',
      r.TotalIniCount || 0,
      Number(r.TotalInitiativeCost || 0).toFixed(2),
      r.NoOfInitiativeUI || 0,
      r.Completed || 0,
      r.NoOfInitiativeToBeCompleted || 0,
      r.CurrentUnderImplementationOnTime || 0,
      r.CurrentUnderImplementationDelayed || 0,
      r.CurrentCompleted || 0,
      r.CurrentYetToBeStarted || 0,
      r.CurrentDropped || 0
    ]);

    return { headers, rows };
  }, [filteredRows]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-[#0f417a] dark:text-blue-400">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Themes Tracked</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{reportData.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Initiatives</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">{totals.totalIniCount.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-600 dark:text-emerald-400">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Total Outlay Cost</span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              ₹ {Math.round(totals.totalInitiativeCost).toLocaleString()} Cr
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-600 dark:text-purple-400">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Completed Rate</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
              {totals.totalIniCount > 0 ? ((totals.currentCompleted / totals.totalIniCount) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Report Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Header Title Section */}
        <div className="text-center space-y-1 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <h2 className="text-base sm:text-lg font-black text-[#0f417a] dark:text-blue-400 uppercase font-display tracking-tight">
            Form No.: 2A - Theme Wise (Abstract) - Status of Maritime India Vision 2030
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <span>As On date: <strong className="text-slate-900 dark:text-white font-mono">{todayDateStr}</strong></span>
            <span>•</span>
            <span>Report for the Month: <strong className="text-slate-900 dark:text-white">{currentMonthYearStr}</strong></span>
          </div>
        </div>

        {/* Toolbar Row matching YP/CA */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative min-w-[260px] w-full sm:w-auto">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search theme name, ID or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0f417a]/30 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap hidden sm:inline-block font-mono">
              Showing {filteredRows.length} of {reportData.length} Themes
            </span>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <CopyButton
              data={exportData.rows}
              headers={exportData.headers}
              onSuccess={() => triggerNotification?.("Theme Report copied to clipboard!")}
              color="#0f417a"
              className="!rounded-xl !py-2 !px-3.5 shadow-sm"
            />

            <ExportDropdown
              headers={exportData.headers}
              rows={exportData.rows}
              fileName={`Form_2A_Theme_Report_${todayDateStr}`}
              title="Form No.: 2A - Theme Wise (Abstract) - Status of Maritime India Vision 2030"
              triggerNotification={triggerNotification}
              color="#0f417a"
            />

            <button
              onClick={fetchThemeData}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Multi-Tier Grouped Table with Dual Tone and YP/CA Header */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-inner">
          <table className="w-full text-center text-xs border-collapse select-text">
            
            <thead className="bg-[#0f417a] text-white uppercase text-[11px] font-extrabold tracking-tight">
              {/* Row 1 */}
              <tr className="border-b border-blue-900/40 divide-x divide-blue-800/40">
                <th rowSpan={2} className="py-3 px-2 text-center" style={{ width: '5%' }}>Theme ID</th>
                <th rowSpan={2} className="py-3 px-3 text-left" style={{ width: '18%' }}>Theme Name</th>
                <th rowSpan={2} className="py-3 px-2 text-center" style={{ width: '8%' }}>Total Initiatives</th>
                <th rowSpan={2} className="py-3 px-2 text-center" style={{ width: '8%' }}>Total Cost (in Cr.)</th>
                <th colSpan={2} className="py-2.5 px-3 text-center bg-[#0c3666]">Status as on 1st April 2023</th>
                <th colSpan={6} className="py-2.5 px-3 text-center bg-[#092b52]">Status as on {todayDateStr}</th>
              </tr>

              {/* Row 2 */}
              <tr className="border-b border-blue-900/40 divide-x divide-blue-800/40 text-[10px] font-bold">
                <th className="py-2 px-2 bg-[#0c3666]/90" style={{ width: '7%' }}>Number of Initiatives Under Implementation</th>
                <th className="py-2 px-2 bg-[#0c3666]/90" style={{ width: '7%' }}>Number of Initiatives Completed</th>

                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '8%' }}>No. of Initiative To Be Completed</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '8%' }}>Current Under Implementation (On Time)</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '8%' }}>Current Under Implementation (Delayed)</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '7%' }}>Number of Initiatives Completed</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '7%' }}>Number of Initiatives Yet to be Started</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '7%' }}>Number of Initiatives Dropped</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <Loader message="Compiling Form 2A Theme Matrix..." fullPage={false} />
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
                    No matching themes found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/70 dark:bg-slate-900/40'} hover:bg-blue-50/70 dark:hover:bg-blue-950/40 divide-x divide-slate-100 dark:divide-slate-800 transition-colors`}
                  >
                    <td className="py-2.5 px-2 text-center font-bold text-[#0f417a] dark:text-blue-400 font-mono">
                      Theme {row.InitiativeId}
                    </td>
                    <td className="py-2.5 px-3 text-left font-semibold text-slate-800 dark:text-slate-200" title={row.InitiativeName}>
                      {row.InitiativeName}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900 dark:text-white font-mono">
                      {row.TotalIniCount || 0}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {row.TotalInitiativeCost ? `₹ ${Number(row.TotalInitiativeCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>

                    {/* 1st April 2023 - UI */}
                    <td className="py-2.5 px-2 text-center">
                      {row.NoOfInitiativeUI > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, null)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.NoOfInitiativeUI}
                        </button>
                      ) : '-'}
                    </td>

                    {/* 1st April 2023 - Completed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.Completed > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, 'Completed')}
                          className="font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.Completed}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - To Be Completed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.NoOfInitiativeToBeCompleted > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, null)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.NoOfInitiativeToBeCompleted}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - UI On Time */}
                    <td className="py-2.5 px-2 text-center">
                      {row.CurrentUnderImplementationOnTime > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, 'Under Implementation - On Time')}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.CurrentUnderImplementationOnTime}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - UI Delayed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.CurrentUnderImplementationDelayed > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, 'Under Implementation - Delayed')}
                          className="font-bold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.CurrentUnderImplementationDelayed}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - Completed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.CurrentCompleted > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, 'Completed')}
                          className="font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.CurrentCompleted}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - Yet to be Started */}
                    <td className="py-2.5 px-2 text-center">
                      {row.CurrentYetToBeStarted > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, 'Yet to be Started')}
                          className="font-bold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.CurrentYetToBeStarted}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - Dropped */}
                    <td className="py-2.5 px-2 text-center">
                      {row.CurrentDropped > 0 ? (
                        <button
                          onClick={() => handleOpenThemeDrilldown(row, 'Dropped')}
                          className="font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.CurrentDropped}
                        </button>
                      ) : '-'}
                    </td>

                  </tr>
                ))
              )}
            </tbody>

            {/* Total Row */}
            {!loading && filteredRows.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700 font-black text-slate-900 dark:text-white divide-x divide-slate-200 dark:divide-slate-700 font-mono">
                <tr>
                  <td colSpan={2} className="py-3 px-3 text-center uppercase tracking-wider text-xs font-sans">
                    Total
                  </td>
                  <td className="py-3 px-2 text-center">{totals.totalIniCount}</td>
                  <td className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400">
                    ₹ {Number(totals.totalInitiativeCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-center">{totals.noOfInitiativeUI}</td>
                  <td className="py-3 px-2 text-center">{totals.completed}</td>
                  <td className="py-3 px-2 text-center">{totals.noOfInitiativeToBeCompleted}</td>
                  <td className="py-3 px-2 text-center">{totals.currentUIOnTime}</td>
                  <td className="py-3 px-2 text-center">{totals.currentUIDelayed}</td>
                  <td className="py-3 px-2 text-center">{totals.currentCompleted}</td>
                  <td className="py-3 px-2 text-center">{totals.currentYetToBeStarted}</td>
                  <td className="py-3 px-2 text-center">{totals.currentDropped}</td>
                </tr>
              </tfoot>
            )}

          </table>
        </div>

      </div>

      {/* Detailed Theme Drilldown Modal */}
      {selectedThemeDrilldown && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[85vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-scale-up overflow-hidden">
            
            <div className="px-6 py-4 bg-gradient-to-r from-[#0f417a] to-[#1e5fa0] text-white flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2.5">
                <FolderTree className="h-5 w-5" />
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    Theme {selectedThemeDrilldown.InitiativeId}: {selectedThemeDrilldown.InitiativeName}
                  </h3>
                  <span className="text-[10px] text-blue-200 font-medium">
                    {drilldownRows.length} detailed initiative(s)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedThemeDrilldown(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {drilldownLoading ? (
                <div className="py-12">
                  <Loader message="Loading theme initiatives..." fullPage={false} />
                </div>
              ) : drilldownRows.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">
                  No matching initiatives found under this theme.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Initiative ID</th>
                        <th className="py-2.5 px-3">Organisation</th>
                        <th className="py-2.5 px-3">Initiative Name</th>
                        <th className="py-2.5 px-3">Cost (₹ Cr)</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {drilldownRows.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#0f417a] dark:text-blue-400 font-mono">
                            {item.initiative_id || item.InitiativeID || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                            {item.organisation_name || item.organisation || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-medium max-w-[220px] truncate" title={item.initiative_name}>
                            {item.initiative_name || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹ {Number(item.total_cost || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                              {item.status_current || item.status_on || 'Active'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedInitiative(item)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedThemeDrilldown(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer shadow-sm"
              >
                Close Drilldown
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Item Full Detail Modal */}
      {selectedInitiative && (
        <MIVDetailModal
          initiative={selectedInitiative}
          onClose={() => setSelectedInitiative(null)}
        />
      )}

    </div>
  );
}
