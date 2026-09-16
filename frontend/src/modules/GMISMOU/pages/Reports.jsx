import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sparkles, Building2, Layers, DollarSign, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import { fetchGmisMouPaginated } from '../api';

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
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'abstract', title: 'Report No.: 8.1A - Abstract ( Organisation Wise ) - GMIS & IMW MoUs' }
  ]);
  const [detailData, setDetailData] = useState([]);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const res = await fetchGmisMouPaginated({
        page: 1,
        pageSize: 2000,
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
            sNo: 0,
            organisationId: orgId,
            organisationName: orgName,
            totalCount: 0,
            totalAmount: 0,
            uiCount: 0,
            completedCount: 0,
            yetToStartCount: 0,
            droppedCount: 0,
            items: []
          };
        }

        orgMap[orgId].totalCount += 1;
        orgMap[orgId].totalAmount += amt;
        orgMap[orgId].items.push(item);

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

      const aggregatedList = Object.values(orgMap)
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .map((row, idx) => ({
          ...row,
          sNo: idx + 1,
          totalAmount: Math.round(row.totalAmount * 100) / 100
        }));

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

  // Overall totals
  const totalStats = useMemo(() => {
    return reportData.reduce(
      (acc, r) => ({
        count: acc.count + (r.totalCount || 0),
        amount: acc.amount + (r.totalAmount || 0),
        ui: acc.ui + (r.uiCount || 0),
        completed: acc.completed + (r.completedCount || 0),
        yetToStart: acc.yetToStart + (r.yetToStartCount || 0),
        dropped: acc.dropped + (r.droppedCount || 0),
      }),
      { count: 0, amount: 0, ui: 0, completed: 0, yetToStart: 0, dropped: 0 }
    );
  }, [reportData]);

  // Abstract columns definition
  const abstractColumns = useMemo(() => [
    {
      headerName: 'S.No',
      field: 'sNo',
      width: 75,
      pinned: 'left',
      cellClass: 'font-mono text-center font-bold text-slate-600 dark:text-slate-400',
      headerClass: 'text-center',
    },
    {
      headerName: 'Organisation Name',
      field: 'organisationName',
      flex: 2.2,
      minWidth: 260,
      pinned: 'left',
      cellRenderer: (params) => {
        if (!params.value || params.node?.rowPinned) {
          return <strong style={{ fontWeight: 800, color: '#4b2424' }}>{params.value || 'Total'}</strong>;
        }
        return (
          <button
            onClick={() => {
              const orgRow = params.data;
              const orgItems = orgRow.items || [];
              setDetailData(orgItems.map((item, idx) => ({
                sNo: idx + 1,
                id: item.id,
                eventName: item.event_name || 'GMIS',
                mouName: item.name_of_mou || '-',
                secondParty: item.name_of_second_party || '-',
                nature: item.nature_of_second_party || '-',
                amount: parseFloat(item.amount) || 0,
                category: item.mou_category_name || 'General',
                status: item.present_status || 'Active',
              })));
              setDrillDownPath(prev => [...prev, {
                type: 'detail',
                orgId: orgRow.organisationId,
                title: `Report No.: 8.1B - Detailed MoUs - ${params.value}`
              }]);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#4b2424',
              fontWeight: 800,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {params.value}
          </button>
        );
      }
    },
    {
      headerName: 'Total MoUs Signed',
      field: 'totalCount',
      width: 150,
      cellClass: 'font-black text-center text-[#4b2424] dark:text-amber-200',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        if (params.node?.rowPinned) {
          return <strong style={{ fontWeight: 800, color: '#4b2424' }}>{params.value}</strong>;
        }
        return params.value ?? 0;
      }
    },
    {
      headerName: 'Total Value (₹ Cr)',
      field: 'totalAmount',
      width: 170,
      cellClass: 'font-black text-right text-emerald-700 dark:text-emerald-400',
      headerClass: 'text-right',
      cellRenderer: (params) => {
        const val = Number(params.value || 0).toLocaleString();
        if (params.node?.rowPinned) {
          return <strong style={{ fontWeight: 800, color: '#4b2424' }}>₹ {val} Cr</strong>;
        }
        return `₹ ${val} Cr`;
      }
    },
    {
      headerName: 'Under Implementation',
      field: 'uiCount',
      width: 160,
      cellClass: 'font-bold text-center text-[#4b2424] dark:text-amber-300',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        if (params.node?.rowPinned) {
          return <strong style={{ fontWeight: 800, color: '#4b2424' }}>{params.value}</strong>;
        }
        return params.value ?? 0;
      }
    },
    {
      headerName: 'Completed',
      field: 'completedCount',
      width: 130,
      cellClass: 'font-bold text-center text-emerald-700 dark:text-emerald-400',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        if (params.node?.rowPinned) {
          return <strong style={{ fontWeight: 800, color: '#4b2424' }}>{params.value}</strong>;
        }
        return params.value ?? 0;
      }
    },
    {
      headerName: 'Yet to Start',
      field: 'yetToStartCount',
      width: 130,
      cellClass: 'font-bold text-center text-amber-700 dark:text-amber-400',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        if (params.node?.rowPinned) {
          return <strong style={{ fontWeight: 800, color: '#4b2424' }}>{params.value}</strong>;
        }
        return params.value ?? 0;
      }
    },
    {
      headerName: 'Dropped',
      field: 'droppedCount',
      width: 120,
      cellClass: 'font-bold text-center text-rose-700 dark:text-rose-400',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        if (params.node?.rowPinned) {
          return <strong style={{ fontWeight: 800, color: '#4b2424' }}>{params.value}</strong>;
        }
        return params.value ?? 0;
      }
    },
  ], []);

  // Detail columns definition
  const detailColumns = useMemo(() => [
    {
      headerName: 'S.No',
      field: 'sNo',
      width: 75,
      pinned: 'left',
      cellClass: 'font-mono text-center font-bold text-slate-600 dark:text-slate-400',
      headerClass: 'text-center',
    },
    {
      headerName: 'Summit',
      field: 'eventName',
      width: 130,
      cellClass: 'font-bold text-[#4b2424] dark:text-amber-200',
    },
    {
      headerName: 'Name of MoU / Project',
      field: 'mouName',
      flex: 2.2,
      minWidth: 260,
      cellClass: 'font-semibold text-slate-800 dark:text-slate-200',
    },
    {
      headerName: '2nd Party (Partner)',
      field: 'secondParty',
      flex: 1.5,
      minWidth: 180,
      cellClass: 'text-slate-600 dark:text-slate-300',
    },
    {
      headerName: 'Nature',
      field: 'nature',
      width: 150,
      cellClass: 'text-slate-600 dark:text-slate-400 text-xs',
    },
    {
      headerName: 'Amount (₹ Cr)',
      field: 'amount',
      width: 140,
      cellClass: 'font-bold text-emerald-700 dark:text-emerald-400 text-right',
      headerClass: 'text-right',
      cellRenderer: (params) => `₹ ${Number(params.value || 0).toLocaleString()} Cr`,
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 160,
      cellClass: 'text-slate-600 dark:text-slate-400 text-xs',
    },
    {
      headerName: 'Present Status',
      field: 'status',
      width: 170,
      cellRenderer: (params) => {
        const s = String(params.value || '').toLowerCase();
        const badgeClass = s.includes('completed')
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
          : s.includes('dropped')
          ? 'bg-rose-50 text-rose-800 border-rose-300'
          : s.includes('under')
          ? 'bg-amber-50 text-[#4b2424] border-amber-300'
          : 'bg-purple-50 text-purple-800 border-purple-300';
        return (
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase border tracking-wider ${badgeClass}`}>
            {params.value}
          </span>
        );
      }
    },
  ], []);

  // Pinned Bottom Totals Row
  const pinnedBottomRowData = useMemo(() => {
    if (currentView.type === 'abstract') {
      if (!reportData || reportData.length === 0) return undefined;
      return [{
        sNo: '',
        organisationName: 'Total',
        totalCount: totalStats.count,
        totalAmount: Math.round(totalStats.amount * 100) / 100,
        uiCount: totalStats.ui,
        completedCount: totalStats.completed,
        yetToStartCount: totalStats.yetToStart,
        droppedCount: totalStats.dropped,
      }];
    }
    return undefined;
  }, [currentView.type, reportData, totalStats]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center' }
  }), []);

  const subtitle = useMemo(() => (
    <>
      <span>Summit Filter: <strong style={{ color: '#4b2424' }}>{selectedEvent}</strong></span>
      <span style={{ color: '#eadede' }}>•</span>
      <span>Total MoUs: <strong style={{ color: '#4b2424' }}>{totalStats.count}</strong></span>
      <span style={{ color: '#eadede' }}>•</span>
      <span>Total Value: <strong style={{ color: '#4b2424' }}>₹ {Math.round(totalStats.amount).toLocaleString()} Cr</strong></span>
    </>
  ), [selectedEvent, totalStats]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Event Selection Buttons in Brown Theme */}
      {currentView.type === 'abstract' && (
        <div className="flex flex-wrap items-center gap-2 pb-1 border-b border-[#eadede] dark:border-slate-800 select-none">
          {EVENT_TABS.map((ev, i) => (
            <button
              key={i}
              onClick={() => setSelectedEvent(ev)}
              className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center space-x-1.5 ${
                selectedEvent === ev
                  ? 'bg-[#4b2424] text-white shadow-md'
                  : 'bg-[#f7f3f3] hover:bg-[#eadede] text-[#4b2424] dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>{ev}</span>
            </button>
          ))}
        </div>
      )}

      {/* Summary KPI Badges in Brown Theme */}
      {currentView.type === 'abstract' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total MoUs</span>
            <span className="text-lg font-black text-[#4b2424] dark:text-amber-200 mt-0.5 block">{totalStats.count}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Value</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
              ₹ {Math.round(totalStats.amount).toLocaleString()} Cr
            </span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Under Implementation</span>
            <span className="text-lg font-black text-[#6b3535] dark:text-amber-300 mt-0.5 block">{totalStats.ui}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">{totalStats.completed}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Yet to Start</span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5 block">{totalStats.yetToStart}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Dropped</span>
            <span className="text-lg font-black text-rose-700 dark:text-rose-400 mt-0.5 block">{totalStats.dropped}</span>
          </div>
        </div>
      )}

      {/* Main Brown Themed ReportTable */}
      <ReportTable
        title={currentView.title}
        subtitle={subtitle}
        onBack={handleBack}
        showBackButton={drillDownPath.length > 1}
        rawData={currentView.type === 'abstract' ? reportData : detailData}
        viewData={currentView.type === 'abstract' ? reportData : detailData}
        columns={currentView.type === 'abstract' ? abstractColumns : detailColumns}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        loading={loading}
        onRefresh={loadReportData}
        triggerNotification={triggerNotification}
        pagination={true}
        themeClass="yp-pro-grid"
        brandColor="#4b2424"
        brandColorHover="#6b3535"
        accentColor="#f7f3f3"
        oddRowColor="#f8faf6"
        totalLabel="Total Rows"
      />

    </div>
  );
}
