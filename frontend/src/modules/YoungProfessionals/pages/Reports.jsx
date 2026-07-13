import React, { useState, useEffect, useCallback } from 'react';
import Table from '../../../components/Table';
import { ChevronLeft, FileSpreadsheet, Download } from 'lucide-react';
import axios from 'axios';

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 2.2A - Abstract ( Wing & Division Wise ) - Young Professionals' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'summary') {
        const response = await axios.get("http://localhost:3000/yp-report");
        setData(response.data.rowData || []);

        setColumns([
          { field: 'S No', headerName: 'S.No', width: 80, cellClass: 'font-mono text-center' },
          { field: 'Wing', headerName: 'Wing', flex: 1.5, minWidth: 150 },
          { field: 'Division', headerName: 'Division', flex: 1.5, minWidth: 150 },
          {
            field: 'In Position',
            headerName: 'In Position',
            flex: 1,
            minWidth: 100,
            cellClass: 'text-center font-bold text-blue-600',
            cellRenderer: (params) => {
              const val = params.value;
              const divisionId = params.data["Division ID"];
              const divisionName = params.data["Division"];
              const wingName = params.data["Wing"];
              if (val > 0) {
                return (
                  <button
                    onClick={() => {
                      setDrillDownPath(prev => [
                        ...prev,
                        {
                          type: 'drilldown',
                          divisionId,
                          title: `Candidates List - Wing: ${wingName} | Division: ${divisionName}`
                        }
                      ]);
                    }}
                    className="text-blue-600 font-bold hover:text-blue-800 underline cursor-pointer"
                  >
                    {val}
                  </button>
                );
              }
              return '--';
            }
          }
        ]);
      } else if (currentView.type === 'drilldown') {
        const response = await axios.get(`http://localhost:3000/divisionwise-ypcandidate/0/${currentView.divisionId}`);
        setData(response.data.rowData || []);
        setColumns(response.data.columnDefs || []);
      }
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [currentView]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleExport = (type) => {
    if (triggerNotification) {
      triggerNotification(`Exporting Report to ${type}...`);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      {/* Title & Back Button */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
        {drillDownPath.length > 1 && (
          <button
            onClick={handleBack}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h3 className="text-base md:text-lg font-black text-slate-800 font-display">
            {currentView.title}
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
            <span>As On date: <strong className="text-slate-700">30-6-2026</strong></span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>(Report for the Month - <strong className="text-slate-700">June 2026</strong>)</span>
          </div>
        </div>
      </div>

      {/* AG Grid table wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm ag-theme-quartz">
        <Table
          rowData={data}
          columnDefs={columns}
          loading={loading}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          enableExport={false} // Disable Table.jsx built-in top-right Export CSV button
          defaultColDef={{
            minWidth: 95,
            filter: true,
            sortable: true,
            resizable: true
          }}
        />
        {/* Style injection to guarantee pagination controls & dropdown page size visibility */}
        <style dangerouslySetInnerHTML={{
          __html: `
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

      {/* Export Options & Total count at the bottom */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleExport('Excel')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export to Excel</span>
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100/50 transition cursor-pointer"
          >
            <Download className="h-4 w-4 text-rose-600" />
            <span>Export to PDF</span>
          </button>
        </div>
        <div className="text-xs font-bold text-slate-550 uppercase tracking-wider">
          Total Rows: {data.length}
        </div>
      </div>
    </div>
  );
}
