import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Building2,
  Anchor,
  Network,
  Layers,
  TrendingUp,
  Coins,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Filter,
  ChevronDown,
  RotateCcw,
  X,
  Tag
} from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import { fetchOvdOrgListData, getUserIdFromToken } from '../api';
import { OVOD_VISIONS } from '../utils/constants';
import { useShallow } from 'zustand/react/shallow';
import { useOvodStore } from '../store/useOvodStore';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

/* ============================================================
   REPORT CONFIGURATION (Matching MIV 2030 Structure)
   ============================================================ */
const REPORTS = [
  {
    id: 'wing',
    code: 'Report 1.1',
    label: 'MOPSW Wing',
    fullTitle: 'Report No. 1.1 - MOPSW Wing Action Items (A3) & Status Report - Drishti Portal (OVOD)',
    icon: Building2
  },
  {
    id: 'port',
    code: 'Report 1.2',
    label: 'Major Ports',
    fullTitle: 'Report No. 1.2 - Major Ports Performance Ranking Report - Drishti Portal (OVOD)',
    icon: Anchor
  },
  {
    id: 'org',
    code: 'Report 1.3',
    label: 'Other Organisations',
    fullTitle: 'Report No. 1.3 - Other Organisations Performance Ranking Report - Drishti Portal (OVOD)',
    icon: Network
  },
];

// Baseline data matching the official Ministry baseline dataset
const BASELINE_WINGS_REPORT = [
  {
    rank: 1,
    name: 'Administration',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 2,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 100
  },
  {
    rank: 2,
    name: 'Coord-I',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 1,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 100
  },
  {
    rank: 3,
    name: 'Information Technology',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 30,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 100
  },
  {
    rank: 4,
    name: 'ALHW & Media',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 2,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 50
  },
  {
    rank: 5,
    name: 'DGLL, Parliament & TRW',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 1,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 2,
    total_cost: 0,
    score: 43.75
  },
  {
    rank: 6,
    name: 'Sagarmala',
    yet_to_start: 7,
    on_time: 3,
    delayed: 0,
    completed: 13,
    not_applicable: 0,
    dropped: 1,
    yet_to_update: 41,
    total_cost: 0,
    score: 34.86
  },
  {
    rank: 7,
    name: 'IWT',
    yet_to_start: 6,
    on_time: 1,
    delayed: 0,
    completed: 5,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 30.56
  },
  {
    rank: 8,
    name: 'Shipping',
    yet_to_start: 12,
    on_time: 33,
    delayed: 0,
    completed: 30,
    not_applicable: 0,
    dropped: 3,
    yet_to_update: 147,
    total_cost: 49119.04,
    score: 27.93
  },
  {
    rank: 9,
    name: 'Ports',
    yet_to_start: 1,
    on_time: 19,
    delayed: 2,
    completed: 10,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 108,
    total_cost: 0,
    score: 25.93
  },
  {
    rank: 10,
    name: 'Office of Economic Advisor',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 1,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 10,
    total_cost: 0,
    score: 18.18
  },
  {
    rank: 11,
    name: 'Development',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 0,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 5,
    total_cost: 0,
    score: 10
  },
  {
    rank: 12,
    name: 'Finance',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 0,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 0
  },
  {
    rank: 13,
    name: 'Coord-II',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 0,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 0
  },
  {
    rank: 14,
    name: 'Vigilance',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 0,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 0
  },
  {
    rank: 15,
    name: 'Special Initiatives & Projects',
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 0,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0,
    score: 0
  }
];

// Canonical list of Major Ports shown in Report 1.2. Each entry carries aliases
// so matching is robust against the DB's spelling variations (e.g. the SMPK
// subsidiaries are stored as "SMPA - Haldia Dock Complex" / "SMPA - Kolkata
// Dock System"). Kolkata Port (SMPA) was replaced by its component rows —
// HDC - SMPK, KDS - SMPK, and the umbrella Syama Prasad Mookeerjii Port — on
// the 2026-11-24 revision. Each alias list is disjoint so a DB row is counted
// under exactly one port row.
const MAJOR_PORTS = [
  { label: 'Chennai Port Authority', aliases: ['chennai port authority'] },
  { label: 'Cochin Port Authority', aliases: ['cochin port authority'] },
  { label: 'Deendayal Port Authority (Kandla)', aliases: ['deendayal port authority'] },
  { label: 'HDC - SMPK', aliases: ['hdc smpk', 'smpa haldia dock complex', 'haldia dock complex'] },
  { label: 'Jawaharlal Nehru Port Authority (JNPA)', aliases: ['jawaharlal nehru port authority'] },
  { label: 'Kamarajar Port Limited', aliases: ['kamarajar port limited'] },
  { label: 'KDS - SMPK', aliases: ['kds smpk', 'smpa kolkata dock system', 'kolkata dock system'] },
  { label: 'Mormugao Port Authority', aliases: ['mormugao port authority'] },
  { label: 'Mumbai Port Authority', aliases: ['mumbai port authority'] },
  { label: 'New Mangalore Port Authority', aliases: ['new mangalore port authority'] },
  { label: 'Paradip Port Authority', aliases: ['paradip port authority'] },
  { label: 'Syama Prasad Mookeerjii Port', aliases: ['syama prasad mookeerjii port'] },
  { label: 'V.O. Chidambaranar Port Authority (VOC Port)', aliases: ['v o chidambaranar port authority'] },
  { label: 'Visakhapatnam Port Authority', aliases: ['visakhapatnam port authority'] }
];

// Normalize an organisation name for robust matching across spelling variations
// (acronym suffix in parens, '&' vs 'and', commas, extra whitespace). Used for
// both Major Ports and Other Organisations.
const normalizeOrgName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\s*\([^)]*\)\s*/g, ' ')   // strip "(SCI)" style acronyms
    .replace(/[-.,'"`]/g, ' ')          // hyphens → space so "HDC - SMPK" and "HDC-SMPK" collapse the same way
    .replace(/\s+/g, ' ')
    .trim();

const matchesAliases = (dbName, aliases) => {
  const n = normalizeOrgName(dbName);
  if (!n) return false;
  return aliases.some(
    (a) => n === a || n.startsWith(a + ' ') || a.startsWith(n + ' ')
  );
};

// Canonical list of "Other Organisations" per the Ministry 2.0 Drishti Portal
// baseline (Report 1.3). Each entry carries aliases so we catch spelling
// variations in the implementing-agency table. Using an explicit allowlist
// also prevents Major Port subsidiaries (KDS-SMPK, HDC-SMPK, …) from leaking
// into this report.
const OTHER_ORGS = [
  {
    label: 'Shipping Corporation of India',
    aliases: [
      'shipping corporation of india',
      'shipping corporation of india limited',
      'sci'
    ]
  },
  {
    label: 'Cochin Shipyard Limited',
    aliases: ['cochin shipyard limited', 'cochin shipyard', 'csl']
  },
  {
    label: 'Directorate General of Lighthouses and Lightships',
    aliases: ['directorate general of lighthouses and lightships', 'dgll']
  },
  {
    label: 'Directorate General of Shipping',
    aliases: [
      'directorate general of shipping',
      'director general of shipping',
      'dgs'
    ]
  },
  {
    label: 'Indian Maritime University',
    aliases: ['indian maritime university', 'imu']
  },
  {
    label: 'Dredging Corporation of India',
    aliases: [
      'dredging corporation of india',
      'dredging corporation of india limited',
      'dci'
    ]
  },
  {
    label: 'Andaman, Lakshadweep Harbour Works',
    aliases: [
      'andaman lakshadweep harbour works',
      'andaman and lakshadweep harbour works',
      'alhw'
    ]
  },
  {
    label: 'Inland Waterways Authority of India',
    aliases: ['inland waterways authority of india', 'iwai']
  },
  {
    label: 'Indian Port Rail & Ropeway Corporation Limited',
    aliases: [
      'indian port rail and ropeway corporation limited',
      'indian port rail and ropeway corporation',
      'iprcl'
    ]
  },
  {
    label: 'Indian Port Association',
    aliases: ['indian port association', 'indian ports association', 'ipa']
  },
  {
    label: 'Sagarmala Finance Corporation Limited',
    aliases: ['sagarmala finance corporation limited', 'sfcl']
  },
  {
    label: 'Ministry Of Ports, Shipping and Waterways',
    aliases: [
      'ministry of ports shipping and waterways',
      'mopsw',
      'mops and w'
    ]
  },
  {
    label: 'NTCPWC, IITM',
    aliases: [
      'ntcpwc iitm',
      'ntcpwc',
      'national technology centre for ports waterways and coasts iitm',
      'national technology centre for ports waterways and coasts'
    ]
  }
];

// Classify a DB row's Current Status into one of the seven report buckets.
// Matches 2.0's behaviour: explicit "Yet to be Updated" rows, NULL / blank
// statuses, and any other unrecognised string all fall through to the YTU
// bucket. (The earlier DGS issue — YTU=4 vs 2.0's YTU=0 — was NOT null-status
// rows; it was A3-only rows with no Action (B3) that the Port/Org branches
// should never have been counting. The B3 filter in those branches excludes
// them now, so this classifier can safely catch MoPSW's 1 legitimate YTU row
// without re-introducing DGS's 4 phantoms.)
const classifyStatus = (status) => {
  const s = String(status || '').toLowerCase().trim();
  if (s.includes('completed')) return 'completed';
  if (s.includes('on time') || s.includes('on track')) return 'on_time';
  if (s.includes('delayed')) return 'delayed';
  if (s.includes('yet to be started') || s.includes('yet to start')) return 'yet_to_start';
  if (s.includes('not applicable')) return 'not_applicable';
  if (s.includes('dropped')) return 'dropped';
  return 'yet_to_update';
};

// Aggregate status counts + total cost for a set of rows, applying the
// null-status exclusion above.
const aggregateCounts = (rows) => {
  const acc = {
    yet_to_start: 0,
    on_time: 0,
    delayed: 0,
    completed: 0,
    not_applicable: 0,
    dropped: 0,
    yet_to_update: 0,
    total_cost: 0
  };
  rows.forEach((item) => {
    const bucket = classifyStatus(item['Current Status'] ?? item.current_status);
    acc[bucket]++;
    // The backend query aliases the column as [Total Cost], so the row key
    // has a space; fall back to a snake_case form just in case.
    const c = Number(item['Total Cost'] ?? item.total_cost ?? 0);
    if (!isNaN(c)) acc.total_cost += c;
  });
  return acc;
};

// Weighted Implementation Score (Ministry 2.0 weights, verified against the
// official Drishti Portal Report 1.3 snapshot on 23-11-2026):
//   Completed 100, On Time 75, Delayed 50, Yet to Start 25, Yet to Update 10
// Not Applicable and Dropped are excluded from both numerator and denominator.
// Spot-checks that pin the weights down:
//   MoPSW  (C=1, OT=1, YTS=3, YTU=1)        → 260/6   = 43.33%
//   IWAI   (C=235,OT=61,D=5,YTS=125,YTU=2)  → 31470/428 = 73.53%
//   Cochin (C=106,OT=7,YTS=4)               → 11225/117 = 95.94%
const weightedScore = (counts) => {
  const denom =
    counts.completed +
    counts.on_time +
    counts.delayed +
    counts.yet_to_start +
    counts.yet_to_update;
  if (denom <= 0) return 0;
  const num =
    counts.completed * 100 +
    counts.on_time * 75 +
    counts.delayed * 50 +
    counts.yet_to_start * 25 +
    counts.yet_to_update * 10;
  return num / denom;
};

// Rank a list of computed report rows by weighted score (descending) and
// re-assign the Rank column so the leader board matches 2.0's ordering.
const rankByScoreDesc = (rows) =>
  [...rows]
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .map((r, idx) => ({ ...r, rank: idx + 1 }));

export default function Reports({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);

  // Active sub-tab ('wing' | 'port' | 'org'), vision filter and panel state live in the OVOD
  // store so they survive switching tabs
  const { activeTab, selectedVision, showFilterPanel } = useOvodStore(useShallow((s) => s.reports));
  const { setReportsTab, setReportsVision, setReportsFilterPanel } = useOvodStore(useShallow((s) => ({
    setReportsTab: s.setReportsTab,
    setReportsVision: s.setReportsVision,
    setReportsFilterPanel: s.setReportsFilterPanel
  })));
  const [loading, setLoading] = useState(false);

  // Raw dataset from database for real-time aggregation and drill-down
  const [allRows, setAllRows] = useState([]);
  
  // Drilldown Target
  const [drilldownTarget, setDrilldownTarget] = useState(null);

  const activeReportConfig = useMemo(
    () => REPORTS.find((r) => r.id === activeTab) || REPORTS[0],
    [activeTab]
  );

  const handleTabChange = (newTab) => {
    setReportsTab(newTab);
    setDrilldownTarget(null);
  };

  /* ── Formatter Helpers matching MIV 2030 ───────────────────── */
  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '0';
    return Number(value).toLocaleString('en-IN');
  };

  const formatInvestment = (value) => {
    if (value === null || value === undefined || value === '' || Number(value) === 0) return '0.00';
    return Number(value).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Fetch complete dataset
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      const res = await fetchOvdOrgListData(userId);
      const rows = Array.isArray(res) ? res : (res?.data || []);
      setAllRows(rows);
    } catch (err) {
      console.warn("OVOD Reports dataset notice:", err.message);
      notify(COMMON_TOASTS.loadFailed('The report data'));
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Compute Report Data based on activeTab & selectedVision
  const reportRows = useMemo(() => {
    if (activeTab === 'wing') {
      return BASELINE_WINGS_REPORT.map((w) => {
        const matched = allRows.filter((r) => {
          const a3 = r['Action (A3)'] || r.action_a3;
          if (!a3) return false;

          const rw = String(r.Wing || r.wing || '').toLowerCase().trim();
          if (!rw) return false;
          const target = w.name.toLowerCase();
          if (rw !== target) return false;

          const miv = String(r['Part of MIV'] ?? r.is_miv ?? '').toLowerCase();
          const makv = String(r['Part of MAKV'] ?? r.is_makv ?? '').toLowerCase();
          const sgos = String(r['Part of SGOS'] ?? r.is_sgos ?? '').toLowerCase();
          const addItem = String(r.is_additional_item ?? '').toLowerCase();
          if (selectedVision === '1' && miv !== 'yes' && miv !== '1' && !String(r['Goal (A1)'] || r.goal_a1 || '').includes('MIV')) return false;
          if (selectedVision === '2' && makv !== 'yes' && makv !== '1' && !String(r['Goal (A1)'] || r.goal_a1 || '').includes('MAKV')) return false;
          if (selectedVision === '3' && sgos !== 'yes' && sgos !== '1' && !String(r['Goal (A1)'] || r.goal_a1 || '').includes('SGOS')) return false;
          if (selectedVision === '4' && addItem !== '1' && addItem !== 'yes') return false;

          return true;
        });

        if (matched.length > 0) {
          const counts = aggregateCounts(matched);
          const sc = weightedScore(counts);
          return {
            ...w,
            ...counts,
            total_cost: Math.round(counts.total_cost * 100) / 100,
            score: Math.round(sc * 100) / 100,
            matchedItems: matched
          };
        }

        return {
          ...w,
          matchedItems: matched
        };
      });
    }

    if (activeTab === 'port') {
      const portRows = MAJOR_PORTS.map((port) => {
        // Report 1.2 is scoped to Action (B3) items (organisation-level
        // actions), matching 2.0's "Major Ports-wise Action Items (B3) & Status"
        // report. A row with no Action (B3) belongs to the A3 wing report
        // (Report 1.1) and must not be counted here.
        const matched = allRows.filter((r) => {
          const b3 = r['Action (B3)'] || r.action_b3;
          if (!b3) return false;
          return matchesAliases(r.ia_name || r.organisation_name, port.aliases);
        });

        const counts = aggregateCounts(matched);
        const sc = weightedScore(counts);

        return {
          name: port.label,
          ...counts,
          total_cost: Math.round(counts.total_cost * 100) / 100,
          score: Math.round(sc * 100) / 100,
          matchedItems: matched
        };
      });

      // Rank by weighted score (descending) to match 2.0's leader-board ordering
      return rankByScoreDesc(portRows);
    }

    if (activeTab !== 'org') return [];

    const orgRows = OTHER_ORGS.map((org) => {
      // Report 1.3 is scoped to Action (B3) items only, matching 2.0's
      // "Non-Port Organisations & PSUs-wise Action Items (B3) & Status" report.
      // Without this filter, orgs like MoPSW pick up their Wing-level A3
      // items too (seen as 203 items / ₹49,119 Cr instead of 6 items on the
      // 23-11-2026 snapshot), which inflates the ranking.
      const matched = allRows.filter((r) => {
        const b3 = r['Action (B3)'] || r.action_b3;
        if (!b3) return false;
        return matchesAliases(r.ia_name || r.organisation_name, org.aliases);
      });

      const counts = aggregateCounts(matched);
      const sc = weightedScore(counts);

      return {
        name: org.label,
        ...counts,
        total_cost: Math.round(counts.total_cost * 100) / 100,
        score: Math.round(sc * 100) / 100,
        matchedItems: matched
      };
    });

    // Rank by weighted score (descending) to match the 2.0 Drishti Portal
    // "Other Organisations Performance Ranking Report" leader board.
    return rankByScoreDesc(orgRows);
  }, [activeTab, selectedVision, allRows]);

  // Handle drill-down trigger
  const handleCellClick = (row, statusKey, statusLabel) => {
    const count = row[statusKey];
    if (!count || count === 0) return;

    const rowName = row.name.toLowerCase().trim();
    let items = (row.matchedItems && row.matchedItems.length > 0)
      ? row.matchedItems
      : allRows.filter((r) => {
          const rw = String(r.Wing || r.wing || r.ia_name || r.organisation_name || '').toLowerCase().trim();
          return rw === rowName || rw.startsWith(rowName.split('(')[0].trim()) || rowName.startsWith(rw.split('(')[0].trim());
        });

    // Use the same classifier the aggregate counts use so the drill-down list
    // size always matches the clicked cell's count. In particular, "Yet To Be
    // Updated" shows ONLY rows with an explicit "Yet to be Updated" status —
    // null / blank statuses are excluded from the report entirely.
    items = items.filter(
      (i) => classifyStatus(i['Current Status'] ?? i.current_status) === statusKey
    );

    setDrilldownTarget({
      entityName: row.name,
      statusKey,
      statusLabel,
      items: (items.length > 0 ? items : (row.matchedItems || [])).map((item, idx) => ({
        ...item,
        sno: idx + 1
      }))
    });
  };

  /* ── 6 KPI Summary Cards Calculation matching MIV 2030 ────── */
  const kpis = useMemo(() => {
    const data = reportRows;
    if (!data || data.length === 0) {
      return {
        totalActions: 0,
        totalCost: 0,
        completed: 0,
        onTime: 0,
        delayed: 0,
        yetToStartOrUpdate: 0
      };
    }

    const totalActions = data.reduce((sum, r) => 
      sum + Number(r.completed || 0) + Number(r.on_time || 0) + Number(r.delayed || 0) + Number(r.yet_to_start || 0) + Number(r.yet_to_update || 0) + Number(r.dropped || 0) + Number(r.not_applicable || 0), 0);
    const totalCost = data.reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
    const completed = data.reduce((sum, r) => sum + Number(r.completed || 0), 0);
    const onTime = data.reduce((sum, r) => sum + Number(r.on_time || 0), 0);
    const delayed = data.reduce((sum, r) => sum + Number(r.delayed || 0), 0);
    const yetToStartOrUpdate = data.reduce((sum, r) => sum + Number(r.yet_to_start || 0) + Number(r.yet_to_update || 0), 0);

    return {
      totalActions,
      totalCost,
      completed,
      onTime,
      delayed,
      yetToStartOrUpdate
    };
  }, [reportRows]);


  /* ── Subtitle matching MIV 2030 ───────────────────────────── */
  const subtitle = useMemo(() => {
    const d = new Date();
    const formattedDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    const formattedMonth = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return (
      <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400">
        <span>As on date: <strong style={{ color: '#4b2424' }} className="font-extrabold">{formattedDate}</strong></span>
        <span>•</span>
        <span>Report for the month: <strong style={{ color: '#4b2424' }} className="font-extrabold">{formattedMonth}</strong></span>
      </div>
    );
  }, []);

  /* ── Filter Panel JSX matching MIV 2030 ────────────────────── */
  const filterPanel = showFilterPanel ? (
    <div className="space-y-3 select-none p-1">
      <div className="flex items-center justify-between pb-2 border-b border-amber-900/10 dark:border-amber-500/20">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-[#4b2424] dark:text-amber-400" />
          <span className="text-xs font-black text-[#4b2424] dark:text-amber-200 uppercase tracking-wider">
            Filter Report by Vision
          </span>
          {selectedVision !== '0' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#4b2424] text-white dark:bg-amber-500 dark:text-slate-900">
              1 Active
            </span>
          )}
        </div>
        {selectedVision !== '0' && (
          <button
            type="button"
            onClick={() => setReportsVision('0')}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer transition"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset Filter</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
            <span>Vision</span>
          </label>
          <select
            value={selectedVision}
            onChange={(e) => setReportsVision(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-[#8c4242]/30 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#8c4242]/40 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="0">-- All Visions --</option>
            {OVOD_VISIONS.filter(v => v.id !== '0').map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  /* ── Toolbar Extra: Filter Button + Legends matching MIV ──── */
  const toolbarExtra = (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => setReportsFilterPanel((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
          showFilterPanel || selectedVision !== '0'
            ? 'bg-[#f7f3f3] border-[#4b2424] text-[#4b2424] dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <Filter className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
        <span>Filter</span>
        {selectedVision !== '0' && (
          <span className="bg-[#4b2424] dark:bg-amber-500 text-white dark:text-slate-900 text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
            1
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`}
        />
      </button>

      {selectedVision !== '0' && (
        <button
          type="button"
          onClick={() => setReportsVision('0')}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      )}

      {/* Score Legend Badges matching MIV 2030 */}
      <div className="hidden sm:flex items-center space-x-3 text-xs font-semibold pl-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#bbf7d0] dark:bg-emerald-950/70 border border-emerald-400/60 text-slate-900 dark:text-emerald-200 text-[11px] font-bold shadow-2xs">
          <CheckCircle2 size={13} className="text-emerald-700 dark:text-emerald-400" />
          <span>On Track — ≥ 50%</span>
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#fecaca] dark:bg-rose-950/70 border border-rose-300/60 text-slate-900 dark:text-rose-200 text-[11px] font-bold shadow-2xs">
          <AlertTriangle size={13} className="text-rose-700 dark:text-rose-400" />
          <span>Below Target — &lt; 50%</span>
        </span>
      </div>
    </div>
  );

  /* ── Report Summary Columns ────────────────────────────────── */
  const columns = useMemo(() => [
    {
      headerName: 'Rank',
      field: 'rank',
      width: 75,
      minWidth: 70,
      maxWidth: 85,
      pinned: 'left',
      cellClass: 'font-mono text-center font-bold text-slate-700 dark:text-slate-300 yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => (
        <div className="py-2.5 whitespace-normal break-words leading-relaxed text-center font-mono font-bold text-xs text-slate-700 dark:text-slate-300">
          {p.node?.rowPinned ? '' : (p.value || (p.node?.rowIndex != null ? p.node.rowIndex + 1 : ''))}
        </div>
      )
    },
    {
      headerName: activeTab === 'wing' ? 'Wing' : activeTab === 'port' ? 'Major Port' : 'Organisation',
      field: 'name',
      flex: 2,
      minWidth: 220,
      pinned: 'left',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellClass: 'yp-wrap-cell',
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (!p.value || p.node?.rowPinned) {
          return (
            <div className="py-2.5 whitespace-normal break-words leading-relaxed">
              <strong style={{ color: '#4b2424' }} className="font-extrabold dark:text-amber-300">{p.value || 'Total'}</strong>
            </div>
          );
        }
        return (
          <div className="py-2.5 whitespace-normal break-words leading-relaxed font-bold text-xs text-slate-800 dark:text-slate-100">
            {p.value}
          </div>
        );
      }
    },
    {
      headerName: 'Yet To Be Started',
      field: 'yet_to_start',
      width: 130,
      minWidth: 110,
      cellClass: 'text-center yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-center font-bold text-slate-800 dark:text-slate-200">{p.value ?? 0}</div>;
        const val = p.value ?? 0;
        return (
          <div className="py-2.5 whitespace-normal break-words text-center">
            <button
              type="button"
              onClick={() => handleCellClick(p.data, 'yet_to_start', 'Yet To Be Started')}
              className={`font-semibold cursor-pointer ${val > 0 ? 'text-[#4b2424] dark:text-amber-300 underline hover:opacity-80 font-bold' : 'text-slate-400'}`}
            >
              {val}
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Implementation - On Time',
      field: 'on_time',
      width: 165,
      minWidth: 130,
      cellClass: 'text-center yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-center font-bold text-slate-800 dark:text-slate-200">{p.value ?? 0}</div>;
        const val = p.value ?? 0;
        return (
          <div className="py-2.5 whitespace-normal break-words text-center">
            <button
              type="button"
              onClick={() => handleCellClick(p.data, 'on_time', 'Implementation - On Time')}
              className={`font-semibold cursor-pointer ${val > 0 ? 'text-[#4b2424] dark:text-amber-300 underline hover:opacity-80 font-bold' : 'text-slate-400'}`}
            >
              {val}
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Implementation - Delayed',
      field: 'delayed',
      width: 165,
      minWidth: 130,
      cellClass: 'text-center yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-center font-bold text-slate-800 dark:text-slate-200">{p.value ?? 0}</div>;
        const val = p.value ?? 0;
        return (
          <div className="py-2.5 whitespace-normal break-words text-center">
            <button
              type="button"
              onClick={() => handleCellClick(p.data, 'delayed', 'Implementation - Delayed')}
              className={`font-semibold cursor-pointer ${val > 0 ? 'text-[#4b2424] dark:text-amber-300 underline hover:opacity-80 font-bold' : 'text-slate-400'}`}
            >
              {val}
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Completed',
      field: 'completed',
      width: 110,
      minWidth: 95,
      cellClass: 'text-center yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-center font-bold text-emerald-700 dark:text-emerald-400">{p.value ?? 0}</div>;
        const val = p.value ?? 0;
        return (
          <div className="py-2.5 whitespace-normal break-words text-center">
            <button
              type="button"
              onClick={() => handleCellClick(p.data, 'completed', 'Completed')}
              className={`font-semibold cursor-pointer ${val > 0 ? 'text-[#4b2424] dark:text-amber-300 underline hover:opacity-80 font-bold' : 'text-slate-400'}`}
            >
              {val}
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Not Applicable',
      field: 'not_applicable',
      width: 120,
      minWidth: 100,
      cellClass: 'text-center yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-center font-bold text-slate-800 dark:text-slate-200">{p.value ?? 0}</div>;
        const val = p.value ?? 0;
        return (
          <div className="py-2.5 whitespace-normal break-words text-center">
            <button
              type="button"
              onClick={() => handleCellClick(p.data, 'not_applicable', 'Not Applicable')}
              className={`font-semibold cursor-pointer ${val > 0 ? 'text-[#4b2424] dark:text-amber-300 underline hover:opacity-80 font-bold' : 'text-slate-400'}`}
            >
              {val}
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Dropped',
      field: 'dropped',
      width: 95,
      minWidth: 85,
      cellClass: 'text-center yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-center font-bold text-slate-800 dark:text-slate-200">{p.value ?? 0}</div>;
        const val = p.value ?? 0;
        return (
          <div className="py-2.5 whitespace-normal break-words text-center">
            <button
              type="button"
              onClick={() => handleCellClick(p.data, 'dropped', 'Dropped')}
              className={`font-semibold cursor-pointer ${val > 0 ? 'text-[#4b2424] dark:text-amber-300 underline hover:opacity-80 font-bold' : 'text-slate-400'}`}
            >
              {val}
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Yet To Be Updated',
      field: 'yet_to_update',
      width: 135,
      minWidth: 110,
      cellClass: 'text-center yp-wrap-cell',
      headerClass: 'text-center',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-center font-bold text-slate-800 dark:text-slate-200">{p.value ?? 0}</div>;
        const val = p.value ?? 0;
        return (
          <div className="py-2.5 whitespace-normal break-words text-center">
            <button
              type="button"
              onClick={() => handleCellClick(p.data, 'yet_to_update', 'Yet To Be Updated')}
              className={`font-semibold cursor-pointer ${val > 0 ? 'text-[#4b2424] dark:text-amber-300 underline hover:opacity-80 font-bold' : 'text-slate-400'}`}
            >
              {val}
            </button>
          </div>
        );
      }
    },
    {
      headerName: 'Total Cost (₹ Cr.)',
      field: 'total_cost',
      width: 140,
      minWidth: 120,
      cellClass: 'text-right font-mono font-bold text-amber-800 dark:text-amber-300 yp-wrap-cell',
      headerClass: 'text-right',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        const val = Number(p.value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (p.node?.rowPinned) return <div className="py-2.5 whitespace-normal break-words text-right font-extrabold text-[#4b2424] dark:text-amber-300 font-mono text-xs">₹{val} Cr</div>;
        return <div className="py-2.5 whitespace-normal break-words text-right font-mono font-bold text-xs">₹{val}</div>;
      }
    },
    {
      headerName: 'Weighted Implementation Score (%)',
      field: 'score',
      width: 200,
      minWidth: 160,
      headerClass: 'text-center',
      cellClass: 'text-center yp-wrap-cell',
      wrapText: true,
      autoHeight: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
      cellRenderer: (p) => {
        if (p.node?.rowPinned) {
          return <div className="py-2.5 whitespace-normal break-words text-center font-black text-[#4b2424] dark:text-amber-300 text-xs">{Number(p.value || 0).toFixed(2)}%</div>;
        }
        const val = Number(p.value ?? 0);
        const isOnTrack = val >= 50;
        return (
          <div className="w-full flex items-center justify-center py-2.5 whitespace-normal break-words">
            <span
              className={`px-3 py-1 rounded-lg text-xs font-black shadow-2xs ${
                isOnTrack
                  ? 'bg-[#bbf7d0] text-[#14532d] dark:bg-emerald-950/80 dark:text-emerald-200'
                  : 'bg-[#fecaca] text-[#7f1d1d] dark:bg-rose-950/80 dark:text-rose-200'
              }`}
            >
              {val}%
            </span>
          </div>
        );
      }
    }
  ], [activeTab]);

  /* ── Pinned Bottom Summary Row (Total Summary) ─────────────── */
  const pinnedBottomRowData = useMemo(() => {
    if (!reportRows || reportRows.length === 0) return undefined;
    const totals = reportRows.reduce(
      (acc, r) => ({
        yet_to_start: acc.yet_to_start + Number(r.yet_to_start || 0),
        on_time: acc.on_time + Number(r.on_time || 0),
        delayed: acc.delayed + Number(r.delayed || 0),
        completed: acc.completed + Number(r.completed || 0),
        not_applicable: acc.not_applicable + Number(r.not_applicable || 0),
        dropped: acc.dropped + Number(r.dropped || 0),
        yet_to_update: acc.yet_to_update + Number(r.yet_to_update || 0),
        total_cost: acc.total_cost + Number(r.total_cost || 0),
        totalScore: acc.totalScore + Number(r.score || 0)
      }),
      {
        yet_to_start: 0,
        on_time: 0,
        delayed: 0,
        completed: 0,
        not_applicable: 0,
        dropped: 0,
        yet_to_update: 0,
        total_cost: 0,
        totalScore: 0
      }
    );

    const avgScore = reportRows.length > 0 ? totals.totalScore / reportRows.length : 0;

    return [
      {
        rank: '',
        name: 'Total Summary',
        yet_to_start: totals.yet_to_start,
        on_time: totals.on_time,
        delayed: totals.delayed,
        completed: totals.completed,
        not_applicable: totals.not_applicable,
        dropped: totals.dropped,
        yet_to_update: totals.yet_to_update,
        total_cost: Math.round(totals.total_cost * 100) / 100,
        score: Math.round(avgScore * 100) / 100
      }
    ];
  }, [reportRows]);

  /* ── Drilldown Columns (Performance Detailed Report) ──────── */
  const drilldownColumns = useMemo(() => {
    const wrap = { wrapText: true, autoHeight: true, wrapHeaderText: true, autoHeaderHeight: true, cellClass: 'yp-wrap-cell', cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' } };
    const cell = (content) => <div className="py-2.5 whitespace-normal break-words leading-relaxed text-xs text-slate-700 dark:text-slate-300">{content}</div>;

    return [
      {
        headerName: 'S.No', field: 'sno', width: 75, minWidth: 70, maxWidth: 85, pinned: 'left',
        headerClass: 'text-center', cellClass: 'text-center font-bold font-mono yp-wrap-cell',
        ...wrap,
        valueGetter: (p) => (p.node?.rowIndex != null ? p.node.rowIndex + 1 : (p.data?.sno || '-')),
        cellRenderer: (p) => <div className="py-2.5 text-center font-mono font-bold text-xs text-slate-800 dark:text-slate-200">{p.value}</div>
      },
      {
        headerName: 'Goal (A1)', field: 'goal_a1', minWidth: 200, flex: 1.4, ...wrap,
        valueGetter: (p) => p.data?.['Goal (A1)'] || p.data?.goal_a1 || '-',
        cellRenderer: (p) => cell(p.value)
      },
      {
        headerName: 'Intervention (A2)', field: 'intervention_a2', minWidth: 200, flex: 1.4, ...wrap,
        valueGetter: (p) => p.data?.['Intervention (A2)'] || p.data?.intervention_a2 || '-',
        cellRenderer: (p) => cell(p.value)
      },
      {
        headerName: 'Action (A3)', field: 'action_a3', minWidth: 240, flex: 1.6, ...wrap,
        cellClass: 'yp-wrap-cell',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => p.data?.['Action (A3)'] || p.data?.action_a3 || '-',
        cellRenderer: (p) => <div className="py-2.5 whitespace-normal break-words leading-relaxed font-semibold text-xs text-slate-800 dark:text-slate-200">{p.value}</div>
      },
      {
        headerName: 'Goal (B1)', field: 'goal_b1', minWidth: 190, flex: 1.3, ...wrap,
        valueGetter: (p) => p.data?.['Goal (B1)'] || p.data?.goal_b1 || '-',
        cellRenderer: (p) => cell(p.value)
      },
      {
        headerName: 'Intervention (B2)', field: 'intervention_b2', minWidth: 200, flex: 1.4, ...wrap,
        valueGetter: (p) => p.data?.['Intervention (B2)'] || p.data?.intervention_b2 || '-',
        cellRenderer: (p) => cell(p.value)
      },
      {
        headerName: 'Action (B3)', field: 'action_b3', minWidth: 240, flex: 1.6, ...wrap,
        cellClass: 'yp-wrap-cell',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => p.data?.['Action (B3)'] || p.data?.action_b3 || '-',
        cellRenderer: (p) => <div className="py-2.5 whitespace-normal break-words leading-relaxed font-semibold text-xs text-slate-800 dark:text-slate-200">{p.value}</div>
      },
      {
        headerName: 'Expected Date', field: 'expected_date', minWidth: 130, width: 140, ...wrap,
        headerClass: 'text-center', cellClass: 'text-center yp-wrap-cell',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => {
          const v = p.data?.['Expected Date'] || p.data?.expected_date;
          if (!v) return '-';
          const d = new Date(v);
          return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        },
        cellRenderer: (p) => <div className="py-2.5 text-center text-xs text-slate-700 dark:text-slate-300">{p.value}</div>
      },
      {
        headerName: 'Physical Progress (%)', field: 'progress', minWidth: 130, width: 140, ...wrap,
        headerClass: 'text-center', cellClass: 'text-center font-semibold yp-wrap-cell',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => {
          const v = p.data?.['Progress'] ?? p.data?.progress;
          return v != null ? Number(v) : '-';
        },
        cellRenderer: (p) => <div className="py-2.5 text-center text-xs font-bold text-slate-800 dark:text-slate-200">{p.value !== '-' ? `${p.value}%` : '-'}</div>
      },
      {
        headerName: 'Total Cost (₹ Cr)', field: 'total_cost', width: 140, minWidth: 130, ...wrap,
        headerClass: 'text-right', cellClass: 'text-right font-bold text-amber-800 dark:text-amber-300 text-xs font-mono yp-wrap-cell',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        valueGetter: (p) => { const v = p.data?.total_cost != null ? p.data.total_cost : p.data?.['Total Cost']; return v != null ? Number(v) : 0; },
        cellRenderer: (p) => <div className="py-2.5 text-right w-full font-mono font-bold text-xs">₹{Number(p.value || 0).toFixed(2)} Cr</div>
      }
    ];
  }, []);

  const handleBack = () => {
    setDrilldownTarget(null);
  };

  return (
    <div className="space-y-6">
      
      {/* ── Top Sub-Tabs Navigation (Matching MIV 2030 Report UI Style) ── */}
      {!drilldownTarget && (
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 select-none overflow-x-auto scrollbar-none">
          <div className="flex space-x-1">
            {REPORTS.map((r) => {
              const Icon = r.icon;
              const isActive = activeTab === r.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleTabChange(r.id)}
                  className={`px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-400 rounded-t-lg'
                      : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-[#4b2424] dark:text-amber-400' : 'text-slate-400'}`} />
                  <span>{r.code}: {r.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── KPI Summary Cards (Brown Theme Highlights Grid) ── */}
      {!drilldownTarget && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5 animate-fade-in">
          <div className="p-2.5 sm:p-3.5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Actions</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-amber-50 dark:bg-[#4b2424]/40 text-[#4b2424] dark:text-amber-400">
                <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-black font-mono text-[#4b2424] dark:text-amber-300">
              {formatNumber(kpis.totalActions)}
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Cost</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <Coins className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 text-base sm:text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 truncate">
              ₹{formatInvestment(kpis.totalCost)} Cr.
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {formatNumber(kpis.completed)}
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress On Time</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-black font-mono text-blue-600 dark:text-blue-400">
              {formatNumber(kpis.onTime)}
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress Delayed</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-black font-mono text-rose-600 dark:text-rose-400">
              {formatNumber(kpis.delayed)}
            </div>
          </div>

          <div className="p-2.5 sm:p-3.5 bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Yet to Start / Update</span>
              <div className="p-1 sm:p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-2 text-lg sm:text-xl font-black font-mono text-slate-600 dark:text-slate-300">
              {formatNumber(kpis.yetToStartOrUpdate)}
            </div>
          </div>
        </div>
      )}

      {/* ── Master Report Table (YP Brown Theme) ── */}
      <ReportTable
        title={drilldownTarget ? `${drilldownTarget.entityName} — ${drilldownTarget.statusLabel} Details` : activeReportConfig.fullTitle}
        subtitle={drilldownTarget ? `Detailed action items drilldown for ${drilldownTarget.entityName} (${drilldownTarget.items.length} items)` : subtitle}
        onBack={handleBack}
        showBackButton={Boolean(drilldownTarget)}
        rawData={drilldownTarget ? drilldownTarget.items : reportRows}
        viewData={drilldownTarget ? drilldownTarget.items : reportRows}
        columns={drilldownTarget ? drilldownColumns : columns}
        pinnedBottomRowData={drilldownTarget ? undefined : pinnedBottomRowData}
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
        toolbarExtra={drilldownTarget ? null : toolbarExtra}
        filterPanel={drilldownTarget ? null : filterPanel}
        autoHeaderHeight={true}
        defaultColDef={{
          wrapText: true,
          autoHeight: true,
          wrapHeaderText: true,
          autoHeaderHeight: true,
          cellClass: 'yp-wrap-cell',
          cellStyle: {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
            lineHeight: '1.4'
          }
        }}
      />

    </div>
  );
}
