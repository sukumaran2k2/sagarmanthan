import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Table from '../../../components/table';
import { Search, X, Edit, Eye, Download, FileText, ChevronDown, BarChart3, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import ExportDropdown from '../../../components/ExportDropdown';

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
  const [viewMode, setViewMode] = useState('table'); // table or chart switching
  const [gridApi, setGridApi] = useState(null); // Ag Grid API reference
  const [dropdownOpen, setDropdownOpen] = useState(false); // Visibility checklist dropdown
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    wing: true,
    division: true,
    status: true
  });

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

  // Category state: 'active' or 'completed'
  const [activeCategory, setActiveCategory] = useState('active');

  // Document Modal state
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [activeNote, setActiveNote] = useState(null);
  const [noteDocs, setNoteDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const fetchNoteDocs = async (noteId) => {
    console.log("fetchNoteDocs called with noteId:", noteId);
    setLoadingDocs(true);
    try {
      const res = await axios.get(`http://localhost:3000/mopsw-document/${noteId}`);
      console.log("Documents fetched response for noteId:", noteId, res.data);
      setNoteDocs(res.data || []);
    } catch (err) {
      console.error("Error loading note documents:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleOpenDownloadModal = (note) => {
    console.log("Opening download modal, active note data:", note);
    setActiveNote(note);
    setDocModalOpen(true);
    // Use notesId (notes.cabinet_notes_mopsw_id)
    fetchNoteDocs(note.cabinet_notes_mopsw_id);
  };

  // Derive Wing and Division Options
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

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const isCompleted = !!item.completed_date;
      const matchesCategory = activeCategory === 'completed' ? isCompleted : !isCompleted;

      if (!matchesCategory) return false;

      const matchesWing = selectedWing
        ? String(item.wing) === String(selectedWing)
        : true;

      const matchesDivision = selectedDivision
        ? String(item.division) === String(selectedDivision)
        : true;

      return matchesWing && matchesDivision;
    });
  }, [rowData, selectedWing, selectedDivision, activeCategory]);

  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const w = item.wing_name || 'Unknown';
      counts[w] = (counts[w] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'Active Notes': counts[key]
    }));
  }, [filteredData]);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

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
      minWidth: 220,
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
      minWidth: 130,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.wing
    },
    {
      field: 'division_name',
      headerName: 'Division',
      flex: 1.2,
      minWidth: 130,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.division
    },
    {
      field: 'mopsw_stage_name',
      headerName: 'Status',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'text-slate-700 dark:text-slate-300 font-bold text-center',
      hide: !visibleCols.status
    },
    {
      headerName: 'Documents',
      flex: 1,
      minWidth: 90,
      cellClass: 'text-center',
      cellRenderer: (params) => {
        const note = params.data;
        console.log("Documents cellRenderer - note details:", note?.cabinet_notes_mopsw_id, "doc_count:", note?.doc_count);
        const hasDocs = note && note.doc_count > 0;
        return (
          <div className="flex items-center justify-center space-x-2">
            {hasDocs ? (
              <button
                onClick={() => handleOpenDownloadModal(note)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
                title="View Documents"
              >
                <Eye className="h-4.5 w-4.5" />
              </button>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-600 font-medium">-</span>
            )}
          </div>
        );
      }
    },
    {
      headerName: 'Update',
      minWidth: 95,
      flex: 0.5,
      cellClass: 'text-center',
      cellRenderer: (params) => {
        const note = params.data;
        return (
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
            title="Update Note"
          >
            <Edit className="h-4 w-4" />
          </button>
        );
      }
    }
  ], [onEdit, activeCategory, visibleCols, handleOpenDownloadModal]);

  const activeCount = useMemo(() => rowData.filter(r => !r.completed_date).length, [rowData]);
  const completedCount = useMemo(() => rowData.filter(r => !!r.completed_date).length, [rowData]);

  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Cabinet_Notes_MoPSW_Register_export.csv`
        });
        if (triggerNotification) {
          triggerNotification(`Register data exported to Excel (CSV) successfully!`);
        }
      } else {
        alert("Grid is not ready for export yet.");
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`);
      }
      const printWindow = window.open('', '_blank');
      const title = 'Cabinet Notes MoPSW Register';

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName && !col.hide && col.headerName !== 'Documents' && col.headerName !== 'Update') {
          headersHtml += `<th style="border:1px solid #0f417a; padding:10px 14px; text-align:left; background:#0f417a; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredData.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
        rowsHtml += `<tr style="background:${bg}">`;
        columnDefs.forEach(col => {
          if (col.headerName && !col.hide && col.headerName !== 'Documents' && col.headerName !== 'Update') {
            let val = '';
            if (col.headerName === 'S.No') val = i + 1;
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
            ? 'border-[#0f417a] text-[#0f417a] dark:text-blue-400 dark:border-blue-400'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Active Notes ({activeCount})
        </button>
        <button
          onClick={() => setActiveCategory('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'completed'
            ? 'border-[#0f417a] text-[#0f417a] dark:text-blue-400 dark:border-blue-400'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Completed Notes ({completedCount})
        </button>
      </div>

      {/* Main Ag Grid Table & Filters */}
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

            {/* Clear Button */}
            {(selectedWing || selectedDivision) && (
              <button
                onClick={() => { setSelectedWing(''); setSelectedDivision(''); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
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

            {/* Toggle Switch Button Pair */}
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
                  <Bar dataKey="Active Notes" fill="#0f417a" radius={[6, 6, 0, 0]}>
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

        {/* Bottom left export options */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
          <ExportDropdown
            onExportExcel={() => handleExport('Excel')}
            onExportPdf={() => handleExport('PDF')}
            color="#0f417a"
            hoverColor="#1e5ea8"
          />
          {viewMode === 'table' && (
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Notes: {filteredData.length}
            </div>
          )}
        </div>
      </div>

      {/* Document Management Modal */}
      {docModalOpen && activeNote && createPortal(
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-xl overflow-hidden">
            <div className="bg-[#0f417a] text-white px-5 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider font-display">
                  View Cabinet Note Documents
                </h3>
                <p className="text-[10px] text-blue-200 font-semibold truncate max-w-[320px] mt-0.5">{activeNote.subject}</p>
              </div>
              <button
                onClick={() => setDocModalOpen(false)}
                className="text-white hover:bg-white/10 p-1 rounded-lg transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Submitted Documents</h4>
              {loadingDocs ? (
                <div className="text-center py-4 text-xs font-bold text-slate-500">Loading files...</div>
              ) : noteDocs.length === 0 ? (
                <div className="text-center py-4 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl">No files uploaded yet.</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {noteDocs.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border border-slate-150 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-xs">
                      <div className="flex-1 min-w-0 pr-3">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={doc.cabinet_notes_mopsw_document}>
                          {doc.cabinet_notes_mopsw_document}
                        </p>
                      </div>
                      <a
                        href={`http://localhost:3000/cabinet_notes_mopsw/download/${activeNote.cabinet_notes_mopsw_id}?file=${encodeURIComponent(doc.cabinet_notes_mopsw_document)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 rounded-lg text-[10px] font-black uppercase transition cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
