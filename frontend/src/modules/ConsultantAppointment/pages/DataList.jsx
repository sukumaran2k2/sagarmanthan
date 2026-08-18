import React, { useState, useMemo, useRef, useEffect } from 'react';
import Table from '../../../components/Table';
import { Search, X, Edit, Trash2, ChevronDown, Users } from 'lucide-react';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import CandidateDrilldownView from './CandidateDrilldownView';

// All stages a pending appointment can be at (Contract Signed belongs to Completed tab)
const PENDING_STAGES = [
  'Initiated',
  'Admin Approval for engaging Consultant',
  'Tender Published',
  'Pre-bid Queries Responded',
  'Bid Received',
  'Technical Bid Finalized',
  'Financial Bid Finalized',
  'Work Order Issued',
];

export default function DataList({
  rowData = [],
  loading,
  onEdit,
  onDelete,
  onAddClick,
  wings = [],
  divisions = [],
  triggerNotification,
  canEdit = true,
  canAdd = true,
  canRemove = true
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWing, setSelectedWing] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [gridApi, setGridApi] = useState(null); // Ag Grid API
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'completed'
  const [selectedStage, setSelectedStage] = useState(''); // stage filter for pending tab
  const [drilldownAppointment, setDrilldownAppointment] = useState(null);

  // Reset stage filter when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'pending') setSelectedStage('');
  };

  // Column visibility states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    wing: true,
    division: true,
    appointmentType: true,
    status: true,
    numResources: true,
    lastUpdated: true
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

  const baseFilteredData = useMemo(() => {
    return rowData.filter(item => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        (item.wing || '').toLowerCase().includes(search) ||
        (item.division || '').toLowerCase().includes(search) ||
        (item.status || '').toLowerCase().includes(search);

      const matchesWing = selectedWing ? (item.wing || '') === selectedWing : true;
      const matchesDivision = selectedDivision ? (item.division || '') === selectedDivision : true;

      return matchesSearch && matchesWing && matchesDivision;
    });
  }, [rowData, searchTerm, selectedWing, selectedDivision]);

  const pendingCount = useMemo(() => {
    return baseFilteredData.filter(item => item.status !== 'Contract Signed').length;
  }, [baseFilteredData]);

  const completedCount = useMemo(() => {
    return baseFilteredData.filter(item => item.status === 'Contract Signed').length;
  }, [baseFilteredData]);

  const filteredData = useMemo(() => {
    return baseFilteredData
      .filter(item => {
        const isCompleted = item.status === 'Contract Signed';
        if (activeTab === 'completed') return isCompleted;
        if (!isCompleted && selectedStage) return item.status === selectedStage;
        return !isCompleted;
      })
      .map((item, index) => ({
        ...item,
        sNo: index + 1
      }));
  }, [baseFilteredData, activeTab, selectedStage]);

  const handleExport = (type) => {
    if (type === 'Copy') {
      if (gridApi) {
        let tsv = '';
        const headers = [];
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Action') headers.push(col.headerName);
        });
        tsv += headers.join('\t') + '\n';
        filteredData.forEach((row, rowIndex) => {
          const line = [];
          columnDefs.forEach(col => {
            if (col.headerName && col.headerName !== 'Action') {
              const val = col.field === 'sNo' ? rowIndex + 1 : (row[col.field] !== undefined ? row[col.field] : '');
              line.push(val);
            }
          });
          tsv += line.join('\t') + '\n';
        });
        navigator.clipboard.writeText(tsv)
          .then(() => { if (triggerNotification) triggerNotification('Table data copied to clipboard!', 'success'); })
          .catch(() => { if (triggerNotification) triggerNotification('Failed to copy table data.', 'error'); });
      } else {
        if (triggerNotification) triggerNotification('Grid is not ready for copy yet.', 'warning');
      }
    } else if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `Consultant_Appointment_Register_export.csv`
        });
        if (triggerNotification) {
          triggerNotification(`Register data exported to Excel (CSV) successfully!`, 'success');
        }
      } else {
        if (triggerNotification) triggerNotification("Grid is not ready for export yet.", "warning");
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`, 'info');
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

  const columnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo',
        headerName: 'S.No',
        minWidth: 95,
        cellClass: 'font-mono text-slate-800 dark:text-white font-bold text-center',
        headerClass: 'text-center',
        pinned: 'left'
      },
      {
        field: 'wing',
        headerName: 'Wing',
        flex: 1.5,
        minWidth: 150,
        cellClass: 'font-bold text-slate-800 dark:text-white',
        hide: !visibleCols.wing,
        pinned: 'left'
      },
      {
        field: 'division',
        headerName: 'Division',
        flex: 1.2,
        minWidth: 120,
        cellClass: 'text-slate-700 dark:text-slate-100 font-medium',
        hide: !visibleCols.division
      },
      {
        field: 'appointmentType',
        headerName: 'Appointment Type',
        flex: 1.2,
        minWidth: 130,
        cellClass: 'text-slate-700 dark:text-slate-100 font-medium',
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
        minWidth: 155,
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const row = params.data;
          const count = params.value || 1;
          return (
            <div className="flex items-center justify-center w-full h-full py-1">
              <button
                type="button"
                onClick={() => setDrilldownAppointment(row)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#0f417a] dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 font-extrabold text-xs rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer shadow-sm hover:scale-105 active:scale-95 group"
                title="Click to view candidate details & documents"
              >
                <Users className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <span>{count}</span>
              </button>
            </div>
          );
        },
        hide: !visibleCols.numResources
      },
      {
        field: 'lastUpdated',
        headerName: 'Last Updated',
        flex: 1.3,
        minWidth: 165,
        cellClass: 'font-mono text-slate-700 dark:text-slate-300 text-xs font-semibold text-center',
        headerClass: 'text-center',
        hide: !visibleCols.lastUpdated
      }
    ];

    if (canEdit || canRemove) {
      cols.push({
        headerName: 'Action',
        minWidth: 120,
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const row = params.data;
          return (
            <div className="flex items-center justify-center gap-1.5 w-full h-full py-1">
              {canEdit && (
                <button
                  onClick={() => onEdit(row)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[#0f417a] dark:text-blue-400 transition cursor-pointer"
                  title="Update Appointment"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canRemove && onDelete && (
                <button
                  onClick={() => onDelete(row)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-red-600 dark:text-red-400 transition cursor-pointer"
                  title="Delete Appointment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        }
      });
    }

    return cols;
  }, [onEdit, onDelete, visibleCols, canEdit, canRemove]);

  if (drilldownAppointment) {
    return (
      <CandidateDrilldownView
        appointment={drilldownAppointment}
        onBack={() => setDrilldownAppointment(null)}
        triggerNotification={triggerNotification}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Pending / Completed tabs matching YP DataList */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          onClick={() => handleTabChange('pending')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'pending'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          PENDING ({pendingCount})
        </button>
        <button
          onClick={() => handleTabChange('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeTab === 'completed'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          COMPLETED ({completedCount})
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">
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

          {/* Stage filter — only on Pending tab */}
          {activeTab === 'pending' && (
            <div className="relative">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 cursor-pointer min-w-[160px]"
              >
                <option value="">All Stages</option>
                {PENDING_STAGES.map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          )}

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

          {(selectedWing || selectedDivision || selectedStage) && (
            <button
              onClick={() => { setSelectedWing(''); setSelectedDivision(''); setSelectedStage(''); }}
              className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 transition"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>

        <div className="flex items-center space-x-2 flex-shrink-0">
          <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            Total Rows: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredData.length}</span>
          </div>

          <div className="relative" ref={colDropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
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
                    <span>{col === 'appointmentType' ? 'Appointment Type' : col === 'numResources' ? 'Num Resources' : col === 'lastUpdated' ? 'Last Updated' : col}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <CopyButton
            onCopy={() => handleExport('Copy')}
            color="#0f417a"
            hoverBg="#f1f5f9"
          />
          <ExportDropdown
            onExportExcel={() => handleExport('Excel')}
            onExportPdf={() => handleExport('PDF')}
            color="#0f417a"
            hoverColor="#1e5ea8"
          />
        </div>
      </div>

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
        <style dangerouslySetInnerHTML={{
          __html: `
          .ag-theme-quartz.rounded-xl,
          .ag-theme-quartz.rounded-2xl {
            border-radius: 16px !important;
          }
          .ag-theme-quartz .ag-root-wrapper {
            border-radius: 16px !important;
          }
          .ag-theme-quartz .ag-paging-panel {
            color: #1e293b !important;
            font-weight: 700 !important;
            opacity: 1 !important;
          }
          .dark .ag-theme-quartz .ag-paging-panel {
            color: #f1f5f9 !important;
          }
          .ag-theme-quartz .ag-paging-button {
            color: #0f417a !important;
            opacity: 1 !important;
          }
          .dark .ag-theme-quartz .ag-paging-button {
            color: #3b82f6 !important;
          }
          .ag-theme-quartz .ag-paging-panel .ag-icon {
            color: #0f417a !important;
            opacity: 1 !important;
          }
          .dark .ag-theme-quartz .ag-paging-panel .ag-icon {
            color: #3b82f6 !important;
          }
          .ag-theme-quartz .ag-paging-row-summary-panel select {
            color: #1e293b !important;
            background-color: #fff !important;
            opacity: 1 !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 4px !important;
          }
          .dark .ag-theme-quartz .ag-paging-row-summary-panel select {
            color: #f1f5f9 !important;
            background-color: #1f2937 !important;
            border: 1px solid #4b5563 !important;
          }
          .ag-theme-quartz select option {
            color: #1e293b !important;
            background-color: #ffffff !important;
          }
          .dark .ag-theme-quartz select option {
            color: #f1f5f9 !important;
            background-color: #1f2937 !important;
          }
        `}} />
      </div>
      </div>
    </div>
  );
}
