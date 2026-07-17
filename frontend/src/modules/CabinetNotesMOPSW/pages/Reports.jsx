import React, { useState, useEffect, useMemo } from 'react';
import Table from '../../../components/Table';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';

const STAGES = [
  { id: 1, label: 'Preliminary DCN Prepared', key: 'prep' },
  { id: 2, label: 'Preliminary DCN Approved by Minister', key: 'appMin' },
  { id: 3, label: 'Circulated for IMC', key: 'circIMC' },
  { id: 4, label: 'IMC Comments Received', key: 'imcRec' },
  { id: 5, label: 'Final DCN to be Prepared', key: 'prepFinal' },
  { id: 6, label: 'Final DCN Approved by Minister', key: 'appFinal' },
  { id: 7, label: 'Has Dcm been approved?', key: 'appDcm' },
  { id: 8, label: 'Advance Copy Sent to PMO & Cab', key: 'advPMO' },
  { id: 9, label: 'Approved by Cabinet', key: 'appCab' },
  { id: 10, label: 'On Hold', key: 'hold' },
  { id: 11, label: 'Completed', key: 'comp' }
];

export default function Reports({ triggerNotification }) {
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'

  useEffect(() => {
    setLoading(true);
    axios.get("http://localhost:3000/cabinet-mopsw-all")
      .then(res => {
        setRowData(res.data || []);
      })
      .catch(err => console.error("Error loading Cabinet Notes MoPSW reports:", err))
      .finally(() => setLoading(false));
  }, []);

  // Aggregate counts by Wing
  const reportRows = useMemo(() => {
    const wingsMap = {};
    
    // Initialize wings
    rowData.forEach(note => {
      if (note.wing_name && !wingsMap[note.wing_name]) {
        wingsMap[note.wing_name] = {
          wing: note.wing_name,
          prep: 0,
          appMin: 0,
          circIMC: 0,
          imcRec: 0,
          prepFinal: 0,
          appFinal: 0,
          appDcm: 0,
          advPMO: 0,
          appCab: 0,
          hold: 0,
          comp: 0,
          total: 0
        };
      }
    });

    // Populate counts
    rowData.forEach(note => {
      const wing = note.wing_name || 'Unknown';
      if (!wingsMap[wing]) {
        wingsMap[wing] = {
          wing, prep: 0, appMin: 0, circIMC: 0, imcRec: 0, prepFinal: 0, appFinal: 0, appDcm: 0, advPMO: 0, appCab: 0, hold: 0, comp: 0, total: 0
        };
      }

      wingsMap[wing].total += 1;
      
      if (note.pre_dcn_prepared === '1' || note.pre_dcn_prepared === true) wingsMap[wing].prep += 1;
      if (note.pre_dcn_approved === '1' || note.pre_dcn_approved === true || note.pre_dcn__approved === '1' || note.pre_dcn__approved === true) wingsMap[wing].appMin += 1;
      if (note.circulated_for_imc === '1' || note.circulated_for_imc === true || note.cirucalted_for_imc === '1' || note.cirucalted_for_imc === true) wingsMap[wing].circIMC += 1;
      if (note.imc_comments_rec === '1' || note.imc_comments_rec === true) wingsMap[wing].imcRec += 1;
      if (note.final_dcn_prepared === '1' || note.final_dcn_prepared === true) wingsMap[wing].prepFinal += 1;
      if (note.final_dcn_approved === '1' || note.final_dcn_approved === true) wingsMap[wing].appFinal += 1;
      if (note.dcm_been_approved === '1' || note.dcm_been_approved === true || note.dcmbeen_approved === '1' || note.dcmbeen_approved === true) wingsMap[wing].appDcm += 1;
      if (note.advance_copy_sent_to_pmo === '1' || note.advance_copy_sent_to_pmo === true) wingsMap[wing].advPMO += 1;
      if (note.cabinet_approved === '1' || note.cabinet_approved === true) wingsMap[wing].appCab += 1;
      if (note.on_hold === '1' || note.on_hold === true) wingsMap[wing].hold += 1;
      if (note.completed === '1' || note.completed === true) wingsMap[wing].comp += 1;
    });

    return Object.values(wingsMap);
  }, [rowData]);

  // Aggregate totals for chart view
  const chartData = useMemo(() => {
    return STAGES.map(stage => {
      const count = rowData.filter(note => {
        if (stage.id === 1) return note.pre_dcn_prepared === '1' || note.pre_dcn_prepared === true;
        if (stage.id === 2) return note.pre_dcn_approved === '1' || note.pre_dcn_approved === true || note.pre_dcn__approved === '1' || note.pre_dcn__approved === true;
        if (stage.id === 3) return note.circulated_for_imc === '1' || note.circulated_for_imc === true || note.cirucalted_for_imc === '1' || note.cirucalted_for_imc === true;
        if (stage.id === 4) return note.imc_comments_rec === '1' || note.imc_comments_rec === true;
        if (stage.id === 5) return note.final_dcn_prepared === '1' || note.final_dcn_prepared === true;
        if (stage.id === 6) return note.final_dcn_approved === '1' || note.final_dcn_approved === true;
        if (stage.id === 7) return note.dcm_been_approved === '1' || note.dcm_been_approved === true || note.dcmbeen_approved === '1' || note.dcmbeen_approved === true;
        if (stage.id === 8) return note.advance_copy_sent_to_pmo === '1' || note.advance_copy_sent_to_pmo === true;
        if (stage.id === 9) return note.cabinet_approved === '1' || note.cabinet_approved === true;
        if (stage.id === 10) return note.on_hold === '1' || note.on_hold === true;
        if (stage.id === 11) return note.completed === '1' || note.completed === true;
        return false;
      }).length;

      return {
        name: stage.label,
        count
      };
    });
  }, [rowData]);

  const columnDefs = useMemo(() => [
    { field: 'wing', headerName: 'Wing Name', flex: 1.5, minWidth: 150, cellClass: 'text-left font-bold text-slate-800 dark:text-slate-200' },
    { field: 'prep', headerName: 'Draft Prep', minWidth: 100 },
    { field: 'appMin', headerName: 'App. Min', minWidth: 100 },
    { field: 'circIMC', headerName: 'Circ. IMC', minWidth: 100 },
    { field: 'imcRec', headerName: 'IMC Rec', minWidth: 100 },
    { field: 'prepFinal', headerName: 'Prep Final', minWidth: 100 },
    { field: 'appFinal', headerName: 'App. Final', minWidth: 100 },
    { field: 'appDcm', headerName: 'Approved DCM', minWidth: 120 },
    { field: 'advPMO', headerName: 'Adv. PMO', minWidth: 100 },
    { field: 'appCab', headerName: 'Approved Cab', minWidth: 120 },
    { field: 'hold', headerName: 'Hold', minWidth: 80 },
    { field: 'comp', headerName: 'Completed', minWidth: 100 },
    { field: 'total', headerName: 'Total Notes', minWidth: 110, cellClass: 'font-black text-blue-700 dark:text-blue-400' }
  ], []);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e', '#64748b'];

  return (
    <div className="space-y-6">
      
      {/* Title / Switcher row */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider">
          {viewMode === 'table' ? "Wing-wise Stages Matrix" : "Cabinet Notes Stages Distribution Chart"}
        </h3>
        
        <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Table View
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${viewMode === 'chart' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
          >
            Visual Chart
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <Table
            rowData={reportRows}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={true}
            exportFileName="Cabinet_Notes_MoPSW_Reports"
            defaultColDef={{
              minWidth: 90,
              filter: true,
              sortable: true,
              resizable: true
            }}
          />
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-[450px] flex flex-col justify-between">
          <div className="flex-1 w-full h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', color: '#fff', fontSize: '11px', border: 'none' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center text-[10px] text-slate-400 font-bold mt-4">
            Total number of cabinet notes categorized under each stage of the approval pipeline.
          </div>
        </div>
      )}

      {/* Footer copyright */}
      <div className="text-center text-[10px] text-slate-400 font-semibold py-4 border-t border-slate-200 dark:border-slate-850">
        Copyright © 2025 Ministry of Ports, Shipping and Waterways, Government of India, All Rights Reserved
      </div>
    </div>
  );
}
