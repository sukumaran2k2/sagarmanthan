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
import { FilePieChart, Coins, Filter, ChevronDown, X, RotateCcw } from 'lucide-react';
import { isOrganisationUser, getSessionOrganisationId, getSessionOrganisationName } from '../../../utils/authSession';

const REPORT_TITLES = {
  'project-report': 'Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report',
  'expenditure-report': 'Report No.: C.S.R 1.1 - Abstract - Overview of CSR Expenditure Report',
};

const getInitialDrilldown = (type) => [{ type: 'abstract', title: REPORT_TITLES[type] || REPORT_TITLES['project-report'] }];

// Standard column helpers preserving exact original alignments
const makeSnoCol = (field = 'S No') => ({
  headerName: 'S.No',
  field,
  width: 80,
  minWidth: 80,
  maxWidth: 80,
  suppressSizeToFit: true,
  pinned: 'left',
  headerClass: 'text-center',
  cellClass: 'text-center',
  cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
  valueGetter: (p) => (p.node?.rowPinned ? (p.data?.[field] || 'Total') : (p.data?.[field] || p.node.rowIndex + 1)),
  cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center font-bold">{p.value}</div>,
});

const makeWrapCol = (headerName, field, minWidth, flex = 1, extra = {}) => ({
  headerName,
  field,
  minWidth,
  flex,
  wrapText: true,
  autoHeight: true,
  cellClass: 'mopsw-wrap-cell',
  cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.35', ...extra.cellStyle },
  ...extra,
});

const makeCenterAmountCol = (headerName, field, color = '#4b2424', minWidth = 140, flex = 1.4) => ({
  headerName,
  field,
  minWidth,
  flex,
  headerClass: 'text-center',
  cellClass: 'text-center',
  cellStyle: { textAlign: 'center', fontWeight: 800, color, justifyContent: 'center' },
  valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '-'),
  cellRenderer: (p) => (
    <div className="w-full flex items-center justify-center text-center font-extrabold" style={{ color }}>
      {p.value != null ? Number(p.value).toFixed(2) : '-'}
    </div>
  ),
});

const makeStageCountCol = (headerName, field, color, onDrilldown) => ({
  headerName,
  field,
  minWidth: 140,
  flex: 1.5,
  headerClass: 'text-center',
  cellClass: 'text-center',
  cellStyle: { textAlign: 'center', justifyContent: 'center' },
  cellRenderer: (p) => {
    if (p.node?.rowPinned) {
      return <div className="w-full flex items-center justify-center text-center"><strong style={{ color: '#4b2424' }}>{p.value || 0}</strong></div>;
    }
    const count = Number(p.value) || 0;
    if (count === 0) {
      return <div className="w-full flex items-center justify-center text-center"><span className="text-slate-300">-</span></div>;
    }
    return (
      <div className="w-full flex items-center justify-center text-center">
        <button
          type="button"
          onClick={() => onDrilldown(p.data?.organisationID, p.data?.['Organisation Name'], field)}
          style={{ color }}
          className="font-bold hover:underline cursor-pointer"
        >
          {count}
        </button>
      </div>
    );
  },
});

const sumField = (data, field) => data.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);

export default function Reports({
  initialReportType = 'project-report',
  onReportTypeChange,
  triggerNotification
}) {
  const isOrgUser = useMemo(() => isOrganisationUser(), []);
  const userOrgId = getSessionOrganisationId();
  const userOrgName = getSessionOrganisationName();

  const [reportType, setReportType] = useState(initialReportType || 'project-report');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [organisations, setOrganisations] = useState([]);
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterFY, setFilterFY] = useState('all');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [projectsDrillDown, setProjectsDrillDown] = useState(() => getInitialDrilldown(initialReportType));

  useEffect(() => {
    if (initialReportType) {
      setReportType(initialReportType);
      setFilterOrg('all');
      setFilterFY('all');
      setProjectsDrillDown(getInitialDrilldown(initialReportType));
    }
  }, [initialReportType]);

  const handleSwitchReportType = (type) => {
    setReportType(type);
    onReportTypeChange?.(type);
    setFilterOrg('all');
    setFilterFY('all');
    setProjectsDrillDown(getInitialDrilldown(type));
  };

  const hasActiveFilters = filterOrg !== 'all' || filterFY !== 'all';

  const resetFilters = () => {
    setFilterOrg('all');
    setFilterFY('all');
    triggerNotification?.('Filters have been reset', 'info');
  };

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

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      if (reportType === 'project-report') {
        const res = currentView.type === 'abstract'
          ? await fetchCsrAbstractReport(userId)
          : await fetchCsrDetailedReport(currentView.orgId, currentView.orgName);
        setReportData(res?.rowData || (Array.isArray(res) ? res : []));
      } else {
        const res = await fetchCsrExpenditureReport(userId);
        setReportData(res?.rowData || (Array.isArray(res) ? res : []));
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

  const filteredData = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];

    return reportData.filter(row => {
      if (isOrgUser) {
        const rowOrgId = String(row.organisation_id || row.organisationID || row['Organisation ID'] || row['organisationID'] || '');
        const rowOrgName = String(row.organisation_name || row['Organisation Name'] || '').toLowerCase();
        if (userOrgId && rowOrgId && rowOrgId !== String(userOrgId)) return false;
        if (userOrgName && rowOrgName && rowOrgName !== userOrgName.toLowerCase()) return false;
      } else if (filterOrg !== 'all') {
        const rowOrgId = String(row.organisation_id || row.organisationID || row['Organisation ID'] || row['organisationID'] || '');
        if (rowOrgId !== String(filterOrg)) return false;
      }

      if (filterFY !== 'all') {
        const rowFY = String(row.financial_year || row['Financial Year'] || '');
        if (rowFY !== String(filterFY)) return false;
      }
      return true;
    });
  }, [reportData, isOrgUser, userOrgId, userOrgName, filterOrg, filterFY]);

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

  const columns = useMemo(() => {
    // 1. Abstract Project Report
    if (reportType === 'project-report' && currentView.type === 'abstract') {
      return [
        makeSnoCol('S No'),
        ...(!isOrgUser ? [{
          headerName: "Organisation Name",
          field: "Organisation Name",
          minWidth: 260,
          flex: 3,
          pinned: 'left',
          cellStyle: { fontWeight: 700 },
          cellRenderer: (p) => {
            if (!p.value || p.node?.rowPinned) return p.value || '';
            return (
              <button
                type="button"
                onClick={() => handleDrilldown(p.data?.organisationID, p.value)}
                style={{ color: '#4b2424' }}
                className="font-bold hover:underline cursor-pointer text-left"
              >
                {p.value}
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
          cellRenderer: (p) => {
            if (p.node?.rowPinned) {
              return <div className="w-full flex items-center justify-center text-center"><strong style={{ color: '#4b2424' }}>{p.value || 0}</strong></div>;
            }
            const count = Number(p.value) || 0;
            if (count === 0) {
              return <div className="w-full flex items-center justify-center text-center"><span className="text-slate-400">0</span></div>;
            }
            return (
              <div className="w-full flex items-center justify-center text-center">
                <button
                  type="button"
                  onClick={() => handleDrilldown(p.data?.organisationID, p.data?.['Organisation Name'])}
                  style={{ color: '#4b2424' }}
                  className="font-black hover:underline cursor-pointer"
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
            makeStageCountCol("Approved by Board", "Approved by Board", "#2563eb", handleDrilldown),
            makeStageCountCol("Project yet to Start", "Project yet to Start", "#d97706", handleDrilldown),
            makeStageCountCol("Project Under implementation", "Project Under implementation", "#4b2424", handleDrilldown),
            makeStageCountCol("Completed", "Completed", "#059669", handleDrilldown),
          ]
        }
      ];
    }

    // 2. Detailed View for C.S.R 1.0 (on drilldown)
    if (reportType === 'project-report' && currentView.type === 'detailed') {
      return [
        {
          headerName: "S. No",
          field: "S No",
          width: 80,
          minWidth: 80,
          maxWidth: 80,
          suppressSizeToFit: true,
          pinned: 'left',
          headerClass: 'text-center',
          cellClass: 'text-center',
          cellStyle: { textAlign: 'center', fontWeight: 700, justifyContent: 'center' },
          valueGetter: (p) => p.node.rowIndex + 1,
          cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center font-bold">{p.value}</div>
        },
        ...(!isOrgUser ? [{
          headerName: "Organisation Name",
          field: "Organisation Name",
          minWidth: 220,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        }] : []),
        { headerName: "CSR Focus", field: "CSR Focus", width: 140, cellStyle: { textAlign: 'center' } },
        makeWrapCol("Project Name", "Project Name", 340, 0, {
          width: 340,
          maxWidth: 340,
          suppressSizeToFit: true,
          cellStyle: { fontWeight: 600 }
        }),
        makeWrapCol("Project Received From", "Project Received From", 180),
        makeWrapCol("Impact Possible Outcome", "Impact Possible Outcome", 220),
        makeWrapCol("Target Beneficiaries", "Target Beneficiaries", 180),
        {
          headerName: "Project Value (₹ Cr)",
          field: "Project Value",
          width: 150,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#4b2424' },
          valueFormatter: (p) => (p.value != null ? Number(p.value).toFixed(2) : '-')
        },
        {
          headerName: "Financial Year",
          field: "Financial Year",
          width: 140,
          minWidth: 140,
          maxWidth: 140,
          suppressSizeToFit: true,
          headerClass: "text-center",
          cellStyle: { textAlign: 'center' }
        },
        { headerName: "Commenced On", field: "Commenced On", width: 130, headerClass: "text-center", cellStyle: { textAlign: 'center' }, valueFormatter: (p) => (p.value ? String(p.value).split('T')[0] : '-') },
        { headerName: "Completed On", field: "Completed On", width: 130, headerClass: "text-center", cellStyle: { textAlign: 'center' }, valueFormatter: (p) => (p.value ? String(p.value).split('T')[0] : '-') },
        { headerName: "Financial Progress", field: "Financial Progress", width: 130, headerClass: "text-center", cellStyle: { textAlign: 'center', fontWeight: 800, color: '#2563eb' } },
        { headerName: "Physical Progress", field: "Physical Progress", width: 130, headerClass: "text-center", cellStyle: { textAlign: 'center', fontWeight: 800, color: '#059669' } },
      ];
    }

    // 3. CSR Expenditure Report
    return [
      makeSnoCol('S No'),
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
        width: 140,
        minWidth: 140,
        maxWidth: 140,
        suppressSizeToFit: true,
        headerClass: "text-center",
        cellClass: "text-center",
        cellStyle: { textAlign: 'center', fontWeight: 600, justifyContent: 'center' },
        cellRenderer: (p) => <div className="w-full flex items-center justify-center text-center font-semibold">{p.value || '-'}</div>
      },
      makeCenterAmountCol("CSR Fund Allotted for the Year (Rs.In lakhs)", "CSR Fund Allotted Year", '#4b2424', 250, 1.5),
      makeCenterAmountCol("Project Expenditure (Rs.In lakhs)", "Project Expenditure", '#d97706', 250, 1.5),
      makeCenterAmountCol("CSR Fund Balance (Rs.In lakhs)", "CSR Fund Balance", '#059669', 250, 1.5),
    ];
  }, [reportType, currentView.type, handleDrilldown, isOrgUser]);

  const pinnedBottomRowData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return undefined;

    if (reportType === 'project-report' && currentView.type === 'abstract') {
      return [{
        'S No': 'Total',
        'Organisation Name': '',
        'Total Number of CSR Projects till date': sumField(filteredData, 'Total Number of CSR Projects till date'),
        'Approved by Board': sumField(filteredData, 'Approved by Board'),
        'Project yet to Start': sumField(filteredData, 'Project yet to Start'),
        'Project Under implementation': sumField(filteredData, 'Project Under implementation'),
        'Completed': sumField(filteredData, 'Completed'),
      }];
    }

    if (reportType === 'expenditure-report') {
      return [{
        'S No': 'Total',
        'Organisation Name': '',
        'Financial Year': '',
        'CSR Fund Allotted Year': Math.round(sumField(filteredData, 'CSR Fund Allotted Year')),
        'Project Expenditure': Math.round(sumField(filteredData, 'Project Expenditure')),
        'CSR Fund Balance': Math.round(sumField(filteredData, 'CSR Fund Balance')),
      }];
    }

    return undefined;
  }, [filteredData, reportType, currentView.type]);

  const defaultColDef = useMemo(() => ({ sortable: true, filter: true, resizable: true }), []);

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
          <button type="button" onClick={resetFilters} className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer">
            <X className="h-3.5 w-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>

      <div className="max-w-md">
        {reportType === 'project-report' ? (
          !isOrgUser ? (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Organization</label>
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
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Financial Year</label>
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

  const currentReportTitle = useMemo(() => {
    if (reportType === 'expenditure-report') return REPORT_TITLES['expenditure-report'];
    return currentView.title || REPORT_TITLES['project-report'];
  }, [reportType, currentView]);

  const currentEyebrow = reportType === 'expenditure-report' ? 'CSR Expenditure Report' : 'CSR Project Report';

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Top Sub-Tabs Navigation */}
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
      </div>

      {/* Main Report Table in Brown Theme */}
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
