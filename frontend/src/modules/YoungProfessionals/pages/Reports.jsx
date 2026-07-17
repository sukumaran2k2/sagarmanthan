import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ReportTable from '../../../components/ReportTable';

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 2.2A - Abstract ( Wing & Division Wise ) - Young Professionals' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  /* ── Data Fetching ─────────────────────────────────────────── */
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'summary') {
        const response = await axios.get("http://localhost:3000/yp-report");
        const list = response.data.rowData || [];
        // Add S No helper values
        setData(list.map((item, idx) => ({ ...item, 'S No': idx + 1 })));
      } else if (currentView.type === 'drilldown') {
        const response = await axios.get(`http://localhost:3000/divisionwise-ypcandidate/0/${currentView.divisionId}`);
        const list = response.data.rowData || [];
        // Add S No helper values
        setData(list.map((item, idx) => ({ ...item, 'S No': idx + 1 })));
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const summaryColumns = useMemo(() => [
    {
      field: 'S No',
      headerName: 'S.No',
      pinned: 'left',
      width: 60,
      suppressMovable: true,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, color: '#000000', fontSize: 11, fontFamily: 'monospace' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'Wing',
      headerName: 'Wing',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13.5 }}>{p.value}</span>;
      }
    },
    {
      field: 'Division',
      headerName: 'Division',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13.5 }}>{p.value}</span>;
      }
    },
    {
      field: 'In Position',
      headerName: 'In Post',
      width: 150,
      cellRenderer: (p) => {
        const val = p.value;
        const divisionId = p.data["Division ID"];
        const divisionName = p.data["Division"];
        const wingName = p.data["Wing"];
        if (val > 0) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <button
                onClick={() => {
                  setDrillDownPath(prev => [
                    ...prev,
                    { type: 'drilldown', divisionId, title: `Candidates List - Wing: ${wingName} | Division: ${divisionName}` }
                  ]);
                }}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: 0,
                  background: 'none',
                  color: '#4b2424', fontWeight: 800, fontSize: 12,
                  textDecoration: 'underline',
                  border: 'none', cursor: 'pointer',
                  transition: 'opacity 0.15s ease'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {val} Active
              </button>
            </div>
          );
        }
        return <span style={{ color: '#657386', fontWeight: 600, display: 'block', textAlign: 'center' }}>—</span>;
      }
    }
  ], []);

  /* ── Drilldown Columns ────────────────────────────────────── */
  const drilldownColumns = useMemo(() => [
    {
      field: 'S No',
      headerName: 'S.No',
      pinned: 'left',
      width: 60,
      suppressMovable: true,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, color: '#000000', fontSize: 11, fontFamily: 'monospace' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'Name',
      headerName: 'Name',
      minWidth: 180,
      pinned: 'left',
      cellRenderer: (p) => {
        if (!p.value) return '—';
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13.5 }}>{p.value}</span>;
      }
    },
    {
      field: 'Qualification',
      headerName: 'Qualification',
      minWidth: 180,
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13 }}>{p.value}</span>;
      }
    },
    {
      field: 'Experience (Years)',
      headerName: 'Experience',
      minWidth: 135,
      cellRenderer: (p) => {
        if (!p.value && p.value !== 0) return '—';
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13 }}>{p.value} Yrs</span>;
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
        color: '#000000',
        fontSize: '13px',
        lineHeight: '1.6',
        paddingTop: '10px',
        paddingBottom: '10px',
        display: 'block'
      },
      valueFormatter: (p) => p.value ? p.value : '—'
    },
    {
      field: 'Role',
      headerName: 'Role',
      minWidth: 155,
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return <span style={{ fontWeight: 600, color: '#000000', fontSize: 13 }}>{p.value}</span>;
      }
    },
    {
      field: 'Salary (per month)',
      headerName: 'Salary',
      minWidth: 135,
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return (
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 650,
            color: '#0F6E56',
            fontSize: 13.5
          }}>
            ₹{Number(p.value).toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      field: 'Appointment Date',
      headerName: 'Date of Appointment',
      minWidth: 180,
      cellRenderer: (p) => {
        if (!p.value) return <span style={{ color: '#657386' }}>—</span>;
        return (
          <span style={{ fontWeight: 600, color: '#000000', fontSize: 12.5, textAlign: 'center', width: '100%', display: 'block' }}>
            {p.value}
          </span>
        );
      }
    },
    {
      field: 'Document',
      headerName: 'Appointment Order',
      minWidth: 185,
      cellRenderer: (p) => {
        const fileName = p.value;
        if (fileName) {
          return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <a
                href={`http://localhost:3000/download-yp-document?fileName=${encodeURIComponent(fileName)}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#4b2424', fontWeight: 800, fontSize: 13,
                  textDecoration: 'underline',
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
      cellRenderer: (p) => (
        <span style={{ fontSize: 11, fontWeight: 550, color: '#94a3b8', textAlign: 'center', width: '100%', display: 'block' }}>
          {p.value || '—'}
        </span>
      )
    },
    {
      field: 'Created By',
      headerName: 'Created By',
      minWidth: 145,
      cellRenderer: (p) => (
        <span style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>
          {p.value || '—'}
        </span>
      )
    },
    {
      field: 'Last Updated At',
      headerName: 'Last Updated At',
      minWidth: 170,
      cellRenderer: (p) => (
        <span style={{ fontSize: 11, fontWeight: 550, color: '#94a3b8', textAlign: 'center', width: '100%', display: 'block' }}>
          {p.value || '—'}
        </span>
      )
    }
  ], []);

  const columns = currentView.type === 'summary' ? summaryColumns : drilldownColumns;

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const subtitle = useMemo(() => (
    <>
      <span>As on date: <strong style={{ color: '#4b2424' }}>15-07-2026</strong></span>
      <span style={{ color: '#eadede' }}>•</span>
      <span>Report for the month — <strong style={{ color: '#4b2424' }}>July 2026</strong></span>
    </>
  ), []);

  return (
    <ReportTable
      title={currentView.title}
      subtitle={subtitle}
      onBack={handleBack}
      showBackButton={drillDownPath.length > 1}
      rawData={data}
      viewData={data}
      columns={columns}
      defaultColDef={defaultColDef}
      loading={loading}
      onRefresh={fetchReportData}
      triggerNotification={triggerNotification}
      pagination={currentView.type === 'drilldown'}
      themeClass="yp-pro-grid"
      brandColor="#4b2424"
      brandColorHover="#6b3535"
      accentColor="#f7f3f3"
      oddRowColor="#f8faf6"
      totalLabel="Total"
    />
  );
}
