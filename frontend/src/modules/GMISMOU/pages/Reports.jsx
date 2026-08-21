import React, { useState, useEffect, useMemo } from 'react';
import { 
  FilePieChart, Building2, Download, Printer, 
  Search, Filter, Sparkles, RefreshCw, BarChart3 
} from 'lucide-react';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { fetchGmisMouPaginated, fetchOrganisations } from '../api';

const EVENT_TABS = [
  'All Summits',
  'GMIS 2025',
  'IMW 2025',
  'GMIS 2023',
  'GMIS 2021'
];

export default function GMISReports({ triggerNotification }) {
  const [selectedEvent, setSelectedEvent] = useState('All Summits');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadReportData = async () => {
    setLoading(true);
    try {
      const res = await fetchGmisMouPaginated({
        page: 1,
        pageSize: 1000,
        eventName: selectedEvent === 'All Summits' ? '' : selectedEvent,
      });

      const items = res.data?.data || [];
      const orgMap = {};

      items.forEach(item => {
        const orgId = item.organisation_id || 0;
        const orgName = item.organisation_name || `Organisation ${orgId}`;
        const amt = parseFloat(item.amount) || 0;
        const status = (item.present_status || '').toLowerCase();

        if (!orgMap[orgId]) {
          orgMap[orgId] = {
            orgId,
            orgName,
            totalCount: 0,
            totalAmount: 0,
            uiCount: 0,
            completedCount: 0,
            yetToStartCount: 0,
            droppedCount: 0,
          };
        }

        orgMap[orgId].totalCount += 1;
        orgMap[orgId].totalAmount += amt;

        if (status.includes('completed')) {
          orgMap[orgId].completedCount += 1;
        } else if (status.includes('under') || status.includes('implementation')) {
          orgMap[orgId].uiCount += 1;
        } else if (status.includes('dropped')) {
          orgMap[orgId].droppedCount += 1;
        } else {
          orgMap[orgId].yetToStartCount += 1;
        }
      });

      const aggregatedList = Object.values(orgMap).sort((a, b) => b.totalAmount - a.totalAmount);
      setReportData(aggregatedList);
    } catch (err) {
      console.error('Failed to load GMIS report data:', err);
      if (triggerNotification) triggerNotification('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [selectedEvent]);

  const filteredData = useMemo(() => {
    if (!searchTerm) return reportData;
    const q = searchTerm.toLowerCase();
    return reportData.filter(r => r.orgName.toLowerCase().includes(q));
  }, [reportData, searchTerm]);

  // Overall totals
  const totalStats = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => ({
        count: acc.count + r.totalCount,
        amount: acc.amount + r.totalAmount,
        ui: acc.ui + r.uiCount,
        completed: acc.completed + r.completedCount,
        yetToStart: acc.yetToStart + r.yetToStartCount,
        dropped: acc.dropped + r.droppedCount,
      }),
      { count: 0, amount: 0, ui: 0, completed: 0, yetToStart: 0, dropped: 0 }
    );
  }, [filteredData]);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: 'node.rowIndex + 1',
      width: 75,
      pinned: 'left',
      cellClass: 'font-mono text-center font-bold text-slate-500',
      headerClass: 'text-center',
    },
    {
      headerName: 'Organisation Name',
      field: 'orgName',
      flex: 2,
      minWidth: 240,
      pinned: 'left',
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
    },
    {
      headerName: 'Total MoUs Signed',
      field: 'totalCount',
      width: 140,
      cellClass: 'font-black text-center text-blue-700 dark:text-blue-400',
      headerClass: 'text-center',
    },
    {
      headerName: 'Total Amount (₹ Cr)',
      field: 'totalAmount',
      width: 170,
      cellClass: 'font-black text-right text-emerald-600 dark:text-emerald-400',
      headerClass: 'text-right',
      cellRenderer: (params) => `₹ ${Math.round(params.value || 0).toLocaleString()} Cr`,
    },
    {
      headerName: 'Under Implementation',
      field: 'uiCount',
      width: 160,
      cellClass: 'font-bold text-center text-blue-600 dark:text-blue-400',
      headerClass: 'text-center',
    },
    {
      headerName: 'Completed',
      field: 'completedCount',
      width: 120,
      cellClass: 'font-bold text-center text-emerald-600 dark:text-emerald-400',
      headerClass: 'text-center',
    },
    {
      headerName: 'Yet to Start',
      field: 'yetToStartCount',
      width: 120,
      cellClass: 'font-bold text-center text-amber-600 dark:text-amber-400',
      headerClass: 'text-center',
    },
    {
      headerName: 'Dropped',
      field: 'droppedCount',
      width: 110,
      cellClass: 'font-bold text-center text-rose-600 dark:text-rose-400',
      headerClass: 'text-center',
    },
  ], []);

  const handleExport = (type) => {
    if (type === 'Copy') {
      let tsv = 'S.No\tOrganisation\tTotal MoUs\tTotal Amount (Cr)\tUnder Implementation\tCompleted\tYet to Start\tDropped\n';
      filteredData.forEach((r, i) => {
        tsv += `${i + 1}\t${r.orgName}\t${r.totalCount}\t${Math.round(r.totalAmount)}\t${r.uiCount}\t${r.completedCount}\t${r.yetToStartCount}\t${r.droppedCount}\n`;
      });
      navigator.clipboard.writeText(tsv)
        .then(() => triggerNotification?.('Report data copied to clipboard!'))
        .catch(() => alert('Failed to copy.'));
    } else if (type === 'Excel') {
      let csv = 'S.No,Organisation,Total MoUs,Total Amount (Cr),Under Implementation,Completed,Yet to Start,Dropped\n';
      filteredData.forEach((r, i) => {
        csv += `"${i + 1}","${r.orgName.replace(/"/g, '""')}","${r.totalCount}","${Math.round(r.totalAmount)}","${r.uiCount}","${r.completedCount}","${r.yetToStartCount}","${r.droppedCount}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `GMIS_IMW_Organisation_Report_${selectedEvent.replace(/\s+/g, '_')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerNotification?.('Exported to CSV successfully!');
    } else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      const title = `GMIS & IMW Organisation Report - ${selectedEvent}`;
      let rowsHtml = '';
      filteredData.forEach((r, i) => {
        rowsHtml += `<tr>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${i + 1}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.orgName}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; text-align: center;">${r.totalCount}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; text-align: right;">₹ ${Math.round(r.totalAmount).toLocaleString()} Cr</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; text-align: center;">${r.uiCount}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; text-align: center;">${r.completedCount}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; text-align: center;">${r.yetToStartCount}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; text-align: center;">${r.droppedCount}</td>
        </tr>`;
      });
      printWindow.document.write(`
        <html>
          <head><title>${title}</title>
            <style>body { font-family: sans-serif; padding: 20px; color: #1e293b; } table { width: 100%; border-collapse: collapse; margin-top: 15px; } th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px; font-size: 11px; text-align: left; }</style>
          </head>
          <body>
            <h2>${title}</h2>
            <p style="font-size: 11px; color: #64748b;">Generated on: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead><tr><th>S.No</th><th>Organisation</th><th>Total MoUs</th><th>Total Amount</th><th>UI</th><th>Completed</th><th>Yet to Start</th><th>Dropped</th></tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <script>window.onload = function() { window.print(); window.close(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Event Selection & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex flex-wrap items-center gap-2 select-none">
          {EVENT_TABS.map((ev, i) => (
            <button
              key={i}
              onClick={() => setSelectedEvent(ev)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                selectedEvent === ev
                  ? 'bg-[#0f417a] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{ev}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 justify-end">
          <CopyButton onClick={() => handleExport('Copy')} />
          <ExportDropdown onExport={handleExport} />
          <button
            onClick={loadReportData}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition cursor-pointer"
            title="Refresh Report"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Telemetry KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total MoUs</span>
          <span className="text-lg font-black text-slate-900 dark:text-white mt-0.5 block">{totalStats.count}</span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Value</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
            ₹ {Math.round(totalStats.amount).toLocaleString()} Cr
          </span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Under Implementation</span>
          <span className="text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5 block">{totalStats.ui}</span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed</span>
          <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">{totalStats.completed}</span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Yet to Start</span>
          <span className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5 block">{totalStats.yetToStart}</span>
        </div>
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Dropped</span>
          <span className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5 block">{totalStats.dropped}</span>
        </div>
      </div>

      {/* Main Aggregated Table Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 dark:bg-slate-950 dark:border-slate-800">
        
        <div className="flex items-center justify-between">
          <div className="relative min-w-[220px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search organisation in report..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
            />
          </div>

          <span className="text-xs font-bold text-slate-500">
            Showing {filteredData.length} Organisations
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            domLayout="autoHeight"
          />
        </div>

      </div>

    </div>
  );
}
