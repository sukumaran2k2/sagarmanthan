import { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Coins, Filter, ChevronDown, X, RotateCcw } from 'lucide-react';
import ReportTable from '../../../components/ReportTable';
import {
  fetchCsrFundYearWiseReport,
  fetchCsrFundOrgWiseReport,
  fetchCsrFundOrgTrendReport,
  fetchCsrProjectsYearWiseSummary,
  fetchCsrProjectsOrgWiseSummary,
  fetchCsrProjectsFocusWiseSummary,
} from '../api';
import { FINANCIAL_YEARS, CSR_FOCUS_AREAS } from '../utils/constants';
import { reportsFor, resolveReport } from '../utils/reports';
import { useCsrStore } from '../store/useCsrStore';
import { lakhToCrore } from '../utils/amounts';
import { COMMON_TOASTS } from '../../../utils/notify';

// Utilisation % colour tiers, as in the CAPEX reports: >100% blue (above allotted),
// 75-100% emerald (good), 50-<75% amber (moderate), <50% red (low).
const getUtilisationColor = (value) => {
  if (value == null) return '#475569';
  if (value > 100) return '#2563eb';
  if (value >= 75) return '#059669';
  if (value >= 50) return '#b45309';
  return '#dc2626';
};

// How each report is fetched. The server scopes every report by the login: organisation
// users get their own organisation, and nothing from the ministry-only reports.
const FETCHERS = {
  'fund-year-wise-report': () => fetchCsrFundYearWiseReport('all'),
  'fund-org-wise-report': ({ fy }) => fetchCsrFundOrgWiseReport(fy),
  'fund-org-trend-report': ({ org }) => fetchCsrFundOrgTrendReport(org || 'all'),
  'projects-year-wise-summary': () => fetchCsrProjectsYearWiseSummary('all'),
  'projects-org-wise-summary': () => fetchCsrProjectsOrgWiseSummary(),
  'projects-focus-wise-summary': () => fetchCsrProjectsFocusWiseSummary('all'),
};

// Which filter a report offers: the FY reports take a year; the fund trend needs an
// organisation (organisation users always get their own, so they have nothing to choose)
const filterKind = (reportType, isOrgUser) => {
  if (reportType === 'fund-org-wise-report') return 'fy';
  if (reportType === 'fund-org-trend-report' && !isOrgUser) return 'org';
  return null;
};

export default function Reports({ notify, triggerNotification, isOrgUser }) {
  const { storedType, reportFY, reportOrg, organisations } = useCsrStore(useShallow((state) => ({
    storedType: state.reportType,
    reportFY: state.reportFY,
    reportOrg: state.reportOrg,
    organisations: state.organisations,
  })));
  const { setReportType, setReportFY, setReportOrg, resetReportFilters } = useCsrStore(useShallow((state) => ({
    setReportType: state.setReportType,
    setReportFY: state.setReportFY,
    setReportOrg: state.setReportOrg,
    resetReportFilters: state.resetReportFilters,
  })));

  const report = resolveReport(storedType, isOrgUser);
  const reportType = report.id;
  const filter = filterKind(reportType, isOrgUser);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Rows tagged with the request they answer; the fund trend waits for an organisation
  const needsOrg = filter === 'org' && !reportOrg;
  const requestKey = JSON.stringify([reportType, reportFY, reportOrg, reloadKey]);
  const [result, setResult] = useState(null); // { key, rows }
  useEffect(() => {
    if (needsOrg) return undefined;
    let cancelled = false;
    FETCHERS[reportType]({ fy: reportFY, org: reportOrg })
      .then((res) => {
        if (!cancelled) setResult({ key: requestKey, rows: Array.isArray(res) ? res : [] });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('CSR report fetch failed:', err);
        setResult({ key: requestKey, rows: [] });
        notify(COMMON_TOASTS.loadFailed(report.label));
      });
    return () => { cancelled = true; };
  }, [requestKey, reportType, reportFY, reportOrg, needsOrg, report.label, notify]);
  const loading = !needsOrg && result?.key !== requestKey;
  // The server returns amounts in lakh (the *_Lakh fields); they are shown in crore, so the
  // grid, the totals row and the exports all read the same figures
  const reportData = useMemo(() => {
    if (needsOrg || result?.key !== requestKey) return [];
    return result.rows.map((row) => Object.fromEntries(Object.entries(row).map(([k, v]) => (
      k.endsWith('_Lakh') && v != null ? [k, lakhToCrore(v)] : [k, v]
    ))));
  }, [needsOrg, result, requestKey]);

  const hasActiveFilters = filter === 'fy' ? reportFY !== 'all' : filter === 'org' ? !!reportOrg : false;
  const resetFilters = () => {
    resetReportFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  const columns = useMemo(() => {
    // Report 1.1 - CSR Fund Year Wise Report
    if (reportType === 'fund-year-wise-report') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => params.node.rowPinned ? params.data['S No'] : params.node.rowIndex + 1
        },
        {
          headerName: "Financial Year",
          field: "Financial_Year",
          minWidth: 150,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        },
        {
          headerName: "No. of Organisations",
          field: "No_of_Organisations",
          minWidth: 170,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' }
        },
        {
          headerName: "CSR Fund Allotted (₹ Cr)",
          field: "CSR_Fund_Allotted_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Project Expenditure (₹ Cr)",
          field: "Project_Expenditure_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#d97706', justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-',
          cellRenderer: (params) => (
            <div className="w-full flex items-center justify-center text-center font-extrabold text-amber-600">
              {params.value != null ? Number(params.value).toFixed(2) : '-'}
            </div>
          )
        },
        {
          headerName: "CSR Fund Balance (₹ Cr)",
          field: "CSR_Fund_Balance_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#059669', justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-',
          cellRenderer: (params) => (
            <div className="w-full flex items-center justify-center text-center font-extrabold text-emerald-600">
              {params.value != null ? Number(params.value).toFixed(2) : '-'}
            </div>
          )
        },
        {
          headerName: "Utilisation (%)",
          field: "Utilisation_Percent",
          minWidth: 150,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: (params) => ({ textAlign: 'center', fontWeight: 800, justifyContent: 'center', color: getUtilisationColor(params.value) }),
          valueFormatter: (params) => params.value != null ? `${Number(params.value).toFixed(2)}%` : '-'
        }
      ];
    }

    // Report 1.2 - CSR Fund Organisation Wise Report
    if (reportType === 'fund-org-wise-report') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => params.node.rowPinned ? params.data['S No'] : params.node.rowIndex + 1
        },
        {
          headerName: "Organisation",
          field: "Organisation_Name",
          minWidth: 260,
          flex: 2,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        },
        {
          headerName: "Opening CSR Balance (₹ Cr)",
          field: "Opening_CSR_Balance_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "CSR Fund Allotted (₹ Cr)",
          field: "CSR_Fund_Allotted_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Project Expenditure (₹ Cr)",
          field: "Project_Expenditure_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#d97706', justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-',
          cellRenderer: (params) => (
            <div className="w-full flex items-center justify-center text-center font-extrabold text-amber-600">
              {params.value != null ? Number(params.value).toFixed(2) : '-'}
            </div>
          )
        },
        {
          headerName: "CSR Fund Balance (₹ Cr)",
          field: "CSR_Fund_Balance_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#059669', justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-',
          cellRenderer: (params) => (
            <div className="w-full flex items-center justify-center text-center font-extrabold text-emerald-600">
              {params.value != null ? Number(params.value).toFixed(2) : '-'}
            </div>
          )
        },
        {
          headerName: "Utilisation (%)",
          field: "Utilisation_Percent",
          minWidth: 150,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: (params) => ({ textAlign: 'center', fontWeight: 800, justifyContent: 'center', color: getUtilisationColor(params.value) }),
          valueFormatter: (params) => params.value != null ? `${Number(params.value).toFixed(2)}%` : '-'
        }
      ];
    }

    // Report 1.3 - Organisation-wise CSR Fund Trend
    if (reportType === 'fund-org-trend-report') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => params.node.rowPinned ? params.data['S No'] : params.node.rowIndex + 1
        },
        {
          headerName: "Financial Year",
          field: "Financial_Year",
          minWidth: 150,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        },
        {
          headerName: "CSR Fund Allotted (₹ Cr)",
          field: "CSR_Fund_Allotted_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Project Expenditure (₹ Cr)",
          field: "Project_Expenditure_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#d97706', justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-',
          cellRenderer: (params) => (
            <div className="w-full flex items-center justify-center text-center font-extrabold text-amber-600">
              {params.value != null ? Number(params.value).toFixed(2) : '-'}
            </div>
          )
        },
        {
          headerName: "CSR Fund Balance (₹ Cr)",
          field: "CSR_Fund_Balance_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#059669', justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-',
          cellRenderer: (params) => (
            <div className="w-full flex items-center justify-center text-center font-extrabold text-emerald-600">
              {params.value != null ? Number(params.value).toFixed(2) : '-'}
            </div>
          )
        },
        {
          headerName: "Utilisation (%)",
          field: "Utilisation_Percent",
          minWidth: 150,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: (params) => ({ textAlign: 'center', fontWeight: 800, justifyContent: 'center', color: getUtilisationColor(params.value) }),
          valueFormatter: (params) => params.value != null ? `${Number(params.value).toFixed(2)}%` : '-'
        }
      ];
    }

    // Report 1.4 - Financial Year-wise CSR Projects Summary
    if (reportType === 'projects-year-wise-summary') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => params.node.rowPinned ? params.data['S No'] : params.node.rowIndex + 1
        },
        {
          headerName: "Financial Year",
          field: "Financial_Year",
          minWidth: 150,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        },
        {
          headerName: "Total CSR Projects",
          field: "Total_CSR_Projects",
          minWidth: 160,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#4b2424', justifyContent: 'center' }
        },
        {
          headerName: "CSR Fund Allotted (₹ Cr)",
          field: "CSR_Fund_Allotted_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Stage wise CSR Projects count",
          headerClass: "text-center",
          children: [
            {
              headerName: "Approved by Board",
              field: "Approved_By_Board",
              minWidth: 140,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#2563eb', justifyContent: 'center' }
            },
            {
              headerName: "Yet to Start",
              field: "Yet_to_Start",
              minWidth: 130,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#d97706', justifyContent: 'center' }
            },
            {
              headerName: "Under Implementation",
              field: "Under_Implementation",
              minWidth: 160,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#4b2424', justifyContent: 'center' }
            },
            {
              headerName: "Completed",
              field: "Completed",
              minWidth: 130,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#059669', justifyContent: 'center' }
            }
          ]
        }
      ];
    }

    // Report 1.5 - Organisation-wise CSR Projects Summary
    if (reportType === 'projects-org-wise-summary') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => params.node.rowPinned ? params.data['S No'] : params.node.rowIndex + 1
        },
        {
          headerName: "Organisation",
          field: "Organisation_Name",
          minWidth: 260,
          flex: 2,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        },
        {
          headerName: "Total CSR Projects",
          field: "Total_CSR_Projects",
          minWidth: 160,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#4b2424', justifyContent: 'center' }
        },
        {
          headerName: "Stage wise CSR Projects count",
          headerClass: "text-center",
          children: [
            {
              headerName: "Approved by Board",
              field: "Approved_By_Board",
              minWidth: 140,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#2563eb', justifyContent: 'center' }
            },
            {
              headerName: "Yet to Start",
              field: "Yet_to_Start",
              minWidth: 130,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#d97706', justifyContent: 'center' }
            },
            {
              headerName: "Under Implementation",
              field: "Under_Implementation",
              minWidth: 160,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#4b2424', justifyContent: 'center' }
            },
            {
              headerName: "Completed",
              field: "Completed",
              minWidth: 130,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#059669', justifyContent: 'center' }
            }
          ]
        }
      ];
    }

    // Report 1.6 - CSR Focus/Project Area-wise CSR Projects Summary
    if (reportType === 'projects-focus-wise-summary') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => params.node.rowPinned ? params.data['S No'] : params.node.rowIndex + 1
        },
        {
          headerName: "CSR Focus/Project Area",
          field: "CSR_Focus",
          minWidth: 280,
          flex: 2,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' },
          valueFormatter: (params) => {
            const match = CSR_FOCUS_AREAS.find(f => f.id === Number(params.value));
            return match ? match.name : (params.value || '-');
          }
        },
        {
          headerName: "Total CSR Projects",
          field: "Total_CSR_Projects",
          minWidth: 160,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#4b2424', justifyContent: 'center' }
        },
        {
          headerName: "CSR Fund Allotted (₹ Cr)",
          field: "CSR_Fund_Allotted_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Stage wise CSR Projects count",
          headerClass: "text-center",
          children: [
            {
              headerName: "Approved by Board",
              field: "Approved_By_Board",
              minWidth: 140,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#2563eb', justifyContent: 'center' }
            },
            {
              headerName: "Yet to Start",
              field: "Yet_to_Start",
              minWidth: 130,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#d97706', justifyContent: 'center' }
            },
            {
              headerName: "Under Implementation",
              field: "Under_Implementation",
              minWidth: 160,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#4b2424', justifyContent: 'center' }
            },
            {
              headerName: "Completed",
              field: "Completed",
              minWidth: 130,
              flex: 1,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', fontWeight: 700, color: '#059669', justifyContent: 'center' }
            }
          ]
        }
      ];
    }

    return [];
  }, [reportType]);

  const pinnedBottomRowData = useMemo(() => {
    if (!reportData || reportData.length === 0) return undefined;

    if (reportType === 'fund-year-wise-report') {
      const totalAllotted = reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Allotted_Lakh) || 0), 0);
      const totalExp = reportData.reduce((acc, r) => acc + (Number(r.Project_Expenditure_Lakh) || 0), 0);
      const totalBal = reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Balance_Lakh) || 0), 0);
      return [{
        'S No': 'Total',
        Financial_Year: '',
        No_of_Organisations: '',
        CSR_Fund_Allotted_Lakh: totalAllotted,
        Project_Expenditure_Lakh: totalExp,
        CSR_Fund_Balance_Lakh: totalBal,
        Utilisation_Percent: totalAllotted ? Number(((totalExp / totalAllotted) * 100).toFixed(2)) : null,
      }];
    }

    if (reportType === 'fund-org-wise-report') {
      const totalOpening = reportData.reduce((acc, r) => acc + (Number(r.Opening_CSR_Balance_Lakh) || 0), 0);
      const totalAllotted = reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Allotted_Lakh) || 0), 0);
      const totalExp = reportData.reduce((acc, r) => acc + (Number(r.Project_Expenditure_Lakh) || 0), 0);
      const totalBal = reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Balance_Lakh) || 0), 0);
      return [{
        'S No': 'Total',
        Organisation_Name: '',
        Opening_CSR_Balance_Lakh: totalOpening,
        CSR_Fund_Allotted_Lakh: totalAllotted,
        Project_Expenditure_Lakh: totalExp,
        CSR_Fund_Balance_Lakh: totalBal,
        Utilisation_Percent: totalAllotted ? Number(((totalExp / totalAllotted) * 100).toFixed(2)) : null,
      }];
    }

    if (reportType === 'fund-org-trend-report') {
      const totalAllotted = reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Allotted_Lakh) || 0), 0);
      const totalExp = reportData.reduce((acc, r) => acc + (Number(r.Project_Expenditure_Lakh) || 0), 0);
      const totalBal = reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Balance_Lakh) || 0), 0);
      return [{
        'S No': 'Total',
        Financial_Year: '',
        CSR_Fund_Allotted_Lakh: totalAllotted,
        Project_Expenditure_Lakh: totalExp,
        CSR_Fund_Balance_Lakh: totalBal,
        Utilisation_Percent: totalAllotted ? Number(((totalExp / totalAllotted) * 100).toFixed(2)) : null,
      }];
    }

    if (reportType === 'projects-year-wise-summary') {
      return [{
        'S No': 'Total',
        Financial_Year: '',
        Total_CSR_Projects: reportData.reduce((acc, r) => acc + (Number(r.Total_CSR_Projects) || 0), 0),
        CSR_Fund_Allotted_Lakh: reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Allotted_Lakh) || 0), 0),
        Approved_By_Board: reportData.reduce((acc, r) => acc + (Number(r.Approved_By_Board) || 0), 0),
        Yet_to_Start: reportData.reduce((acc, r) => acc + (Number(r.Yet_to_Start) || 0), 0),
        Under_Implementation: reportData.reduce((acc, r) => acc + (Number(r.Under_Implementation) || 0), 0),
        Completed: reportData.reduce((acc, r) => acc + (Number(r.Completed) || 0), 0),
      }];
    }

    if (reportType === 'projects-org-wise-summary') {
      return [{
        'S No': 'Total',
        Organisation_Name: '',
        Total_CSR_Projects: reportData.reduce((acc, r) => acc + (Number(r.Total_CSR_Projects) || 0), 0),
        Approved_By_Board: reportData.reduce((acc, r) => acc + (Number(r.Approved_By_Board) || 0), 0),
        Yet_to_Start: reportData.reduce((acc, r) => acc + (Number(r.Yet_to_Start) || 0), 0),
        Under_Implementation: reportData.reduce((acc, r) => acc + (Number(r.Under_Implementation) || 0), 0),
        Completed: reportData.reduce((acc, r) => acc + (Number(r.Completed) || 0), 0),
      }];
    }

    if (reportType === 'projects-focus-wise-summary') {
      return [{
        'S No': 'Total',
        CSR_Focus: '',
        Total_CSR_Projects: reportData.reduce((acc, r) => acc + (Number(r.Total_CSR_Projects) || 0), 0),
        CSR_Fund_Allotted_Lakh: reportData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Allotted_Lakh) || 0), 0),
        Approved_By_Board: reportData.reduce((acc, r) => acc + (Number(r.Approved_By_Board) || 0), 0),
        Yet_to_Start: reportData.reduce((acc, r) => acc + (Number(r.Yet_to_Start) || 0), 0),
        Under_Implementation: reportData.reduce((acc, r) => acc + (Number(r.Under_Implementation) || 0), 0),
        Completed: reportData.reduce((acc, r) => acc + (Number(r.Completed) || 0), 0),
      }];
    }

    return undefined;
  }, [reportData, reportType]);

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true }), []);

  const toolbarExtra = filter && (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowFilterPanel((open) => !open)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold border transition cursor-pointer ${
          showFilterPanel || hasActiveFilters
            ? 'bg-[#f7f3f3] border-[#4b2424] text-[#4b2424] dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <Filter size={14} className="text-[#4b2424] dark:text-amber-400" />
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="bg-[#4b2424] dark:bg-amber-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">1</span>
        )}
        <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
      </button>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-[9px] border border-rose-200 dark:border-rose-900 transition cursor-pointer"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );

  const filterPanel = filter && showFilterPanel ? (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Filter {report.label}</span>
        </div>
        {hasActiveFilters && (
          <button type="button" onClick={resetFilters} className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer">
            <X className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
      <div className="max-w-md">
        {filter === 'org' ? (
          <div>
            <label className="module-form-label">Organisation</label>
            <select value={reportOrg} onChange={(e) => setReportOrg(e.target.value)} className="module-form-select">
              <option value="">-- Select an Organisation --</option>
              {organisations.map((o) => <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <label className="module-form-label">Financial Year</label>
            <select value={reportFY} onChange={(e) => setReportFY(e.target.value)} className="module-form-select">
              <option value="all">Show All Financial Years</option>
              {FINANCIAL_YEARS.map((fy) => <option key={fy} value={fy}>{fy}</option>)}
            </select>
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="module-subtabs-strip flex-wrap">
        {reportsFor(isOrgUser).map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setReportType(r.id)}
            className={`module-subtab-btn flex items-center gap-2 ${reportType === r.id ? 'active' : ''}`}
          >
            <Coins className="h-4 w-4" />
            <span>{r.tab}</span>
          </button>
        ))}
      </div>

      {needsOrg && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl text-xs font-semibold text-amber-800 dark:text-amber-300">
          <Filter className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Select an organisation from the Filter panel to generate this report.</span>
        </div>
      )}

      <ReportTable
        title={(isOrgUser && report.orgTitle) || report.title}
        subtitle={null}
        eyebrow={report.label}
        showBackButton={false}
        loading={loading}
        onRefresh={() => setReloadKey((k) => k + 1)}
        rawData={reportData}
        viewData={reportData}
        columns={columns}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        toolbarExtra={toolbarExtra}
        filterPanel={filterPanel}
        triggerNotification={triggerNotification}
        pagination={true}
        themeClass="yp-pro-grid"
        brandColor="#4b2424"
        brandColorHover="#6b3535"
        accentColor="#f7f3f3"
        oddRowColor="#f8faf6"
        totalLabel="Total"
      />

      {['fund-year-wise-report', 'fund-org-wise-report', 'fund-org-trend-report'].includes(reportType) && (
        <div className="flex flex-wrap gap-3 text-[11px] text-slate-600 dark:text-slate-400 px-1">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> 75–100% Good</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-600" /> 50–&lt;75% Moderate</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> &lt;50% Low</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> &gt;100% Above Fund Allotted</span>
        </div>
      )}
    </div>
  );
}
