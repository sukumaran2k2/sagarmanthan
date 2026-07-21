import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ReportTable from '../../../components/ReportTable';

const COLUMN_STAGE_MAP = {
  "Draft Bill Prepared": 1,
  "DCN And Draft Bill Approved by Minister": 2,
  "Circulated for IMC": 3,
  "IMC comments received": 4,
  "DCN & Draft Bill prepared": 5,
  "DCN & draft bill Approved by Minister": 6,
  "Submitted for Legal Vetting": 7,
  "Legal Vetting to be Completed": 8,
  "Final DCN & draft bill Approved by Minister": 9,
  "Advance Copy to be Sent to PMO & Cab Sectt": 10,
  "Approved By Cabinet": 11,
  "Bill introduced in parliament": 12,
  "Bill Passed": 13,
  "Bill Notified": 14,
  "Completed": 15
};

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 1.1 - Wing-wise Bills/Pre-Constitutions Matrix' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);

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
        const response = await axios.get("http://localhost:3000/billwingwise-report");
        const rawRows = response.data?.rowData || [];
        const rawCols = response.data?.columnDefs || [];

        const mappedCols = rawCols.map(col => {
          if (col.field === 'wing_id') {
            return { ...col, hide: true };
          }
          if (col.field === 'Wing') {
            return {
              ...col,
              pinned: 'left',
              cellClass: 'text-left font-bold border-r border-slate-150',
              headerClass: 'border-r border-slate-150',
              cellRenderer: (p) => {
                const val = p.value;
                if (val && p.data && p.data.Wing !== 'Total') {
                  return (
                    <button
                      onClick={() => {
                        const wingId = p.data.wing_id;
                        setDrillDownPath(prev => [
                          ...prev,
                          {
                            type: 'division-summary',
                            wingId,
                            title: `Division-wise Summary - Wing: ${val}`
                          }
                        ]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0f417a',
                        fontWeight: 800,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '11px',
                        textAlign: 'left'
                      }}
                    >
                      {val}
                    </button>
                  );
                }
                return val || '';
              }
            };
          }
          
          const stageId = COLUMN_STAGE_MAP[col.field];
          if (stageId) {
            return {
              ...col,
              cellRenderer: (p) => {
                const val = p.value;
                if (val > 0 && p.data && p.data.Wing !== 'Total') {
                  return (
                    <button
                      onClick={() => {
                        const wingId = p.data.wing_id;
                        const wingName = p.data.Wing;
                        setDrillDownPath(prev => [
                          ...prev,
                          {
                            type: 'detail-wing',
                            wingId,
                            stageId,
                            title: `Bills - Wing: ${wingName} | Stage: ${col.field}`
                          }
                        ]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0f417a',
                        fontWeight: 800,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      {val}
                    </button>
                  );
                }
                return val > 0 ? val : <span style={{ color: '#94a3b8', fontWeight: 650 }}>—</span>;
              }
            };
          }
          return col;
        });

        setColumnDefs(mappedCols);
        setData(rawRows.map((r, idx) => ({ ...r, 'S No': idx + 1 })));

      } else if (currentView.type === 'division-summary') {
        const response = await axios.get(`http://localhost:3000/billdivisionwise-report/${currentView.wingId}`);
        const rawRows = response.data?.rowData || [];
        const rawCols = response.data?.columnDefs || [];

        const mappedCols = rawCols.map(col => {
          if (col.field === 'division_id') {
            return { ...col, hide: true };
          }
          if (col.field === 'Division') {
            return {
              ...col,
              pinned: 'left',
              cellClass: 'text-left font-bold border-r border-slate-150',
              headerClass: 'border-r border-slate-150'
            };
          }

          const stageId = COLUMN_STAGE_MAP[col.field];
          if (stageId) {
            return {
              ...col,
              cellRenderer: (p) => {
                const val = p.value;
                if (val > 0 && p.data && p.data.Division !== 'Total') {
                  return (
                    <button
                      onClick={() => {
                        const divisionId = p.data.division_id;
                        const divisionName = p.data.Division;
                        setDrillDownPath(prev => [
                          ...prev,
                          {
                            type: 'detail-division',
                            divisionId,
                            stageId,
                            title: `Bills - Division: ${divisionName} | Stage: ${col.field}`
                          }
                        ]);
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0f417a',
                        fontWeight: 800,
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      {val}
                    </button>
                  );
                }
                return val > 0 ? val : <span style={{ color: '#94a3b8', fontWeight: 650 }}>—</span>;
              }
            };
          }
          return col;
        });

        setColumnDefs(mappedCols);
        setData(rawRows.map((r, idx) => ({ ...r, 'S No': idx + 1 })));

      } else if (currentView.type === 'detail-wing') {
        const response = await axios.get(`http://localhost:3000/getbill-wingwise/${currentView.wingId}/${currentView.stageId}`);
        const rawRows = response.data?.rowData || [];
        const rawCols = response.data?.columnDefs || [];

        setColumnDefs(rawCols);
        setData(rawRows.map((r, idx) => ({ ...r, 'S No': idx + 1 })));

      } else if (currentView.type === 'detail-division') {
        const response = await axios.get(`http://localhost:3000/getbill-divisionwise/${currentView.divisionId}/${currentView.stageId}`);
        const rawRows = response.data?.rowData || [];
        const rawCols = response.data?.columnDefs || [];

        setColumnDefs(rawCols);
        setData(rawRows.map((r, idx) => ({ ...r, 'S No': idx + 1 })));
      }
    } catch (err) {
      console.error("Error loading Bills reports:", err);
      setData([]);
      setColumnDefs([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  return (
    <div className="space-y-6">
      <ReportTable
        rawData={data}
        viewData={data}
        columns={columnDefs}
        loading={loading}
        title={currentView.title}
        showBackButton={drillDownPath.length > 1}
        onBack={handleBack}
      />
    </div>
  );
}
