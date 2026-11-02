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
  Filter,
  ChevronDown,
  ChevronUp,
  RotateCcw,
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

const BRAND = '#4b2424';
const BRAND_HOVER = '#6b3535';
const BRAND_SOFT = '#8c4242';
const ACCENT = '#f5eeea';
const BORDER = '#e8d5c8';

const REPORTS = [
  {
    id: '1.1',
    code: 'Report 1.1',
    label: 'Organisation Performance',
    fullTitle: 'Report No. 1.1 - Organisation-wise Performance Ranking Report - Maritime India Vision 2030',
    icon: Building2
  },
  {
    id: '1.2',
    code: 'Report 1.2',
    label: 'Theme Performance',
    fullTitle: 'Report No. 1.2 - Theme-wise Performance Ranking Report - Maritime India Vision 2030',
    icon: FolderTree
  },
  {
    id: '1.3',
    code: 'Report 1.3',
    label: 'Category Performance',
    fullTitle: 'Report No. 1.3 - Category-wise Performance Ranking Report - Maritime India Vision 2030',
    icon: BarChart3
  },
  {
    id: '1.4',
    code: 'Report 1.4',
    label: 'Delayed Summary',
    fullTitle: 'Report No. 1.4 - Summary Report (Delayed / Overdue Initiatives) - Maritime India Vision 2030',
    icon: Layers
  },
  {
    id: '1.5',
    code: 'Report 1.5',
    label: 'Delayed Details',
    fullTitle: 'Report No. 1.5 - Detailed Report (Delayed / Overdue Initiatives) - Maritime India Vision 2030',
    icon: FileText
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

  const gridApiRef = useRef(null);

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    if (newTab !== '1.5') {
      setShowFilterPanel(false);
      setFilterOrg('all');
      setFilterCategory('all');
    } else {
      setShowFilterPanel(true);
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
          performanceScore:
            item['Performance Score'] ??
            item.PerformanceScore ??
            item.performance_score ??
            item.performanceScore ??
            0
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
          severelyDelayed: Number(item.SeverelyDelayed ?? item.SeverelyDelayedMoreThan1Year ?? item.severely_delayed_more_than_1_year ?? item.severely_delayed_more_than_1_year ?? 0),
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

  const onGridReady = useCallback((params) => {
    gridApiRef.current = params.api;
  }, []);

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
          wrapText: true,
          autoHeight: true,
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
            <span className="p-2  text-right text-slate-700">
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
            <span className="p-2  text-right text-slate-700">
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
                <span className="p-2  text-right text-slate-700">
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
                <span className="p-2  text-right text-slate-700">
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
                <span className="p-2  text-right text-slate-700">
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
                <span className="p-2  text-right text-slate-700">
                  {formatNumber(p.value)}
                </span>
              ),
              cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }
          ]
        },
        {
          headerName: 'Performance Score (%)',
          field: 'performanceScore',
          width: 180,

          cellRenderer: (params) => {
            const score = Number(params.value);

            return Number.isFinite(score)
              ? `${score.toFixed(2)}%`
              : '—';
          },

          cellStyle: (params) => {
            const score = Number(params.value);

            let backgroundColor = '#fee2e2';
            let color = '#b91c1c';

            if (score > 100) {
              backgroundColor = '#dbeafe';
              color = '#1d4ed8';
            } else if (score >= 75) {
              backgroundColor = '#dcfce7';
              color = '#15803d';
            } else if (score >= 50) {
              backgroundColor = '#ffedd5';
              color = '#c2410c';
            }

            return {
              backgroundColor,
              color,
              fontWeight: 'bold',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            };
          }
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
          wrapText: true,
          autoHeight: true,
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
            <span className="p-2  text-right text-slate-700">
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
            <span className="p-2  text-right text-slate-700">
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
            <span className="p-2  text-right text-slate-700">
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
            <span className="p-2  text-right text-slate-700">
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
            <span className="p-2  text-right text-slate-700">
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
          wrapText: true,
          autoHeight: true,
          cellRenderer: (p) => <span className="font-bold text-slate-800 dark:text-slate-100">{p.value}</span>
        },
        {
          headerName: 'Initiative ID',
          field: 'initiativeId',
          minWidth: 135,
          cellRenderer: (p) => (
            <span className="p-2  text-right text-slate-700">{p.value}</span>
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
          cellRenderer: (p) => <span className="p-2  text-right text-slate-700">{p.value}</span>
        },
        {
          headerName: 'Category',
          field: 'category',
          minWidth: 160,
          cellRenderer: (p) => (
            <span className="p-2  text-right text-slate-700">
              {p.value}
            </span>
          )
        },
        {
          headerName: 'Total Cost (₹ Cr.)',
          field: 'totalCost',
          minWidth: 155,
          cellRenderer: (p) => (
            <span className="p-2  text-right text-slate-700">
              ₹{formatInvestment(p.value)}
            </span>
          ),
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '16px' }
        },
        {
          headerName: 'Expected / Actual Date',
          field: 'expectedActualDate',
          minWidth: 180,
          cellRenderer: (p) => <span className="p-2  text-right text-slate-700">{p.value}</span>,
          cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
        },
        {
          headerName: 'Days Overdue',
          field: 'daysOverdue',
          minWidth: 160,

          cellRenderer: (p) => {
            const days = Number(p.value || 0);

            return (
              <span className="font-bold">
                {formatNumber(days)} days
              </span>
            );
          },

          cellStyle: (params) => {
            const days = Number(params.value || 0);

            if (days <= 180) {
              return {
                backgroundColor: '#ffedd5',
                color: '#c2410c',
                fontWeight: 'bold',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              };
            }

            return {
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontWeight: 'bold',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            };
          }
        },
        {
          headerName: 'Reason for Delay',
          field: 'reasonForDelay',
          minWidth: 280,
          flex: 1,
          wrapText: true,
          autoHeight: true,
          cellRenderer: (p) => <span className="p-2  text-right text-slate-700">{p.value}</span>
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

  /* ── As-on-date / Report month (header strip) ────────────── */
  const asOnDateLabel = useMemo(() => {
    const now = new Date();

    const asOnDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
    const reportMonth = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    return { asOnDate, reportMonth };
  }, []);

  const isCountReport = activeTab === '1.1' || activeTab === '1.2' || activeTab === '1.3';
  const isDelayReport = activeTab === '1.4' || activeTab === '1.5';

  return (
    <div className="space-y-4 animate-fade-in select-none">
      <div className="overflow-hidden border-b" style={{ borderColor: BORDER, background: '#ffffff' }}>
        <div className="flex items-center overflow-x-auto px-2 gap-1 scrollbar-none">
          {REPORTS.map((r) => {
            const Icon = r.icon;
            const isActive = activeTab === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleTabChange(r.id)}
                style={{
                  color: isActive ? BRAND : '#9AA9BF',
                  backgroundColor: isActive ? ACCENT : 'transparent',
                  borderBottomColor: isActive ? BRAND : 'transparent'
                }}
                className="flex items-center gap-2 whitespace-nowrap px-4 py-3 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-200 cursor-pointer border-b-[3px] border-x-0 border-t-0 rounded-t-[8px] hover:bg-[#f5eeea] hover:text-[#4b2424]"
              >
                <Icon size={16} strokeWidth={2.2} />
                <span>{r.code}: {r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {isCountReport && (
          <>
            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Initiatives</span>
              <span className="text-lg font-black mt-0.5 block" style={{ color: BRAND }}>
                {formatNumber(kpis.totalInitiatives)}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Investment</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block truncate">
                ₹{formatInvestment(kpis.totalInvestment)} Cr
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">
                {formatNumber(kpis.completed)}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Progress On Time</span>
              <span className="text-lg font-black mt-0.5 block" style={{ color: BRAND_HOVER }}>
                {formatNumber(kpis.progressOn)}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Progress Delayed</span>
              <span className="text-lg font-black text-rose-700 dark:text-rose-400 mt-0.5 block">
                {formatNumber(kpis.progressDelayed)}
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Not Started</span>
              <span className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5 block">
                {formatNumber(kpis.notStarted)}
              </span>
            </div>
          </>
        )}

        {isDelayReport && (
          <>
            <div className="p-3.5 col-span-1 sm:col-span-2 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Delayed Initiatives</span>
              <span className="text-xl font-black text-rose-700 dark:text-rose-400 mt-0.5 block">
                {formatNumber(kpis.totalDelayed)}
              </span>
            </div>

            <div className="p-3.5 col-span-1 sm:col-span-2 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Severely Delayed (&gt; 1 Year)</span>
              <span className="text-xl font-black text-rose-800 dark:text-rose-400 mt-0.5 block">
                {formatNumber(kpis.severelyDelayed)}
              </span>
            </div>

            <div className="p-3.5 col-span-2 sm:col-span-2 bg-white dark:bg-slate-900 rounded-xl border shadow-xs" style={{ borderColor: '#eadede' }}>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Delayed Cost</span>
              <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block truncate">
                ₹{formatInvestment(kpis.totalInvestment)} Cr
              </span>
            </div>
          </>
        )}
      </div>

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

      <div className="rounded-2xl border shadow-sm overflow-hidden bg-white" style={{ borderColor: BORDER }}>
        {/* ---- Header strip ---- */}
        <div
          className="relative flex flex-wrap items-center justify-between gap-4 px-[26px] py-5"
          style={{
            background: 'linear-gradient(to right, #fdfcfc, #f7f3f3)',
            borderBottom: `1px solid ${BORDER}`
          }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} style={{ color: BRAND_SOFT }} strokeWidth={2.5} />
                <span className="text-[10.5px] uppercase tracking-[0.12em] font-extrabold" style={{ color: BRAND_SOFT }}>
                  MIV 2030 Reports
                </span>
              </div>

              <h3 className="m-0 text-xl font-bold tracking-wide" style={{ color: BRAND }}>
                {activeReportConfig.fullTitle}
              </h3>

              <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold flex-wrap" style={{ color: BRAND_SOFT }}>
                <span>
                  As on date:
                  <strong style={{ color: BRAND, marginLeft: '4px' }}>{asOnDateLabel.asOnDate}</strong>
                </span>
                <span style={{ color: '#eadede' }}>•</span>
                <span>
                  Report for the month —
                  <strong style={{ color: BRAND, marginLeft: '4px' }}>{asOnDateLabel.reportMonth}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Filter panel (Report 1.5 only) ---- */}
        {activeTab === '1.5' && (
          <div>
            <button
              type="button"
              onClick={() => setShowFilterPanel((open) => !open)}
              className="w-full px-[18px] py-3 flex items-center justify-between text-xs font-extrabold cursor-pointer transition"
              style={{
                background: ACCENT,
                color: BRAND,
                border: 'none',
                borderBottom: showFilterPanel ? `1px solid ${BORDER}` : 'none'
              }}
            >
              <div className="flex items-center gap-2">
                <Filter size={15} color={BRAND} />
                <span>Filter Delayed / Overdue Initiatives</span>
                {hasActiveFilters && (
                  <span className="px-2 py-0.5 bg-[#4b2424] text-white text-[10px] rounded-full font-bold">
                    {activeFilterCount} Active
                  </span>
                )}
              </div>

              {showFilterPanel ? <ChevronUp size={16} color={BRAND} /> : <ChevronDown size={16} color={BRAND} />}
            </button>

            {showFilterPanel && (
              <div className="p-4 space-y-3 animate-fade-in bg-white" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Organization Filter */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[11.5px] font-extrabold mb-1.5" style={{ color: BRAND }}>
                      <Building2 size={13} style={{ color: BRAND_SOFT }} />
                      <span>Organization</span>
                    </label>
                    <select
                      value={filterOrg}
                      onChange={(e) => setFilterOrg(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-[10px] font-semibold outline-none cursor-pointer"
                      style={{ background: '#fcf9f7', border: '1px solid #d7c4b7', color: BRAND }}
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
                    <label className="flex items-center gap-1.5 text-[11.5px] font-extrabold mb-1.5" style={{ color: BRAND }}>
                      <Tag size={13} style={{ color: BRAND_SOFT }} />
                      <span>Category</span>
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-[10px] font-semibold outline-none cursor-pointer"
                      style={{ background: '#fcf9f7', border: '1px solid #d7c4b7', color: BRAND }}
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

                {hasActiveFilters && (
                  <div className="flex justify-end pt-2 border-t" style={{ borderColor: '#eadede' }}>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="px-3 py-1.5 rounded-lg text-xs font-extrabold transition cursor-pointer inline-flex items-center gap-1.5"
                      style={{ background: ACCENT, color: BRAND }}
                    >
                      <RotateCcw size={12} />
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---- Report Table ---- */}
        <div>
          <ReportTable
            title={activeReportConfig.fullTitle}
            subtitle={<></>}
            rawData={displayedReportRows}
            viewData={displayedReportRows}
            columns={columns}
            pinnedBottomRowData={pinnedBottomRowData}
            loading={loading}
            onRefresh={fetchCurrentReport}
            triggerNotification={triggerNotification}
            pagination={true}
            suppressHorizontalScroll={false}
            alwaysShowHorizontalScroll={true}
            domLayout="normal"
            themeClass="yp-pro-grid"
            brandColor={BRAND}
            brandColorHover={BRAND_HOVER}
            accentColor="#f7f3f3"
            oddRowColor="#f8faf6"
            totalLabel="Total"
            onGridReady={onGridReady}
          />
        </div>
      </div>
    </div>
  );
}
