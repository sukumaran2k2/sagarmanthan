import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  Layers, 
  Compass, 
  FileSpreadsheet, 
  RefreshCw, 
  TrendingUp, 
  Coins, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Check
} from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import { fetchOvdStatusReport } from '../api';
import { useShallow } from 'zustand/react/shallow';
import { useOvodStore } from '../store/useOvodStore';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';


/* ============================================================
   SUB-TABS CONFIGURATION
   ============================================================ */
const SUB_TABS = [
  {
    id: 'ministry',
    label: 'Ministry',
    apiType: 'Ministry',
    title: 'Ministry Wise - Data Entry Status',
    subtitle: 'Tracking A1 Goals, A2 Interventions, and A3 Action Items update status across MOPSW Wings',
    entityField: 'Wings',
    icon: Building2
  },
  {
    id: 'organization',
    label: 'Organization',
    apiType: 'Organisation',
    title: 'Organisation Wise - Data Entry Status',
    subtitle: 'Tracking B1 Goals, B2 Interventions, and B3 Action Items update status across Major Ports and Attached Agencies',
    entityField: 'Organisation Name',
    icon: Layers
  },
  {
    id: 'vibhas',
    label: 'ViBhas/NAVIC',
    apiType: 'Vibhas',
    title: 'ViBhas/NAVIC Wise - Data Entry Status',
    subtitle: 'Comprehensive overview of data entry and item updates categorized across 20 ViBhas/NAVIC Pillar Cells',
    entityField: 'VIBHAS Cell',
    icon: Compass
  }
];

/* Updated vs Total: green when every item is updated, red when some are still pending */
const updatedCellClass = (p) => {
  const base = 'text-center font-mono font-bold';
  const total = Number(p.data?.[String(p.colDef?.field).replace('Updated', 'Total')]);
  const updated = Number(p.value);
  if (Number.isNaN(total) || Number.isNaN(updated)) return base;
  return updated >= total
    ? `${base} text-emerald-700 dark:text-emerald-400`
    : `${base} text-red-600 dark:text-red-400`;
};

export default function DataEntryStatusReport({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);

  // Selected sub-report and its search text live in the OVOD store so they survive switching
  // tabs; switching to a different sub-report clears the search (done by the store action)
  const { activeTab: activeTabId, searchQuery } = useOvodStore(useShallow((s) => s.statusReport));
  const { setStatusReportTab, setStatusReportSearch } = useOvodStore(useShallow((s) => ({
    setStatusReportTab: s.setStatusReportTab,
    setStatusReportSearch: s.setStatusReportSearch
  })));
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  const activeTabConfig = useMemo(() => {
    return SUB_TABS.find(t => t.id === activeTabId) || SUB_TABS[0];
  }, [activeTabId]);

  /* ── Fetch Data ─────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOvdStatusReport(activeTabConfig.apiType);
      const rows = res?.rowData || res?.data || (Array.isArray(res) ? res : []);
      setData(rows);
    } catch (err) {
      console.error('Could not fetch status data:', err);
      notify(COMMON_TOASTS.loadFailed('The latest status data'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTabConfig, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Formatters ────────────────────────────────────────────── */
  const fmtNumber = (val) => {
    if (val === null || val === undefined || val === '') return '0';
    const n = Number(val);
    return isNaN(n) ? String(val) : n.toLocaleString('en-IN');
  };

  const fmtCurrency = (val) => {
    if (val === null || val === undefined || val === '') return '0.00';
    const n = Number(val);
    return isNaN(n) ? String(val) : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  /* ── Filtered Rows by Quick Search ─────────────────────────── */
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(row => {
      return Object.values(row).some(v => 
        String(v || '').toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery]);

  /* ── KPI Summary Calculations ──────────────────────────────── */
  const kpis = useMemo(() => {
    const rows = filteredRows;
    const totalRows = rows.length;

    if (activeTabConfig.id === 'ministry') {
      const totalA1 = rows.reduce((s, r) => s + (Number(r['Total A1']) || 0), 0);
      const updatedA1 = rows.reduce((s, r) => s + (Number(r['Updated A1']) || 0), 0);
      const totalA2 = rows.reduce((s, r) => s + (Number(r['Total A2']) || 0), 0);
      const updatedA2 = rows.reduce((s, r) => s + (Number(r['Updated A2']) || 0), 0);
      const totalA3 = rows.reduce((s, r) => s + (Number(r['Total A3']) || 0), 0);
      const updatedA3 = rows.reduce((s, r) => s + (Number(r['Updated A3']) || 0), 0);
      const costA3 = rows.reduce((s, r) => s + (Number(r['Total Cost A3 (In Cr)']) || 0), 0);
      const costB3 = rows.reduce((s, r) => s + (Number(r['Total Cost B3 (In Cr)']) || 0), 0);
      const overallCost = rows.reduce((s, r) => s + (Number(r['Overall Total Cost (In Cr)']) || Number(r['Total Cost (Cr)']) || 0), 0);
      const pct = totalA3 > 0 ? Math.round((updatedA3 / totalA3) * 100) : 0;

      return {
        totalEntities: totalRows,
        entityLabel: 'Total Wings',
        card1Title: 'Total A1 Goals',
        card1Val: `${fmtNumber(updatedA1)} / ${fmtNumber(totalA1)}`,
        card1Sub: `${totalA1 > 0 ? Math.round((updatedA1 / totalA1) * 100) : 0}% Updated`,
        card2Title: 'Total A2 Interventions',
        card2Val: `${fmtNumber(updatedA2)} / ${fmtNumber(totalA2)}`,
        card2Sub: `${totalA2 > 0 ? Math.round((updatedA2 / totalA2) * 100) : 0}% Updated`,
        card3Title: 'Total A3 Actions',
        card3Val: `${fmtNumber(updatedA3)} / ${fmtNumber(totalA3)}`,
        card3Sub: `${pct}% Updated`,
        card4Title: 'Cost A3 (₹ Cr)',
        card4Val: `₹${fmtCurrency(costA3)}`,
        card5Title: 'Overall Total Cost (₹ Cr)',
        card5Val: `₹${fmtCurrency(overallCost || (costA3 + costB3))}`,
      };
    } else if (activeTabConfig.id === 'organization') {
      const totalB1 = rows.reduce((s, r) => s + (Number(r['Total B1']) || 0), 0);
      const updatedB1 = rows.reduce((s, r) => s + (Number(r['Updated B1']) || 0), 0);
      const totalB2 = rows.reduce((s, r) => s + (Number(r['Total B2']) || 0), 0);
      const updatedB2 = rows.reduce((s, r) => s + (Number(r['Updated B2']) || 0), 0);
      const totalB3 = rows.reduce((s, r) => s + (Number(r['Total B3']) || 0), 0);
      const updatedB3 = rows.reduce((s, r) => s + (Number(r['Updated B3']) || 0), 0);
      const cost = rows.reduce((s, r) => s + (Number(r['Total Cost (In Cr)']) || Number(r['Total Cost (Cr)']) || 0), 0);
      const pct = totalB3 > 0 ? Math.round((updatedB3 / totalB3) * 100) : 0;

      return {
        totalEntities: totalRows,
        entityLabel: 'Total Organisations',
        card1Title: 'Total B1 Goals',
        card1Val: `${fmtNumber(updatedB1)} / ${fmtNumber(totalB1)}`,
        card1Sub: `${totalB1 > 0 ? Math.round((updatedB1 / totalB1) * 100) : 0}% Updated`,
        card2Title: 'Total B2 Interventions',
        card2Val: `${fmtNumber(updatedB2)} / ${fmtNumber(totalB2)}`,
        card2Sub: `${totalB2 > 0 ? Math.round((updatedB2 / totalB2) * 100) : 0}% Updated`,
        card3Title: 'Total B3 Actions',
        card3Val: `${fmtNumber(updatedB3)} / ${fmtNumber(totalB3)}`,
        card3Sub: `${pct}% Updated`,
        card4Title: 'Update Progress',
        card4Val: `${pct}%`,
        card5Title: 'Total Cost (₹ Cr)',
        card5Val: `₹${fmtCurrency(cost)}`,
      };
    } else {
      // Vibhas
      const totalA3 = rows.reduce((s, r) => s + (Number(r['Total A3']) || 0), 0);
      const updatedA3 = rows.reduce((s, r) => s + (Number(r['Updated A3']) || 0), 0);
      const totalB3 = rows.reduce((s, r) => s + (Number(r['Total B3']) || 0), 0);
      const updatedB3 = rows.reduce((s, r) => s + (Number(r['Updated B3']) || 0), 0);
      const cost = rows.reduce((s, r) => s + (Number(r['Total Cost (In Cr)']) || Number(r['Total Cost (Cr)']) || 0), 0);
      const overallActions = totalA3 + totalB3;
      const overallUpdated = updatedA3 + updatedB3;
      const pct = overallActions > 0 ? Math.round((overallUpdated / overallActions) * 100) : 0;

      return {
        totalEntities: totalRows,
        entityLabel: 'Total ViBhas/NAVIC Cells',
        card1Title: 'A3 Actions (Ministry)',
        card1Val: `${fmtNumber(updatedA3)} / ${fmtNumber(totalA3)}`,
        card1Sub: `${totalA3 > 0 ? Math.round((updatedA3 / totalA3) * 100) : 0}% Updated`,
        card2Title: 'B3 Actions (Organisations)',
        card2Val: `${fmtNumber(updatedB3)} / ${fmtNumber(totalB3)}`,
        card2Sub: `${totalB3 > 0 ? Math.round((updatedB3 / totalB3) * 100) : 0}% Updated`,
        card3Title: 'Total Actions (A3 + B3)',
        card3Val: `${fmtNumber(overallUpdated)} / ${fmtNumber(overallActions)}`,
        card3Sub: `${pct}% Overall Updated`,
        card4Title: 'Overall Data Entry',
        card4Val: `${pct}%`,
        card5Title: 'Total Cost (₹ Cr)',
        card5Val: `₹${fmtCurrency(cost)}`,
      };
    }
  }, [filteredRows, activeTabConfig]);

  /* ── Columns Definition for AG Grid ────────────────────────── */
  const columns = useMemo(() => {
    const sNoCol = {
      headerName: 'S.No',
      field: 'sno',
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-mono font-bold text-stone-600 dark:text-stone-400',
      headerClass: 'text-center font-bold',
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <span className="font-extrabold text-[#4b2424] dark:text-amber-300">Total</span>;
        return <span>{(p.node?.rowIndex ?? 0) + 1}</span>;
      }
    };

    if (activeTabConfig.id === 'ministry') {
      return [
        sNoCol,
        {
          headerName: 'Wings',
          field: 'Wings',
          minWidth: 230,
          flex: 1.5,
          pinned: 'left',
          cellClass: 'font-semibold text-stone-900 dark:text-stone-100',
          headerClass: 'font-bold',
          cellRenderer: (p) => {
            if (p.node?.rowPinned) {
              return <strong className="font-extrabold text-[#4b2424] dark:text-amber-300">{p.value || 'Grand Total'}</strong>;
            }
            return (
              <span className="text-[#0f417a] dark:text-blue-400 font-bold hover:underline cursor-pointer">
                {p.value}
              </span>
            );
          }
        },
        {
          headerName: 'Total A1',
          field: 'Total A1',
          width: 105,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated A1',
          field: 'Updated A1',
          width: 115,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total A2',
          field: 'Total A2',
          width: 105,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated A2',
          field: 'Updated A2',
          width: 115,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total A3',
          field: 'Total A3',
          width: 105,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated A3',
          field: 'Updated A3',
          width: 115,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total Cost A3 (In Cr)',
          field: 'Total Cost A3 (In Cr)',
          minWidth: 160,
          flex: 1,
          cellClass: 'text-right font-mono font-semibold text-stone-800 dark:text-stone-200',
          headerClass: 'text-right',
          cellRenderer: (p) => fmtCurrency(p.value)
        },
        {
          headerName: 'Total Cost B3 (In Cr)',
          field: 'Total Cost B3 (In Cr)',
          minWidth: 160,
          flex: 1,
          cellClass: 'text-right font-mono font-semibold text-stone-800 dark:text-stone-200',
          headerClass: 'text-right',
          cellRenderer: (p) => fmtCurrency(p.value)
        },
        {
          headerName: 'Overall Total Cost (In Cr)',
          field: 'Overall Total Cost (In Cr)',
          minWidth: 180,
          flex: 1.2,
          cellClass: 'text-right font-mono font-black text-[#4b2424] dark:text-amber-300',
          headerClass: 'text-right',
          cellRenderer: (p) => {
            const v = p.value !== undefined ? p.value : p.data?.['Total Cost (Cr)'];
            return fmtCurrency(v);
          }
        }
      ];
    } else if (activeTabConfig.id === 'organization') {
      return [
        sNoCol,
        {
          headerName: 'Organisation Name',
          field: 'Organisation Name',
          minWidth: 260,
          flex: 2,
          pinned: 'left',
          cellClass: 'font-semibold text-stone-900 dark:text-stone-100',
          headerClass: 'font-bold',
          cellRenderer: (p) => {
            if (p.node?.rowPinned) {
              return <strong className="font-extrabold text-[#4b2424] dark:text-amber-300">{p.value || 'Grand Total'}</strong>;
            }
            return (
              <span className="text-stone-800 dark:text-stone-200 font-medium">
                {p.value}
              </span>
            );
          }
        },
        {
          headerName: 'Total B1',
          field: 'Total B1',
          width: 110,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated B1',
          field: 'Updated B1',
          width: 115,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total B2',
          field: 'Total B2',
          width: 110,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated B2',
          field: 'Updated B2',
          width: 115,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total B3',
          field: 'Total B3',
          width: 110,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated B3',
          field: 'Updated B3',
          width: 115,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total Cost (In Cr)',
          field: 'Total Cost (In Cr)',
          minWidth: 170,
          flex: 1.2,
          cellClass: 'text-right font-mono font-black text-[#4b2424] dark:text-amber-300',
          headerClass: 'text-right',
          cellRenderer: (p) => {
            const v = p.value !== undefined ? p.value : p.data?.['Total Cost (Cr)'];
            return fmtCurrency(v);
          }
        }
      ];
    } else {
      // Vibhas
      return [
        sNoCol,
        {
          headerName: 'ViBhas/NAVIC Cell',
          field: 'VIBHAS Cell',
          minWidth: 260,
          flex: 2,
          pinned: 'left',
          cellClass: 'font-semibold text-stone-900 dark:text-stone-100',
          headerClass: 'font-bold',
          cellRenderer: (p) => {
            if (p.node?.rowPinned) {
              return <strong className="font-extrabold text-[#4b2424] dark:text-amber-300">{p.value || 'Grand Total'}</strong>;
            }
            return (
              <span className="text-stone-800 dark:text-stone-200 font-medium">
                {p.value}
              </span>
            );
          }
        },
        {
          headerName: 'Total A1',
          field: 'Total A1',
          width: 95,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated A1',
          field: 'Updated A1',
          width: 105,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total A2',
          field: 'Total A2',
          width: 95,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated A2',
          field: 'Updated A2',
          width: 105,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total A3',
          field: 'Total A3',
          width: 95,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated A3',
          field: 'Updated A3',
          width: 105,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total B1',
          field: 'Total B1',
          width: 95,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated B1',
          field: 'Updated B1',
          width: 105,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total B2',
          field: 'Total B2',
          width: 95,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated B2',
          field: 'Updated B2',
          width: 105,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total B3',
          field: 'Total B3',
          width: 95,
          cellClass: 'text-center font-mono font-semibold',
          headerClass: 'text-center'
        },
        {
          headerName: 'Updated B3',
          field: 'Updated B3',
          width: 105,
          cellClass: updatedCellClass,
          headerClass: 'text-center'
        },
        {
          headerName: 'Total Cost (In Cr)',
          field: 'Total Cost (In Cr)',
          minWidth: 160,
          flex: 1.2,
          cellClass: 'text-right font-mono font-black text-[#4b2424] dark:text-amber-300',
          headerClass: 'text-right',
          cellRenderer: (p) => {
            const v = p.value !== undefined ? p.value : p.data?.['Total Cost (Cr)'];
            return fmtCurrency(v);
          }
        }
      ];
    }
  }, [activeTabConfig]);

  /* ── Pinned Bottom Row Data (Grand Total Sums) ─────────────── */
  const pinnedBottomRowData = useMemo(() => {
    if (!filteredRows || filteredRows.length === 0) return [];
    
    const totals = {
      Wings: 'Grand Total',
      'Organisation Name': 'Grand Total',
      'VIBHAS Cell': 'Grand Total'
    };

    // Calculate sum across all numeric columns
    const numericKeys = [
      'Total A1', 'Updated A1', 'Total A2', 'Updated A2', 'Total A3', 'Updated A3',
      'Total B1', 'Updated B1', 'Total B2', 'Updated B2', 'Total B3', 'Updated B3',
      'Total Cost A3 (In Cr)', 'Total Cost B3 (In Cr)', 'Overall Total Cost (In Cr)',
      'Total Cost (In Cr)', 'Total Cost (Cr)'
    ];

    numericKeys.forEach(k => {
      let sum = 0;
      let hasCol = false;
      filteredRows.forEach(r => {
        if (r[k] !== undefined) {
          hasCol = true;
          sum += Number(r[k]) || 0;
        }
      });
      if (hasCol) {
        totals[k] = sum;
      }
    });

    return [totals];
  }, [filteredRows]);

  /* ── Toolbar Extra Elements ────────────────────────────────── */
  const toolbarExtra = (
    <div className="flex items-center gap-2">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setStatusReportSearch(e.target.value)}
          placeholder={`Search ${activeTabConfig.label}...`}
          className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-stone-200 dark:border-stone-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#4b2424] text-stone-800 dark:text-stone-200 shadow-2xs w-48 sm:w-60"
        />
      </div>

      {/* Refresh Button */}
      <button
        type="button"
        onClick={loadData}
        disabled={loading}
        className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors shadow-2xs cursor-pointer"
        title="Reload data"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in text-stone-800 dark:text-stone-100">
      
      {/* ── Top Header & Sub-Tabs Navigation (Brown Theme) ─────── */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#4b2424]/10 dark:bg-amber-400/10 text-[#4b2424] dark:text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#4b2424] dark:text-amber-400 tracking-wide">
                {activeTabConfig.title}
              </h1>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                {activeTabConfig.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Pills (Ministry / Organization / Vibhas) */}
        <div className="flex items-center gap-2 bg-stone-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-stone-200/80 dark:border-stone-700/80 self-start md:self-auto">
          {SUB_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusReportTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#4b2424] to-[#6b3535] text-white shadow-sm ring-1 ring-[#4b2424]/20'
                    : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 hover:bg-stone-200/60 dark:hover:bg-slate-700/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {isActive && <Check className="w-3 h-3 text-emerald-300 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Crucial Compliance Notice Note (Matching User Screenshot) ── */}
      <div className="p-3.5 bg-amber-50/90 dark:bg-amber-950/25 border border-amber-200/90 dark:border-amber-800/40 rounded-2xl shadow-2xs text-xs text-stone-700 dark:text-amber-100 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-rose-600 dark:text-rose-400 font-bold">Note : </strong>
          <span>
            Kindly note that the counts displayed in this report may not match the corresponding totals shown on the dashboard, as a single A1/A2/A3 item may be mapped to more than one wing. Therefore, this report is intended only to track whether A1/A2/A3 items are being updated and should not be used for any other analytical or progress-tracking purposes.
          </span>
        </div>
      </div>

      {/* ── KPI Highlight Cards (Brown Theme Pro Grid) ─────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Entities */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">{kpis.entityLabel}</span>
            <div className="p-1.5 rounded-lg bg-[#4b2424]/10 text-[#4b2424] dark:text-amber-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black font-mono text-[#4b2424] dark:text-amber-300">
            {fmtNumber(kpis.totalEntities)}
          </div>
        </div>

        {/* Card 1 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider truncate">{kpis.card1Title}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black font-mono text-emerald-700 dark:text-emerald-400">
            {kpis.card1Val}
          </div>
          <div className="text-[10px] font-bold text-stone-400 mt-0.5">{kpis.card1Sub}</div>
        </div>

        {/* Card 2 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider truncate">{kpis.card2Title}</span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black font-mono text-blue-600 dark:text-blue-400">
            {kpis.card2Val}
          </div>
          <div className="text-[10px] font-bold text-stone-400 mt-0.5">{kpis.card2Sub}</div>
        </div>

        {/* Card 3 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider truncate">{kpis.card3Title}</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-xl font-black font-mono text-indigo-600 dark:text-indigo-400">
            {kpis.card3Val}
          </div>
          <div className="text-[10px] font-bold text-stone-400 mt-0.5">{kpis.card3Sub}</div>
        </div>

        {/* Card 4 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider truncate">{kpis.card4Title}</span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-black font-mono text-amber-700 dark:text-amber-400 truncate">
            {kpis.card4Val}
          </div>
          <div className="text-[10px] font-bold text-stone-400 mt-0.5">Tracked value</div>
        </div>

        {/* Card 5 */}
        <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider truncate">{kpis.card5Title}</span>
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-lg font-black font-mono text-rose-700 dark:text-rose-400 truncate">
            {kpis.card5Val}
          </div>
          <div className="text-[10px] font-bold text-stone-400 mt-0.5">Budget outlay</div>
        </div>
      </div>

      {/* ── Main Data Table (Brown Theme YP-Pro-Grid) ──────────── */}
      <div className="relative">
        <ReportTable
          title={activeTabConfig.title}
          subtitle={`Active View: ${activeTabConfig.label} • Showing ${filteredRows.length} entries`}
          rawData={filteredRows}
          viewData={filteredRows}
          columns={columns}
          pinnedBottomRowData={pinnedBottomRowData}
          loading={loading}
          onRefresh={loadData}
          triggerNotification={triggerNotification}
          pagination={false}
          themeClass="yp-pro-grid"
          brandColor="var(--module-report-brand-color, #4b2424)"
          brandColorHover="var(--module-report-brand-color-hover, #6b3535)"
          accentColor="var(--module-report-accent-color, #f7f3f3)"
          oddRowColor="var(--module-report-odd-row-bg, #f8faf6)"
          totalLabel="Total"
          toolbarExtra={toolbarExtra}
        />

        {/* Footer info: Total Rows matching screenshots */}
        <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-stone-500 dark:text-stone-400">
          <span>Total Rows: <strong className="text-stone-800 dark:text-stone-200 font-mono">{filteredRows.length}</strong></span>
          <span className="text-[11px] font-medium text-stone-400">Data source: Drishti Portal (OVOD)</span>
        </div>
      </div>

    </div>
  );
}
