import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { FilePieChart, Search, ChevronLeft, Database } from 'lucide-react';
import PageBanner from '../../../components/PageBanner';
import Table from '../../../components/Table'; // Reusable Table component

const REPORT_LIST = [
  // Major Ports
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.1 A', name: 'Abstract - HR Position', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.2 A', name: 'Status of Filling up of Vacancies', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.3 A', name: 'Report on Class/Group Wise Filling up of Vacancies', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.4 A', name: 'Abstract of filling up of vacant Posts through Direct Recruitment', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.5 A', name: 'Abstract of filling up of vacant Posts through Promotion', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.6 A', name: 'Abstract of filling up of vacant Posts through Deputation', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.7 A', name: 'Abstract of filling up of vacant Posts through Composite Method', type: 'major_port' },
  { category: 'HR - Ministry Review Reports - Major Ports', code: 'H-1.8 A', name: 'Abstract of Revival of Abolished Posts', type: 'major_port' },

  // Other Organisations
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.1 B', name: 'Abstract - HR Position', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.2 B', name: 'Status of Filling up of Vacancies', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.3 B', name: 'Report on Class/Group Wise Filling up of Vacancies', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.4 B', name: 'Abstract of filling up of vacant Posts through Direct Recruitment', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.5 B', name: 'Abstract of filling up of vacant Posts through Promotion', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.6 B', name: 'Abstract of filling up of vacant Posts through Deputation', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.7 B', name: 'Abstract of filling up of vacant Posts through Composite Method', type: 'other_org' },
  { category: 'HR - Ministry Review Reports - Other Organisations', code: 'H-1.8 B', name: 'Abstract of Revival of Abolished Posts', type: 'other_org' },

  // MIS Reports
  { category: 'HR - MIS Reports', code: 'H-2.0.1', name: 'Vacancy History - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.1.1', name: 'Manpower Overview - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.1.2', name: 'Manpower Overview - Non Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.2.1', name: 'Total Manpower Sanction and actual - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.2.2', name: 'Total Manpower Sanction and actual - Non Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.3.1', name: 'Gender Wise Manpower - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.3.2', name: 'Gender Wise Manpower - Non Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.4.1', name: 'Actual Manpower Regular & Contract - Major Ports', type: 'mis' },
  { category: 'HR - MIS Reports', code: 'H-2.4.2', name: 'Actual Manpower Regular & Contract - Non Major Ports', type: 'mis' },

  // Contractual & Training
  { category: 'Contractual Details Report', code: 'H-3.1', name: 'Abstract - Contractual Details Report', type: 'contractual' },
  { category: 'Training Details Report', code: 'H-4.1', name: 'Abstract - Training Details Report', type: 'training' }
];

// Drill Down Component fetching dynamic API data
const ReportDataDrillDown = ({ report, onBack }) => {
  const [data, setData] = useState([]);
  const [apiColDefs, setApiColDefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [detailedData, setDetailedData] = useState(null);
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [detailedError, setDetailedError] = useState(null);
  const [detailedTitle, setDetailedTitle] = useState('');

  const handleCellClick = useCallback((params) => {
    // Basic logic for generic detailed drill down
    let detailEndpoint = '';
    const orgId = params.data.organisation_id || params.data.organization_id || params.data.organisationID || 0;
    const classId = params.data.class_id || params.data.class_Id || 0;
    const type = 1; // Generic type 1 used in old UI for abstract

    // Use similar logic to API endpoints based on report code
    if (report.code.includes('H-1.1')) detailEndpoint = `/hrdetailed-report/${orgId}/${type}/0`;
    else if (report.code.includes('H-1.3')) detailEndpoint = `/hrdetailed-abstarct-report/${orgId}/${classId}`;
    else if (report.code.includes('H-1.4')) detailEndpoint = `/hrfourth-detailed-report/${orgId}/${classId}`;
    else if (report.code.includes('H-1.5')) detailEndpoint = `/hrfifth-detailed-report/${orgId}/${classId}`;
    else if (report.code.includes('H-1.6')) detailEndpoint = `/hrsixth-detailed-report/${orgId}/${classId}`;
    else if (report.code.includes('H-1.7')) detailEndpoint = `/hrseventh-detailed-report/${orgId}/${classId}`;
    else if (report.code.includes('H-1.8')) detailEndpoint = `/hreighth-detailed-report/${orgId}/${classId}`;

    if (!detailEndpoint) {
      console.warn("Detailed drill-down not supported for this report yet.");
      return;
    }

    setDetailedLoading(true);
    setDetailedError(null);
    setDetailedTitle(`Detailed View: ${params.colDef.headerName} for ${params.data.organisation_name || 'Organization'}`);

    axios.get(`http://localhost:3000${detailEndpoint}`)
      .then(res => {
        const dData = res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDetailedData(dData);
        setDetailedLoading(false);
      })
      .catch(err => {
        console.error('Error fetching detailed data:', err);
        setDetailedError('Failed to load detailed drill down data.');
        setDetailedLoading(false);
      });
  }, [report.code]);

  useEffect(() => {
    setLoading(true);
    // Map report codes to their corresponding backend endpoints exactly as in sagarmanthan-main.
    let endpoint = '/hrfirst-report/0/0/0'; // Default fallback

    // Major Ports (A) and Other Orgs (B) mappings
    if (report.code === 'H-1.1 A') endpoint = '/hrfirst-report/0/0/0';
    else if (report.code === 'H-1.1 B') endpoint = '/hrfirst-report-other-org/0/0';
    else if (report.code === 'H-1.2 A') endpoint = '/hrsecond-report/0/0';
    else if (report.code === 'H-1.2 B') endpoint = '/hrsecond-report-other-org/0/0';
    else if (report.code === 'H-1.3 A') endpoint = '/hrabstarct-report/0/0/0';
    else if (report.code === 'H-1.3 B') endpoint = '/hrabstarct-report-other-org/0/0';
    else if (report.code === 'H-1.4 A') endpoint = '/hrfourth-report/0/0/0';
    else if (report.code === 'H-1.4 B') endpoint = '/hrfourth-report-other-org/0/0';
    else if (report.code === 'H-1.5 A') endpoint = '/hrfifth-report/0/0/0';
    else if (report.code === 'H-1.5 B') endpoint = '/hrfifth-report-other-org/0/0';
    else if (report.code === 'H-1.6 A') endpoint = '/hrsixth-report/0/0/0';
    else if (report.code === 'H-1.6 B') endpoint = '/hrsixth-report-other-org/0/0';
    else if (report.code === 'H-1.7 A') endpoint = '/hrseventh-report/0/0/0';
    else if (report.code === 'H-1.7 B') endpoint = '/hrseventh-report-other-org/0/0';
    else if (report.code === 'H-1.8 A') endpoint = '/hreighth-report/0/0/0';
    else if (report.code === 'H-1.8 B') endpoint = '/hreighth-report-other-org/0/0';
    // MIS Reports
    else if (report.code === 'H-2.0.1') endpoint = '/hrfirst-report/0/0/0'; // Fallback
    else if (report.code === 'H-2.1.1') endpoint = '/get-hr-staffing-overview-report/1';
    else if (report.code === 'H-2.1.2') endpoint = '/get-hr-staffing-overview-report/2';
    else if (report.code === 'H-2.2.1') endpoint = '/get-hr-mis-total-manpower-actual/0/0/1/0';
    else if (report.code === 'H-2.2.2') endpoint = '/get-hr-mis-total-manpower-actual/0/0/2/0';
    else if (report.code === 'H-2.3.1') endpoint = '/get-hr-mis-gender-wise-major-port/1';
    else if (report.code === 'H-2.3.2') endpoint = '/get-hr-mis-gender-wise-major-port/2';
    else if (report.code === 'H-2.4.1') endpoint = '/get-total-manpower-class-wise-report/1/0';
    else if (report.code === 'H-2.4.2') endpoint = '/get-total-manpower-class-wise-report/2/0';

    // Contractual & Training Details
    else if (report.code === 'H-3.1') endpoint = '/get-contract-details-report/0/0';
    else if (report.code === 'H-4.1') endpoint = '/get-training-details-report/0/0';

    axios.get(`http://localhost:3000${endpoint}`)
      .then(res => {
        // Handle variations in response format safely (including when backend returns { columnDefs, rowData })
        const fetchedData = res.data?.rowData || res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setData(fetchedData);
        if (res.data?.columnDefs) {
          setApiColDefs(res.data.columnDefs);
        } else {
          setApiColDefs(null);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching report data:', err);
        setError('Failed to load data for this report.');
        setLoading(false);
      });
  }, [report.code]);

  // Determine dynamic columns based on data keys
  const drillDownColDefs = useMemo(() => {
    if (apiColDefs && apiColDefs.length > 0) {
      // Inject drill-down cell renderer into the backend-provided column definitions
      const injectRenderer = (cols) => {
        return cols.map(col => {
          if (col.children) {
            return { ...col, children: injectRenderer(col.children) };
          }
          const isIdColumn = col.field?.toLowerCase().includes('_id');
          return {
            ...col,
            cellRenderer: !isIdColumn ? (params) => {
              if (params.value === null || params.value === undefined) return '';
              // Treat numeric or number-like strings as clickable metrics
              if (typeof params.value === 'number' || (!isNaN(Number(params.value)) && String(params.value).trim() !== '')) {
                return (
                  <button
                    className="text-blue-600 font-semibold hover:text-blue-800 underline cursor-pointer"
                    onClick={() => handleCellClick(params)}
                  >
                    {params.value}
                  </button>
                );
              }
              return params.value;
            } : undefined
          };
        });
      };
      return injectRenderer(apiColDefs);
    }

    if (data.length === 0) return [];

    // Fallback if no columnDefs are provided
    return Object.keys(data[0]).map(key => {
      const isNumerical = data.some(row => typeof row[key] === 'number');
      const isIdColumn = key.toLowerCase().includes('_id');

      return {
        field: key,
        headerName: key.replace(/_/g, ' ').toUpperCase(),
        minWidth: 150,
        filter: true,
        sortable: true,
        cellRenderer: (isNumerical && !isIdColumn) ? (params) => {
          if (params.value === null || params.value === undefined) return '';
          return (
            <button
              className="text-blue-600 font-semibold hover:text-blue-800 underline cursor-pointer"
              onClick={() => handleCellClick(params)}
            >
              {params.value}
            </button>
          )
        } : undefined
      };
    });
  }, [data, apiColDefs, handleCellClick]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
          title="Back to Reports Catalog"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black uppercase rounded-full">
              {report.code}
            </span>
            <h3 className="text-lg font-extrabold text-[#0f417a]">{report.name}</h3>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">{report.category}</p>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
        {/* <div className="h-12 w-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-200 shadow-sm mb-2">
          <Database className="h-6 w-6 text-[#0f417a]" />
        </div>
        <div>
          <h4 className="text-md font-bold text-slate-800">Live Data View for {report.name}</h4>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto mb-6">
            This data is dynamically fetched from the database in real-time. Use the table below to explore or export the records.
          </p>
        </div> */}

        {error ? (
          <div className="text-sm font-bold text-red-600 mt-8 py-10">
            {error}
          </div>
        ) : (
          <div className="w-full text-left space-y-8">
            <Table
              rowData={data}
              columnDefs={drillDownColDefs}
              loading={loading}
              pagination={true}
              paginationPageSize={10}
              enableExport={true}
              exportFileName={`${report.code}_Export`}
              exportPdfTitle={report.name}
              defaultColDef={{
                minWidth: 150,
                filter: true,
                sortable: true,
                resizable: true
              }}
            />

            {/* Detailed Drill Down Section */}
            {(detailedData || detailedLoading || detailedError) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mt-8 animate-fade-in relative">
                <button
                  onClick={() => { setDetailedData(null); setDetailedError(null); setDetailedLoading(false); }}
                  className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full text-slate-400 transition cursor-pointer"
                  title="Close Details"
                >
                  ✕
                </button>
                <div className="mb-4">
                  <h4 className="text-md font-bold text-slate-800">{detailedTitle}</h4>
                </div>

                {detailedError ? (
                  <div className="text-sm font-bold text-red-600 py-4">{detailedError}</div>
                ) : (
                  <div className="max-h-[500px] overflow-auto">
                    <Table
                      rowData={detailedData || []}
                      columnDefs={detailedData && detailedData.length > 0 ? Object.keys(detailedData[0]).map(k => ({
                        field: k, headerName: k.replace(/_/g, ' ').toUpperCase(), minWidth: 120, filter: true, sortable: true
                      })) : []}
                      loading={detailedLoading}
                      pagination={true}
                      paginationPageSize={10}
                      enableExport={true}
                      exportFileName="Detailed_DrillDown_Export"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState('');

  // State for drill-down view
  const [activeDrillDownReport, setActiveDrillDownReport] = useState(null);

  const handleDrillDown = (report) => {
    setActiveDrillDownReport(report);
  };

  const filteredReports = useMemo(() => {
    return REPORT_LIST.filter(rep => {
      const code = rep.code.toLowerCase();
      const name = rep.name.toLowerCase();
      const category = rep.category.toLowerCase();
      const term = searchTerm.toLowerCase();

      return !searchTerm || code.includes(term) || name.includes(term) || category.includes(term);
    });
  }, [searchTerm]);

  const catalogColDefs = useMemo(() => [
    { field: 'category', headerName: 'Category', minWidth: 250, cellClass: 'font-bold text-slate-800' },
    { field: 'code', headerName: 'Report Code', minWidth: 120, cellClass: 'font-mono font-bold text-slate-700 text-center' },
    {
      field: 'name',
      headerName: 'Description (Click to View)',
      minWidth: 400,
      cellRenderer: (params) => {
        return (
          <button
            onClick={() => handleDrillDown(params.data)}
            className="text-left font-semibold text-blue-700 hover:text-blue-900 cursor-pointer hover:underline underline-offset-4 transition"
          >
            {params.value}
          </button>
        )
      }
    }
  ], []);

  if (activeDrillDownReport) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        <PageBanner
          title="HR Reports Analysis"
          description="Detailed drill-down view for the selected report."
          icon={FilePieChart}
        />
        <ReportDataDrillDown
          report={activeDrillDownReport}
          onBack={() => setActiveDrillDownReport(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <PageBanner
        title="HR Reports Index"
        description="Access and export official ministry review records, manpower overview audits, and demographic statistics."
        icon={FilePieChart}
      />

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Reports Catalog</h3>
            <p className="text-xs text-slate-400 font-medium">Select any ministry review sheet to view its live data.</p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search reports catalog..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-105 font-medium text-slate-700"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="w-full">
          <Table
            rowData={filteredReports}
            columnDefs={catalogColDefs}
            loading={false}
            pagination={true}
            paginationPageSize={10}
            enableExport={true}
            exportFileName="HR_Reports_Catalog"
            exportPdfTitle="HR Reports Catalog"
            defaultColDef={{
              minWidth: 120,
              filter: true,
              sortable: true,
              resizable: true
            }}
          />
        </div>
      </div>
    </div>
  );
}
