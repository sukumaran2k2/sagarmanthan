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

/* ============================================================
   BASELINE DATASETS (Accurately matching screenshots & official baseline)
   ============================================================ */
const BASELINE_MINISTRY = [
  { "Wings": "Administration", "Total A1": 1, "Updated A1": 1, "Total A2": 1, "Updated A2": 1, "Total A3": 5, "Updated A3": 5, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "ALHW & Media", "Total A1": 1, "Updated A1": 1, "Total A2": 1, "Updated A2": 1, "Total A3": 4, "Updated A3": 4, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "Coord-I", "Total A1": 2, "Updated A1": 2, "Total A2": 3, "Updated A2": 3, "Total A3": 9, "Updated A3": 9, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "Development", "Total A1": 1, "Updated A1": 0, "Total A2": 1, "Updated A2": 0, "Total A3": 5, "Updated A3": 0, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "DGLL, Parliament & TRW", "Total A1": 2, "Updated A1": 1, "Total A2": 2, "Updated A2": 1, "Total A3": 8, "Updated A3": 3, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "Information Technology", "Total A1": 5, "Updated A1": 5, "Total A2": 7, "Updated A2": 7, "Total A3": 55, "Updated A3": 55, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "IWT", "Total A1": 2, "Updated A1": 2, "Total A2": 2, "Updated A2": 2, "Total A3": 9, "Updated A3": 9, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "Office of Economic Advisor", "Total A1": 2, "Updated A1": 1, "Total A2": 3, "Updated A2": 1, "Total A3": 11, "Updated A3": 1, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "Ports", "Total A1": 16, "Updated A1": 5, "Total A2": 34, "Updated A2": 8, "Total A3": 140, "Updated A3": 32, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "Sagarmala", "Total A1": 3, "Updated A1": 3, "Total A2": 12, "Updated A2": 5, "Total A3": 70, "Updated A3": 32, "Total Cost A3 (In Cr)": 0, "Total Cost B3 (In Cr)": 0, "Overall Total Cost (In Cr)": 0 },
  { "Wings": "Shipping", "Total A1": 25, "Updated A1": 11, "Total A2": 72, "Updated A2": 23, "Total A3": 215, "Updated A3": 60, "Total Cost A3 (In Cr)": 49119.04, "Total Cost B3 (In Cr)": 49119.04, "Overall Total Cost (In Cr)": 98238.08 }
];

const BASELINE_ORGANISATION = [
  { "Organisation Name": "Chennai Port Authority", "Total B1": 110, "Updated B1": 110, "Total B2": 121, "Updated B2": 121, "Total B3": 598, "Updated B3": 598, "Total Cost (In Cr)": 6040.11 },
  { "Organisation Name": "Cochin Port Authority", "Total B1": 99, "Updated B1": 99, "Total B2": 112, "Updated B2": 112, "Total B3": 539, "Updated B3": 539, "Total Cost (In Cr)": 3289.63 },
  { "Organisation Name": "Kamarajar Port Limited", "Total B1": 106, "Updated B1": 106, "Total B2": 119, "Updated B2": 119, "Total B3": 579, "Updated B3": 579, "Total Cost (In Cr)": 6150.45 },
  { "Organisation Name": "Syama Prasad Mookerjee Port", "Total B1": 1, "Updated B1": 0, "Total B2": 1, "Updated B2": 0, "Total B3": 1, "Updated B3": 0, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "Deendayal Port Authority", "Total B1": 95, "Updated B1": 95, "Total B2": 101, "Updated B2": 101, "Total B3": 470, "Updated B3": 470, "Total Cost (In Cr)": 5846.14 },
  { "Organisation Name": "New Mangalore Port Authority", "Total B1": 95, "Updated B1": 95, "Total B2": 108, "Updated B2": 108, "Total B3": 514, "Updated B3": 514, "Total Cost (In Cr)": 7040 },
  { "Organisation Name": "Mormugao Port Authority", "Total B1": 101, "Updated B1": 101, "Total B2": 114, "Updated B2": 114, "Total B3": 540, "Updated B3": 540, "Total Cost (In Cr)": 2297.21 },
  { "Organisation Name": "Mumbai Port Authority", "Total B1": 83, "Updated B1": 83, "Total B2": 97, "Updated B2": 97, "Total B3": 387, "Updated B3": 387, "Total Cost (In Cr)": 4145.00 },
  { "Organisation Name": "Jawaharlal Nehru Port Authority", "Total B1": 109, "Updated B1": 109, "Total B2": 119, "Updated B2": 119, "Total B3": 591, "Updated B3": 591, "Total Cost (In Cr)": 11696.11 },
  { "Organisation Name": "Paradip Port Authority", "Total B1": 105, "Updated B1": 105, "Total B2": 126, "Updated B2": 126, "Total B3": 611, "Updated B3": 611, "Total Cost (In Cr)": 21419.15 },
  { "Organisation Name": "V.O. Chidambaranar Port Authority", "Total B1": 104, "Updated B1": 104, "Total B2": 115, "Updated B2": 115, "Total B3": 541, "Updated B3": 541, "Total Cost (In Cr)": 101697.13 },
  { "Organisation Name": "Visakhapatnam Port Authority", "Total B1": 98, "Updated B1": 98, "Total B2": 107, "Updated B2": 107, "Total B3": 478, "Updated B3": 478, "Total Cost (In Cr)": 15286.54 },
  { "Organisation Name": "Ministry Of Ports, Shipping and Waterways", "Total B1": 2, "Updated B1": 1, "Total B2": 2, "Updated B2": 1, "Total B3": 6, "Updated B3": 5, "Total Cost (In Cr)": 49119.04 },
  { "Organisation Name": "Inland Waterways Authority of India", "Total B1": 68, "Updated B1": 68, "Total B2": 102, "Updated B2": 102, "Total B3": 507, "Updated B3": 507, "Total Cost (In Cr)": 30272.32 },
  { "Organisation Name": "Cochin Shipyard Limited", "Total B1": 30, "Updated B1": 30, "Total B2": 35, "Updated B2": 35, "Total B3": 141, "Updated B3": 141, "Total Cost (In Cr)": 2624.6 },
  { "Organisation Name": "Directorate General of Lighthouses and Lightships", "Total B1": 10, "Updated B1": 10, "Total B2": 10, "Updated B2": 10, "Total B3": 48, "Updated B3": 48, "Total Cost (In Cr)": 173.52 },
  { "Organisation Name": "Indian Port Rail & Ropeway Corporation Limited", "Total B1": 6, "Updated B1": 6, "Total B2": 6, "Updated B2": 6, "Total B3": 30, "Updated B3": 30, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "Director General of Shipping", "Total B1": 56, "Updated B1": 56, "Total B2": 70, "Updated B2": 70, "Total B3": 257, "Updated B3": 257, "Total Cost (In Cr)": 4946.95 },
  { "Organisation Name": "Sagarmala Finance Corporation Limited", "Total B1": 14, "Updated B1": 14, "Total B2": 14, "Updated B2": 14, "Total B3": 70, "Updated B3": 70, "Total Cost (In Cr)": 5.36 },
  { "Organisation Name": "Andaman, Lakshadweep Harbour Works", "Total B1": 5, "Updated B1": 5, "Total B2": 5, "Updated B2": 5, "Total B3": 25, "Updated B3": 25, "Total Cost (In Cr)": 3.04 },
  { "Organisation Name": "Indian Maritime University", "Total B1": 25, "Updated B1": 25, "Total B2": 32, "Updated B2": 32, "Total B3": 160, "Updated B3": 160, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "Dredging Corporation of India", "Total B1": 15, "Updated B1": 15, "Total B2": 19, "Updated B2": 19, "Total B3": 96, "Updated B3": 96, "Total Cost (In Cr)": 7597.51 },
  { "Organisation Name": "Gujarat Maritime Board", "Total B1": 4, "Updated B1": 0, "Total B2": 9, "Updated B2": 0, "Total B3": 51, "Updated B3": 0, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "IIT Chennai", "Total B1": 1, "Updated B1": 1, "Total B2": 2, "Updated B2": 2, "Total B3": 8, "Updated B3": 3, "Total Cost (In Cr)": 1 },
  { "Organisation Name": "Centre of Excellence in Maritime and Shipbuilding", "Total B1": 12, "Updated B1": 10, "Total B2": 15, "Updated B2": 13, "Total B3": 62, "Updated B3": 55, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "India Ports Global Limited", "Total B1": 115, "Updated B1": 115, "Total B2": 115, "Updated B2": 115, "Total B3": 687, "Updated B3": 683, "Total Cost (In Cr)": 1068 },
  { "Organisation Name": "SPV", "Total B1": 1, "Updated B1": 0, "Total B2": 1, "Updated B2": 0, "Total B3": 7, "Updated B3": 0, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "Krishnapatnam", "Total B1": 1, "Updated B1": 0, "Total B2": 1, "Updated B2": 0, "Total B3": 8, "Updated B3": 0, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "Kattupalli", "Total B1": 1, "Updated B1": 0, "Total B2": 1, "Updated B2": 0, "Total B3": 8, "Updated B3": 0, "Total Cost (In Cr)": 0 },
  { "Organisation Name": "HDC - SMPK", "Total B1": 125, "Updated B1": 125, "Total B2": 134, "Updated B2": 134, "Total B3": 680, "Updated B3": 680, "Total Cost (In Cr)": 2554.79 },
  { "Organisation Name": "KDS - SMPK", "Total B1": 125, "Updated B1": 125, "Total B2": 134, "Updated B2": 134, "Total B3": 680, "Updated B3": 680, "Total Cost (In Cr)": 1437.49 },
  { "Organisation Name": "NTCPWC, IITM", "Total B1": 1, "Updated B1": 1, "Total B2": 1, "Updated B2": 1, "Total B3": 1, "Updated B3": 1, "Total Cost (In Cr)": 36.15 }
];

const BASELINE_VIBHAS = [
  { "VIBHAS Cell": "Capacity building, outreach, Education", "Total A1": 5, "Updated A1": 5, "Total A2": 43, "Updated A2": 43, "Total A3": 45, "Updated A3": 25, "Total B1": 68, "Updated B1": 68, "Total B2": 83, "Updated B2": 83, "Total B3": 392, "Updated B3": 392, "Total Cost (In Cr)": 100.67 },
  { "VIBHAS Cell": "Communication", "Total A1": 4, "Updated A1": 4, "Total A2": 8, "Updated A2": 8, "Total A3": 0, "Updated A3": 0, "Total B1": 19, "Updated B1": 19, "Total B2": 20, "Updated B2": 20, "Total B3": 92, "Updated B3": 92, "Total Cost (In Cr)": 262.17 },
  { "VIBHAS Cell": "CSR & community outreach", "Total A1": 4, "Updated A1": 4, "Total A2": 9, "Updated A2": 9, "Total A3": 10, "Updated A3": 10, "Total B1": 7, "Updated B1": 7, "Total B2": 14, "Updated B2": 14, "Total B3": 64, "Updated B3": 64, "Total Cost (In Cr)": 868.48 },
  { "VIBHAS Cell": "Data analytics, statistics, knowledge repo...", "Total A1": 6, "Updated A1": 6, "Total A2": 14, "Updated A2": 14, "Total A3": 9, "Updated A3": 3, "Total B1": 59, "Updated B1": 59, "Total B2": 99, "Updated B2": 99, "Total B3": 286, "Updated B3": 286, "Total Cost (In Cr)": 48.1 },
  { "VIBHAS Cell": "Economic analysis, appraisal, policy meas...", "Total A1": 1, "Updated A1": 1, "Total A2": 5, "Updated A2": 5, "Total A3": 0, "Updated A3": 0, "Total B1": 15, "Updated B1": 15, "Total B2": 55, "Updated B2": 55, "Total B3": 150, "Updated B3": 150, "Total Cost (In Cr)": 0 },
  { "VIBHAS Cell": "Green initiatives including pollution com...", "Total A1": 4, "Updated A1": 4, "Total A2": 55, "Updated A2": 45, "Total A3": 58, "Updated A3": 8, "Total B1": 47, "Updated B1": 47, "Total B2": 467, "Updated B2": 467, "Total B3": 1851, "Updated B3": 1851, "Total Cost (In Cr)": 8355.44 },
  { "VIBHAS Cell": "Health, Safety, Security & Disaster Mana...", "Total A1": 7, "Updated A1": 7, "Total A2": 34, "Updated A2": 25, "Total A3": 44, "Updated A3": 0, "Total B1": 25, "Updated B1": 25, "Total B2": 207, "Updated B2": 207, "Total B3": 1589, "Updated B3": 1589, "Total Cost (In Cr)": 1027.25 },
  { "VIBHAS Cell": "Inter ministerial issues", "Total A1": 1, "Updated A1": 1, "Total A2": 2, "Updated A2": 2, "Total A3": 4, "Updated A3": 4, "Total B1": 0, "Updated B1": 0, "Total B2": 0, "Updated B2": 0, "Total B3": 0, "Updated B3": 0, "Total Cost (In Cr)": 0 },
  { "VIBHAS Cell": "International cooperation", "Total A1": 23, "Updated A1": 22, "Total A2": 60, "Updated A2": 44, "Total A3": 0, "Updated A3": 0, "Total B1": 60, "Updated B1": 60, "Total B2": 97, "Updated B2": 96, "Total B3": 954, "Updated B3": 929, "Total Cost (In Cr)": 1073.2 },
  { "VIBHAS Cell": "IT/E-governance", "Total A1": 5, "Updated A1": 4, "Total A2": 45, "Updated A2": 38, "Total A3": 35, "Updated A3": 5, "Total B1": 145, "Updated B1": 144, "Total B2": 232, "Updated B2": 231, "Total B3": 1151, "Updated B3": 1146, "Total Cost (In Cr)": 1226.7 },
  { "VIBHAS Cell": "Land, asset, port led industrialization", "Total A1": 2, "Updated A1": 2, "Total A2": 20, "Updated A2": 14, "Total A3": 45, "Updated A3": 15, "Total B1": 11, "Updated B1": 11, "Total B2": 142, "Updated B2": 142, "Total B3": 710, "Updated B3": 710, "Total Cost (In Cr)": 3182.21 },
  { "VIBHAS Cell": "Legal (arbitration - shipping + Institution...", "Total A1": 4, "Updated A1": 4, "Total A2": 11, "Updated A2": 7, "Total A3": 54, "Updated A3": 35, "Total B1": 0, "Updated B1": 0, "Total B2": 0, "Updated B2": 0, "Total B3": 0, "Updated B3": 0, "Total Cost (In Cr)": 0 },
  { "VIBHAS Cell": "Maritime Finance, Insurance, Leasing, Ownership and Registration", "Total A1": 6, "Updated A1": 6, "Total A2": 37, "Updated A2": 26, "Total A3": 52, "Updated A3": 2, "Total B1": 25, "Updated B1": 25, "Total B2": 37, "Updated B2": 36, "Total B3": 51, "Updated B3": 50, "Total Cost (In Cr)": 17.6 },
  { "VIBHAS Cell": "Media and public outreach", "Total A1": 3, "Updated A1": 2, "Total A2": 8, "Updated A2": 2, "Total A3": 40, "Updated A3": 7, "Total B1": 1, "Updated B1": 1, "Total B2": 13, "Updated B2": 13, "Total B3": 65, "Updated B3": 65, "Total Cost (In Cr)": 0 },
  { "VIBHAS Cell": "New Technology & Innovation/Research/Startups and Entrepreneurship", "Total A1": 3, "Updated A1": 3, "Total A2": 24, "Updated A2": 16, "Total A3": 44, "Updated A3": 2, "Total B1": 30, "Updated B1": 30, "Total B2": 31, "Updated B2": 31, "Total B3": 149, "Updated B3": 144, "Total Cost (In Cr)": 14.75 },
  { "VIBHAS Cell": "Projects and schemes, PPP", "Total A1": 6, "Updated A1": 5, "Total A2": 18, "Updated A2": 15, "Total A3": 14, "Updated A3": 6, "Total B1": 14, "Updated B1": 14, "Total B2": 80, "Updated B2": 77, "Total B3": 635, "Updated B3": 612, "Total Cost (In Cr)": 91531.26 },
  { "VIBHAS Cell": "Ship building, repair and recycling", "Total A1": 5, "Updated A1": 5, "Total A2": 41, "Updated A2": 23, "Total A3": 51, "Updated A3": 0, "Total B1": 25, "Updated B1": 23, "Total B2": 32, "Updated B2": 30, "Total B3": 106, "Updated B3": 87, "Total Cost (In Cr)": 7424.6 },
  { "VIBHAS Cell": "States", "Total A1": 4, "Updated A1": 4, "Total A2": 4, "Updated A2": 4, "Total A3": 0, "Updated A3": 0, "Total B1": 4, "Updated B1": 4, "Total B2": 24, "Updated B2": 24, "Total B3": 120, "Updated B3": 120, "Total Cost (In Cr)": 0 },
  { "VIBHAS Cell": "Tourism and ferries", "Total A1": 5, "Updated A1": 5, "Total A2": 9, "Updated A2": 8, "Total A3": 14, "Updated A3": 9, "Total B1": 5, "Updated B1": 5, "Total B2": 20, "Updated B2": 20, "Total B3": 83, "Updated B3": 83, "Total Cost (In Cr)": 1430.85 },
  { "VIBHAS Cell": "Traffic, cargo operation", "Total A1": 6, "Updated A1": 6, "Total A2": 34, "Updated A2": 28, "Total A3": 30, "Updated A3": 0, "Total B1": 30, "Updated B1": 30, "Total B2": 245, "Updated B2": 238, "Total B3": 1222, "Updated B3": 1187, "Total Cost (In Cr)": 70247.41 }
];

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
  const [activeTabId, setActiveTabId] = useState('ministry');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const activeTabConfig = useMemo(() => {
    return SUB_TABS.find(t => t.id === activeTabId) || SUB_TABS[0];
  }, [activeTabId]);

  /* ── Fetch Data with Baseline Fallback ──────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOvdStatusReport(activeTabConfig.apiType);
      const rows = res?.rowData || res?.data || (Array.isArray(res) ? res : []);
      if (rows && rows.length > 0) {
        setData(rows);
      } else {
        // Fallback to baseline matching active tab
        if (activeTabConfig.id === 'ministry') setData(BASELINE_MINISTRY);
        else if (activeTabConfig.id === 'organization') setData(BASELINE_ORGANISATION);
        else setData(BASELINE_VIBHAS);
      }
    } catch (err) {
      console.warn('Could not fetch remote status data, falling back to baseline:', err);
      if (activeTabConfig.id === 'ministry') setData(BASELINE_MINISTRY);
      else if (activeTabConfig.id === 'organization') setData(BASELINE_ORGANISATION);
      else setData(BASELINE_VIBHAS);
    } finally {
      setLoading(false);
    }
  }, [activeTabConfig]);

  useEffect(() => {
    loadData();
    setSearchQuery('');
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
          onChange={(e) => setSearchQuery(e.target.value)}
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
                onClick={() => setActiveTabId(tab.id)}
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
          brandColor="#4b2424"
          brandColorHover="#6b3535"
          accentColor="#f7f3f3"
          oddRowColor="#fbf9f8"
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
