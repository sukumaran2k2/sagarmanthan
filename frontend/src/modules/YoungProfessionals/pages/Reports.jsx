import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Building2 } from 'lucide-react';
import api, { API_BASE } from '../api';
import ReportTable from '../../../components/ReportTable';
import { useAICopilot } from '../../../context/AICopilotContext';

export default function Reports({ triggerNotification }) {
  const { registerReport, clearReport } = useAICopilot();
  const [reportView, setReportView] = useState('all');

  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 2.2A - Abstract ( Wing & Division Wise ) - Young Professionals' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  /* ── Data Fetching ─────────────────────────────────────────── */
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (currentView.type === 'summary') {
        const response = await api.get("/yp-report");
        const list = response.data?.rowData || [];
        setData(list.map((item, idx) => ({ ...item, 'S No': idx + 1 })));
      } else if (currentView.type === 'wing_drilldown') {
        const response = await api.get(`/wingwise-ypcandidate/0/${currentView.wingId}`);
        const list = response.data?.rowData || response.data || [];
        setData(list.map((item, idx) => ({
          'S No': idx + 1,
          'Wing Name': item['Wing Name'] || item.wing || item.wing_name || '—',
          'Division Name': item['Division Name'] || item.division || item.division_name || '—',
          'Name': item['Name'] || item.name,
          'Qualification': item['Qualification'] || item.qualification,
          'Role': item['Role'] || item.role,
          'Salary (per month)': item['Salary (per month)'] || item.salary,
          'Experience (Years)': item['Experience (Years)'] ?? item.total_experience,
          'Skills': item['Skills'] || item.skills,
          'Appointment Date': item['Appointment Date'] || item.appointment_date,
          'Document': item['Document'] || item.appointment_document,
          'Created At': item['Created At'] || item.created_at || item.created_date || '—',
          'Created By': item['Created By'] || item.created_by || '—',
          'Last Updated At': item['Last Updated At'] || item.last_updated_at || item.last_updated_date || '—'
        })));
      } else if (currentView.type === 'drilldown') {
        const response = await api.get(`/divisionwise-ypcandidate/0/${currentView.divisionId}`);
        const list = response.data?.rowData || response.data || [];
        setData(list.map((item, idx) => ({
          'S No': idx + 1,
          'Wing Name': item['Wing Name'] || item.wing || item.wing_name || '—',
          'Division Name': item['Division Name'] || item.division || item.division_name || '—',
          'Name': item['Name'] || item.name,
          'Qualification': item['Qualification'] || item.qualification,
          'Role': item['Role'] || item.role,
          'Salary (per month)': item['Salary (per month)'] || item.salary,
          'Experience (Years)': item['Experience (Years)'] ?? item.total_experience,
          'Skills': item['Skills'] || item.skills,
          'Appointment Date': item['Appointment Date'] || item.appointment_date,
          'Document': item['Document'] || item.appointment_document,
          'Created At': item['Created At'] || item.created_at || item.created_date || '—',
          'Created By': item['Created By'] || item.created_by || '—',
          'Last Updated At': item['Last Updated At'] || item.last_updated_at || item.last_updated_date || '—'
        })));
      } else if (currentView.type === 'all_drilldown') {
        const response = await api.get('/young-professional?all=true');
        const raw = response.data;
        const list = (Array.isArray(raw) ? raw : (raw?.data || [])).filter(item => Number(item.is_active) === 1 || item.is_active === true || item.is_active == null);
        setData(list.map((item, idx) => ({
          'S No': idx + 1,
          'Wing Name': item.wing || item.wing_name || item['Wing Name'] || '—',
          'Division Name': item.division || item.division_name || item['Division Name'] || '—',
          'Name': item.name || item['Name'],
          'Qualification': item.qualification || item['Qualification'],
          'Role': item.role || item['Role'],
          'Salary (per month)': item.salary || item['Salary (per month)'],
          'Experience (Years)': item.total_experience ?? item['Experience (Years)'],
          'Skills': item.skills || item['Skills'],
          'Appointment Date': item.appointment_date || item['Appointment Date'],
          'Document': item.appointment_document || item['Document'],
          'Created At': item.created_at || item.created_date || item['Created At'] || '—',
          'Created By': item.created_by || item['Created By'] || '—',
          'Last Updated At': item.last_updated_at || item.last_updated_date || item['Last Updated At'] || '—'
        })));
      }
    } catch (err) {
      console.error("Error loading YP report data:", err);
      setError("Failed to load report data.");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  /* ── Summary Columns ───────────────────────────────────────── */
  const summaryColumns = useMemo(() => {
    const cols = [
      {
        field: 'S No',
        headerName: 'S.No',
        pinned: 'left',
        width: 80,
        suppressMovable: true,
        cellRenderer: (p) => {
          if (p.node && p.node.rowPinned) {
            return '';
          }
          return (
            <span style={{ fontWeight: 800, fontSize: 11, fontFamily: 'monospace' }}>
              {p.value}
            </span>
          );
        }
      }
    ];

    if (reportView === 'wing' || reportView === 'all') {
      cols.push({
        field: 'Wing',
        headerName: 'Wing',
        flex: 1.5,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          if (p.node && p.node.rowPinned) {
            return <strong style={{ fontWeight: 850, color: '#4b2424' }}>Total</strong>;
          }
          return <span style={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value || '—'}</span>;
        }
      });
    }

    if (reportView === 'division' || reportView === 'all') {
      cols.push({
        field: 'Division',
        headerName: 'Division',
        flex: 1.5,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          if (p.node && p.node.rowPinned) {
            return <strong style={{ fontWeight: 850, color: '#4b2424' }}>Total</strong>;
          }
          return <span style={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value || '—'}</span>;
        }
      });
    }

    cols.push({
      field: 'In Position',
      headerName: 'In Post',
      width: 150,
      wrapText: true,
      autoHeight: true,
      cellClass: 'yp-wrap-cell',
      cellRenderer: (p) => {
        const val = p.value;
        if (p.node && p.node.rowPinned) {
          return (
            <button
              onClick={() => {
                setDrillDownPath(prev => [
                  ...prev,
                  { type: 'all_drilldown', title: 'Young Professional List - All Active Young Professionals' }
                ]);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#4b2424',
                fontWeight: 850,
                fontSize: '13px',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {val} Total Active
            </button>
          );
        }

        if (val > 0) {
          return (
            <button
              onClick={() => {
                if (reportView === 'wing') {
                  const wingId = p.data["Wing ID"] || p.data["wing_id"];
                  const wingName = p.data["Wing"];
                  setDrillDownPath(prev => [
                    ...prev,
                    { type: 'wing_drilldown', wingId, wingName, title: `Young Professional List - Wing: ${wingName}` }
                  ]);
                } else if (reportView === 'division') {
                  const divisionId = p.data["Division ID"] || p.data["division_id"];
                  const divisionName = p.data["Division"];
                  setDrillDownPath(prev => [
                    ...prev,
                    { type: 'drilldown', divisionId, title: `Young Professional List - Division: ${divisionName}` }
                  ]);
                } else {
                  const divisionId = p.data["Division ID"] || p.data["division_id"];
                  const divisionName = p.data["Division"];
                  const wingName = p.data["Wing"];
                  setDrillDownPath(prev => [
                    ...prev,
                    { type: 'drilldown', divisionId, title: `Young Professional List - Wing: ${wingName} | Division: ${divisionName}` }
                  ]);
                }
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#4b2424',
                fontWeight: 800,
                fontSize: '13px',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              {val} Active
            </button>
          );
        }
        return <span style={{ color: '#657386', fontWeight: 600 }}>—</span>;
      }
    });

    return cols;
  }, [reportView]);

  /* ── Drilldown Columns ────────────────────────────────────── */
  const drilldownColumns = useMemo(() => {
    const cols = [
      {
        field: 'S No',
        headerName: 'S.No',
        pinned: 'left',
        width: 80,
        suppressMovable: true,
        cellRenderer: (p) => (
          <span style={{ fontWeight: 800, fontSize: 11, fontFamily: 'monospace' }}>
            {p.value}
          </span>
        )
      }
    ];

    if (currentView.type === 'all_drilldown' || currentView.type === 'wing_drilldown') {
      cols.push(
        {
          field: 'Wing Name',
          headerName: 'Wing',
          minWidth: 160,
          wrapText: true,
          autoHeight: true,
          cellClass: 'yp-wrap-cell',
          cellRenderer: (p) => <span style={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value || '—'}</span>
        },
        {
          field: 'Division Name',
          headerName: 'Division',
          minWidth: 160,
          wrapText: true,
          autoHeight: true,
          cellClass: 'yp-wrap-cell',
          cellRenderer: (p) => <span style={{ fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value || '—'}</span>
        }
      );
    }

    cols.push(
      {
        field: 'Name',
        headerName: 'Name',
        minWidth: 180,
        pinned: 'left',
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          if (!p.value) return '—';
          return <span style={{ fontWeight: 600, fontSize: 13.5, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value}</span>;
        }
      },
      {
        field: 'Qualification',
        headerName: 'Qualification',
        minWidth: 180,
        flex: 1.2,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellStyle: {
          fontSize: '13px',
          lineHeight: '1.5',
          paddingTop: '8px',
          paddingBottom: '8px',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          display: 'block'
        },
        cellRenderer: (p) => {
          if (!p.value) return <span className="text-slate-400">—</span>;
          return <span style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value}</span>;
        }
      },
      {
        field: 'Experience (Years)',
        headerName: 'Experience',
        minWidth: 135,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          if (!p.value && p.value !== 0) return '—';
          return <span style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value} Yrs</span>;
        }
      },
      {
        field: 'Skills',
        headerName: 'Skills',
        minWidth: 280,
        flex: 1.5,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellStyle: {
          fontSize: '13px',
          lineHeight: '1.6',
          paddingTop: '8px',
          paddingBottom: '8px',
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          display: 'block'
        },
        valueFormatter: (p) => p.value ? p.value : '—'
      },
      {
        field: 'Role',
        headerName: 'Role',
        minWidth: 155,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          if (!p.value) return <span className="text-slate-400">—</span>;
          return <span style={{ fontWeight: 600, fontSize: 13, wordBreak: 'break-word', whiteSpace: 'normal' }}>{p.value}</span>;
        }
      },
      {
        field: 'Salary (per month)',
        headerName: 'Salary',
        minWidth: 135,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          if (!p.value) return <span className="text-slate-400">—</span>;
          return (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 650,
                fontSize: 13.5,
                wordBreak: 'break-word',
                whiteSpace: 'normal'
              }}
              className="text-emerald-700 dark:text-emerald-400"
            >
              ₹{Number(p.value).toLocaleString('en-IN')}
            </span>
          );
        }
      },
      {
        field: 'Appointment Date',
        headerName: 'Date of Appointment',
        minWidth: 180,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          if (!p.value) return <span className="text-slate-400">—</span>;
          return (
            <span style={{ fontWeight: 600, fontSize: 12.5, textAlign: 'center', width: '100%', display: 'block', wordBreak: 'break-word', whiteSpace: 'normal' }}>
              {p.value}
            </span>
          );
        }
      },
      {
        field: 'Document',
        headerName: 'Appointment Order',
        minWidth: 185,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => {
          const fileName = p.value;
          if (fileName) {
            return (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', wordBreak: 'break-word', whiteSpace: 'normal' }}>
                <a
                  href={`${API_BASE}/download-yp-document?fileName=${encodeURIComponent(fileName)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    textDecoration: 'underline',
                    color: '#2563eb',
                    wordBreak: 'break-word',
                    whiteSpace: 'normal'
                  }}
                >
                  Download Order
                </a>
              </div>
            );
          }
          return <span style={{ color: '#cbd5e1', display: 'block', textAlign: 'center' }}>—</span>;
        }
      },
      {
        field: 'Created At',
        headerName: 'Created At',
        minWidth: 165,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textAlign: 'center', width: '100%', display: 'block', wordBreak: 'break-word', whiteSpace: 'normal' }} className="dark:text-slate-100">
            {p.value || '—'}
          </span>
        )
      },
      {
        field: 'Created By',
        headerName: 'Created By',
        minWidth: 155,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => (
          <span style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a', wordBreak: 'break-word', whiteSpace: 'normal' }} className="dark:text-slate-100">
            {p.value || '—'}
          </span>
        )
      },
      {
        field: 'Last Updated At',
        headerName: 'Last Updated At',
        minWidth: 170,
        wrapText: true,
        autoHeight: true,
        cellClass: 'yp-wrap-cell',
        cellRenderer: (p) => (
          <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', textAlign: 'center', width: '100%', display: 'block', wordBreak: 'break-word', whiteSpace: 'normal' }} className="dark:text-slate-100">
            {p.value || '—'}
          </span>
        )
      }
    );
    return cols;
  }, [currentView.type]);

  const columns = currentView.type === 'summary' ? summaryColumns : drilldownColumns;

  const aggregatedData = useMemo(() => {
    if (currentView.type !== 'summary') return data;

    if (reportView === 'wing') {
      const wingMap = {};
      data.forEach(item => {
        const wingId = item['Wing ID'] || item.wing_id;
        const wingName = item['Wing'] || item.wing;
        const inPost = Number(item['In Position'] || item.in_position || 0);
        if (wingId) {
          if (!wingMap[wingId]) {
            wingMap[wingId] = {
              'Wing ID': wingId,
              'Wing': wingName,
              'In Position': 0
            };
          }
          wingMap[wingId]['In Position'] += inPost;
        }
      });
      return Object.values(wingMap).map((item, idx) => ({ ...item, 'S No': idx + 1 }));
    }

    if (reportView === 'division') {
      const divisionMap = {};
      data.forEach(item => {
        const divId = item['Division ID'] || item.division_id;
        const divName = item['Division'] || item.division;
        const inPost = Number(item['In Position'] || item.in_position || 0);
        if (divId) {
          if (!divisionMap[divId]) {
            divisionMap[divId] = {
              'Division ID': divId,
              'Division': divName,
              'In Position': 0
            };
          }
          divisionMap[divId]['In Position'] += inPost;
        }
      });
      return Object.values(divisionMap).map((item, idx) => ({ ...item, 'S No': idx + 1 }));
    }

    return data;
  }, [data, reportView, currentView.type]);

  const pinnedBottomRowData = useMemo(() => {
    if (currentView.type !== 'summary' || !aggregatedData || aggregatedData.length === 0) return undefined;
    const total = aggregatedData.reduce((sum, item) => sum + Number(item['In Position'] || 0), 0);
    return [
      {
        'S No': '',
        'Wing': 'Total',
        'Division': 'Total',
        'In Position': total
      }
    ];
  }, [aggregatedData, currentView.type]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    wrapText: true,
    autoHeight: true,
    cellClass: 'yp-wrap-cell',
    cellStyle: {
      wordBreak: 'break-word',
      whiteSpace: 'normal',
      lineHeight: '1.5'
    }
  }), []);

  useEffect(() => {
    if (aggregatedData && aggregatedData.length > 0) {
      registerReport?.({
        moduleName: 'Young Professionals',
        reportTitle: currentView.title,
        activeView: currentView.type === 'summary' ? `Summary (${reportView})` : 'Drilldown List',
        columns: columns,
        data: aggregatedData,
        rowCount: aggregatedData.length,
        pinnedBottom: pinnedBottomRowData,
        autoOpen: false
      });
    }
    return () => {
      clearReport?.();
    };
  }, [aggregatedData, currentView, columns, reportView, registerReport, clearReport, pinnedBottomRowData]);

  const subtitle = useMemo(() => (
    <>
      <span>As on date: <strong style={{ color: '#4b2424' }}>15-07-2026</strong></span>
      <span style={{ color: '#eadede' }}>•</span>
      <span>Report for the month — <strong style={{ color: '#4b2424' }}>July 2026</strong></span>
    </>
  ), []);

  const toolbarExtra = currentView.type === 'summary' ? (
    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-blue-50/90 dark:from-slate-900 dark:via-indigo-950/40 dark:to-slate-900 border-2 border-indigo-400/60 dark:border-indigo-500/60 text-xs shadow-xs">
      <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold shrink-0">
        <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-800 dark:text-indigo-300 whitespace-nowrap">
          Report View:
        </span>
      </div>
      <select
        value={reportView}
        onChange={(e) => setReportView(e.target.value)}
        className="bg-transparent border-none text-xs font-extrabold text-indigo-950 dark:text-indigo-100 outline-none cursor-pointer pr-1 max-w-[200px]"
      >
        <option value="wing" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">Wing</option>
        <option value="division" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">Division</option>
        <option value="all" className="dark:bg-slate-900 dark:text-slate-200 font-semibold">Wing and Division</option>
      </select>
    </div>
  ) : null;

  if (error) {
    return (
      <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl border border-red-200 animate-fade-in">
        {error}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <ReportTable
        title={currentView.type === 'summary' ? 'Report No. 2.2A - Abstract ( Wing & Division Wise ) - Young Professionals' : currentView.title}
        subtitle={subtitle}
        onBack={handleBack}
        showBackButton={drillDownPath.length > 1}
        rawData={data}
        viewData={aggregatedData}
        columns={columns}
        defaultColDef={defaultColDef}
        pinnedBottomRowData={pinnedBottomRowData}
        loading={loading}
        onRefresh={fetchReportData}
        triggerNotification={triggerNotification}
        pagination={true}
        themeClass="yp-pro-grid"
        brandColor="#4b2424"
        brandColorHover="#6b3535"
        accentColor="#f3f7f5ff"
        oddRowColor="#f8faf6"
        totalLabel="Total Active"
        toolbarExtra={toolbarExtra}
      />
    </div>
  );
}
