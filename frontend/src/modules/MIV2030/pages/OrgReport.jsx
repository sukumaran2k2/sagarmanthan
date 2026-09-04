import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Building2,
  FolderTree,
  BarChart3,
  Layers,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Coins,
  Sparkles,
  Filter,
  ChevronDown,
  RotateCcw,
  X,
  Tag
} from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import { useAICopilot } from '../../../context/AICopilotContext';
import { getCurrentUserId } from '../../../utils/authSession';
import {
  getMIVOrgWisePerformanceReport,
  getThemeWiseMIVPerformanceReport,
  getCategoryWiseMIVPerformanceReport,
  getSummaryReportOverdueInitiatives,
  detailedReportDelayedOverdueInitiatives
} from '../api';

/* ============================================================
   REPORT CONFIGURATION (MIV 2030)
   ============================================================ */
const REPORTS = [
  {
    id: '1.1',
    code: 'Report 1.1',
    label: 'Organisation Performance',
    fullTitle: 'Report No. 1.1 - Organisation-wise Performance Ranking Report - Maritime India Vision 2030',
    icon: Building2,
    badgeColor: 'from-blue-600 to-cyan-600'
  },
  {
    id: '1.2',
    code: 'Report 1.2',
    label: 'Theme Performance',
    fullTitle: 'Report No. 1.2 - Theme-wise Performance Ranking Report - Maritime India Vision 2030',
    icon: FolderTree,
    badgeColor: 'from-indigo-600 to-blue-600'
  },
  {
    id: '1.3',
    code: 'Report 1.3',
    label: 'Category Performance',
    fullTitle: 'Report No. 1.3 - Category-wise Performance Ranking Report - Maritime India Vision 2030',
    icon: BarChart3,
    badgeColor: 'from-purple-600 to-indigo-600'
  },
  {
    id: '1.4',
    code: 'Report 1.4',
    label: 'Delayed Summary',
    fullTitle: 'Report No. 1.4 - Summary Report (Delayed / Overdue Initiatives) - Maritime India Vision 2030',
    icon: Layers,
    badgeColor: 'from-amber-600 to-orange-600'
  },
  {
    id: '1.5',
    code: 'Report 1.5',
    label: 'Delayed Details',
    fullTitle: 'Report No. 1.5 - Detailed Report (Delayed / Overdue Initiatives) - Maritime India Vision 2030',
    icon: FileText,
    badgeColor: 'from-rose-600 to-red-600'
  }
];

export default function MIVReports({ triggerNotification }) {
  const { registerReport, clearReport } = useAICopilot();
  const [activeTab, setActiveTab] = useState('1.1');
  const [loading, setLoading] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [error, setError] = useState(null);

  // Filter states specifically for Report 1.5
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab !== '1.5') {
      setShowFilterPanel(false);
      setFilterOrg('all');
      setFilterCategory('all');
    }
  };

  const activeReportConfig = useMemo(
    () => REPORTS.find((r) => r.id === activeTab) || REPORTS[0],
    [activeTab]
  );

  /* ── Formatter Helpers ────────────────────────────────────── */
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

  const getRowsFromResponse = (response) => {
    if (Array.isArray(response?.data?.rows)) return response.data.rows;
    if (Array.isArray(response?.rows)) return response.rows;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response)) return response;
    return [];
  };

  /* ── Data Fetching ────────────────────────────────────────── */
  const fetchCurrentReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setReportRows([]);

    try {
      const userId = getCurrentUserId() || 1;
      let response;

      if (activeTab === '1.1') {
        response = await getMIVOrgWisePerformanceReport(userId);
        const rows = getRowsFromResponse(response);
        const formatted = rows.map((item, index) => ({
          sno: index + 1,
          organisationId: item.OrganisationID ?? item.OrganisationId ?? item.organisation_id ?? item.organisationId ?? null,
          organisationName: item.Organisation ?? item.OrganisationName ?? item.organisation_name ?? item.organisationName ?? '—',
          totalInitiatives: Number(item['Total Initiatives'] ?? item.TotalInitiatives ?? item.total_initiatives ?? 0),
          totalInvestment: Number(item['Total Investment (Cr.)'] ?? item.TotalInvestment ?? item.total_investment ?? 0),
          completed: Number(item['Completed'] ?? item.Completed ?? item.completed ?? 0),
          progressOn: Number(item['In Progress - On Time'] ?? item.ProgressOn ?? item.progress_on ?? item.progressOn ?? 0),
          progressDelayed: Number(item['In Progress - Delayed'] ?? item.ProgressDelayed ?? item.progress_delayed ?? item.progressDelayed ?? 0),
          notStarted: Number(item['Not Started'] ?? item.NotStarted ?? item.not_started ?? item.notStarted ?? 0),
          performanceScore: item.PerformanceScore ?? item.performance_score ?? item.performanceScore ?? item['Performance Score'] ?? '—'
        }));
        setReportRows(formatted);
      } else if (activeTab === '1.2') {
        response = await getThemeWiseMIVPerformanceReport(userId);
        const rows = getRowsFromResponse(response);
        const formatted = rows.map((item, index) => ({
          sno: index + 1,
          themeId: item.ThemeId ?? item.theme_id ?? item.themeId ?? index + 1,
          themeName: item.initiative_name ?? item.InitiativeName ?? item.ThemeName ?? item.theme_name ?? item.themeName ?? '—',
          totalInitiatives: Number(item['Total Initiatives'] ?? item.TotalInitiatives ?? item.total_initiatives ?? 0),
          totalInvestment: Number(item['Total Investment (Cr.)'] ?? item.TotalInvestment ?? item.total_investment ?? 0),
          completed: Number(item['Completed'] ?? item.Completed ?? item.completed ?? 0),
          progressOn: Number(item['In Progress - On Time'] ?? item.ProgressOn ?? item.progress_on ?? item.progressOn ?? 0),
          progressDelayed: Number(item['In Progress - Delayed'] ?? item.ProgressDelayed ?? item.progress_delayed ?? item.progressDelayed ?? 0),
          notStarted: Number(item['Not Started'] ?? item.NotStarted ?? item.not_started ?? item.notStarted ?? 0),
          performanceScore: item.PerformanceScore ?? item.performance_score ?? item.performanceScore ?? item['Performance Score'] ?? '—'
        }));
        setReportRows(formatted);
      } else if (activeTab === '1.3') {
        response = await getCategoryWiseMIVPerformanceReport(userId);
        const rows = getRowsFromResponse(response);
        const formatted = rows.map((item, index) => ({
          sno: index + 1,
          categoryId: item.CategoryId ?? item.CategoryID ?? item.category_id ?? item.categoryId ?? index + 1,
          categoryName: item.category ?? item.Category ?? item.CategoryName ?? item.category_name ?? item.categoryName ?? '—',
          totalInitiatives: Number(item['Total Initiatives'] ?? item.TotalInitiatives ?? item.total_initiatives ?? 0),
          totalInvestment: Number(item['Total Investment (Cr.)'] ?? item.TotalInvestment ?? item.total_investment ?? 0),
          completed: Number(item['Completed'] ?? item.Completed ?? item.completed ?? 0),
          progressOn: Number(item['In Progress - On Time'] ?? item.ProgressOn ?? item.progress_on ?? item.progressOn ?? 0),
          progressDelayed: Number(item['In Progress - Delayed'] ?? item.ProgressDelayed ?? item.progress_delayed ?? item.progressDelayed ?? 0),
          notStarted: Number(item['Not Started'] ?? item.NotStarted ?? item.not_started ?? item.notStarted ?? 0),
          performanceScore: item.PerformanceScore ?? item.performance_score ?? item.performanceScore ?? item['Performance Score'] ?? '—'
        }));
        setReportRows(formatted);
      } else if (activeTab === '1.4') {
        response = await getSummaryReportOverdueInitiatives(userId);
        const rows = getRowsFromResponse(response);
        const formatted = rows.map((item, index) => ({
          sno: index + 1,
          organisationId: item.OrganisationId ?? item.OrganisationID ?? item.organisation_id ?? item.organisationId ?? null,
          organisationName: item.OrganisationName ?? item.Organisation ?? item.organisation_name ?? item.organisationName ?? '—',
          totalDelayed: Number(item.TotalDelayedInitiatives ?? item.TotalDelayed ?? item.total_delayed_initiatives ?? 0),
          delayedLess6: Number(item.DelayedLess6Months ?? item.DelayedLessThan6Months ?? item.Delayed_Under_6_Months ?? item.delayed_less_than_6_months ?? 0),
          delayed6To12: Number(item.Delayed6To12Months ?? item.Delayed6_12Months ?? item.Delayed_6_12_Months ?? item.delayed_6_12_months ?? 0),
          severelyDelayed: Number(item.SeverelyDelayed ?? item.SeverelyDelayedMoreThan1Year ?? item.Severely_Delayed ?? item.severely_delayed ?? 0),
          totalCost: Number(item.TotalCost ?? item.TotalDelayedCost ?? item.total_cost ?? 0)
        }));
        setReportRows(formatted);
      } else if (activeTab === '1.5') {
        response = await detailedReportDelayedOverdueInitiatives(userId);
        const rows = getRowsFromResponse(response);
        const formatted = rows.map((item, index) => ({
          sno: index + 1,
          organisationId: item.OrganisationId ?? item.OrganisationID ?? item.organisation_id ?? item.organisationId ?? null,
          organisationName: item.OrganisationName ?? item.Organisation ?? item.organisation_name ?? item.organisationName ?? '—',
          initiativeId: item.InitiativeId ?? item.InitiativeID ?? item.initiative_id ?? item.initiativeId ?? '—',
          initiativeName: item.InitiativeActivityName ?? item.InitiativeName ?? item.initiative_activity_name ?? item.initiative_name ?? '—',
          category: item.Category ?? item.CategoryName ?? item.category ?? item.category_name ?? '—',
          totalCost: Number(item.TotalCost ?? item.TotalDelayedCost ?? item.total_cost ?? 0),
          expectedActualDate: item.ExpectedActualCompletionDate ?? item.ExpectedActualDate ?? item.ExpectedCompletionDate ?? item.completionDate ?? '—',
          daysOverdue: Number(item.DaysOverdue ?? item.days_overdue ?? item.daysOverdue ?? 0),
          reasonForDelay: item.ReasonForDelay ?? item.reason_for_delay ?? item.reasonForDelay ?? '—',
          severityStatus: item.SeverityStatus ?? item.Severity ?? item.severity_status ?? '—'
        }));
        setReportRows(formatted);
      }
    } catch (err) {
      console.error(`Error loading MIV Report ${activeTab}:`, err);
      setError(`Unable to load data for ${activeReportConfig.code}. Please try again.`);
      setReportRows([]);
      triggerNotification?.(`Unable to load ${activeReportConfig.code}`);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeReportConfig, triggerNotification]);

  useEffect(() => {
    fetchCurrentReport();
  }, [fetchCurrentReport]);

  /* ── Filter Options & Filtering (Specifically for Report 1.5) ── */
  const availableOrgs = useMemo(() => {
    if (activeTab !== '1.5' || !reportRows.length) return [];
    const set = new Set();
    reportRows.forEach((r) => {
      if (r.organisationName && r.organisationName !== '—') {
        set.add(r.organisationName);
      }
    });
    return Array.from(set).sort();
  }, [reportRows, activeTab]);

  const availableCategories = useMemo(() => {
    if (activeTab !== '1.5' || !reportRows.length) return [];
    const set = new Set();
    reportRows.forEach((r) => {
      if (r.category && r.category !== '—') {
        set.add(r.category);
      }
    });
    return Array.from(set).sort();
  }, [reportRows, activeTab]);

  const hasActiveFilters = activeTab === '1.5' && (filterOrg !== 'all' || filterCategory !== 'all');
  const activeFilterCount = (filterOrg !== 'all' ? 1 : 0) + (filterCategory !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setFilterOrg('all');
    setFilterCategory('all');
    triggerNotification?.('Filters have been reset', 'info');
  };

  const displayedReportRows = useMemo(() => {
    if (activeTab !== '1.5') return reportRows;
    const filtered = reportRows.filter((r) => {
      const matchOrg = filterOrg === 'all' || r.organisationName === filterOrg;
      const matchCat = filterCategory === 'all' || r.category === filterCategory;
      return matchOrg && matchCat;
    });
    return filtered.map((r, idx) => ({
      ...r,
      sno: idx + 1
    }));
  }, [reportRows, activeTab, filterOrg, filterCategory]);

  /* ── Column Definitions ───────────────────────────────────── */
  const columns = useMemo(() => {
    if (activeTab === '1.1' || activeTab === '1.2' || activeTab === '1.3') {
      let mainHeader = 'Organisation';
      let mainField = 'organisationName';

      if (activeTab === '1.2') {
        mainHeader = 'Theme Name';
        mainField = 'themeName';
      } else if (activeTab === '1.3') {
        mainHeader = 'Category';
        mainField = 'categoryName';
      }

      return [
        {
          headerName: 'S.No',
          field: 'sno',
          width: 75,
          minWidth: 75,
          maxWidth: 75,
          pinned: 'left',
          cellRenderer: (p) => {
            if (p.data?.isTotalRow) return '';
            return <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{p.value}</span>;
          },
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: mainHeader,
          field: mainField,
          minWidth: 260,
          flex: 1,
          pinned: 'left',
          cellRenderer: (p) => {
            if (p.data?.isTotalRow) {
              return <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">Total</span>;
            }
            return <span className="font-bold text-slate-800 dark:text-slate-100">{p.value}</span>;
          }
        },
        {
          headerName: 'Total Initiatives',
          field: 'totalInitiatives',
          minWidth: 150,
          cellRenderer: (p) => (
            <span className="font-mono font-extrabold text-[#4b2424] dark:text-amber-400">
              {formatNumber(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Total Investment (₹ Cr.)',
          field: 'totalInvestment',
          minWidth: 180,
          cellRenderer: (p) => (
            <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
              ₹{formatInvestment(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '16px' }
        },
        {
          headerName: 'Stage wise Initiatives Count',
          marryChildren: true,
          children: [
            {
              headerName: 'Completed',
              field: 'completed',
              minWidth: 125,
              cellRenderer: (p) => (
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumber(p.value)}
                </span>
              ),
              cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
            },
            {
              headerName: 'Progress (On Time)',
              field: 'progressOn',
              minWidth: 155,
              cellRenderer: (p) => (
                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                  {formatNumber(p.value)}
                </span>
              ),
              cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
            },
            {
              headerName: 'Progress (Delayed)',
              field: 'progressDelayed',
              minWidth: 155,
              cellRenderer: (p) => (
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatNumber(p.value)}
                </span>
              ),
              cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
            },
            {
              headerName: 'Not Started',
              field: 'notStarted',
              minWidth: 125,
              cellRenderer: (p) => (
                <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
                  {formatNumber(p.value)}
                </span>
              ),
              cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }
          ]
        },
        {
          headerName: 'Performance Score',
          field: 'performanceScore',
          minWidth: 155,
          cellRenderer: (p) => {
            if (p.data?.isTotalRow) return '—';
            const val = p.value;
            if (!val || val === '—') return <span className="text-slate-400">—</span>;
            return (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 dark:bg-[#4b2424]/60 text-[#4b2424] dark:text-amber-300 border border-[#8c4242]/30">
                {val}
              </span>
            );
          },
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        }
      ];
    }

    if (activeTab === '1.4') {
      return [
        {
          headerName: 'S.No',
          field: 'sno',
          width: 75,
          minWidth: 75,
          maxWidth: 75,
          pinned: 'left',
          cellRenderer: (p) => {
            if (p.data?.isTotalRow) return '';
            return <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{p.value}</span>;
          },
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Organisation Name',
          field: 'organisationName',
          minWidth: 260,
          flex: 1,
          pinned: 'left',
          cellRenderer: (p) => {
            if (p.data?.isTotalRow) {
              return <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider">Total</span>;
            }
            return <span className="font-bold text-slate-800 dark:text-slate-100">{p.value}</span>;
          }
        },
        {
          headerName: 'Total Delayed Initiatives',
          field: 'totalDelayed',
          minWidth: 190,
          cellRenderer: (p) => (
            <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400">
              {formatNumber(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Delayed < 6 Months',
          field: 'delayedLess6',
          minWidth: 165,
          cellRenderer: (p) => (
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
              {formatNumber(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Delayed 6–12 Months',
          field: 'delayed6To12',
          minWidth: 175,
          cellRenderer: (p) => (
            <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
              {formatNumber(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Severely Delayed > 1 Year',
          field: 'severelyDelayed',
          minWidth: 200,
          cellRenderer: (p) => (
            <span className="font-mono font-black text-rose-700 dark:text-rose-400">
              {formatNumber(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Total Cost (₹ Cr.)',
          field: 'totalCost',
          minWidth: 170,
          cellRenderer: (p) => (
            <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
              ₹{formatInvestment(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '16px' }
        }
      ];
    }

    if (activeTab === '1.5') {
      return [
        {
          headerName: 'S.No',
          field: 'sno',
          width: 75,
          minWidth: 75,
          maxWidth: 75,
          pinned: 'left',
          cellRenderer: (p) => (
            <span className="font-mono font-extrabold text-slate-800 dark:text-slate-200">{p.value}</span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Organisation Name',
          field: 'organisationName',
          minWidth: 220,
          pinned: 'left',
          cellRenderer: (p) => <span className="font-bold text-slate-800 dark:text-slate-100">{p.value}</span>
        },
        {
          headerName: 'Initiative ID',
          field: 'initiativeId',
          minWidth: 135,
          cellRenderer: (p) => (
            <span className="font-mono font-bold text-[#8c4242] dark:text-amber-300">{p.value}</span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Initiative / Activity Name',
          field: 'initiativeName',
          minWidth: 320,
          flex: 1,
          wrapText: true,
          autoHeight: true,
          cellRenderer: (p) => <span className="font-medium text-slate-800 dark:text-slate-200 leading-snug">{p.value}</span>
        },
        {
          headerName: 'Category',
          field: 'category',
          minWidth: 160,
          cellRenderer: (p) => (
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-[#4b2424]/40 text-[#4b2424] dark:text-amber-300">
              {p.value}
            </span>
          )
        },
        {
          headerName: 'Total Cost (₹ Cr.)',
          field: 'totalCost',
          minWidth: 155,
          cellRenderer: (p) => (
            <span className="font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
              ₹{formatInvestment(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '16px' }
        },
        {
          headerName: 'Expected / Actual Date',
          field: 'expectedActualDate',
          minWidth: 180,
          cellRenderer: (p) => <span className="font-medium text-slate-700 dark:text-slate-300">{p.value}</span>,
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Days Overdue',
          field: 'daysOverdue',
          minWidth: 140,
          cellRenderer: (p) => (
            <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400">
              {formatNumber(p.value)} days
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Reason for Delay',
          field: 'reasonForDelay',
          minWidth: 280,
          flex: 1,
          wrapText: true,
          autoHeight: true,
          cellRenderer: (p) => <span className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{p.value}</span>
        },
        {
          headerName: 'Severity Status',
          field: 'severityStatus',
          minWidth: 160,
          cellRenderer: (p) => {
            const val = String(p.value || '').toLowerCase();
            let color = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
            if (val.includes('severe') || val.includes('> 1') || val.includes('high')) {
              color = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-500/30';
            } else if (val.includes('6-12') || val.includes('moderate')) {
              color = 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-500/30';
            } else if (val.includes('< 6') || val.includes('low') || val.includes('minor')) {
              color = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-500/30';
            }
            return (
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${color}`}>
                {p.value}
              </span>
            );
          },
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        }
      ];
    }

    return [];
  }, [activeTab]);

  /* ── Pinned Bottom Summary Totals ─────────────────────────── */
  const pinnedBottomRowData = useMemo(() => {
    const data = displayedReportRows;
    if (!data || data.length === 0) return undefined;

    if (activeTab === '1.1' || activeTab === '1.2' || activeTab === '1.3') {
      const totInit = data.reduce((sum, r) => sum + Number(r.totalInitiatives || 0), 0);
      const totInv = data.reduce((sum, r) => sum + Number(r.totalInvestment || 0), 0);
      const totComp = data.reduce((sum, r) => sum + Number(r.completed || 0), 0);
      const totProgOn = data.reduce((sum, r) => sum + Number(r.progressOn || 0), 0);
      const totProgDel = data.reduce((sum, r) => sum + Number(r.progressDelayed || 0), 0);
      const totNotStart = data.reduce((sum, r) => sum + Number(r.notStarted || 0), 0);

      const labelField = activeTab === '1.1' ? 'organisationName' : activeTab === '1.2' ? 'themeName' : 'categoryName';

      return [
        {
          isTotalRow: true,
          sno: '',
          [labelField]: 'Total',
          totalInitiatives: totInit,
          totalInvestment: totInv,
          completed: totComp,
          progressOn: totProgOn,
          progressDelayed: totProgDel,
          notStarted: totNotStart,
          performanceScore: '—'
        }
      ];
    }

    if (activeTab === '1.4') {
      const totDel = data.reduce((sum, r) => sum + Number(r.totalDelayed || 0), 0);
      const totLess6 = data.reduce((sum, r) => sum + Number(r.delayedLess6 || 0), 0);
      const tot6To12 = data.reduce((sum, r) => sum + Number(r.delayed6To12 || 0), 0);
      const totSev = data.reduce((sum, r) => sum + Number(r.severelyDelayed || 0), 0);
      const totCost = data.reduce((sum, r) => sum + Number(r.totalCost || 0), 0);

      return [
        {
          isTotalRow: true,
          sno: '',
          organisationName: 'Total',
          totalDelayed: totDel,
          delayedLess6: totLess6,
          delayed6To12: tot6To12,
          severelyDelayed: totSev,
          totalCost: totCost
        }
      ];
    }

    return undefined;
  }, [displayedReportRows, activeTab]);

  /* ── KPI Summary Stats Calculation ────────────────────────── */
  const kpis = useMemo(() => {
    const data = displayedReportRows;
    if (!data || data.length === 0) {
      return {
        totalInitiatives: 0,
        totalInvestment: 0,
        completed: 0,
        progressOn: 0,
        progressDelayed: 0,
        notStarted: 0,
        totalDelayed: 0,
        severelyDelayed: 0
      };
    }

    if (activeTab === '1.1' || activeTab === '1.2' || activeTab === '1.3') {
      return {
        totalInitiatives: data.reduce((sum, r) => sum + Number(r.totalInitiatives || 0), 0),
        totalInvestment: data.reduce((sum, r) => sum + Number(r.totalInvestment || 0), 0),
        completed: data.reduce((sum, r) => sum + Number(r.completed || 0), 0),
        progressOn: data.reduce((sum, r) => sum + Number(r.progressOn || 0), 0),
        progressDelayed: data.reduce((sum, r) => sum + Number(r.progressDelayed || 0), 0),
        notStarted: data.reduce((sum, r) => sum + Number(r.notStarted || 0), 0)
      };
    }

    if (activeTab === '1.4' || activeTab === '1.5') {
      const totDelayed = data.reduce((sum, r) => sum + Number(r.totalDelayed || (activeTab === '1.5' ? 1 : 0)), 0);
      const totCost = data.reduce((sum, r) => sum + Number(r.totalCost || 0), 0);
      const severelyDelayed = data.reduce(
        (sum, r) => sum + Number(r.severelyDelayed || (String(r.severityStatus || '').toLowerCase().includes('severe') ? 1 : 0)),
        0
      );
      return {
        totalDelayed: totDelayed,
        totalInvestment: totCost,
        severelyDelayed: severelyDelayed
      };
    }

    return {};
  }, [displayedReportRows, activeTab]);

  /* ── Register Report into SagarBot AICopilotContext ────────── */
  useEffect(() => {
    if (displayedReportRows && displayedReportRows.length > 0) {
      registerReport({
        moduleName: 'Maritime India Vision 2030',
        reportTitle: activeReportConfig.fullTitle,
        activeView: activeReportConfig.code,
        columns: columns,
        data: displayedReportRows,
        rowCount: displayedReportRows.length,
        pinnedBottom: pinnedBottomRowData,
        autoOpen: true
      });
    }
    return () => {
      clearReport();
    };
  }, [displayedReportRows, activeReportConfig, columns, pinnedBottomRowData, registerReport, clearReport]);

  /* ── Subtitle ─────────────────────────────────────────────── */
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

  /* ── Filter Panel JSX (Specifically for Report 1.5) ───────── */
  const filterPanel = (activeTab === '1.5' && showFilterPanel) ? (
    <div className="space-y-3 select-none p-1">
      <div className="flex items-center justify-between pb-2 border-b border-amber-900/10 dark:border-amber-500/20">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-[#4b2424] dark:text-amber-400" />
          <span className="text-xs font-black text-[#4b2424] dark:text-amber-200 uppercase tracking-wider">
            Filter Delayed / Overdue Initiatives (Report 1.5)
          </span>
          {hasActiveFilters && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#4b2424] text-white dark:bg-amber-500 dark:text-slate-900">
              {activeFilterCount} Active
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer transition"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
        {/* Organization Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
            <span>Organization</span>
          </label>
          <select
            value={filterOrg}
            onChange={(e) => setFilterOrg(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-[#8c4242]/30 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#8c4242]/40 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">-- All Organisations -- ({availableOrgs.length})</option>
            {availableOrgs.map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
            <span>Category</span>
          </label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-[#8c4242]/30 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#8c4242]/40 focus:outline-none cursor-pointer shadow-2xs"
          >
            <option value="all">-- All Categories -- ({availableCategories.length})</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  ) : null;

  /* ── Toolbar Extra: Filter Button (Report 1.5 alone) ──────── */
  const toolbarExtra = activeTab === '1.5' ? (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowFilterPanel((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-2xs ${
          showFilterPanel || hasActiveFilters
            ? 'bg-[#f7f3f3] border-[#4b2424] text-[#4b2424] dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <Filter className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="bg-[#4b2424] dark:bg-amber-500 text-white dark:text-slate-900 text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
            {activeFilterCount}
          </span>
        )}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`}
        />
      </button>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className="space-y-6">
      {/* ── Top Sub-Tabs Navigation (CSR Project Reports Style - Left Aligned) ── */}
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
                className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
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

      {/* ── KPI Summary Cards (Brown Theme Highlights) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 animate-fade-in">
        {(activeTab === '1.1' || activeTab === '1.2' || activeTab === '1.3') && (
          <>
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Initiatives</span>
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-[#4b2424]/40 text-[#4b2424] dark:text-amber-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black font-mono text-[#4b2424] dark:text-amber-300">
                {formatNumber(kpis.totalInitiatives)}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Investment</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-lg font-black font-mono text-emerald-700 dark:text-emerald-400 truncate">
                ₹{formatInvestment(kpis.totalInvestment)} Cr.
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Completed</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatNumber(kpis.completed)}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress On Time</span>
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black font-mono text-blue-600 dark:text-blue-400">
                {formatNumber(kpis.progressOn)}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progress Delayed</span>
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                {formatNumber(kpis.progressDelayed)}
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Not Started</span>
                <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black font-mono text-slate-600 dark:text-slate-300">
                {formatNumber(kpis.notStarted)}
              </div>
            </div>
          </>
        )}

        {(activeTab === '1.4' || activeTab === '1.5') && (
          <>
            <div className="p-3.5 col-span-1 sm:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Delayed Initiatives</span>
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-rose-600 dark:text-rose-400">
                {formatNumber(kpis.totalDelayed)}
              </div>
            </div>

            <div className="p-3.5 col-span-1 sm:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Severely Delayed (&gt; 1 Year)</span>
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black font-mono text-rose-700 dark:text-rose-400">
                {formatNumber(kpis.severelyDelayed)}
              </div>
            </div>

            <div className="p-3.5 col-span-2 sm:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Delayed Cost</span>
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  <Coins className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 truncate">
                ₹{formatInvestment(kpis.totalInvestment)} Cr.
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-2xl border border-rose-200 dark:border-rose-500/30 font-bold text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={fetchCurrentReport}
            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Master Report Table (YP Brown Theme) ── */}
      <ReportTable
        title={activeReportConfig.fullTitle}
        subtitle={subtitle}
        rawData={displayedReportRows}
        viewData={displayedReportRows}
        columns={columns}
        pinnedBottomRowData={pinnedBottomRowData}
        loading={loading}
        onRefresh={fetchCurrentReport}
        triggerNotification={triggerNotification}
        pagination={true}
        themeClass="yp-pro-grid"
        brandColor="#4b2424"
        brandColorHover="#6b3535"
        accentColor="#f3f7f5ff"
        oddRowColor="#f8faf6"
        totalLabel="Total"
        toolbarExtra={toolbarExtra}
        filterPanel={filterPanel}
      />
    </div>
  );
}