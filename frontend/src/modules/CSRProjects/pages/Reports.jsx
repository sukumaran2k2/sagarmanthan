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
import { FilePieChart, Coins, Filter, RotateCcw } from 'lucide-react';

export default function Reports({ triggerNotification }) {
  // Mode: 'csr_projects_overview' (C.S.R 1.0 A) | 'csr_fund_overview' (C.S.R 1.1)
  const [reportType, setReportType] = useState('csr_projects_overview');

  // Filters
  const [organisations, setOrganisations] = useState([]);
  const [filterOrg, setFilterOrg] = useState('all');
  const [filterFY, setFilterFY] = useState('all');

  // Drilldown Navigation Stack for C.S.R 1.0
  const [projectsDrillDown, setProjectsDrillDown] = useState([
    {
      type: 'abstract',
      title: 'Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report',
      subtitle: 'Overview of CSR projects across implementation stages'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  // Fetch organisations for the filter dropdown
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(Array.isArray(res) ? res : []))
      .catch(err => console.warn('Could not fetch organisations:', err.message));
  }, []);

  const currentView = projectsDrillDown[projectsDrillDown.length - 1];

  const handleBack = () => {
    if (projectsDrillDown.length > 1) {
      setProjectsDrillDown(prev => prev.slice(0, -1));
    }
  };

  const handleSwitchReportType = (type) => {
    if (type === reportType) return;
    setReportType(type);
    setFilterOrg('all');
    setFilterFY('all');
    setProjectsDrillDown([
      {
        type: 'abstract',
        title: type === 'csr_projects_overview'
          ? 'Report No.: C.S.R 1.0 A - Abstract - Overview of CSR Projects Report'
          : 'Report No.: C.S.R 1.1 - Abstract - Overview of CSR Fund Report',
        subtitle: type === 'csr_projects_overview'
          ? 'Overview of CSR projects across implementation stages'
          : 'Overview of CSR fund allocations, expenditures, and balance'
      }
    ]);
  };

  const resetFilters = () => {
    setFilterOrg('all');
    setFilterFY('all');
  };

  // Fetch report data
  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      if (reportType === 'csr_projects_overview') {
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

  // Client-side filtering
  const filteredData = useMemo(() => {
    if (!reportData || reportData.length === 0) return [];

    return reportData.filter(row => {
      // Organisation Filter
      if (filterOrg !== 'all') {
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
  }, [reportData, filterOrg, filterFY]);

  // Handle drilldown click on Organisation or Stage Counts
  const handleDrilldown = useCallback((orgId, orgName, stageName = '') => {
    setProjectsDrillDown(prev => [
      ...prev,
      {
        type: 'detailed',
        orgId,
        orgName,
        stageName,
        title: `Report No.: C.S.R 1.0 B - Detailed - CSR Projects Report - ${orgName}${stageName ? ` (${stageName})` : ''}`,
        subtitle: `Individual project details for ${orgName}`
      }
    ]);
  }, []);

  // Summary KPI values in Brown theme
  const summaryKPIs = useMemo(() => {
    if (!filteredData || filteredData.length === 0) {
      return { totalProjects: 0, approved: 0, yetToStart: 0, underImpl: 0, completed: 0 };
    }
    return {
      totalProjects: filteredData.reduce((acc, r) => acc + (Number(r['Total Number of CSR Projects till date']) || 0), 0),
      approved: filteredData.reduce((acc, r) => acc + (Number(r['Approved by Board']) || 0), 0),
      yetToStart: filteredData.reduce((acc, r) => acc + (Number(r['Project yet to Start']) || 0), 0),
      underImpl: filteredData.reduce((acc, r) => acc + (Number(r['Project Under implementation']) || 0), 0),
      completed: filteredData.reduce((acc, r) => acc + (Number(r['Completed']) || 0), 0),
    };
  }, [filteredData]);

  // Columns Configuration
  const columns = useMemo(() => {
    // 1. C.S.R 1.0 A - Overview of CSR Projects Report (Abstract)
    if (reportType === 'csr_projects_overview' && currentView.type === 'abstract') {
      return [
        {
          headerName: "S.No",
          field: "S No",
          width: 75,
          pinned: 'left',
          cellStyle: { textAlign: 'center', fontWeight: 700 },
          valueGetter: (params) => {
            if (params.node?.rowPinned) return params.data?.['S No'] || 'Total';
            return params.data?.['S No'] || params.node.rowIndex + 1;
          }
        },
        {
          headerName: "Organisation Name",
          field: "Organisation Name",
          minWidth: 260,
          flex: 2,
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
        },
        {
          headerName: "Total Number of CSR Projects till date",
          field: "Total Number of CSR Projects till date",
          width: 280,
          cellStyle: { textAlign: 'center', fontWeight: 800 },
          cellRenderer: (params) => {
            if (params.node?.rowPinned) return <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>;
            const count = Number(params.value) || 0;
            if (count === 0) return <span className="text-slate-400">0</span>;
            return (
              <button
                type="button"
                onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'])}
                style={{ color: '#4b2424', background: '#f7f3f3' }}
                className="font-black hover:underline cursor-pointer px-2.5 py-0.5 rounded"
              >
                {count}
              </button>
            );
          }
        },
        {
          headerName: "Current Stage",
          headerClass: "headercenter",
          children: [
            {
              headerName: "Approved by Board",
              field: "Approved by Board",
              width: 170,
              cellStyle: { textAlign: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) return <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>;
                const count = Number(params.value) || 0;
                if (count === 0) return <span className="text-slate-300">-</span>;
                return (
                  <button
                    type="button"
                    onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Approved by Board')}
                    style={{ color: '#2563eb' }}
                    className="font-bold hover:underline cursor-pointer"
                  >
                    {count}
                  </button>
                );
              }
            },
            {
              headerName: "Project yet to Start",
              field: "Project yet to Start",
              width: 170,
              cellStyle: { textAlign: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) return <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>;
                const count = Number(params.value) || 0;
                if (count === 0) return <span className="text-slate-300">-</span>;
                return (
                  <button
                    type="button"
                    onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Project yet to start')}
                    style={{ color: '#d97706' }}
                    className="font-bold hover:underline cursor-pointer"
                  >
                    {count}
                  </button>
                );
              }
            },
            {
              headerName: "Project Under implementation",
              field: "Project Under implementation",
              width: 220,
              cellStyle: { textAlign: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) return <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>;
                const count = Number(params.value) || 0;
                if (count === 0) return <span className="text-slate-300">-</span>;
                return (
                  <button
                    type="button"
                    onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Project Under implementation')}
                    style={{ color: '#4b2424' }}
                    className="font-bold hover:underline cursor-pointer"
                  >
                    {count}
                  </button>
                );
              }
            },
            {
              headerName: "Completed",
              field: "Completed",
              width: 160,
              cellStyle: { textAlign: 'center' },
              cellRenderer: (params) => {
                if (params.node?.rowPinned) return <strong style={{ color: '#4b2424' }}>{params.value || 0}</strong>;
                const count = Number(params.value) || 0;
                if (count === 0) return <span className="text-slate-300">-</span>;
                return (
                  <button
                    type="button"
                    onClick={() => handleDrilldown(params.data?.organisationID, params.data?.['Organisation Name'], 'Completed')}
                    style={{ color: '#059669' }}
                    className="font-bold hover:underline cursor-pointer"
                  >
                    {count}
                  </button>
                );
              }
            }
          ]
        }
      ];
    }

    // 2. C.S.R 1.0 B - Detailed CSR Projects Report (Drilldown View)
    if (reportType === 'csr_projects_overview' && currentView.type === 'detailed') {
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
          headerName: "Organisation Name",
          field: "Organisation Name",
          minWidth: 220,
          pinned: 'left',
          cellStyle: { fontWeight: 700, color: '#4b2424' }
        },
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
          cellStyle: { fontWeight: 600 }
        },
        {
          headerName: "Project Received From",
          field: "Project Received From",
          width: 180
        },
        {
          headerName: "Impact Possible Outcome",
          field: "Impact Possible Outcome",
          width: 220
        },
        {
          headerName: "Target Beneficiaries",
          field: "Target Beneficiaries",
          width: 180
        },
        {
          headerName: "Project Value (₹ Cr)",
          field: "Project Value",
          width: 150,
          cellStyle: { textAlign: 'right', fontWeight: 800, color: '#4b2424' },
          valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
        },
        {
          headerName: "Financial Year",
          field: "Financial Year",
          width: 130,
          cellStyle: { textAlign: 'center' }
        },
        {
          headerName: "Commenced On",
          field: "Commenced On",
          width: 130,
          cellStyle: { textAlign: 'center' },
          valueFormatter: (params) => params.value ? String(params.value).split('T')[0] : '-'
        },
        {
          headerName: "Completed On",
          field: "Completed On",
          width: 130,
          cellStyle: { textAlign: 'center' },
          valueFormatter: (params) => params.value ? String(params.value).split('T')[0] : '-'
        },
        {
          headerName: "Financial Progress",
          field: "Financial Progress",
          width: 130,
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#2563eb' }
        },
        {
          headerName: "Physical Progress",
          field: "Physical Progress",
          width: 130,
          cellStyle: { textAlign: 'center', fontWeight: 800, color: '#059669' }
        }
      ];
    }

    // 3. C.S.R 1.1 - Overview of CSR Fund Report
    return [
      {
        headerName: "S. No",
        field: "S No",
        width: 80,
        pinned: 'left',
        cellStyle: { textAlign: 'center', fontWeight: 700 },
        valueGetter: (params) => {
          if (params.node?.rowPinned) return params.data?.['S No'] || 'Total';
          return params.data?.['S No'] || params.node.rowIndex + 1;
        }
      },
      {
        headerName: "Organisation Name",
        field: "Organisation Name",
        minWidth: 280,
        flex: 2,
        pinned: 'left',
        cellStyle: { fontWeight: 700, color: '#4b2424' }
      },
      {
        headerName: "Financial Year",
        field: "Financial Year",
        width: 160,
        cellStyle: { textAlign: 'center', fontWeight: 600 }
      },
      {
        headerName: "CSR fund Allotted for the year (Rs.In lakhs)",
        field: "CSR Fund Allotted Year",
        minWidth: 280,
        flex: 1.5,
        cellStyle: { textAlign: 'right', fontWeight: 800, color: '#4b2424' },
        valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
      },
      {
        headerName: "Project Expenditure (Rs.In lakhs)",
        field: "Project Expenditure",
        minWidth: 250,
        flex: 1.5,
        cellStyle: { textAlign: 'right', fontWeight: 800, color: '#b45309' },
        valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '0.00'
      },
      {
        headerName: "CSR Fund Balance (Rs.In lakhs)",
        field: "CSR Fund Balance",
        minWidth: 250,
        flex: 1.5,
        cellStyle: { textAlign: 'right', fontWeight: 800, color: '#059669' },
        valueFormatter: (params) => params.value != null ? Number(params.value).toFixed(2) : '-'
      }
    ];
  }, [reportType, currentView.type, handleDrilldown]);

  // Pinned Bottom Totals
  const pinnedBottomRowData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return undefined;

    if (reportType === 'csr_projects_overview' && currentView.type === 'abstract') {
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

    if (reportType === 'csr_fund_overview') {
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

  const subtitle = useMemo(() => {
    const today = new Date();
    const formattedDate = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <span className="flex items-center gap-2 text-xs">
        <span>As on date: <strong style={{ color: '#4b2424' }}>{formattedDate}</strong></span>
        <span style={{ color: '#eadede' }}>•</span>
        <span>Report for the month — <strong style={{ color: '#4b2424' }}>{monthName}</strong></span>
      </span>
    );
  }, []);

  const hasActiveFilters = filterOrg !== 'all' || filterFY !== 'all';

  // Toolbar extra for switching between the two reports in Brown theme
  const toolbarExtra = (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => handleSwitchReportType('csr_projects_overview')}
        style={{
          backgroundColor: reportType === 'csr_projects_overview' ? '#4b2424' : '#f7f3f3',
          color: reportType === 'csr_projects_overview' ? '#ffffff' : '#4b2424',
          borderColor: '#4b2424'
        }}
        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-xs"
      >
        <FilePieChart className="h-3.5 w-3.5" />
        <span>C.S.R 1.0 A - Overview of CSR Projects</span>
      </button>

      <button
        onClick={() => handleSwitchReportType('csr_fund_overview')}
        style={{
          backgroundColor: reportType === 'csr_fund_overview' ? '#4b2424' : '#f7f3f3',
          color: reportType === 'csr_fund_overview' ? '#ffffff' : '#4b2424',
          borderColor: '#4b2424'
        }}
        className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-xs"
      >
        <Coins className="h-3.5 w-3.5" />
        <span>C.S.R 1.1 - Overview of CSR Fund</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Summary KPI Badges in Brown Theme matching MIV / GMIS / CA */}
      {reportType === 'csr_projects_overview' && currentView.type === 'abstract' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Projects</span>
            <span className="text-lg font-black text-[#4b2424] dark:text-amber-200 mt-0.5 block">{summaryKPIs.totalProjects}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Approved by Board</span>
            <span className="text-lg font-black text-blue-700 dark:text-blue-400 mt-0.5 block">{summaryKPIs.approved}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Yet to Start</span>
            <span className="text-lg font-black text-amber-700 dark:text-amber-400 mt-0.5 block">{summaryKPIs.yetToStart}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Under Implementation</span>
            <span className="text-lg font-black text-[#6b3535] dark:text-amber-300 mt-0.5 block">{summaryKPIs.underImpl}</span>
          </div>
          <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-[#eadede] dark:border-slate-800 shadow-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed</span>
            <span className="text-lg font-black text-emerald-700 dark:text-emerald-400 mt-0.5 block">{summaryKPIs.completed}</span>
          </div>
        </div>
      )}

      {/* Filter Toolbar matching CA / MIV Brown Theme */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5" style={{ color: '#4b2424' }}>
              <Filter className="h-3.5 w-3.5" />
              <span>Filters:</span>
            </span>

            {/* Organisation Filter */}
            <select
              value={filterOrg}
              onChange={e => setFilterOrg(e.target.value)}
              className="text-xs px-3 py-1.5 bg-[#f7f3f3] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="all">--Show All Organisations--</option>
              {organisations.map(o => (
                <option key={o.organisation_id} value={o.organisation_id}>{o.organisation_name}</option>
              ))}
            </select>

            {/* Financial Year Filter (for Fund Report) */}
            {reportType === 'csr_fund_overview' && (
              <select
                value={filterFY}
                onChange={e => setFilterFY(e.target.value)}
                className="text-xs px-3 py-1.5 bg-[#f7f3f3] dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">--Show All Financial Years--</option>
                {FINANCIAL_YEARS.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2 py-1 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
            Total Records: <strong style={{ color: '#4b2424' }}>{filteredData.length}</strong>
          </div>

        </div>
      </div>

      {/* Main Report Table with MIV / CA Brown Theme */}
      <ReportTable
        title={currentView.title}
        subtitle={subtitle}
        eyebrow="Corporate Social Responsibility"
        showBackButton={projectsDrillDown.length > 1}
        onBack={handleBack}
        loading={loading}
        onRefresh={loadReportData}
        rawData={filteredData}
        viewData={filteredData}
        columns={columns}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        toolbarExtra={toolbarExtra}
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
