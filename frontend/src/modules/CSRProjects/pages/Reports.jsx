import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReportTable from '../../../components/ReportTable';
import {
  fetchCsrFundYearWiseReport,
  fetchCsrFundOrgWiseReport,
  fetchOrganisations,
  getUserIdFromToken
} from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import { Coins, Filter, ChevronDown, X, RotateCcw } from 'lucide-react';
import { getDataScopeCode, getSessionClaims, getSessionOrganisationId, getSessionOrganisationName } from '../../../utils/authSession';

const REPORT_TITLES = {
  'fund-year-wise-report': 'Report No.: C.S.R 1.1 - CSR Fund Year Wise Report',
  'fund-org-wise-report': 'Report No.: C.S.R 1.2 - CSR Fund Organisation Wise Report',
};

const REPORT_LABELS = {
  'fund-year-wise-report': 'CSR Fund Year Wise Report',
  'fund-org-wise-report': 'CSR Fund Organisation Wise Report',
};

export default function Reports({
  initialReportType = 'fund-year-wise-report',
  onReportTypeChange,
  triggerNotification
}) {
  const isOrgUser = useMemo(() => {
    const scope = String(getDataScopeCode() || '').toUpperCase();
    if (scope === 'ORGANISATION') return true;
    if (scope === 'MINISTRY' || scope === 'MASTER') return false;
    const claims = getSessionClaims();
    const roleId = Number(claims?.roleId || claims?.role_id || claims?.role || 1);
    return roleId === 6 || roleId === 7;
  }, []);

  const userOrgId = getSessionOrganisationId();
  const userOrgName = getSessionOrganisationName();

  const [reportType, setReportType] = useState(initialReportType || 'fund-year-wise-report');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const [organisations, setOrganisations] = useState([]);
  const [filterFY, setFilterFY] = useState('all');

  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
      setFilterFY(initialReportType === 'fund-org-wise-report' ? FINANCIAL_YEARS[0] : 'all');
    }
  }, [initialReportType]);

  const handleSwitchReportType = (type) => {
    setReportType(type);
    onReportTypeChange?.(type);
    setFilterFY(type === 'fund-org-wise-report' ? FINANCIAL_YEARS[0] : 'all');
  };

  const hasActiveFilters = filterFY !== 'all';

  const resetFilters = () => {
    setFilterFY('all');
    triggerNotification?.('Filters have been reset', 'info');
  };

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(Array.isArray(res) ? res : []))
      .catch(() => setOrganisations([]));
  }, []);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (reportType === 'fund-year-wise-report') {
        const res = await fetchCsrFundYearWiseReport('all');
        setReportData(Array.isArray(res) ? res : []);
      } else if (reportType === 'fund-org-wise-report') {
        const res = await fetchCsrFundOrgWiseReport(filterFY);
        setReportData(Array.isArray(res) ? res : []);
      }
    } catch (err) {
      console.warn("CSR report fetch notice:", err.message);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, filterFY]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Client-side scoping: org users only ever see their own organisation's rows
  const filteredData = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];
    if (!isOrgUser) return reportData;

    return reportData.filter(row => {
      const rowOrgId = String(row.organisation_id || row.organisationID || row['Organisation ID'] || '');
      const rowOrgName = String(row.Organisation_Name || row.organisation_name || '').toLowerCase();
      if (userOrgId && rowOrgId && rowOrgId !== String(userOrgId)) return false;
      if (userOrgName && rowOrgName && rowOrgName !== userOrgName.toLowerCase()) return false;
      return true;
    });
  }, [reportData, isOrgUser, userOrgId, userOrgName]);

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
          valueGetter: (params) => params.node.rowIndex + 1
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
          headerName: "CSR Fund Allotted (₹ Lakh)",
          field: "CSR_Fund_Allotted_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Project Expenditure (₹ Lakh)",
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
          headerName: "CSR Fund Balance (₹ Lakh)",
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
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
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
          valueGetter: (params) => params.node.rowIndex + 1
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
          headerName: "Opening CSR Balance (₹ Lakh)",
          field: "Opening_CSR_Balance_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "CSR Fund Allotted (₹ Lakh)",
          field: "CSR_Fund_Allotted_Lakh",
          minWidth: 200,
          flex: 1.5,
          headerClass: "text-center",
          cellClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Project Expenditure (₹ Lakh)",
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
          headerName: "CSR Fund Balance (₹ Lakh)",
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
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueFormatter: (params) => params.value != null ? `${Number(params.value).toFixed(2)}%` : '-'
        }
      ];
    }

    return [];
  }, [reportType]);

  const pinnedBottomRowData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return undefined;

    if (reportType === 'fund-year-wise-report') {
      const totalAllotted = filteredData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Allotted_Lakh) || 0), 0);
      const totalExp = filteredData.reduce((acc, r) => acc + (Number(r.Project_Expenditure_Lakh) || 0), 0);
      const totalBal = filteredData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Balance_Lakh) || 0), 0);
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
      const totalOpening = filteredData.reduce((acc, r) => acc + (Number(r.Opening_CSR_Balance_Lakh) || 0), 0);
      const totalAllotted = filteredData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Allotted_Lakh) || 0), 0);
      const totalExp = filteredData.reduce((acc, r) => acc + (Number(r.Project_Expenditure_Lakh) || 0), 0);
      const totalBal = filteredData.reduce((acc, r) => acc + (Number(r.CSR_Fund_Balance_Lakh) || 0), 0);
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

    return undefined;
  }, [filteredData, reportType]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const toolbarExtra = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setShowFilterPanel(prev => !prev)}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[13px] font-semibold border transition cursor-pointer ${
          showFilterPanel || hasActiveFilters
            ? 'bg-[#f7f3f3] border-[#4b2424] text-[#4b2424] dark:bg-amber-950/50 dark:border-amber-700 dark:text-amber-300'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
        }`}
      >
        <Filter size={14} className="text-[#4b2424] dark:text-amber-400" />
        <span>Filter</span>
        {hasActiveFilters && (
          <span className="bg-[#4b2424] dark:bg-amber-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
            1
          </span>
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

  const filterPanel = showFilterPanel ? (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {`Filter ${REPORT_LABELS[reportType] || ''}`}
          </span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="max-w-md">
        <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
          Financial Year
        </label>
        <select
          value={filterFY}
          onChange={e => setFilterFY(e.target.value)}
          className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none cursor-pointer"
        >
          <option value="all">Show All Financial Years</option>
          {FINANCIAL_YEARS.map(fy => (
            <option key={fy} value={fy}>{fy}</option>
          ))}
        </select>
      </div>
    </div>
  ) : null;

  const currentReportTitle = REPORT_TITLES[reportType] || '';
  const currentEyebrow = REPORT_LABELS[reportType] || '';

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">

      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 select-none">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => handleSwitchReportType('fund-year-wise-report')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              reportType === 'fund-year-wise-report'
                ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>CSR FUND YEAR WISE REPORT</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchReportType('fund-org-wise-report')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              reportType === 'fund-org-wise-report'
                ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>CSR FUND ORGANISATION WISE REPORT</span>
          </button>
        </div>
      </div>

      <ReportTable
        title={currentReportTitle}
        subtitle={null}
        eyebrow={currentEyebrow}
        showBackButton={false}
        loading={loading}
        onRefresh={loadReportData}
        rawData={filteredData}
        viewData={filteredData}
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

    </div>
  );
}
