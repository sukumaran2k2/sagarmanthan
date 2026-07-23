import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Edit, BarChart3, List, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';

const STAGE_STEPS = {
  1: 'Received at Ministry',
  2: 'Submitted for Approval',
  3: 'Comments Sought',
  4: 'Comments Received',
  5: 'Reply Furnished',
  6: 'Disposed'
};

export default function DataList({
  wings = [],
  divisions = [],
  onEdit,
  triggerNotification
}) {
  const gridRef = useRef();

  // Reference data
  const [rowData, setRowData] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // table or chart

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [activeCategory, setActiveCategory] = useState('active'); // 'active' or 'disposed'

  useEffect(() => {
    if (activeCategory === 'disposed') {
      setSelectedStage('All');
    }
  }, [activeCategory]);

  // Column visibility checklist
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    wing: true,
    division: true,
    stage: true,
    refNumber: true,
    receivedFrom: true
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

  // Fetch references dynamically from backend
  const fetchData = () => {
    setLoading(true);
    axios.get("http://localhost:3000/vip-reference", {
      params: {
        wing: selectedWing,
        division: selectedDivision,
        status: selectedStage,
        search: debouncedSearch
      }
    })
      .then(res => {
        const dataArray = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const mapped = dataArray.map(r => {
          const steps = {
            1: r.received_at_ministry_date ? 'Yes' : 'No',
            2: r.submitted_for_approval_date ? 'Yes' : 'No',
            3: r.comments_sought_date ? 'Yes' : 'No',
            4: r.comments_received_date ? 'Yes' : 'No',
            5: r.reply_furnished_date ? 'Yes' : 'No',
            6: r.disposed_date ? 'Yes' : 'No'
          };
          const dates = {
            1: r.received_at_ministry_date ? new Date(r.received_at_ministry_date).toISOString().split('T')[0] : '',
            2: r.submitted_for_approval_date ? new Date(r.submitted_for_approval_date).toISOString().split('T')[0] : '',
            3: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            4: r.comments_received_date ? new Date(r.comments_received_date).toISOString().split('T')[0] : '',
            5: r.reply_furnished_date ? new Date(r.reply_furnished_date).toISOString().split('T')[0] : '',
            6: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.vip_reference_id,
            subject: r.subject || '',
            eofficeFile: r.eoffice_file_number || '',
            wing: r.wing_name || '',
            division: r.division_name || '',
            refNumber: r.ref_letter_num || '',
            receivedFrom: r.received_from || '',
            remarks: r.remarks || '',
            deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
            stageSteps: steps,
            statusDates: dates,
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : ''
          };
        });
        setRowData(mapped);
        setTotalEntries(mapped.length);
      })
      .catch(err => console.error("Error loading VIP references:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [selectedWing, selectedDivision, selectedStage, debouncedSearch]);

  const getRefStageText = (steps) => {
    let currentStage = 'Draft';
    for (let i = 1; i <= 6; i++) {
      if (steps[i] === 'Yes') {
        currentStage = STAGE_STEPS[i];
      }
    }
    return currentStage;
  };

  const wingNames = useMemo(() => wings.map(w => w.wing_name), [wings]);

  // Dynamically filter divisions based on selected wing
  const filteredDivisions = useMemo(() => {
    if (selectedWing === 'All') return divisions.map(d => d.division_name);
    const selectedWingObj = wings.find(w => w.wing_name === selectedWing);
    if (!selectedWingObj) return [];
    return divisions
      .filter(d => d.wing_id === selectedWingObj.wing_id)
      .map(d => d.division_name);
  }, [selectedWing, wings, divisions]);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const isDisposed = item.stageSteps[6] === 'Yes';
      if (activeCategory === 'active' && isDisposed) return false;
      if (activeCategory === 'disposed' && !isDisposed) return false;
      return true;
    });
  }, [rowData, activeCategory]);

  const activeCount = useMemo(() => rowData.filter(item => item.stageSteps[6] !== 'Yes').length, [rowData]);
  const disposedCount = useMemo(() => rowData.filter(item => item.stageSteps[6] === 'Yes').length, [rowData]);

  // Group data by wing for chart visualization (based on filteredData)
  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const w = item.wing || 'Unknown';
      const isPending = item.stageSteps[6] !== 'Yes';
      if (isPending) {
        counts[w] = (counts[w] || 0) + 1;
      }
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'Pending References': counts[key]
    }));
  }, [filteredData]);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridRef.current?.api) {
        gridRef.current.api.exportDataAsCsv({
          fileName: `VIP_Reference_Register_export.csv`
        });
        triggerNotification?.(`Register data exported to Excel (CSV) successfully!`);
      }
    } else if (type === 'PDF') {
      triggerNotification?.(`Preparing PDF document...`);
      const printWindow = window.open('', '_blank');
      const title = 'VIP Reference - Data List';

      let headersHtml = '';
      colDefs.forEach(col => {
        if (col.headerName && col.headerName !== 'Update') {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      filteredData.forEach((row, rowIndex) => {
        rowsHtml += '<tr>';
        colDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Update') {
            let val = '';
            if (col.headerName === 'S.No') {
              val = rowIndex + 1;
            } else if (col.field === 'stageSteps') {
              val = getRefStageText(row[col.field]);
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

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 130,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center'
    },
    {
      headerName: 'Subject',
      field: 'subject',
      width: 280,
      minWidth: 200,
      pinned: 'left',
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-700 flex items-center py-2 border-r border-slate-100 font-semibold whitespace-normal',
      hide: !visibleCols.subject
    },
    {
      headerName: 'Wing',
      field: 'wing',
      width: 150,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium',
      hide: !visibleCols.wing
    },
    {
      headerName: 'Division',
      field: 'division',
      width: 180,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium',
      hide: !visibleCols.division
    },
    {
      headerName: 'Stage',
      field: 'stageSteps',
      minWidth: 180,
      cellClass: 'text-center font-bold border-r border-slate-100 flex items-center justify-center',
      hide: !visibleCols.stage,
      cellRenderer: (params) => {
        const stageText = getRefStageText(params.value);
        const color = activeCategory === 'disposed' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500';
        return <span className={color}>{stageText}</span>;
      },
      valueFormatter: (params) => getRefStageText(params.value)
    },
    {
      headerName: 'Reference Letter Number',
      field: 'refNumber',
      width: 200,
      minWidth: 200,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium',
      hide: !visibleCols.refNumber
    },
    {
      headerName: 'Received From',
      field: 'receivedFrom',
      width: 250,
      minWidth: 220,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-600 flex items-center py-2 border-r border-slate-100 font-semibold whitespace-normal',
      hide: !visibleCols.receivedFrom
    },
    {
      headerName: 'Remarks',
      field: 'remarks',
      width: 250,
      minWidth: 220,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-550 flex items-center py-2 border-r border-slate-100 font-medium whitespace-normal',
      valueFormatter: (params) => params.value || '--'
    },
    {
      headerName: 'Last Updated Date',
      field: 'lastUpdated',
      width: 170,
      minWidth: 170,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'Update',
      field: 'id',
      width: 90,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => onEdit(params.data)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[#0f417a] dark:text-blue-400 transition cursor-pointer"
          title="Update VIP Letter status"
        >
          <Edit className="h-4 w-4" />
        </button>
      )
    }
  ], [visibleCols, onEdit, activeCategory]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Category selector tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          onClick={() => setActiveCategory('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'active'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Active ({activeCount})
        </button>
        <button
          onClick={() => setActiveCategory('disposed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'disposed'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Disposed ({disposedCount})
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">

      {/* Search & Actions Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 pb-4">

        {/* Left Cluster: Filters & Search */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* <div className="relative">
            <select
              value={selectedWing}
              onChange={(e) => {
                setSelectedWing(e.target.value);
                setSelectedDivision('All');
              }}
              className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer min-w-[120px]"
            >
              <option value="All">All Wings</option>
              {wingNames.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          <div className="relative">
            <select
              value={selectedDivision}
              onChange={(e) => {
                setSelectedDivision(e.target.value);
              }}
              className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer min-w-[130px]"
            >
              <option value="All">All Divisions</option>
              {filteredDivisions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div> */}

          {activeCategory === 'active' && (
            <div className="relative">
              <select
                value={selectedStage}
                onChange={(e) => {
                  setSelectedStage(e.target.value);
                }}
                className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer min-w-[130px]"
              >
                <option value="All">All Stages</option>
                {Object.values(STAGE_STEPS).filter(s => s !== 'Disposed').map(stage => <option key={stage} value={stage}>{stage}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}

          <div className="relative min-w-[160px] max-w-xs flex-1">
            <input
              type="text"
              placeholder="Search Subject..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {(selectedWing !== 'All' || selectedDivision !== 'All' || selectedStage !== 'All') && (
            <button
              onClick={() => { setSelectedWing('All'); setSelectedDivision('All'); setSelectedStage('All'); }}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        {/* Right Cluster: Visiblity checklist + view toggle (Removed Register VIP Letter button) */}
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
                      <span>{col === 'refNumber' ? 'Ref Number' : col === 'receivedFrom' ? 'Received From' : col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Toggle Switch */}
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
        <Table
          ref={gridRef}
          rowData={filteredData}
          columnDefs={colDefs}
          pagination={true}
          paginationPageSize={entriesLimit}
          paginationPageSizeSelector={[5, 10, 20, 50]}
          loading={loading}
        />
      ) : (
        <div className="w-full h-[350px] p-4 flex items-center justify-center bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                <Tooltip cursor={{ fill: 'rgba(15, 65, 122, 0.05)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="Pending References" fill="#0f417a" radius={[6, 6, 0, 0]}>
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

      {/* Export Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
        <div className="flex items-center space-x-2">
          <ExportDropdown
            onExportExcel={() => handleExport('Excel')}
            onExportPdf={() => handleExport('PDF')}
            color="#0f417a"
            hoverColor="#1e5ea8"
          />
        </div>
        <div className="text-xs font-bold text-slate-550 uppercase tracking-wider">
          Total Entries: {filteredData.length}
        </div>
      </div>

      </div>
    </div>
  );
}
