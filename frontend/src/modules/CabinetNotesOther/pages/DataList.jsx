import React, { useState, useMemo, useRef, useEffect } from 'react';
import Table from '../../../components/table';
import { Search, Edit, Eye, ChevronDown, BarChart3, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';

export default function DataList({
  rowData = [],
  loading = false,
  onEdit,
  onRefresh,
  triggerNotification
}) {
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table or chart
  const [gridApi, setGridApi] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    ministry: true,
    fileNumber: true,
    stage: true
  });

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

  // Derive Ministry Options
  const ministryOptions = useMemo(() => {
    const set = new Set();
    rowData.forEach(item => {
      if (item.ministry_name) set.add(item.ministry_name);
    });
    return Array.from(set).map(m => ({ value: m, label: m }));
  }, [rowData]);

  // Derive Stage Options
  const stageOptions = useMemo(() => {
    const set = new Set();
    rowData.forEach(item => {
      const isCompleted = item.stage_name?.includes('Reply furnished to other ministry') || !!item.reply_furnished_date;
      if (activeCategory === 'active' && isCompleted) return;
      if (activeCategory === 'completed' && !isCompleted) return;
      const st = item.stage_name || (item.reply_furnished_date ? 'Reply Furnished' : item.comments_rec_date ? 'Comments Received' : 'Pending');
      set.add(st);
    });
    return Array.from(set).map(s => ({ value: s, label: s }));
  }, [rowData, activeCategory]);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const isCompleted = item.stage_name?.includes('Reply furnished to other ministry') || !!item.reply_furnished_date;
      const matchesCategory = activeCategory === 'completed' ? isCompleted : !isCompleted;

      if (!matchesCategory) return false;

      const matchesMinistry = selectedMinistry
        ? item.ministry_name === selectedMinistry
        : true;

      const stageText = item.stage_name || (item.reply_furnished_date ? 'Reply Furnished' : item.comments_rec_date ? 'Comments Received' : 'Pending');
      const matchesStage = selectedStage
        ? stageText === selectedStage
        : true;

      return matchesMinistry && matchesStage;
    });
  }, [rowData, selectedMinistry, selectedStage, activeCategory]);

  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const m = item.ministry_name || 'Unknown';
      counts[m] = (counts[m] || 0) + 1;
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
      width: 100,
      minWidth: 90,
      pinned: 'left',
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center border-r border-slate-100 dark:border-slate-800',
      headerClass: 'text-center border-r border-slate-100 dark:border-slate-800'
    },
    {
      field: 'subject',
      headerName: 'Name of the Subject',
      width: 250,
      minWidth: 100,
      maxWidth: 300,
      pinned: 'left',
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-left font-semibold text-slate-800 dark:text-slate-200 whitespace-normal leading-normal py-2 border-r border-slate-150 dark:border-slate-800',
      headerClass: 'border-r border-slate-150 dark:border-slate-800',
      autoHeight: true,
      hide: !visibleCols.subject
    },
    {
      field: 'ministry_name',
      headerName: 'Name of the Ministry',
      // flex: 1.5,
      minWidth: 160,
      width: 250,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.ministry
    },
    {
      field: 'eoffice_file_number',
      headerName: 'E-Office File No',
      // flex: 1.2,
      minWidth: 140,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-600 dark:text-slate-400 font-mono text-xs',
      hide: !visibleCols.fileNumber
    },
    {
      field: 'stage_name',
      headerName: 'Stage',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'font-bold text-center flex items-center justify-center',
      valueGetter: (params) => {
        const item = params.data;
        return item.stage_name || (item.reply_furnished_date ? 'Reply furnished to other ministry' : item.comments_rec_date ? 'Comments Received' : 'Pending');
      },
      cellRenderer: (params) => {
        const color = activeCategory === 'completed' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500';
        return <span className={color}>{params.value}</span>;
      },
      hide: !visibleCols.stage
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
  ], [onEdit, visibleCols, activeCategory]);

  const activeCount = useMemo(() => rowData.filter(r => !(r.stage_name?.includes('Reply furnished to other ministry') || !!r.reply_furnished_date)).length, [rowData]);
  const completedCount = useMemo(() => rowData.filter(r => (r.stage_name?.includes('Reply furnished to other ministry') || !!r.reply_furnished_date)).length, [rowData]);

  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Cabinet_Notes_Other_Ministry_Register_export.csv`
        });
        if (triggerNotification) {
          triggerNotification(`Register data exported to Excel (CSV) successfully!`);
        }
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`);
      }
      const printWindow = window.open('', '_blank');
      const title = 'Cabinet Notes Other Ministry Register';

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName && !col.hide && col.headerName !== 'Update') {
          headersHtml += `<th style="border:1px solid #0f417a; padding:10px 14px; text-align:left; background:#0f417a; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredData.forEach((row, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f8fafc';
        rowsHtml += `<tr style="background:${bg}">`;
        columnDefs.forEach(col => {
          if (col.headerName && !col.hide && col.headerName !== 'Update') {
            let val = '-';
            if (col.field) val = row[col.field] || '-';
            else if (col.valueGetter) val = col.valueGetter({ data: row, node: { rowIndex: i } });
            rowsHtml += `<td style="border:1px solid #cbd5e1; padding:8px 12px; font-size:11px; color:#334155;">${val}</td>`;
          }
        });
        rowsHtml += `</tr>`;
      });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; }
            h2 { color: #0f417a; font-size: 18px; margin-bottom: 4px; text-transform: uppercase; }
            p { color: #64748b; font-size: 11px; margin-top: 0; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            @page { size: landscape; margin: 10mm; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <p>Generated on ${new Date().toLocaleDateString('en-GB')} | Total Records: ${filteredData.length}</p>
          <table>
            <thead><tr>${headersHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">

      {/* Category selector tabs matching CabinetNotesMOPSW */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none">
        <button
          onClick={() => setActiveCategory('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'active'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          ACTIVE NOTES ({activeCount})
        </button>
        <button
          onClick={() => setActiveCategory('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'completed'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          COMPLETED NOTES ({completedCount})
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Ministry Dropdown */}
            <div className="w-56 relative">
              <select
                value={selectedMinistry}
                onChange={(e) => setSelectedMinistry(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200 cursor-pointer"
              >
                <option value="">Show all Ministries</option>
                {ministryOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
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
            {(selectedMinistry || selectedStage) && (
              <button
                onClick={() => { setSelectedMinistry(''); setSelectedStage(''); }}
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
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 p-2 text-xs space-y-1 animate-fade-in">
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.subject}
                        onChange={(e) => setVisibleCols({ ...visibleCols, subject: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>Subject</span>
                    </label>
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.ministry}
                        onChange={(e) => setVisibleCols({ ...visibleCols, ministry: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>Ministry</span>
                    </label>
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.fileNumber}
                        onChange={(e) => setVisibleCols({ ...visibleCols, fileNumber: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>E-Office File No</span>
                    </label>
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded cursor-pointer text-slate-700 dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.stage}
                        onChange={(e) => setVisibleCols({ ...visibleCols, stage: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>Stage</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Chart / Table Toggle Icons */}
            <div className="flex items-center bg-slate-50 dark:bg-slate-955 p-1 border border-slate-200 dark:border-slate-850 rounded-xl space-x-1">
              <button
                onClick={() => setViewMode('chart')}
                title="Visual Analytics"
                className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'chart'
                  ? 'bg-white dark:bg-slate-800 text-[#0f417a] dark:text-blue-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Table View"
                className={`p-2 rounded-lg transition cursor-pointer ${viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-[#0f417a] dark:text-blue-400 shadow-2xs'
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                  }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* View Mode Content */}
        {viewMode === 'table' ? (
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            onGridReady={(params) => setGridApi(params.api)}
          />
        ) : (
          <div className="pt-2">
            <h3 className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 tracking-wider mb-4">
              Ministry-wise Breakdown ({activeCategory === 'active' ? 'Active Notes' : 'Completed Notes'})
            </h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                  <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Active Notes" fill="#0f417a" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
