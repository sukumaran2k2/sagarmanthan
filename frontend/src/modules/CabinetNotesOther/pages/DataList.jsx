import React, { useState, useMemo, useRef, useEffect } from 'react';
import Table from '../../../components/Table';
import { Search, Edit, Trash2, Eye, ChevronDown, BarChart3, List, X, Download, FileSpreadsheet, Copy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { fetchDropdownAllValues } from '../api';

export default function DataList({
  rowData = [],
  loading = false,
  canEdit = true,
  canDelete = false,
  onEdit,
  onDelete,
  onRefresh,
  triggerNotification
}) {
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // table or chart
  const [gridApi, setGridApi] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const exportDropdownRef = useRef(null);
  const [stageMasterList, setStageMasterList] = useState([]);

  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    ministry: true,
    fileNumber: true,
    stage: true,
    remarks: false,
    lastUpdatedDate: false
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch stage master list using /allvalue-dropdown/mmt_cabinet_ministry_stage
  useEffect(() => {
    fetchDropdownAllValues('mmt_cabinet_ministry_stage')
      .then(res => {
        const rows = res.data || [];
        setStageMasterList(rows);
      })
      .catch(err => console.error("Error fetching stage master dropdown:", err));
  }, []);

  const cleanMinistryName = (name) => {
    if (!name) return '';
    const parts = String(name).split(',').map(s => s.trim()).filter(Boolean);
    return Array.from(new Set(parts)).join(' / ') || String(name);
  };

  // Derive Ministry Options
  const ministryOptions = useMemo(() => {
    const set = new Set();
    rowData.forEach(item => {
      if (item.ministry_name) set.add(cleanMinistryName(item.ministry_name));
    });
    return Array.from(set).map(m => ({ value: m, label: m }));
  }, [rowData]);

  // Active vs Completed sub-tabs state
  const [activeCategory, setActiveCategory] = useState('active'); // 'active' or 'completed'

  const handleCategoryChange = (category) => {
    setActiveCategory(category);
    setSelectedStage('');
    setSearchTerm('');
  };

  const checkIsCompleted = (item) => {
    if (!item) return false;
    if (item.stage_id == 5) return true;
    const stName = String(item.stage_name || '').toLowerCase();
    return stName.includes('reply furnished to other ministry') || stName.includes('completed');
  };

  const { activeCount, completedCount } = useMemo(() => {
    let active = 0;
    let completed = 0;
    (rowData || []).forEach(item => {
      if (checkIsCompleted(item)) {
        completed++;
      } else {
        active++;
      }
    });
    return { activeCount: active, completedCount: completed };
  }, [rowData]);

  // Derive Stage Options: exclude "Reply Furnished to Other Ministry" / Stage 5 from stage options in active tab
  const stageOptions = useMemo(() => {
    let list = [];
    if (stageMasterList.length > 0) {
      list = stageMasterList.map(s => ({
        value: s.cab_ministry_stage_name || s.stage_name || s.name,
        label: s.cab_ministry_stage_name || s.stage_name || s.name
      })).filter(o => o.value);
    } else {
      const set = new Set();
      (rowData || []).forEach(item => {
        if (checkIsCompleted(item)) return;
        if (item.stage_name) set.add(item.stage_name);
      });
      list = Array.from(set).map(s => ({ value: s, label: s }));
    }

    return list.filter(opt => {
      const valLower = String(opt.value || '').toLowerCase();
      return !valLower.includes('reply furnished to other ministry') && !valLower.startsWith('5');
    });
  }, [rowData, stageMasterList]);

  // Filter data by active/completed category and filters
  const filteredData = useMemo(() => {
    return (rowData || []).filter(item => {
      const isCompleted = checkIsCompleted(item);
      const matchesCategory = activeCategory === 'completed' ? isCompleted : !isCompleted;

      if (!matchesCategory) return false;

      const matchesMinistry = selectedMinistry
        ? cleanMinistryName(item.ministry_name) === selectedMinistry
        : true;

      const stageText = item.stage_name || '';
      const matchesStage = (activeCategory === 'active' && selectedStage)
        ? stageText === selectedStage
        : true;

      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || [
        item.subject,
        item.ministry_name,
        item.eoffice_file_number,
        item.stage_name,
        item.remarks
      ].some(val => String(val || '').toLowerCase().includes(q));

      return matchesMinistry && matchesStage && matchesSearch;
    });
  }, [rowData, selectedMinistry, selectedStage, activeCategory, searchTerm]);

  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const m = cleanMinistryName(item.ministry_name) || 'Unknown';
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'Cabinet Notes': counts[key]
    }));
  }, [filteredData]);

  // AG Grid Column Definitions with Filter enabled on EVERY column
  const columnDefs = useMemo(() => [
    {
      field: 'sNo',
      headerName: 'S.NO',
      valueGetter: 'node.rowIndex + 1',
      width: 95,
      minWidth: 90,
      pinned: 'left',
      filter: true,
      headerClass: 'text-center',
      cellClass: 'text-center font-bold text-slate-600 dark:text-slate-400 font-mono text-xs'
    },
    {
      field: 'subject',
      headerName: 'SUBJECT',
      pinned: 'left',
      minWidth: 220,
      flex: 2,
      filter: 'agTextColumnFilter',
      cellStyle: { textAlign: 'left' },
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
      hide: !visibleCols.subject
    },
    {
      field: 'ministry_name',
      headerName: 'NAME OF THE MINISTRY',
      minWidth: 200,
      flex: 1.8,
      filter: 'agTextColumnFilter',
      valueGetter: (params) => cleanMinistryName(params.data?.ministry_name),
      cellStyle: { textAlign: 'left' },
      cellClass: 'font-medium text-slate-700 dark:text-slate-350',
      hide: !visibleCols.ministry
    },
    {
      field: 'eoffice_file_number',
      headerName: 'E-OFFICE FILE NO',
      minWidth: 160,
      flex: 1.3,
      filter: 'agTextColumnFilter',
      cellStyle: { textAlign: 'left' },
      cellClass: 'font-mono text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.fileNumber
    },
    {
      field: 'stage_name',
      headerName: 'STAGE',
      minWidth: 180,
      flex: 1.5,
      filter: 'agTextColumnFilter',
      cellStyle: { textAlign: 'left' },
      cellClass: 'font-semibold text-left',
      valueGetter: (params) => {
        return params.data?.stage_name || '-';
      },
      cellRenderer: (params) => {
        const rawVal = String(params.value || '').trim();
        const upperVal = rawVal.toUpperCase();
        const isCompleted = upperVal.includes('REPLY FURNISHED');
        const color = isCompleted ? 'text-emerald-600 dark:text-emerald-500 font-bold' : 'text-[#0f417a] dark:text-blue-400 font-bold';
        return (
          <span className={`${color} text-[11px] uppercase tracking-wider font-extrabold`}>
            {upperVal}
          </span>
        );
      },
      hide: !visibleCols.stage
    },
    {
      field: 'remarks',
      headerName: 'REMARKS',
      minWidth: 150,
      flex: 1.2,
      filter: 'agTextColumnFilter',
      valueGetter: (params) => params.data?.remarks || '-',
      cellStyle: { textAlign: 'left' },
      cellClass: 'text-xs text-slate-600 dark:text-slate-400',
      hide: !visibleCols.remarks
    },
    {
      field: 'updated_date',
      headerName: 'LAST UPDATED DATE',
      minWidth: 130,
      flex: 1,
      filter: 'agTextColumnFilter',
      headerClass: 'text-center',
      valueGetter: (params) => {
        const item = params.data;
        const rawDate = item.updated_date || item.updatedAt || item.updated_at;
        if (!rawDate) return '-';
        try {
          const d = new Date(rawDate);
          if (isNaN(d.getTime())) return String(rawDate).split('T')[0];
          return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
        } catch {
          return String(rawDate).split('T')[0];
        }
      },
      cellClass: 'text-center text-slate-600 dark:text-slate-400 font-mono text-xs',
      hide: !visibleCols.lastUpdatedDate
    },
    {
      headerName: 'ACTIONS',
      minWidth: 110,
      headerClass: 'text-center',
      cellRenderer: (params) => {
        const note = params.data;
        return (
          <div className="flex items-center justify-center w-full h-full space-x-1">
            {canEdit && (
              <button
                onClick={() => onEdit(note)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-[#0f417a] dark:text-blue-400 rounded-lg transition cursor-pointer"
                title="Update Note"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {canDelete && onDelete && (
              <button
                onClick={() => onDelete(note)}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                title="Delete Note"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ], [onEdit, onDelete, canEdit, canDelete, visibleCols]);

  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Cabinet_Notes_Other_Ministry_Register_export.csv`
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
      const title = 'Cabinet Notes - Other Ministry Data List';

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName && col.headerName !== 'ACTIONS') {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredData.forEach((row, rowIndex) => {
        rowsHtml += '<tr>';
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'ACTIONS') {
            let val = '';
            if (col.field === 'sNo' || col.headerName === 'S.NO') {
              val = rowIndex + 1;
            } else if (col.valueGetter && typeof col.valueGetter === 'function') {
              val = col.valueGetter({ data: row, node: { rowIndex } });
            } else {
              val = row[col.field] !== undefined ? row[col.field] : '';
            }
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Category Sub-tabs (Active Notes vs Completed Notes) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 select-none px-1">
        <button
          onClick={() => handleCategoryChange('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeCategory === 'active'
              ? 'border-[#0f417a] text-[#0f417a] dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          ACTIVE NOTES ({activeCount})
        </button>
        <button
          onClick={() => handleCategoryChange('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeCategory === 'completed'
              ? 'border-[#0f417a] text-[#0f417a] dark:border-blue-400 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          COMPLETED NOTES ({completedCount})
        </button>
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">

        {/* Filter Toolbar matching Consultant Appointment */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            {/* Ministry Dropdown */}
            <div className="relative">
              <select
                value={selectedMinistry}
                onChange={(e) => setSelectedMinistry(e.target.value)}
                className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[150px]"
              >
                <option value="">Show all Ministries</option>
                {ministryOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Stage Dropdown (Only visible in Active Notes tab) */}
            {activeCategory === 'active' && (
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[140px]"
                >
                  <option value="">Show all Stages</option>
                  {stageOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            )}

            {/* Keyword Search Input Box matching Consultant Appointment */}
            <div className="relative min-w-[180px] max-w-xs flex-1">
              <input
                type="text"
                placeholder="Search Subject, File No, Ministry..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Clear Button */}
            {(selectedMinistry || selectedStage || searchTerm) && (
              <button
                onClick={() => { setSelectedMinistry(''); setSelectedStage(''); setSearchTerm(''); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Right Toolbar Controls matching checkmark Image 1 */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Total Rows Pill Badge */}
            <div className="px-3.5 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-[#0f417a] dark:text-blue-400 tracking-wider">
              TOTAL ROWS: {filteredData.length}
            </div>

            {/* Column Visibility Dropdown */}
            {viewMode === 'table' && (
              <div className="relative" ref={colDropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-3.5 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-900 transition cursor-pointer flex items-center space-x-1.5 dark:text-slate-200"
                >
                  <span>Visibility</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 p-2 z-30 space-y-1">
                    <label className="flex items-center space-x-2 text-xs font-medium p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.subject}
                        onChange={(e) => setVisibleCols(prev => ({ ...prev, subject: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Subject</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-medium p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.ministry}
                        onChange={(e) => setVisibleCols(prev => ({ ...prev, ministry: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Name of Ministry</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-medium p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.fileNumber}
                        onChange={(e) => setVisibleCols(prev => ({ ...prev, fileNumber: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>File Number</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-medium p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.stage}
                        onChange={(e) => setVisibleCols(prev => ({ ...prev, stage: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Stage</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-medium p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.remarks}
                        onChange={(e) => setVisibleCols(prev => ({ ...prev, remarks: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Remarks</span>
                    </label>
                    <label className="flex items-center space-x-2 text-xs font-medium p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg cursor-pointer dark:text-slate-200">
                      <input
                        type="checkbox"
                        checked={visibleCols.lastUpdatedDate}
                        onChange={(e) => setVisibleCols(prev => ({ ...prev, lastUpdatedDate: e.target.checked }))}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>Last Updated Date</span>
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Solid Blue Export Dropdown Button */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="px-4 py-2 bg-[#0f417a] hover:bg-[#1e5ea8] text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <span>Export</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {exportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-30 animate-fade-in">
                  <button
                    onClick={() => { handleExport('Excel'); setExportDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-[#0f417a] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border-0 bg-transparent cursor-pointer"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <span>Export to Excel</span>
                  </button>
                  <button
                    onClick={() => { handleExport('PDF'); setExportDropdownOpen(false); }}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-xs font-semibold text-[#0f417a] dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border-0 bg-transparent cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-rose-600" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content View */}
        {viewMode === 'table' ? (
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            entriesLimit={15}
            onGridReady={(params) => setGridApi(params.api)}
          />
        ) : (
          <div className="h-96 w-full pt-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Cabinet Notes Distribution by Ministry</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#60a5fa' }}
                />
                <Bar dataKey="Cabinet Notes" fill="#0f417a" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0f417a' : '#1e5ea8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
