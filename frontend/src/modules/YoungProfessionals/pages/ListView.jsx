import React, { useState, useMemo } from 'react';
import Table from '../../../components/Table';
import { Search, X, Edit, UserMinus, BarChart3, List, FileSpreadsheet, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';

export default function ListView({ 
  rowData, 
  loading, 
  onEdit, 
  onRefresh, 
  triggerNotification 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'
  const [relieveModalOpen, setRelieveModalOpen] = useState(false);
  const [selectedYp, setSelectedYp] = useState(null);
  const [lastWorkingDate, setLastWorkingDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [submittingRelieve, setSubmittingRelieve] = useState(false);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      const search = searchTerm.toLowerCase();
      return (
        (item.name || '').toLowerCase().includes(search) ||
        (item.role || '').toLowerCase().includes(search) ||
        (item.wing || '').toLowerCase().includes(search) ||
        (item.division || '').toLowerCase().includes(search)
      );
    }).map((item, index) => ({
      ...item,
      sNo: index + 1
    }));
  }, [rowData, searchTerm]);

  // Group data by wing for the chart visualization
  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(item => {
      const w = item.wing || 'Unknown';
      counts[w] = (counts[w] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'In Position': counts[key]
    }));
  }, [filteredData]);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const handleOpenRelieve = (yp) => {
    setSelectedYp(yp);
    setLastWorkingDate('');
    setRemarks('');
    setRelieveModalOpen(true);
  };

  const handleRelieveSubmit = async (e) => {
    e.preventDefault();
    if (!lastWorkingDate) {
      alert("Please select the last working date.");
      return;
    }
    setSubmittingRelieve(true);
    try {
      await axios.put("http://localhost:3000/relieve-young-professional", {
        candidateId: selectedYp.yp_id,
        lastWorkingDate,
        remarks
      });
      if (triggerNotification) {
        triggerNotification(`${selectedYp.name} has been relieved successfully.`);
      }
      setRelieveModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to relieve young professional.");
    } finally {
      setSubmittingRelieve(false);
    }
  };

  const handleExport = (type) => {
    if (triggerNotification) {
      triggerNotification(`Exporting Register data to ${type}...`);
    }
  };

  const columnDefs = useMemo(() => [
    { 
      field: 'sNo', 
      headerName: 'S.No', 
      width: 70, 
      cellClass: 'font-mono text-slate-600 text-center', 
      headerClass: 'text-center' 
    },
    { 
      field: 'name', 
      headerName: 'Name', 
      flex: 1.5, 
      minWidth: 150, 
      cellClass: 'font-bold text-slate-800' 
    },
    { 
      field: 'role', 
      headerName: 'Role', 
      flex: 1.2, 
      minWidth: 120, 
      cellClass: 'text-slate-700 font-semibold' 
    },
    { 
      field: 'wing', 
      headerName: 'Wing', 
      flex: 1.2, 
      minWidth: 120, 
      cellClass: 'text-slate-600 font-medium' 
    },
    { 
      field: 'division', 
      headerName: 'Division', 
      flex: 1.2, 
      minWidth: 120, 
      cellClass: 'text-slate-655 font-medium' 
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      cellRenderer: (params) => {
        const isActive = params.value;
        return (
          <span className={`text-xs font-black uppercase ${
            isActive ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {isActive ? 'Active' : 'Relieved'}
          </span>
        );
      }
    },
    {
      headerName: 'Action',
      width: 120,
      cellRenderer: (params) => {
        const yp = params.data;
        return (
          <div className="flex items-center space-x-3 py-2">
            <button
              onClick={() => onEdit(yp)}
              className="p-1.5 hover:bg-slate-100 rounded text-[#0f417a] transition cursor-pointer"
              title="Update"
            >
              <Edit className="h-4 w-4" />
            </button>
            {yp.is_active && (
              <button
                onClick={() => handleOpenRelieve(yp)}
                className="p-1.5 hover:bg-rose-50 rounded text-rose-600 transition cursor-pointer"
                title="Relieve"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      }
    }
  ], [onEdit]);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in relative">
      
      {/* Title & View Switcher Row with Search */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            placeholder="Search YP details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
          />
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        </div>
        
        {/* Toggle Switch Button Pair */}
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

      {viewMode === 'table' ? (
        <div className="ag-theme-quartz w-full relative">
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            enableExport={false} // Disable Table.jsx built-in top-right Export button
            defaultColDef={{
              minWidth: 90,
              flex: 1,
              filter: true,
              sortable: true,
              resizable: true
            }}
          />
          {/* Style overrides to guarantee pagination visibility in light and dark themes and remove border radius */}
          <style dangerouslySetInnerHTML={{__html: `
            .ag-theme-quartz.rounded-xl {
              border-radius: 0px !important;
            }
            .ag-theme-quartz .ag-root-wrapper {
              border-radius: 0px !important;
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
      ) : (
        <div className="w-full h-[350px] p-4 flex items-center justify-center bg-slate-50/50 border border-slate-200 rounded-2xl shadow-sm">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                <Tooltip cursor={{ fill: 'rgba(15, 65, 122, 0.05)' }} />
                <Legend verticalAlign="top" height={36} />
                <Bar dataKey="In Position" fill="#0f417a" radius={[6, 6, 0, 0]}>
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
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500 mr-1 uppercase">Export as</span>
          <button
            onClick={() => handleExport('Excel')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
            title="Export Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100/50 transition cursor-pointer"
            title="Export PDF"
          >
            <Download className="h-4 w-4 text-rose-600" />
          </button>
        </div>
        {viewMode === 'table' && (
          <div className="text-xs font-bold text-slate-550 uppercase tracking-wider">
            Total Rows: {filteredData.length}
          </div>
        )}
      </div>

      {/* Relieve Modal */}
      {relieveModalOpen && selectedYp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-rose-700 text-white">
              <h3 className="text-sm font-black font-display uppercase tracking-wider">Relieve Young Professional</h3>
              <button onClick={() => setRelieveModalOpen(false)} className="text-rose-200 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRelieveSubmit} className="p-6 space-y-5">
              <div>
                <p className="text-xs font-bold text-slate-700">Name</p>
                <p className="text-sm font-black text-slate-900 mt-0.5">{selectedYp.name}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700">Role</p>
                <p className="text-xs font-semibold text-slate-655 mt-0.5">{selectedYp.role} ({selectedYp.wing} - {selectedYp.division})</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Last Working Date*</label>
                <input
                  type="date"
                  value={lastWorkingDate}
                  onChange={(e) => setLastWorkingDate(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-medium text-slate-700"
                  placeholder="Reason for relieving, remarks..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRelieveModalOpen(false)}
                  className="px-4.5 py-2 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRelieve}
                  className="px-5.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  {submittingRelieve ? 'Submitting...' : 'Relieve Candidate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
