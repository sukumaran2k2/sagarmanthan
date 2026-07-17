import React, { useState, useMemo, useRef, useEffect } from 'react';
import Table from '../../../components/Table';
import { Search, X, Edit, BarChart3, List, ChevronDown, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import ExportButtons from '../../../components/ExportButtons';

export default function DataList({
  rowData = [],
  loading,
  onEdit,
  onAddClick,
  wings = [],
  divisions = [],
  triggerNotification
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWing, setSelectedWing] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table or chart view
  const [gridApi, setGridApi] = useState(null); // Ag Grid API

  // Column visibility states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    wing: true,
    division: true,
    appointmentType: true,
    status: true,
    numResources: true
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

  const wingOptions = useMemo(() => {
    return wings.map(w => ({
      value: w.wing_name,
      label: w.wing_name
    }));
  }, [wings]);

  const divisionOptions = useMemo(() => {
    return divisions.map(d => ({
      value: d.division_name,
      label: d.division_name
    }));
  }, [divisions]);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        (item.wing || '').toLowerCase().includes(search) ||
        (item.division || '').toLowerCase().includes(search) ||
        (item.status || '').toLowerCase().includes(search);

      const matchesWing = selectedWing ? (item.wing || '') === selectedWing : true;
      const matchesDivision = selectedDivision ? (item.division || '') === selectedDivision : true;

      return matchesSearch && matchesWing && matchesDivision;
    }).map((item, index) => ({
      ...item,
      sNo: index + 1
    }));
  }, [rowData, searchTerm, selectedWing, selectedDivision]);

  // Group data by wing for the chart
  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const w = item.wing || 'Unknown';
      counts[w] = (counts[w] || 0) + Number(item.numResources || 0);
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'Consultants Engaged': counts[key]
    }));
  }, [filteredData]);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Consultant_Appointment_Register_export.csv`
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
      const title = 'Consultant Appointment - Data List';

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName && col.headerName !== 'Action') {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredData.forEach((row, rowIndex) => {
        rowsHtml += '<tr>';
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Action') {
            const val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border: 1px solid #e2e8f0; padding: 8px; font-size: 11px;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 20px; }
              h1 { font-size: 18px; margin-bottom: 5px; color: #0f417a; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Generated on: ${new Date().toLocaleDateString()}</p>
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

  const columnDefs = useMemo(() => [
    {
      field: 'sNo',
      headerName: 'S.No',
      minWidth: 95,
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center',
      headerClass: 'text-center',
      pinned: 'left'
    },
    {
      field: 'wing',
      headerName: 'Wing',
      flex: 1.5,
      minWidth: 150,
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
      hide: !visibleCols.wing,
      pinned: 'left'
    },
    {
      field: 'division',
      headerName: 'Division',
      flex: 1.2,
      minWidth: 120,
      cellClass: 'text-slate-700 dark:text-slate-350',
      hide: !visibleCols.division
    },
    {
      field: 'appointmentType',
      headerName: 'Appointment Type',
      flex: 1.2,
      minWidth: 130,
      cellClass: 'text-slate-600 dark:text-slate-400',
      hide: !visibleCols.appointmentType
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 2,
      minWidth: 200,
      cellClass: 'font-semibold text-blue-700 dark:text-blue-400',
      hide: !visibleCols.status
    },
    {
      field: 'numResources',
      headerName: 'Number of Resources',
      flex: 1,
      minWidth: 140,
      cellClass: 'text-center font-bold text-slate-800 dark:text-slate-200',
      headerClass: 'text-center',
      hide: !visibleCols.numResources
    },
    {
      headerName: 'Action',
      minWidth: 120,
      cellRenderer: (params) => {
        const row = params.data;
        return (
          <div className="flex items-center justify-center w-full h-full py-1">
            <button
              onClick={() => onEdit(row)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[#0f417a] dark:text-blue-400 transition cursor-pointer"
              title="Update"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [onEdit, visibleCols]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in relative">
      {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 font-display">Consultant Appointment Register</h3>
          <p className="text-xs text-slate-500 font-medium">Tracking engagement statuses of consultants.</p>
        </div>
        <button
          onClick={onAddClick}
          className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Consultant</span>
        </button>
      </div> */}

      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          <div className="relative">
            <select
              value={selectedWing}
              onChange={(e) => setSelectedWing(e.target.value)}
              className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[120px]"
            >
              <option value="">All Wings</option>
              {wingOptions.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={selectedDivision}
              onChange={(e) => setSelectedDivision(e.target.value)}
              className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[130px]"
            >
              <option value="">All Divisions</option>
              {divisionOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="relative min-w-[160px] max-w-xs flex-1">
            <input
              type="text"
              placeholder="Search Wing, Division or Status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {(selectedWing || selectedDivision) && (
            <button
              onClick={() => { setSelectedWing(''); setSelectedDivision(''); }}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          {viewMode === 'table' && (
            <div className="relative" ref={colDropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
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
                      <span>{col === 'appointmentType' ? 'Appointment Type' : col === 'numResources' ? 'Num Resources' : col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
            <button
              onClick={() => setViewMode('chart')}
              className={`p-1.5 rounded transition ${viewMode === 'chart' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
              title="Chart View"
            >
              <BarChart3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded transition ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow text-[#0f417a] dark:text-blue-400' : 'text-slate-400 hover:text-slate-700'}`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            enableExport={false}
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{
              minWidth: 90,
              filter: true,
              sortable: true,
              resizable: true
            }}
          />
        </div>
      ) : (
        <div className="w-full h-[350px] p-4 flex items-center justify-center bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                <Tooltip cursor={{ fill: 'rgba(15, 65, 122, 0.05)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Consultants Engaged" fill="#0f417a" radius={[6, 6, 0, 0]}>
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

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <ExportButtons
          onExportExcel={() => handleExport('Excel')}
          onExportPdf={() => handleExport('PDF')}
        />
        {viewMode === 'table' && (
          <div className="text-xs font-bold text-slate-550 uppercase tracking-wider">
            Total Rows: {filteredData.length}
          </div>
        )}
      </div>
    </div>
  );
}
