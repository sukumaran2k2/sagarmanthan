import React, { useState, useMemo, useRef, useEffect } from 'react';
import Table from '../../../components/table';
import { Search, Edit, Eye, ChevronDown, BarChart3, List } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import ExportDropdown from '../../../components/ExportDropdown';

export default function DataList({
  rowData = [],
  loading = false,
  onEdit,
  onRefresh,
  triggerNotification
}) {
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table or chart
  const [gridApi, setGridApi] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    ministry: true,
    fileNumber: true,
    status: true
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

  // Derive Status Options
  const statusOptions = useMemo(() => {
    const set = new Set();
    rowData.forEach(item => {
      const st = item.stage_name || (item.reply_furnished_date ? 'Reply Furnished' : item.comments_rec_date ? 'Comments Received' : 'Pending');
      set.add(st);
    });
    return Array.from(set).map(s => ({ value: s, label: s }));
  }, [rowData]);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const isCompleted = !!item.reply_furnished_date;
      const matchesCategory = activeCategory === 'completed' ? isCompleted : !isCompleted;

      if (!matchesCategory) return false;

      const matchesMinistry = selectedMinistry
        ? item.ministry_name === selectedMinistry
        : true;

      const statusText = item.stage_name || (item.reply_furnished_date ? 'Reply Furnished' : item.comments_rec_date ? 'Comments Received' : 'Pending');
      const matchesStatus = selectedStatus
        ? statusText === selectedStatus
        : true;

      return matchesMinistry && matchesStatus;
    });
  }, [rowData, selectedMinistry, selectedStatus, activeCategory]);

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
      flex: 2,
      minWidth: 260,
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
      flex: 1.5,
      minWidth: 160,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.ministry
    },
    {
      field: 'eoffice_file_number',
      headerName: 'E-Office File No',
      flex: 1.2,
      minWidth: 140,
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-slate-600 dark:text-slate-400 font-mono text-xs',
      hide: !visibleCols.fileNumber
    },
    {
      field: 'stage_name',
      headerName: 'Status',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'text-slate-700 dark:text-slate-300 font-bold text-center',
      valueGetter: (params) => {
        const item = params.data;
        return item.stage_name || (item.reply_furnished_date ? 'Reply Furnished' : item.comments_rec_date ? 'Comments Received' : 'Pending');
      },
      hide: !visibleCols.status
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
  ], [onEdit, visibleCols]);

  const activeCount = useMemo(() => rowData.filter(r => !r.reply_furnished_date).length, [rowData]);
  const completedCount = useMemo(() => rowData.filter(r => !!r.reply_furnished_date).length, [rowData]);

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
      
      {/* Category Tabs: Active vs Completed */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveCategory('active')}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeCategory === 'active'
                ? 'bg-white dark:bg-slate-700 text-[#0f417a] dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Active Cabinet Notes</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeCategory === 'active' ? 'bg-[#0f417a]/10 text-[#0f417a] dark:bg-blue-400/20 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {activeCount}
            </span>
          </button>
          <button
            onClick={() => setActiveCategory('completed')}
            className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeCategory === 'completed'
                ? 'bg-white dark:bg-slate-700 text-[#0f417a] dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>Completed Cabinet Notes</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
              activeCategory === 'completed' ? 'bg-[#0f417a]/10 text-[#0f417a] dark:bg-blue-400/20 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {completedCount}
            </span>
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-[#0f417a] dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <List className="w-4 h-4" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition ${
              viewMode === 'chart' ? 'bg-white dark:bg-slate-700 text-[#0f417a] dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Visual Analytics</span>
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <Table
          rowData={filteredData}
          columnDefs={columnDefs}
          loading={loading}
          pagination={true}
          paginationPageSize={10}
          onGridReady={(params) => setGridApi(params.api)}
          filterOptions={[
            {
              id: 'ministry',
              label: 'Name Of The Ministry',
              options: ministryOptions,
              value: selectedMinistry,
              onChange: setSelectedMinistry
            },
            {
              id: 'status',
              label: 'Status',
              options: statusOptions,
              value: selectedStatus,
              onChange: setSelectedStatus
            }
          ]}
          headerRightSlot={
            <div className="flex items-center space-x-2">
              <ExportDropdown onExport={handleExport} />
              
              {/* Column Selector */}
              <div className="relative" ref={colDropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 transition"
                >
                  <span>Select Columns</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 p-2 text-xs space-y-1 animate-fade-in">
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleCols.subject}
                        onChange={(e) => setVisibleCols({ ...visibleCols, subject: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>Subject</span>
                    </label>
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleCols.ministry}
                        onChange={(e) => setVisibleCols({ ...visibleCols, ministry: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>Ministry</span>
                    </label>
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleCols.fileNumber}
                        onChange={(e) => setVisibleCols({ ...visibleCols, fileNumber: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>E-Office File No</span>
                    </label>
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={visibleCols.status}
                        onChange={(e) => setVisibleCols({ ...visibleCols, status: e.target.checked })}
                        className="rounded text-[#0f417a]"
                      />
                      <span>Status</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          }
        />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
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
  );
}
