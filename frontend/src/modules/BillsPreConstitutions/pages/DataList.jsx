import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Table from '../../../components/table';
import { Search, X, Edit, Trash2, ChevronDown, BarChart3, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import ExportDropdown from '../../../components/ExportDropdown';

const STAGES = {
  1: 'Pre-Draft Bill Prepared',
  2: 'Pre-Draft Bill Approved',
  3: 'Circulated for IMC',
  4: 'IMC Comments Received',
  5: 'DCN Draft Prepared',
  6: 'DCN Draft Approved',
  7: 'Submitted for Legal Vetting',
  8: 'Legal Vetting Completed',
  9: 'Final DCN Approved',
  10: 'Advance Copy Sent',
  11: 'Approved by Cabinet',
  12: 'Introduced in Parliament',
  13: 'Bill Passed',
  14: 'Bill Notified',
  15: 'Completed'
};

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function DataList({
  rowData,
  loading,
  onEdit,
  onRefresh,
  triggerNotification,
  wings = [],
  divisions = []
}) {
  const [selectedWing, setSelectedWing] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table or chart switching
  const [gridApi, setGridApi] = useState(null); // Ag Grid API reference
  const [dropdownOpen, setDropdownOpen] = useState(false); // Visibility checklist dropdown
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    wing: true,
    subject: true,
    wing: true,
    division: true,
    stage: true
  });

  const [activeCategory, setActiveCategory] = useState('active');

  const activeUserId = useMemo(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const decoded = decodeToken(token);
      return decoded ? decoded.userID : null;
    }
    return null;
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const wingOptions = useMemo(() => {
    return wings.map(w => ({
      value: w.wing_id,
      label: w.wing_name
    }));
  }, [wings]);

  const divisionOptions = useMemo(() => {
    return divisions.map(d => ({
      value: d.division_id,
      label: d.division_name
    }));
  }, [divisions]);

  const getBillStageText = (item) => {
    if (item.completed_date) return STAGES[15];
    if (item.bill_notified_date) return STAGES[14];
    if (item.bill_passed_date) return STAGES[13];
    if (item.bill_introduced_in_parliament_date) return STAGES[12];
    if (item.approved_by_cabinet_date) return STAGES[11];
    if (item.advance_copy_date) return STAGES[10];
    if (item.final_dcn_approved_date) return STAGES[9];
    if (item.legal_vetting_completed_date) return STAGES[8];
    if (item.submited_legal_vetting_date) return STAGES[7];
    if (item.dcn_draft_bill_approved_date) return STAGES[6];
    if (item.dcn_draft_bill_prepared_date) return STAGES[5];
    if (item.imc_comments_rec_date) return STAGES[4];
    if (item.circulated_imc_date) return STAGES[3];
    if (item.pre_draft_bill_approved_date) return STAGES[2];
    if (item.pre_draft_bill_prepared_date) return STAGES[1];
    return 'Draft';
  };

  // Derive Stage Options
  const stageOptions = useMemo(() => {
    const set = new Set();
    rowData.forEach(item => {
      const isDisposed = !!item.bill_passed_date || !!item.bill_notified_date || !!item.completed_date;
      if (activeCategory === 'active' && isDisposed) return;
      if (activeCategory === 'disposed' && !isDisposed) return;
      const st = getBillStageText(item);
      set.add(st);
    });
    return Array.from(set).map(s => ({ value: s, label: s }));
  }, [rowData, activeCategory]);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const isDisposed = !!item.bill_passed_date || !!item.bill_notified_date || !!item.completed_date;
      if (activeCategory === 'active' && isDisposed) return false;
      if (activeCategory === 'disposed' && !isDisposed) return false;

      const matchesWing = selectedWing
        ? String(item.wing) === String(selectedWing)
        : true;

      const matchesDivision = selectedDivision
        ? String(item.division) === String(selectedDivision)
        : true;

      const matchesStage = selectedStage
        ? getBillStageText(item) === selectedStage
        : true;

      return matchesWing && matchesDivision && matchesStage;
    });
  }, [rowData, selectedWing, selectedDivision, selectedStage, activeCategory]);

  const activeCount = useMemo(() => rowData.filter(item => !(!!item.bill_passed_date || !!item.bill_notified_date || !!item.completed_date)).length, [rowData]);
  const disposedCount = useMemo(() => rowData.filter(item => (!!item.bill_passed_date || !!item.bill_notified_date || !!item.completed_date)).length, [rowData]);

  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const w = item.wing_name || 'Unknown';
      counts[w] = (counts[w] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'Bills': counts[key]
    }));
  }, [filteredData]);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleDelete = async (billId) => {
    if (!window.confirm("Are you sure you want to delete this Bill?")) return;
    try {
      await axios.delete(`http://localhost:3000/delete-bill/${billId}/${activeUserId || 1}`);
      triggerNotification("Bill deleted successfully!");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error deleting bill:", err);
      triggerNotification("Error deleting bill.");
    }
  };

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 90,
      minWidth: 90,
      maxWidth: 95,
      pinned: 'left',
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center border-r border-slate-100 dark:border-slate-800',
      headerClass: 'text-center border-r border-slate-100 dark:border-slate-800'
    },
    {
      field: 'subject',
      headerName: 'Name of the Subject',
      flex: 1,
      minWidth: 250,
      pinned: 'left',
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-left font-semibold text-slate-800 dark:text-slate-200 whitespace-normal leading-normal py-2 border-r border-slate-150 dark:border-slate-800',
      headerClass: 'border-r border-slate-150 dark:border-slate-800',
      autoHeight: true,
      hide: !visibleCols.subject
    },
    {
      field: 'wing_name',
      headerName: 'Wing',
      flex: 1.2,
      minWidth: 150,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.wing
    },
    {
      field: 'division_name',
      headerName: 'Division',
      flex: 1.2,
      minWidth: 150,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.division
    },
    {
      headerName: 'Stage',
      flex: 1.2,
      minWidth: 180,
      cellClass: 'font-bold text-center flex items-center justify-center',
      hide: !visibleCols.stage,
      cellRenderer: (params) => {
        const stageText = getBillStageText(params.data);
        const color = activeCategory === 'disposed' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500';
        return <span className={color}>{stageText}</span>;
      },
      valueGetter: (params) => getBillStageText(params.data)
    },
    {
      headerName: 'Actions',
      minWidth: 120,
      flex: 0.5,
      cellClass: 'text-center flex justify-center items-center',
      cellRenderer: (params) => {
        const bill = params.data;
        return (
          <button
            onClick={() => onEdit(bill)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
            title="Update Bill"
          >
            <Edit className="h-4.5 w-4.5" />
          </button>
        );
      }
    }
  ], [onEdit, visibleCols, activeUserId, activeCategory]);

  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Bills_PreConstitutions_Register.csv`
        });
        if (triggerNotification) {
          triggerNotification(`Register data exported to Excel successfully!`);
        }
      } else {
        alert("Grid is not ready for export yet.");
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`);
      }
      const printWindow = window.open('', '_blank');
      const title = 'Bills / Pre-Constitutions Act Register';

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName && !col.hide && col.headerName !== 'Actions') {
          headersHtml += `<th style="border:1px solid #0f417a; padding:10px 14px; text-align:left; background:#0f417a; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredData.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
        rowsHtml += `<tr style="background:${bg}">`;
        columnDefs.forEach(col => {
          if (col.headerName && !col.hide && col.headerName !== 'Actions') {
            let val = '';
            if (col.headerName === 'S.No') val = i + 1;
            else if (col.headerName === 'Status') val = getBillStatusText(row);
            else if (col.field) val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border:1px solid #e2e8f0; padding:8px 14px; font-size:12px; color:#334155;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; padding: 24px; }
              h1 { font-size: 18px; margin-bottom: 4px; color: #0f417a; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p style="font-size:11px; color:#64748b; margin:0 0 20px;">Generated on: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>${headersHtml}</tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">

      {/* Category selector tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none">
        <button
          onClick={() => setActiveCategory('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'active'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Active Bills ({activeCount})
        </button>
        <button
          onClick={() => setActiveCategory('disposed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'disposed'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Disposed Bills ({disposedCount})
        </button>
      </div>

      {/* Table & Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Wing Dropdown */}
            <div className="w-48 relative">
              <select
                value={selectedWing}
                onChange={(e) => setSelectedWing(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200 cursor-pointer"
              >
                <option value="">Show all Wings</option>
                {wingOptions.map(w => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </select>
            </div>

            {/* Division Dropdown */}
            <div className="w-48 relative">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200 cursor-pointer"
              >
                <option value="">Show all Divisions</option>
                {divisionOptions.map(d => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            {/* Stage Dropdown */}
            {activeCategory === 'active' && (
              <div className="w-48 relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Show all Stages</option>
                  {stageOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Clear Button */}
            {(selectedWing || selectedDivision || selectedStage) && (
              <button
                onClick={() => { setSelectedWing(''); setSelectedDivision(''); setSelectedStage(''); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 transition cursor-pointer"
              >
                <span className="h-3.5 w-3.5 text-center">✕</span>
                <span>Clear</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Column Visibility Dropdown */}
            {viewMode === 'table' && (
              <div className="relative" ref={colDropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition cursor-pointer flex items-center space-x-1.5 dark:text-slate-200"
                >
                  <span>Visibility</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                    {Object.keys(visibleCols).map(col => (
                      <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={visibleCols[col]}
                          onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                          className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{col}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Toggle View */}
            <div className="flex items-center border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-900">
              <button
                onClick={() => setViewMode('chart')}
                className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'chart' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
                title="Chart View"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'table' ? (
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[5, 10, 20, 50]}
            enableExport={false}
            onGridReady={(params) => setGridApi(params.api)}
            autoSizeStrategy={{
              type: 'fitGridWidth'
            }}
            defaultColDef={{
              minWidth: 100,
              filter: true,
              sortable: true,
              resizable: true,
              autoHeight: true,
              wrapHeaderText: true,
              autoHeaderHeight: true
            }}
          />
        ) : (
          <div className="w-full h-[350px] p-4 flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', fontSize: '11px' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Bills" fill="#0f417a" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm font-semibold text-slate-500">No data available for chart representation.</p>
            )}
          </div>
        )}

        {/* Bottom export bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <ExportDropdown
            onExportExcel={() => handleExport('Excel')}
            onExportPdf={() => handleExport('PDF')}
            color="#0f417a"
            hoverColor="#1e5ea8"
          />
          {viewMode === 'table' && (
            <div className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
              Total Bills: {filteredData.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
