import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Layers,
  Compass,
  RefreshCw,
  Search,
  ChevronDown
} from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import { fetchOvdStatusReport, fetchOvdOrgListData, getUserIdFromToken } from '../api';
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
  const [drilldownOrg, setDrilldownOrg] = useState(null);
  const [drilldownRows, setDrilldownRows] = useState([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownType, setDrilldownType] = useState(null); // 'wing' | 'org' | null
  // 3rd-level: clicking a count number inside an org row
  const [numDrilldownOrg, setNumDrilldownOrg] = useState(null);   // org name
  const [numDrilldownLevel, setNumDrilldownLevel] = useState('B1'); // 'B1'|'B2'|'B3'
  const [numDrilldownUpdated, setNumDrilldownUpdated] = useState(false);
  const [numDrilldownRows, setNumDrilldownRows] = useState([]);
  const [numDrilldownLoading, setNumDrilldownLoading] = useState(false);
  const cachedItemsRef = React.useRef([]); // raw fetchOvdOrgListData cache

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

  const handleEntityClick = useCallback(async (entityName, type) => {
    if (!entityName) return;
    setDrilldownOrg(entityName);
    setDrilldownType(type);
    setDrilldownLoading(true);
    try {
      const userId = getUserIdFromToken();
      const res = await fetchOvdOrgListData(userId);
      const rows = Array.isArray(res) ? res : (res?.data || []);
      cachedItemsRef.current = rows; // cache for number-click drilldown

      if (type === 'wing') {
        // Filter individual items by wing
        const target = entityName.toLowerCase();
        const filtered = rows.filter((r) => {
          const rw = String(r.Wing || r.wing || '').toLowerCase().trim();
          if (!rw) return false;
          return rw.includes(target) || target.includes(rw);
        });

        // Aggregate into org-level B1/B2/B3 summary (mirrors the Organisation tab query)
        const orgMap = new Map();
        const extractCode = (val) => (val ? String(val).split(':')[0].trim() : null);
        filtered.forEach((item) => {
          const orgName = String(item.ia_name || '').trim();
          if (!orgName) return;
          if (!orgMap.has(orgName)) {
            orgMap.set(orgName, { b1: new Set(), b1u: new Set(), b2: new Set(), b2u: new Set(), b3: new Set(), b3u: new Set(), cost: 0 });
          }
          const o = orgMap.get(orgName);
          const isUpdated = !!(item['Last Updated Date'] || item.updated_date);
          const b1c = extractCode(item['Goal (B1)']);
          const b2c = extractCode(item['Intervention (B2)']);
          const b3c = extractCode(item['Action (B3)']);
          if (b1c) { o.b1.add(b1c); if (isUpdated) o.b1u.add(b1c); }
          if (b2c) { o.b2.add(b2c); if (isUpdated) o.b2u.add(b2c); }
          if (b3c) { o.b3.add(b3c); if (isUpdated) o.b3u.add(b3c); }
          o.cost += Number(item['Total Cost'] || 0);
        });

        const wingRows = [...orgMap.entries()].map(([name, o], idx) => ({
          sno: idx + 1,
          'Organisation Name': name,
          'Total B1': o.b1.size,
          'Updated B1': o.b1u.size,
          'Total B2': o.b2.size,
          'Updated B2': o.b2u.size,
          'Total B3': o.b3.size,
          'Updated B3': o.b3u.size,
          'Total Cost (In Cr)': o.cost,
        }));
        setDrilldownRows(wingRows);
      } else {
        // org click → individual action items
        const orgKey = entityName.toLowerCase().split(' ').slice(0, 2).join(' ');
        const filtered = rows.filter((r) => {
          const org = String(r.ia_name || r.organisation_name || '').toLowerCase();
          return org.includes(orgKey) || orgKey.includes(org.split(' ').slice(0, 2).join(' '));
        });
        setDrilldownRows(filtered.map((item, idx) => ({ ...item, sno: idx + 1 })));
      }
    } catch (err) {
      console.error('Drilldown load failed:', err);
      notify(COMMON_TOASTS.loadFailed('The detailed data'));
      setDrilldownRows([]);
    } finally {
      setDrilldownLoading(false);
    }
  }, [notify]);

  /* ── Number-click handler: B1/B2/B3 items for an org ───────── */
  const handleNumberClick = useCallback(async (orgName, bLevel, updatedOnly, wingFilter) => {
    if (!orgName) return;
    setNumDrilldownOrg(orgName);
    setNumDrilldownLevel(bLevel);
    setNumDrilldownUpdated(updatedOnly);
    setNumDrilldownLoading(true);
    try {
      let items = cachedItemsRef.current;
      if (!items.length) {
        const res = await fetchOvdOrgListData(getUserIdFromToken());
        items = Array.isArray(res) ? res : (res?.data || []);
        cachedItemsRef.current = items;
      }
      // Filter by org
      const orgLow = orgName.toLowerCase();
      let filtered = items.filter((r) => {
        const rOrg = String(r.ia_name || '').toLowerCase().trim();
        return rOrg.includes(orgLow) || orgLow.includes(rOrg);
      });
      // Filter by wing if provided (number clicked inside wing drilldown)
      if (wingFilter) {
        const wingLow = wingFilter.toLowerCase();
        filtered = filtered.filter((r) => {
          const rw = String(r.Wing || '').toLowerCase().trim();
          return rw && (rw.includes(wingLow) || wingLow.includes(rw));
        });
      }
      // Filter updated-only if applicable
      if (updatedOnly) {
        filtered = filtered.filter((r) => !!(r['Last Updated Date'] || r.updated_date));
      }
      // Deduplicate by the B-level code so row count matches the displayed count
      const fieldMap = { B1: 'Goal (B1)', B2: 'Intervention (B2)', B3: 'Action (B3)' };
      const bField = fieldMap[bLevel] || 'Goal (B1)';
      const seen = new Set();
      const deduped = filtered.filter((r) => {
        const val = r[bField];
        if (!val) return false;
        const code = String(val).split(':')[0].trim();
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      });
      setNumDrilldownRows(deduped.map((item, idx) => ({ ...item, sno: idx + 1 })));
    } catch (err) {
      console.error('Number drilldown failed:', err);
      notify(COMMON_TOASTS.loadFailed('The detailed data'));
      setNumDrilldownRows([]);
    } finally {
      setNumDrilldownLoading(false);
    }
  }, [notify]);

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

  /* ── Drilldown Detail Columns ──────────────────────────────── */
  const drilldownColumns = useMemo(() => {
    const wrap = { wrapText: true, autoHeight: true, wrapHeaderText: true, autoHeaderHeight: true, cellClass: 'yp-wrap-cell', cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' } };
    const cell = (content) => <div className="py-2 whitespace-normal break-words text-xs text-slate-700 dark:text-slate-300">{content}</div>;
    return [
      { headerName: 'S.No', field: 'sno', width: 70, minWidth: 65, maxWidth: 80, pinned: 'left', headerClass: 'text-center', cellClass: 'text-center font-mono font-bold yp-wrap-cell', ...wrap, valueGetter: (p) => (p.node?.rowIndex != null ? p.node.rowIndex + 1 : (p.data?.sno || '-')), cellRenderer: (p) => <div className="py-2 text-center font-mono font-bold text-xs">{p.value}</div> },
      { headerName: 'Goal (A1)', field: 'goal_a1', minWidth: 200, flex: 1.4, ...wrap, valueGetter: (p) => p.data?.['Goal (A1)'] || p.data?.goal_a1 || '-', cellRenderer: (p) => cell(p.value) },
      { headerName: 'Intervention (A2)', field: 'intervention_a2', minWidth: 200, flex: 1.4, ...wrap, valueGetter: (p) => p.data?.['Intervention (A2)'] || p.data?.intervention_a2 || '-', cellRenderer: (p) => cell(p.value) },
      { headerName: 'Action (A3)', field: 'action_a3', minWidth: 230, flex: 1.5, ...wrap, valueGetter: (p) => p.data?.['Action (A3)'] || p.data?.action_a3 || '-', cellRenderer: (p) => <div className="py-2 whitespace-normal break-words text-xs font-semibold text-slate-800 dark:text-slate-200">{p.value}</div> },
      { headerName: 'Goal (B1)', field: 'goal_b1', minWidth: 190, flex: 1.3, ...wrap, valueGetter: (p) => p.data?.['Goal (B1)'] || p.data?.goal_b1 || '-', cellRenderer: (p) => cell(p.value) },
      { headerName: 'Intervention (B2)', field: 'intervention_b2', minWidth: 200, flex: 1.4, ...wrap, valueGetter: (p) => p.data?.['Intervention (B2)'] || p.data?.intervention_b2 || '-', cellRenderer: (p) => cell(p.value) },
      { headerName: 'Action (B3)', field: 'action_b3', minWidth: 230, flex: 1.5, ...wrap, valueGetter: (p) => p.data?.['Action (B3)'] || p.data?.action_b3 || '-', cellRenderer: (p) => <div className="py-2 whitespace-normal break-words text-xs font-semibold text-slate-800 dark:text-slate-200">{p.value}</div> },
      {
        headerName: 'Expected Date', field: 'expected_date', minWidth: 130, width: 140, ...wrap, headerClass: 'text-center', cellClass: 'text-center yp-wrap-cell', cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => { const v = p.data?.['Expected Date'] || p.data?.expected_date; if (!v) return '-'; const d = new Date(v); return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); },
        cellRenderer: (p) => <div className="py-2 text-center text-xs">{p.value}</div>
      },
      {
        headerName: 'Physical Progress (%)', field: 'progress', minWidth: 130, width: 140, ...wrap, headerClass: 'text-center', cellClass: 'text-center font-semibold yp-wrap-cell', cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => { const v = p.data?.['Progress'] ?? p.data?.progress; return v != null ? Number(v) : '-'; },
        cellRenderer: (p) => <div className="py-2 text-center text-xs font-bold">{p.value !== '-' ? `${p.value}%` : '-'}</div>
      },
      {
        headerName: 'Total Cost (₹ Cr)', field: 'total_cost', width: 140, minWidth: 130, ...wrap, headerClass: 'text-right', cellClass: 'text-right font-bold font-mono yp-wrap-cell', cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => { const v = p.data?.total_cost != null ? p.data.total_cost : p.data?.['Total Cost']; return v != null ? Number(v) : 0; },
        cellRenderer: (p) => <div className="py-2 text-right font-mono font-bold text-xs">₹{Number(p.value || 0).toFixed(2)} Cr</div>
      }
    ];
  }, []);

  /* ── Number-Drilldown Columns (B-level items for one org) ──── */
  const numDrilldownColumns = useMemo(() => {
    const fieldMap = { B1: 'Goal (B1)', B2: 'Intervention (B2)', B3: 'Action (B3)' };
    const bField = fieldMap[numDrilldownLevel] || 'Goal (B1)';
    const wrap = { wrapText: true, autoHeight: true, cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.5' } };
    const cell = (content) => <div className="py-1.5 whitespace-normal break-words text-xs text-slate-700 dark:text-slate-300">{content}</div>;
    return [
      {
        headerName: 'S.No', field: 'sno', width: 70, minWidth: 65, maxWidth: 80,
        pinned: 'left', headerClass: 'text-center',
        cellClass: 'text-center font-mono font-bold text-stone-600 dark:text-stone-400',
        cellRenderer: (p) => <div className="py-1.5 text-center font-mono text-xs">{(p.node?.rowIndex ?? 0) + 1}</div>
      },
      {
        headerName: `Goal (${numDrilldownLevel})`, field: bField, minWidth: 320, flex: 2.5, ...wrap,
        wrapHeaderText: true, autoHeaderHeight: true,
        valueGetter: (p) => p.data?.[bField] || '-',
        cellRenderer: (p) => cell(p.value)
      },
      {
        headerName: 'Current Status', field: 'Current Status', minWidth: 140, width: 155, ...wrap,
        wrapHeaderText: true, autoHeaderHeight: true, headerClass: 'text-center', cellClass: 'text-center',
        valueGetter: (p) => p.data?.['Current Status'] || p.data?.current_status || '-',
        cellRenderer: (p) => <div className="py-1.5 text-center text-xs">{p.value}</div>
      },
      {
        headerName: 'Physical Progress (%)', field: 'Progress', width: 150, minWidth: 130, ...wrap,
        wrapHeaderText: true, autoHeaderHeight: true, headerClass: 'text-center', cellClass: 'text-center font-bold',
        valueGetter: (p) => { const v = p.data?.['Progress'] ?? p.data?.progress; return v != null ? Number(v) : '-'; },
        cellRenderer: (p) => <div className="py-1.5 text-center text-xs font-bold">{p.value !== '-' ? `${p.value}%` : '-'}</div>
      },
      {
        headerName: 'Target Completion Date', field: 'Expected Date', width: 170, minWidth: 150, ...wrap,
        wrapHeaderText: true, autoHeaderHeight: true, headerClass: 'text-center', cellClass: 'text-center',
        valueGetter: (p) => {
          const v = p.data?.['Expected Date'] || p.data?.['Target Date'] || p.data?.expected_date;
          if (!v) return '-';
          const d = new Date(v);
          return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        },
        cellRenderer: (p) => <div className="py-1.5 text-center text-xs">{p.value}</div>
      },
      {
        headerName: 'Last Updated', field: 'Last Updated Date', width: 150, minWidth: 130, ...wrap,
        wrapHeaderText: true, autoHeaderHeight: true, headerClass: 'text-center', cellClass: 'text-center',
        valueGetter: (p) => {
          const v = p.data?.['Last Updated Date'] || p.data?.updated_date;
          if (!v) return '-';
          const d = new Date(v);
          return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        },
        cellRenderer: (p) => <div className="py-1.5 text-center text-xs">{p.value}</div>
      },
    ];
  }, [numDrilldownLevel]);

  /* ── Wing Drilldown Columns (Org-Level B1/B2/B3 Summary) ─── */
  const wingDrilldownColumns = useMemo(() => {
    const numLink = (orgName, bLevel, updatedOnly, value) => (
      value > 0
        ? <span className="text-[#0f417a] dark:text-blue-400 font-bold hover:underline cursor-pointer" onClick={() => handleNumberClick(orgName, bLevel, updatedOnly, drilldownOrg)}>{value}</span>
        : <span className="font-mono">{value}</span>
    );
    const sNoCol = {
      headerName: 'S.No', field: 'sno', width: 70, minWidth: 65, maxWidth: 80,
      pinned: 'left', headerClass: 'text-center',
      cellClass: 'text-center font-mono font-bold text-stone-600 dark:text-stone-400',
      cellRenderer: (p) => <span>{(p.node?.rowIndex ?? 0) + 1}</span>
    };
    return [
      sNoCol,
      {
        headerName: 'Organisation Name', field: 'Organisation Name', minWidth: 260, flex: 2,
        pinned: 'left', headerClass: 'font-bold',
        cellClass: 'font-semibold text-stone-900 dark:text-stone-100',
      },
      { headerName: 'Total B1', field: 'Total B1', width: 110, headerClass: 'text-center', cellClass: 'text-center font-mono font-semibold', cellRenderer: (p) => numLink(p.data?.['Organisation Name'], 'B1', false, p.value) },
      { headerName: 'Updated B1', field: 'Updated B1', width: 115, headerClass: 'text-center', cellClass: updatedCellClass, cellRenderer: (p) => numLink(p.data?.['Organisation Name'], 'B1', true, p.value) },
      { headerName: 'Total B2', field: 'Total B2', width: 110, headerClass: 'text-center', cellClass: 'text-center font-mono font-semibold', cellRenderer: (p) => numLink(p.data?.['Organisation Name'], 'B2', false, p.value) },
      { headerName: 'Updated B2', field: 'Updated B2', width: 115, headerClass: 'text-center', cellClass: updatedCellClass, cellRenderer: (p) => numLink(p.data?.['Organisation Name'], 'B2', true, p.value) },
      { headerName: 'Total B3', field: 'Total B3', width: 110, headerClass: 'text-center', cellClass: 'text-center font-mono font-semibold', cellRenderer: (p) => numLink(p.data?.['Organisation Name'], 'B3', false, p.value) },
      { headerName: 'Updated B3', field: 'Updated B3', width: 115, headerClass: 'text-center', cellClass: updatedCellClass, cellRenderer: (p) => numLink(p.data?.['Organisation Name'], 'B3', true, p.value) },
      {
        headerName: 'Total Cost (₹ Cr)', field: 'Total Cost (In Cr)', minWidth: 160, flex: 1.2,
        cellClass: 'text-right font-mono font-black text-[#4b2424] dark:text-amber-300', headerClass: 'text-right',
        cellRenderer: (p) => fmtCurrency(p.value)
      }
    ];
  }, [handleNumberClick, drilldownOrg]);

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
              <span className="text-[#0f417a] dark:text-blue-400 font-bold hover:underline cursor-pointer" onClick={() => handleEntityClick(p.value, 'wing')}>
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
            return <span className="font-semibold text-stone-800 dark:text-stone-200">{p.value}</span>;
          }
        },
        { headerName: 'Total B1', field: 'Total B1', width: 110, headerClass: 'text-center', cellClass: 'text-center font-mono font-semibold' },
        { headerName: 'Updated B1', field: 'Updated B1', width: 115, headerClass: 'text-center', cellClass: updatedCellClass },
        { headerName: 'Total B2', field: 'Total B2', width: 110, headerClass: 'text-center', cellClass: 'text-center font-mono font-semibold' },
        { headerName: 'Updated B2', field: 'Updated B2', width: 115, headerClass: 'text-center', cellClass: updatedCellClass },
        { headerName: 'Total B3', field: 'Total B3', width: 110, headerClass: 'text-center', cellClass: 'text-center font-mono font-semibold' },
        { headerName: 'Updated B3', field: 'Updated B3', width: 115, headerClass: 'text-center', cellClass: updatedCellClass },
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
  }, [activeTabConfig, handleNumberClick]);

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
    <div className="space-y-3 animate-fade-in text-stone-800 dark:text-stone-100">

      {/* ── Toolbar: Dropdown tab selector + note ──────────────── */}
      <div className="flex items-center justify-between gap-3">
        {/* Sub-tab as dropdown */}
        <div className="relative">
          <select
            value={activeTabId}
            onChange={(e) => {
              setStatusReportTab(e.target.value);
              setDrilldownOrg(null);
              setDrilldownRows([]);
              setDrilldownType(null);
              setNumDrilldownOrg(null);
            }}
            className="appearance-none pl-3 pr-8 py-1.5 text-sm font-bold bg-teal-500 hover:bg-teal-600 text-white rounded cursor-pointer focus:outline-none transition-colors"
          >
            {SUB_TABS.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white" />
        </div>
      </div>

      {/* ── Note ───────────────────────────────────────────────── */}
      <p className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed">
        <strong className="text-rose-600 dark:text-rose-400">Note : </strong>
        Kindly note that the counts displayed in this report may not match the corresponding totals shown on the dashboard, as a single A1/A2/A3 item may be mapped to more than one wing. Therefore, this report is intended only to track whether A1/A2/A3 items are being updated and should not be used for any other analytical or progress-tracking purposes.
      </p>

      {/* ── Main Data Table or Drilldown ───────────────────────── */}
      <div className="relative">
        {numDrilldownOrg ? (
          /* Level 3: B-count number click → individual B items for one org */
          <ReportTable
            title={`${numDrilldownOrg} — ${numDrilldownUpdated ? 'Updated' : 'All'} ${numDrilldownLevel} Items`}
            subtitle={`${numDrilldownUpdated ? 'Updated' : 'Total'} Goal (${numDrilldownLevel}) items for ${numDrilldownOrg} (${numDrilldownRows.length} records)`}
            rawData={numDrilldownRows}
            viewData={numDrilldownRows}
            columns={numDrilldownColumns}
            loading={numDrilldownLoading}
            triggerNotification={triggerNotification}
            pagination={true}
            showBackButton={true}
            onBack={() => setNumDrilldownOrg(null)}
            themeClass="yp-pro-grid"
            brandColor="#4b2424"
            brandColorHover="#6b3535"
            accentColor="#f7f3f3"
            oddRowColor="#f8faf6"
            autoHeaderHeight={true}
          />
        ) : drilldownOrg ? (
          /* Level 2: wing/org name click */
          <ReportTable
            title={drilldownType === 'wing' ? `${drilldownOrg} — Wing Wise Data Entry Status` : `Detail — ${drilldownOrg}`}
            subtitle={drilldownType === 'wing'
              ? `Organisations under ${drilldownOrg} wing with their B1/B2/B3 data entry counts (${drilldownRows.length} organisations)`
              : `Action items for ${drilldownOrg} (${drilldownRows.length} records)`}
            rawData={drilldownRows}
            viewData={drilldownRows}
            columns={drilldownType === 'wing' ? wingDrilldownColumns : drilldownColumns}
            loading={drilldownLoading}
            triggerNotification={triggerNotification}
            pagination={true}
            showBackButton={true}
            onBack={() => { setDrilldownOrg(null); setDrilldownRows([]); setDrilldownType(null); }}
            themeClass="yp-pro-grid"
            brandColor="#4b2424"
            brandColorHover="#6b3535"
            accentColor="#f7f3f3"
            oddRowColor="#f8faf6"
            autoHeaderHeight={true}
          />
        ) : (
          <>
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
              pagination={true}
              themeClass="yp-pro-grid"
              brandColor="var(--module-report-brand-color, #4b2424)"
              brandColorHover="var(--module-report-brand-color-hover, #6b3535)"
              accentColor="var(--module-report-accent-color, #f7f3f3)"
              oddRowColor="var(--module-report-odd-row-bg, #f8faf6)"
              totalLabel="Total"
              toolbarExtra={toolbarExtra}
            />
            <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-stone-500 dark:text-stone-400">
              <span>Total Rows: <strong className="text-stone-800 dark:text-stone-200 font-mono">{filteredRows.length}</strong></span>
              <span className="text-[11px] font-medium text-stone-400">Data source: Drishti Portal (OVOD)</span>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
