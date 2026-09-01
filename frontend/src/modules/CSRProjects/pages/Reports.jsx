import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReportTable from '../../../components/ReportTable';
import { 
  fetchCsrAbstractReport, 
  fetchCsrDetailedReport,
  fetchCsrExpenditureReport,
  fetchOrganisations,
  getUserIdFromToken
} from '../api';
import { FINANCIAL_YEARS } from '../utils/constants';
import { FilePieChart, Coins, ArrowLeft, Filter, ChevronDown, X, RotateCcw } from 'lucide-react';
import { isOrganisationUser, getSessionOrganisationId, getSessionOrganisationName } from '../../../utils/authSession';

export default function Reports({
  initialReportType = 'project-report',
  onReportTypeChange,
  triggerNotification
}) {
  const isOrgUser = useMemo(() => isOrganisationUser(), []);

  const userOrgId = getSessionOrganisationId();
  const userOrgName = getSessionOrganisationName();

  // Sub-report selection: 'project-report' | 'expenditure-report'
  const [reportType, setReportType] = useState(initialReportType || 'project-report');
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Filters
  const [organisations, setOrganisations] = useState([]);
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterFY, setFilterFY] = useState('all');

  // Drilldown Navigation Stack for Project Report
  const [projectsDrillDown, setProjectsDrillDown] = useState([
    {
      type: 'abstract',
      title: (initialReportType === 'expenditure-report')
        ? 'Report No.: C.S.R 1.1 - Abstract - Overview of CSR Expenditure Report'
        : 'Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report',
    }
  ]);

  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
      setFilterOrg('all');
      setFilterFY('all');
      setProjectsDrillDown([
        {
          type: 'abstract',
          title: initialReportType === 'expenditure-report'
            ? 'Report No.: C.S.R 1.1 - Abstract - Overview of CSR Expenditure Report'
            : 'Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report',
        }
      ]);
    }
  }, [initialReportType]);

  const handleSwitchReportType = (type) => {
    setReportType(type);
    onReportTypeChange?.(type);
    setFilterOrg('all');
    setFilterFY('all');
    setProjectsDrillDown([
      {
        type: 'abstract',
        title: type === 'expenditure-report'
          ? 'Report No.: C.S.R 1.1 - Abstract - Overview of CSR Expenditure Report'
          : 'Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report',
      }
    ]);
  };

  const hasActiveFilters = filterOrg !== 'all' || filterFY !== 'all';

  const resetFilters = () => {
    setFilterOrg('all');
    setFilterFY('all');
    triggerNotification?.('Filters have been reset', 'info');
  };

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Load master organisations for dropdown filters
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(Array.isArray(res) ? res : []))
      .catch(() => setOrganisations([]));
  }, []);

  const currentView = projectsDrillDown[projectsDrillDown.length - 1];

  const handleBack = () => {
    if (projectsDrillDown.length > 1) {
      setProjectsDrillDown(prev => prev.slice(0, -1));
    }
  };

  // Fetch report data
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      if (reportType === 'project-report') {
        if (currentView.type === 'abstract') {
          const res = await fetchCsrAbstractReport(userId);
          const rows = res?.rowData || (Array.isArray(res) ? res : []);
          setReportData(rows);
        } else if (currentView.type === 'detailed') {
          const res = await fetchCsrDetailedReport(currentView.orgId, currentView.orgName);
          const rows = res?.rowData || (Array.isArray(res) ? res : []);
          setReportData(rows);
        }
      } else {
        const res = await fetchCsrExpenditureReport(userId);
        const rows = res?.rowData || (Array.isArray(res) ? res : []);
        setReportData(rows);
      }
    } catch (err) {
      console.warn("CSR report fetch notice:", err.message);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [reportType, currentView]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Client-side filtering with strict organisation scoping for org users
  const filteredData = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];

    return reportData.filter(row => {
      // Organisation Scoping for Org Users
      if (isOrgUser) {
        const rowOrgId = String(row.organisation_id || row.organisationID || row['Organisation ID'] || row['organisationID'] || '');
        const rowOrgName = String(row.organisation_name || row['Organisation Name'] || '').toLowerCase();
        if (userOrgId && rowOrgId && rowOrgId !== String(userOrgId)) return false;
        if (userOrgName && rowOrgName && rowOrgName !== userOrgName.toLowerCase()) return false;
      } else if (filterOrg !== 'all') {
        const rowOrgId = String(row.organisation_id || row.organisationID || row['Organisation ID'] || row['organisationID'] || '');
        if (rowOrgId !== String(filterOrg)) return false;
      }

      // Financial Year Filter
      if (filterFY !== 'all') {
        const rowFY = String(row.financial_year || row['Financial Year'] || '');
        if (rowFY !== String(filterFY)) return false;
      }

      return true;
    });
  }, [reportData, isOrgUser, userOrgId, userOrgName, filterOrg, filterFY]);

  // Handle drilldown click on Organisation or Stage Counts
  const handleDrilldown = useCallback((orgId, orgName, stageName = '') => {
    setProjectsDrillDown(prev => [
      ...prev,
      {
        type: 'detailed',
        orgId,
        orgName,
        stageName,
        title: `Report No.: C.S.R 1.0 B - Detailed - Overview of CSR Projects Report - ${orgName}${stageName ? ` (${stageName})` : ''}`,
        subtitle: `Individual project details for ${orgName}`
      }
    ]);
  }, []);

  // Columns Configuration matching only the fields in user's images
  const columns = useMemo(() => {
    // 1. Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report
    if (reportType === 'project-report' && currentView.type === 'abstract') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          headerClass: 'text-center',
          cellClass: 'text-center',
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueGetter: (params) => {
            if (params.node?.rowPinned) return params.data?.['S No'] || 'Total';
            return params.data?.['S No'] || params.node.rowIndex + 1;
          },
          cellRenderer: (params) => (
            <div className="w-full flex items-center justify-center text-center font-bold">
              {params.value}
            </div>
          )
        },
        ...(!isOrgUser ? [{
          headerName: "Organisation Name",
          field: "Organisation Name",
          minWidth: 260,
          flex: 3,
          pinned: 'left',
          cellStyle: { fontWeight: 700 },
          cellRenderer: (params) => {
            if (!params.value || params.node?.rowPinned) return params.value || '';
            return (
              <button
                type="button"
                onClick={() => handleDrilldown(params.data?.organisationID, params.value)}
                style={{ color: '#4b2424' }}
                className="font-bold hover:underline cursor-pointer text-left"
              >
                {params.value}
              </button>
            );
          }
        }] : []),
        {
          headerName: "Total Number of CSR Projects till date",
          field: "Total Number of CSR Projects till date",
          minWidth: 200,
          flex: 2,
          headerClass: 'text-center',
          cellClass: 'text-center',
          cellStyle: { textAlign: 'center', fontWeight: 800, justifyContent: 'center' },
          cellRenderer: (params) => {
            if (params.node?.rowPinned) {
              return (
                <div className="w-full flex items-center justify-center text-center">
                  <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>
                </div>
              );
            }
            const count = Number(params.value) || 0;
            if (count === 0) {
              return (
                <div className="w-full flex items-center justify-center text-center">
                  <span className="text-slate-400">0</span>
                </div>
              );
            }
            return (
              <div className="w-full flex items-center justify-center text-center">
                <button
                  type="button"
                  onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'])}
                  style={{ color: '#4b2424', background: '#f7f3f3' }}
                  className="font-black hover:underline cursor-pointer px-2.5 py-0.5 rounded"
                >
                  {count}
                </button>
              </div>
            );
          }
        },
        {
          headerName: "Current Stage",
          headerClass: "headercenter text-center",
          children: [
            {
              headerName: "Approved by Board",
              field: "Approved by Board",
              minWidth: 140,
              flex: 1.5,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', justifyContent: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>
                    </div>
                  );
                }
                const count = Number(params.value) || 0;
                if (count === 0) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <span className="text-slate-300">-</span>
                    </div>
                  );
                }
                return (
                  <div className="w-full flex items-center justify-center text-center">
                    <button
                      type="button"
                      onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Approved by Board')}
                      style={{ color: '#2563eb' }}
                      className="font-bold hover:underline cursor-pointer"
                    >
                      {count}
                    </button>
                  </div>
                );
              }
            },
            {
              headerName: "Project yet to Start",
              field: "Project yet to Start",
              minWidth: 140,
              flex: 1.5,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', justifyContent: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>
                    </div>
                  );
                }
                const count = Number(params.value) || 0;
                if (count === 0) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <span className="text-slate-300">-</span>
                    </div>
                  );
                }
                return (
                  <div className="w-full flex items-center justify-center text-center">
                    <button
                      type="button"
                      onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Project yet to start')}
                      style={{ color: '#d97706' }}
                      className="font-bold hover:underline cursor-pointer"
                    >
                      {count}
                    </button>
                  </div>
                );
              }
            },
            {
              headerName: "Project Under implementation",
              field: "Project Under implementation",
              minWidth: 170,
              flex: 1.8,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', justifyContent: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>
                    </div>
                  );
                }
                const count = Number(params.value) || 0;
                if (count === 0) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <span className="text-slate-300">-</span>
                    </div>
                  );
                }
                return (
                  <div className="w-full flex items-center justify-center text-center">
                    <button
                      type="button"
                      onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Project Under implementation')}
                      style={{ color: '#4b2424' }}
                      className="font-bold hover:underline cursor-pointer"
                    >
                      {count}
                    </button>
                  </div>
                );
              }
            },
            {
              headerName: "Completed",
              field: "Completed",
              minWidth: 140,
              flex: 1.5,
              headerClass: 'text-center',
              cellClass: 'text-center',
              cellStyle: { textAlign: 'center', justifyContent: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>
                    </div>
                  );
                }
                const count = Number(params.value) || 0;
                if (count === 0) {
                  return (
                    <div className="w-full flex items-center justify-center text-center">
                      <span className="text-slate-300">-</span>
                    </div>
                  );
                }
                return (
                  <div className="w-full flex items-center justify-center text-center">
                    <button
                      type="button"
                      onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Completed')}
                      style={{ color: '#059669' }}
                      className="font-bold hover:underline cursor-pointer"
                    >
                      {count}
                    </button>
                  </div>
                );
              }
            }
          ]
        }
      ];
    }

    // Detailed View for C.S.R 1.0 (on drilldown)
    if (reportType === 'project-report' && currentView.type === 'detailed') {
      return [
        {
          headerName: "S. No",
          field: "S No",
          width: 80,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => params.node.rowIndex + 1
        },
        ...(!isOrgUser ? [{
          headerName: "Organisation Name",
          field: "Organisation Name",
          minWidth: 220,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        }] : []),
        {
          headerName: "CSR Focus",
          field: "CSR Focus",
          width: 140,
          cellStyle: { textAlign: 'center' }
        },
        {
          headerName: "Project Name",
          field: "Project Name",
          minWidth: 260,
          flex: 2,
          wrapText: true,
          autoHeight: true,
          cellClass: 'mopsw-wrap-cell',
          cellStyle: { fontWeight: 600, whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35' }
        },
        {
          headerName: "Project Received From",
          field: "Project Received From",
          width: 180,
          wrapText: true,
          autoHeight: true,
          cellClass: 'mopsw-wrap-cell',
          cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35' }
        },
        {
          headerName: "Impact Possible Outcome",
          field: "Impact Possible Outcome",
          width: 220,
          wrapText: true,
          autoHeight: true,
          cellClass: 'mopsw-wrap-cell',
          cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35' }
        },
        {
          headerName: "Target Beneficiaries",
          field: "Target Beneficiaries",
          width: 180,
          wrapText: true,
          autoHeight: true,
          cellClass: 'mopsw-wrap-cell',
          cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35' }
        },
        {
          headerName: "Project Value (₹ Cr)",
          field: "Project Value",
          width: 150,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#4b2424' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Financial Year",
          field: "Financial Year",
          width: 130,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center' }
        },
        {
          headerName: "Commenced On",
          field: "Commenced On",
          width: 130,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center' },
          valueFormatter: (params) => params.value ? String(params.value).split('T')[0] : '-'
        },
        {
          headerName: "Completed On",
          field: "Completed On",
          width: 130,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center' },
          valueFormatter: (params) => params.value ? String(params.value).split('T')[0] : '-'
        },
        {
          headerName: "Financial Progress",
          field: "Financial Progress",
          width: 130,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#2563eb' }
        },
        {
          headerName: "Physical Progress",
          field: "Physical Progress",
          width: 130,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#059669' }
        }
      ];
    }

    // 2. Report No.: C.S.R 1.1 - Abstract - Overview of CSR Expenditure Report
    return [
      {
        headerName: "S. No",
        field: "S No",
        width: 80,
        pinned: 'left',
        headerClass: "text-center",
        cellClass: "text-center",
        cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
        valueGetter: (params) => {
          if (params.node?.rowPinned) return params.data?.['S No'] || 'Total';
          return params.data?.['S No'] || params.node.rowIndex + 1;
        },
        cellRenderer: (params) => (
          <div className="w-full flex items-center justify-center text-center font-bold">
            {params.value}
          </div>
        )
      },
      ...(!isOrgUser ? [{
        headerName: "Organization Name",
        field: "Organisation Name",
        minWidth: 280,
        flex: 2,
        pinned: 'left',
        cellStyle: { fontWeight: 700, color: '#4b2424' }
      }] : []),
      {
        headerName: "Financial Year",
        field: "Financial Year",
        width: 160,
        headerClass: "text-center",
        cellClass: "text-center",
        cellStyle: { textAlign: 'center', fontWeight: 600, justifyContent: 'center' },
        cellRenderer: (params) => (
          <div className="w-full flex items-center justify-center text-center font-semibold">
            {params.value || '-'}
          </div>
        )
      },
      {
        headerName: "CSR Fund Allotted for the Year (Rs.In lakhs)",
        field: "CSR Fund Allotted Year",
        minWidth: 250,
        flex: 1.5,
        headerClass: "text-center",
        cellClass: "text-center",
        cellStyle: { textAlign: 'center', fontWeight: 800, color: '#4b2424', justifyContent: 'center' },
        valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-',
        cellRenderer: (params) => (
          <div className="w-full flex items-center justify-center text-center font-extrabold text-[#4b2424]">
            {params.value != null ? Number(params.value).toFixed(2) : '-'}
          </div>
        )
      },
      {
        headerName: "Project Expenditure (Rs.In lakhs)",
        field: "Project Expenditure",
        minWidth: 250,
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
        headerName: "CSR Fund Balance (Rs.In lakhs)",
        field: "CSR Fund Balance",
        minWidth: 250,
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
      }
    ];
  }, [reportType, currentView.type, handleDrilldown, isOrgUser]);

  // Pinned Bottom Totals matching user's screenshots
  const pinnedBottomRowData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return undefined;

    if (reportType === 'project-report' && currentView.type === 'abstract') {
      return [{
        'S No': 'Total',
        'Organisation Name': '',
        'Total Number of CSR Projects till date': filteredData.reduce((acc, r) => acc + (Number(r['Total Number of CSR Projects till date']) || 0), 0),
        'Approved by Board': filteredData.reduce((acc, r) => acc + (Number(r['Approved by Board']) || 0), 0),
        'Project yet to Start': filteredData.reduce((acc, r) => acc + (Number(r['Project yet to Start']) || 0), 0),
        'Project Under implementation': filteredData.reduce((acc, r) => acc + (Number(r['Project Under implementation']) || 0), 0),
        'Completed': filteredData.reduce((acc, r) => acc + (Number(r['Completed']) || 0), 0),
      }];
    }

    if (reportType === 'expenditure-report') {
      const totalAllotted = filteredData.reduce((acc, r) => acc + (Number(r['CSR Fund Allotted Year']) || 0), 0);
      const totalExp = filteredData.reduce((acc, r) => acc + (Number(r['Project Expenditure']) || 0), 0);
      const totalBal = filteredData.reduce((acc, r) => acc + (Number(r['CSR Fund Balance']) || 0), 0);

      return [{
        'S No': 'Total',
        'Organisation Name': '',
        'Financial Year': '',
        'CSR Fund Allotted Year': Math.round(totalAllotted),
        'Project Expenditure': Math.round(totalExp),
        'CSR Fund Balance': Math.round(totalBal),
      }];
    }

    return undefined;
  }, [filteredData, reportType, currentView.type]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  // Toolbar Extra matching GMIS DataList filter button on the exact report header toolbar line
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

  // Filter Panel content rendered inside ReportTable
  const filterPanel = showFilterPanel ? (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-3.5 w-3.5 text-[#4b2424] dark:text-amber-400" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
            {reportType === 'project-report' ? 'Filter CSR Project Report' : 'Filter CSR Expenditure Report'}
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
        {reportType === 'project-report' ? (
          !isOrgUser ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                Organization
              </label>
              <select
                value={filterOrg}
                onChange={e => setFilterOrg(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <option value="all">--Show All Organisations-- ({organisations.length})</option>
                {organisations.map(o => (
                  <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
                ))}
              </select>
            </div>
          ) : null
        ) : (
          <div>
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
        )}
      </div>
    </div>
  ) : null;

  // Title & Eyebrow dynamically matching the active report
  const currentReportTitle = useMemo(() => {
    if (reportType === 'expenditure-report') {
      return 'Report No.: C.S.R 1.1 - Abstract - Overview of CSR Expenditure Report';
    }
    return currentView.title || 'Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report';
  }, [reportType, currentView]);

  const currentEyebrow = useMemo(() => {
    if (reportType === 'expenditure-report') {
      return 'CSR Expenditure Report';
    }
    return 'CSR Project Report';
  }, [reportType]);

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">

      {/* Top Sub-Tabs Navigation for the two Reports (Brown Theme) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 select-none">
        <div className="flex space-x-1">
          <button
            type="button"
            onClick={() => handleSwitchReportType('project-report')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              reportType === 'project-report'
                ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <FilePieChart className="h-4 w-4" />
            <span>CSR PROJECT REPORT</span>
          </button>

          <button
            type="button"
            onClick={() => handleSwitchReportType('expenditure-report')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              reportType === 'expenditure-report'
                ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-400 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            <Coins className="h-4 w-4" />
            <span>CSR EXPENDITURE REPORT</span>
          </button>
        </div>

        {/* {reportType === 'project-report' && projectsDrillDown.length > 1 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-[#4b2424] dark:text-slate-400 dark:hover:text-amber-300 px-3 py-1.5 mb-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Abstract Report</span>
          </button>
        )} */}
      </div>

      {/* Main Report Table in Brown Theme with Filter Button in Toolbar Line */}
      <ReportTable
        title={currentReportTitle}
        subtitle={null}
        eyebrow={currentEyebrow}
        showBackButton={reportType === 'project-report' && projectsDrillDown.length > 1}
        onBack={handleBack}
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
