import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { 
  Building2, FileText, Download, Eye, Layers, 
  CheckCircle, Clock, AlertTriangle, RefreshCw, X, Search, 
  TrendingUp, Users, DollarSign 
} from 'lucide-react';
import Loader from '../../../components/Loader';
import { getCurrentUserId } from '../../../utils/authSession';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import MIVDetailModal from '../components/MIVDetailModal';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MIVOrgReport({ triggerNotification }) {
  const [loading, setLoading] = useState(true);
  const [summaryRows, setSummaryRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drilldown Modal
  const [drilldownModalOpen, setDrilldownModalOpen] = useState(false);
  const [drilldownTitle, setDrilldownTitle] = useState('');
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

  const fetchReportData = () => {
    setLoading(true);
    const userId = getCurrentUserId() || 1;

    axios.get(`${API}/mivabstract-report/${userId}`, { headers: authHeaders() })
      .then(res => {
        const { rows = [], count = [], initiative = [], totalCost = [] } = res.data || {};

        // Aggregate by Organisation
        const summaryMap = {};

        rows.forEach(item => {
          const orgId = item.organisation_id;
          const orgName = item.organisation_name || `Organisation ${orgId}`;
          
          if (!summaryMap[orgName]) {
            summaryMap[orgName] = {
              organisationId: orgId,
              organisationName: orgName,
              underImplementationOnTime: 0,
              underImplementationDelayed: 0,
              Completed: 0,
              YetToBeStarted: 0,
              Dropped: 0,
              currentUnderImplementationOnTime: 0,
              currentUnderImplementationDelayed: 0,
              currentCompleted: 0,
              currentYetToBeStarted: 0,
              currentDropped: 0,
              initiativesList: [],
            };
          }

          summaryMap[orgName].initiativesList.push(item);

          // Status As On 1st April 2023
          const statusOn = (item.status_on || '').trim();
          if (statusOn === 'Under Implementation - On Time') summaryMap[orgName].underImplementationOnTime += 1;
          else if (statusOn === 'Under Implementation - Delayed') summaryMap[orgName].underImplementationDelayed += 1;
          else if (statusOn === 'Completed') summaryMap[orgName].Completed += 1;
          else if (statusOn === 'Yet to be Started') summaryMap[orgName].YetToBeStarted += 1;
          else if (statusOn === 'Dropped') summaryMap[orgName].Dropped += 1;

          // Status Current
          const statusCurrent = (item.status_current || '').trim();
          if (statusCurrent === 'Under Implementation - On Time') summaryMap[orgName].currentUnderImplementationOnTime += 1;
          else if (statusCurrent === 'Under Implementation - Delayed') summaryMap[orgName].currentUnderImplementationDelayed += 1;
          else if (statusCurrent === 'Completed') summaryMap[orgName].currentCompleted += 1;
          else if (statusCurrent === 'Yet to be Started') summaryMap[orgName].currentYetToBeStarted += 1;
          else if (statusCurrent === 'Dropped') summaryMap[orgName].currentDropped += 1;
        });

        // Assemble consolidated rows
        const compiledRows = [];

        for (const [orgName, data] of Object.entries(summaryMap)) {
          const orgID = data.organisationId;

          // Meetings count
          const meetItem = count.find(c => String(c.organisation_id) === String(orgID));
          const meetCount = meetItem ? Number(meetItem.meeting_document_id || 0) : 0;

          // Initiatives count
          const initItem = initiative.find(i => String(i.organisation_id) === String(orgID));
          const totalIniCount = initItem ? Number(initItem.initiative_id || 0) : data.initiativesList.length;

          // Total cost
          const costItem = totalCost.find(c => String(c.organisation_id) === String(orgID));
          const totalInitiativeCost = costItem ? Number(costItem.total_cost || 0) : 0;

          const noOfInitiativeUI = data.underImplementationOnTime + data.underImplementationDelayed;
          const noOfInitiativeToBeCompleted = data.YetToBeStarted + data.underImplementationOnTime + data.underImplementationDelayed;

          compiledRows.push({
            organisationId: orgID,
            organisationName: orgName,
            meetCount,
            totalIniCount,
            totalInitiativeCost,
            noOfInitiativeUI,
            completedOn: data.Completed,
            noOfInitiativeToBeCompleted,
            currentUIOnTime: data.currentUnderImplementationOnTime,
            currentUIDelayed: data.currentUnderImplementationDelayed,
            currentCompleted: data.currentCompleted,
            currentYetToBeStarted: data.currentYetToBeStarted,
            currentDropped: data.currentDropped,
            initiativesList: data.initiativesList,
          });
        }

        setSummaryRows(compiledRows);
      })
      .catch(err => {
        console.error("Error loading MIV abstract report:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Compute grand totals
  const totals = useMemo(() => {
    return summaryRows.reduce((acc, row) => {
      acc.meetCount += row.meetCount || 0;
      acc.totalIniCount += row.totalIniCount || 0;
      acc.totalInitiativeCost += row.totalInitiativeCost || 0;
      acc.noOfInitiativeUI += row.noOfInitiativeUI || 0;
      acc.completedOn += row.completedOn || 0;
      acc.noOfInitiativeToBeCompleted += row.noOfInitiativeToBeCompleted || 0;
      acc.currentUIOnTime += row.currentUIOnTime || 0;
      acc.currentUIDelayed += row.currentUIDelayed || 0;
      acc.currentCompleted += row.currentCompleted || 0;
      acc.currentYetToBeStarted += row.currentYetToBeStarted || 0;
      acc.currentDropped += row.currentDropped || 0;
      return acc;
    }, {
      meetCount: 0,
      totalIniCount: 0,
      totalInitiativeCost: 0,
      noOfInitiativeUI: 0,
      completedOn: 0,
      noOfInitiativeToBeCompleted: 0,
      currentUIOnTime: 0,
      currentUIDelayed: 0,
      currentCompleted: 0,
      currentYetToBeStarted: 0,
      currentDropped: 0,
    });
  }, [summaryRows]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return summaryRows;
    const q = searchTerm.toLowerCase();
    return summaryRows.filter(r => r.organisationName.toLowerCase().includes(q));
  }, [summaryRows, searchTerm]);

  // Open drilldown for specific cell
  const handleCellDrilldown = (org, filterType, filterValue, titleSuffix) => {
    setDrilldownTitle(`${org.organisationName} - ${titleSuffix}`);
    setDrilldownLoading(true);
    setDrilldownModalOpen(true);

    axios.post(`${API}/mivdetailed-report/`, {
      organisationID: org.organisationId,
      statusOn: filterType === 'status_on' ? filterValue : null,
      statusCurrent: filterType === 'status_current' ? filterValue : null,
    }, { headers: authHeaders() })
      .then(res => {
        setDrilldownRows(res.data || []);
      })
      .catch(err => {
        console.error("Error fetching detailed report:", err);
        const filtered = (org.initiativesList || []).filter(item => {
          if (filterType === 'status_on') return (item.status_on || '').includes(filterValue);
          if (filterType === 'status_current') return (item.status_current || '').includes(filterValue);
          return true;
        });
        setDrilldownRows(filtered);
      })
      .finally(() => setDrilldownLoading(false));
  };

  const exportData = useMemo(() => {
    const headers = [
      "S.No",
      "Organisation Name",
      "Number of MVIC Meetings Conducted",
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

    const rows = filteredRows.map((r, i) => [
      i + 1,
      r.organisationName,
      r.meetCount,
      r.totalIniCount,
      r.totalInitiativeCost.toFixed(2),
      r.noOfInitiativeUI,
      r.completedOn,
      r.noOfInitiativeToBeCompleted,
      r.currentUIOnTime,
      r.currentUIDelayed,
      r.currentCompleted,
      r.currentYetToBeStarted,
      r.currentDropped
    ]);

    return { headers, rows };
  }, [filteredRows]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Top Stat KPI Cards matching YP/CA format */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 rounded-xl text-[#0f417a] dark:text-blue-400">
            <Layers className="h-6 w-6" />
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
          <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-xl text-teal-600 dark:text-teal-400">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Completed Initiatives</span>
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400 font-mono">{totals.currentCompleted.toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 rounded-xl text-purple-600 dark:text-purple-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">MVIC Meetings Held</span>
            <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">{totals.meetCount}</span>
          </div>
        </div>
      </div>

      {/* Main Report Card Container */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5 dark:bg-slate-950 dark:border-slate-800">
        
        {/* Header Title Section */}
        <div className="text-center space-y-1 border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <h2 className="text-base sm:text-lg font-black text-[#0f417a] dark:text-blue-400 uppercase font-display tracking-tight">
            Form No.: 1A - Organisation Wise (Abstract) - Status of Maritime India Vision 2030
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
                placeholder="Search organisation / wing..."
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
              Showing {filteredRows.length} of {summaryRows.length} Orgs
            </span>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-auto">
            <CopyButton
              data={exportData.rows}
              headers={exportData.headers}
              onSuccess={() => triggerNotification?.("Abstract Report copied to clipboard!")}
              color="#0f417a"
              className="!rounded-xl !py-2 !px-3.5 shadow-sm"
            />

            <ExportDropdown
              headers={exportData.headers}
              rows={exportData.rows}
              fileName={`Form_1A_Organisation_Report_${todayDateStr}`}
              title="Form No.: 1A - Organisation Wise (Abstract) - Status of Maritime India Vision 2030"
              triggerNotification={triggerNotification}
              color="#0f417a"
            />

            <button
              onClick={fetchReportData}
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
            
            {/* Table Header with rich brand header styling */}
            <thead className="bg-[#0f417a] text-white uppercase text-[11px] font-extrabold tracking-tight">
              
              {/* Row 1 */}
              <tr className="border-b border-blue-900/40 divide-x divide-blue-800/40">
                <th rowSpan={2} className="py-3 px-2 text-center" style={{ width: '4%' }}>S.No</th>
                <th rowSpan={2} className="py-3 px-3 text-left" style={{ width: '16%' }}>Organisation / Wing</th>
                <th rowSpan={2} className="py-3 px-2 text-center" style={{ width: '8%' }}>Number of MVIC Meetings Conducted</th>
                <th rowSpan={2} className="py-3 px-2 text-center" style={{ width: '7%' }}>Total Number of Initiatives</th>
                <th rowSpan={2} className="py-3 px-2 text-center" style={{ width: '8%' }}>Total Cost of Initiatives (in Cr.)</th>
                <th colSpan={2} className="py-2.5 px-3 text-center bg-[#0c3666]">Status as on 1st April 2023</th>
                <th colSpan={6} className="py-2.5 px-3 text-center bg-[#092b52]">Status as on {todayDateStr}</th>
              </tr>

              {/* Row 2 */}
              <tr className="border-b border-blue-900/40 divide-x divide-blue-800/40 text-[10px] font-bold">
                {/* 1st April 2023 */}
                <th className="py-2 px-2 bg-[#0c3666]/90" style={{ width: '7%' }}>Number of Initiatives Under Implementation</th>
                <th className="py-2 px-2 bg-[#0c3666]/90" style={{ width: '7%' }}>Number of Initiatives Completed</th>

                {/* Current */}
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '8%' }}>No. of Initiative To Be Completed</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '8%' }}>Current Under Implementation (On Time)</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '8%' }}>Current Under Implementation (Delayed)</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '7%' }}>Number of Initiatives Completed</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '7%' }}>Number of Initiatives Yet to be Started</th>
                <th className="py-2 px-2 bg-[#092b52]/90" style={{ width: '7%' }}>Number of Initiatives Dropped</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center">
                    <Loader message="Compiling Form 1A Abstract Matrix..." fullPage={false} />
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-10 text-center text-slate-400">
                    No matching organisation records found.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, idx) => (
                  <tr 
                    key={idx} 
                    className={`${idx % 2 === 0 ? 'bg-white dark:bg-slate-950' : 'bg-slate-50/70 dark:bg-slate-900/40'} hover:bg-blue-50/70 dark:hover:bg-blue-950/40 divide-x divide-slate-100 dark:divide-slate-800 transition-colors`}
                  >
                    <td className="py-2.5 px-2 text-center font-bold text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3 text-left font-bold text-slate-800 dark:text-slate-200 text-xs">
                      {row.organisationName}
                    </td>
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-700 dark:text-slate-300 font-mono">
                      {row.meetCount || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-900 dark:text-white font-mono">
                      {row.totalIniCount || '-'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {row.totalInitiativeCost ? `₹ ${Number(row.totalInitiativeCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                    </td>

                    {/* 1st April 2023 - UI */}
                    <td className="py-2.5 px-2 text-center">
                      {row.noOfInitiativeUI > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_on', 'Under Implementation', 'Under Implementation (As on 1 Apr 2023)')}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.noOfInitiativeUI}
                        </button>
                      ) : '-'}
                    </td>

                    {/* 1st April 2023 - Completed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.completedOn > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_on', 'Completed', 'Completed (As on 1 Apr 2023)')}
                          className="font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.completedOn}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - To Be Completed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.noOfInitiativeToBeCompleted > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_on', '', 'To Be Completed Initiatives')}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.noOfInitiativeToBeCompleted}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - UI On Time */}
                    <td className="py-2.5 px-2 text-center">
                      {row.currentUIOnTime > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_current', 'Under Implementation - On Time', 'Current Under Implementation (On Time)')}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.currentUIOnTime}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - UI Delayed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.currentUIDelayed > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_current', 'Under Implementation - Delayed', 'Current Under Implementation (Delayed)')}
                          className="font-bold text-amber-600 hover:text-amber-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.currentUIDelayed}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - Completed */}
                    <td className="py-2.5 px-2 text-center">
                      {row.currentCompleted > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_current', 'Completed', 'Current Completed Initiatives')}
                          className="font-bold text-emerald-600 hover:text-emerald-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.currentCompleted}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - Yet to be Started */}
                    <td className="py-2.5 px-2 text-center">
                      {row.currentYetToBeStarted > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_current', 'Yet to be Started', 'Current Yet to be Started')}
                          className="font-bold text-purple-600 hover:text-purple-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.currentYetToBeStarted}
                        </button>
                      ) : '-'}
                    </td>

                    {/* Current - Dropped */}
                    <td className="py-2.5 px-2 text-center">
                      {row.currentDropped > 0 ? (
                        <button
                          onClick={() => handleCellDrilldown(row, 'status_current', 'Dropped', 'Current Dropped Initiatives')}
                          className="font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer font-mono"
                        >
                          {row.currentDropped}
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
                  <td className="py-3 px-2 text-center">{totals.meetCount}</td>
                  <td className="py-3 px-2 text-center">{totals.totalIniCount}</td>
                  <td className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400">
                    ₹ {Number(totals.totalInitiativeCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-2 text-center">{totals.noOfInitiativeUI}</td>
                  <td className="py-3 px-2 text-center">{totals.completedOn}</td>
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

      {/* Drilldown Modal */}
      {drilldownModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full max-h-[85vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-scale-up overflow-hidden">
            
            <div className="px-6 py-4 bg-gradient-to-r from-[#0f417a] to-[#1e5fa0] text-white flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2.5">
                <Building2 className="h-5 w-5" />
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {drilldownTitle}
                  </h3>
                  <span className="text-[10px] text-blue-200 font-medium">
                    {drilldownRows.length} initiative(s) matching criteria
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDrilldownModalOpen(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {drilldownLoading ? (
                <div className="py-12">
                  <Loader message="Loading drilldown rows..." fullPage={false} />
                </div>
              ) : drilldownRows.length === 0 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-medium">
                  No matching initiatives found.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Initiative ID</th>
                        <th className="py-2.5 px-3">Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Cost (₹ Cr)</th>
                        <th className="py-2.5 px-3">Status As On 1 Apr 2023</th>
                        <th className="py-2.5 px-3">Current Status</th>
                        <th className="py-2.5 px-3 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {drilldownRows.map((init, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-[#0f417a] dark:text-blue-400 font-mono">
                            {init.initiative_id || init.initiativeID || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-medium max-w-[220px] truncate" title={init.initiative_name}>
                            {init.initiative_name || '-'}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-[11px]">
                            {init.category || '-'}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                            ₹ {Number(init.total_cost || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                              {init.status_on || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800">
                              {init.status_current || '-'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => setSelectedInitiative(init)}
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
                onClick={() => setDrilldownModalOpen(false)}
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
