import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import ReportTable from '../../../components/ReportTable';

const STAGES = [
  { id: 1, label: 'Preliminary DCN Prepared', key: 'prep' },
  { id: 2, label: 'Preliminary DCN Approved by Minister', key: 'appMin' },
  { id: 3, label: 'Circulated for IMC', key: 'circIMC' },
  { id: 4, label: 'IMC Comments Received', key: 'imcRec' },
  { id: 5, label: 'Final DCN to be Prepared', key: 'prepFinal' },
  { id: 6, label: 'Final DCN Approved by Minister', key: 'appFinal' },
  { id: 7, label: 'Advance Copy Sent to PMO & Cab', key: 'advPMO' },
  { id: 8, label: 'Approved by Cabinet', key: 'appCab' },
  { id: 9, label: 'On Hold', key: 'hold' },
  { id: 10, label: 'Completed', key: 'comp' }
];

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 1.1 - Wing-wise Cabinet Notes Stage Matrix' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'summary') {
        const response = await axios.get("http://localhost:3000/cabinetmopsw-report");
        const rawData = response.data || [];
        
        const wingsMap = {};
        rawData.forEach(row => {
          const wingName = row.wing_name || 'Unknown';
          const wingId = row.wing;
          const stageId = parseInt(row.stage_id, 10);
          const count = parseInt(row.cabinet_notes_mopsw_count, 10) || 0;

          if (!wingsMap[wingName]) {
            wingsMap[wingName] = {
              wingId,
              wing: wingName,
              prep: 0,
              appMin: 0,
              circIMC: 0,
              imcRec: 0,
              prepFinal: 0,
              appFinal: 0,
              advPMO: 0,
              appCab: 0,
              hold: 0,
              comp: 0,
              total: 0
            };
          }

          if (stageId === 1) wingsMap[wingName].prep = count;
          else if (stageId === 2) wingsMap[wingName].appMin = count;
          else if (stageId === 3) wingsMap[wingName].circIMC = count;
          else if (stageId === 4) wingsMap[wingName].imcRec = count;
          else if (stageId === 5) wingsMap[wingName].prepFinal = count;
          else if (stageId === 6) wingsMap[wingName].appFinal = count;
          else if (stageId === 7) wingsMap[wingName].advPMO = count;
          else if (stageId === 8) wingsMap[wingName].appCab = count;
          else if (stageId === 9) wingsMap[wingName].hold = count;
          else if (stageId === 10) wingsMap[wingName].comp = count;

          if (stageId !== 0 && !isNaN(stageId)) {
            wingsMap[wingName].total += count;
          }
        });

        const rows = Object.values(wingsMap).map((w, idx) => ({ ...w, 'S No': idx + 1 }));
        setData(rows);
      } else if (currentView.type === 'detail') {
        if (currentView.stageKey) {
          // Specific stage selected - fetch from detailed wing-wise endpoint
          const response = await axios.get(`http://localhost:3000/getmopsw-wingwise/${currentView.wingId}/${currentView.stageId}`);
          const list = response.data || [];
          setData(list.map((n, idx) => ({ ...n, 'S No': idx + 1 })));
        } else {
          // Total/All stages selected - fetch all and filter in memory by wing
          const response = await axios.get("http://localhost:3000/cabinet-mopsw-all");
          const list = (response.data || []).filter(note => String(note.wing) === String(currentView.wingId));
          setData(list.map((n, idx) => ({ ...n, 'S No': idx + 1 })));
        }
      }
    } catch (err) {
      console.error("Error loading Cabinet Notes MoPSW reports:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Create numeric drilldown link cell renderer
  const createDrilldownCellRenderer = (stageKey, stageIdInput = null) => {
    return (p) => {
      const val = p.value;
      if (val > 0) {
        return (
          <button
            onClick={() => {
              const wingId = p.data.wingId;
              const wingName = p.data.wing;
              const stage = STAGES.find(s => s.key === stageKey);
              const stageLabel = stage ? stage.label : 'All stages';
              const stageId = stageIdInput || (stage ? stage.id : null);
              
              setDrillDownPath(prev => [
                ...prev,
                {
                  type: 'detail',
                  wingId,
                  stageKey,
                  stageId,
                  title: `Cabinet Notes - Wing: ${wingName} | Stage: ${stageLabel}`
                }
              ]);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#4b2424',
              fontWeight: 800,
              textDecoration: 'underline',
              cursor: 'pointer',
              fontSize: '12px'
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.7'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          >
            {val}
          </button>
        );
      }
      return <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>;
    };
  };

  const summaryColumns = useMemo(() => [
    {
      field: 'S No',
      headerName: 'S.No',
      pinned: 'left',
      width: 60,
      suppressMovable: true,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 11, fontFamily: 'monospace' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'wing',
      headerName: 'Wing Name',
      flex: 1.5,
      minWidth: 160,
      pinned: 'left',
      cellRenderer: (p) => (
        <button
          onClick={() => {
            setDrillDownPath(prev => [
              ...prev,
              {
                type: 'detail',
                wingId: p.data.wingId,
                stageKey: null,
                stageId: null,
                title: `Cabinet Notes - Wing: ${p.data.wing} | All Stages`
              }
            ]);
          }}
          style={{
            background: 'none',
            border: 'none',
            color: '#4b2424',
            fontWeight: 800,
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '13px'
          }}
          onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
          onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
        >
          {p.value}
        </button>
      )
    },
    { 
      field: 'total', 
      headerName: 'No. of Cabinet Notes', 
      minWidth: 160, 
      cellClass: 'font-black text-slate-800 dark:text-slate-100', 
      cellRenderer: createDrilldownCellRenderer(null) 
    },
    { field: 'prep', headerName: 'Preliminary DCN Prepared', minWidth: 200, cellRenderer: createDrilldownCellRenderer('prep', 1) },
    { field: 'appMin', headerName: 'Preliminary DCN Approved by Minister', minWidth: 260, cellRenderer: createDrilldownCellRenderer('appMin', 2) },
    { field: 'circIMC', headerName: 'Circulated for IMC', minWidth: 180, cellRenderer: createDrilldownCellRenderer('circIMC', 3) },
    { field: 'imcRec', headerName: 'IMC Comments Received', minWidth: 200, cellRenderer: createDrilldownCellRenderer('imcRec', 4) },
    { field: 'prepFinal', headerName: 'Final DCN to be Prepared', minWidth: 200, cellRenderer: createDrilldownCellRenderer('prepFinal', 5) },
    { field: 'appFinal', headerName: 'Final DCN Approved by Minister', minWidth: 240, cellRenderer: createDrilldownCellRenderer('appFinal', 6) },
    { field: 'advPMO', headerName: 'Advance Copy Sent to PMO & Cab', minWidth: 240, cellRenderer: createDrilldownCellRenderer('advPMO', 7) },
    { field: 'appCab', headerName: 'Approved by Cabinet', minWidth: 180, cellRenderer: createDrilldownCellRenderer('appCab', 8) },
    { field: 'hold', headerName: 'On Hold', minWidth: 100, cellRenderer: createDrilldownCellRenderer('hold', 9) },
    { field: 'comp', headerName: 'Completed', minWidth: 100, cellRenderer: createDrilldownCellRenderer('comp', 10) }
  ], []);

  const detailColumns = useMemo(() => [
    {
      field: 'S No',
      headerName: 'S.No',
      pinned: 'left',
      width: 60,
      suppressMovable: true,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 11, fontFamily: 'monospace' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'subject',
      headerName: 'Name of the Subject',
      flex: 1.5,
      minWidth: 220,
      pinned: 'left',
      cellClass: 'mopsw-wrap-cell',
      cellRenderer: (p) => (
        <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '13px', lineHeight: '1.5' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'wing_name',
      headerName: 'Wing',
      minWidth: 130,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 600, color: '#475569', fontSize: '12.5px' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'division_name',
      headerName: 'Division',
      minWidth: 130,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 600, color: '#475569', fontSize: '12.5px' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'mopsw_stage_name',
      headerName: 'Current Stage',
      minWidth: 160,
      cellRenderer: (p) => (
        <span style={{ fontWeight: 800, color: '#4b2424', fontSize: '12.5px' }}>
          {p.value}
        </span>
      )
    },
    {
      field: 'remarks',
      headerName: 'Remarks',
      minWidth: 180,
      flex: 1,
      cellClass: 'mopsw-wrap-cell',
      cellRenderer: (p) => (
        <span style={{ fontWeight: 500, color: '#475569', fontSize: '12.5px', lineHeight: '1.5' }}>
          {p.value || '—'}
        </span>
      )
    }
  ], []);

  const columns = useMemo(() => {
    if (currentView.type === 'summary') return summaryColumns;
    return detailColumns;
  }, [currentView, summaryColumns, detailColumns]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  const subtitle = useMemo(() => (
    <>
      <span>As on date: <strong style={{ color: '#4b2424' }}>17-07-2026</strong></span>
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
      pagination={currentView.type === 'detail'}
      themeClass="yp-pro-grid"
      brandColor="#4b2424"
      brandColorHover="#6b3535"
      accentColor="#f7f3f3"
      oddRowColor="#f8faf6"
      totalLabel="Total Notes"
    />
  );
}
