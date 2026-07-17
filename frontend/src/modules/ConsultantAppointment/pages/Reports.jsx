import React, { useState, useEffect, useCallback } from 'react';
import Table from '../../../components/Table';
import { ChevronLeft, FileSpreadsheet, Download } from 'lucide-react';
import axios from 'axios';
import ExportButtons from '../../../components/ExportButtons';

export default function Reports({ wings = [], triggerNotification }) {
  const [localWings, setLocalWings] = useState(wings);

  useEffect(() => {
    if (wings && wings.length > 0) {
      setLocalWings(wings);
    } else {
      axios.get("http://localhost:3000/mmt-dropdown/mmt_wings")
        .then(res => setLocalWings(res.data || []))
        .catch(err => console.error("Error loading wings in report:", err));
    }
  }, [wings]);

  const [drillDownPath, setDrillDownPath] = useState([{ type: 'abstract', title: 'Abstract ( Wing Wise )' }]);
  const [drillDownData, setDrillDownData] = useState([]);
  const [drillDownColDefs, setDrillDownColDefs] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownError, setDrillDownError] = useState(null);
  const [wingFilter, setWingFilter] = useState('');
  const [gridApi, setGridApi] = useState(null);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const mapColDefs = useCallback((cols) => {
    return cols
      .filter(col => {
        const fieldLower = col.field?.toLowerCase() || '';
        return fieldLower !== 'wing id' && fieldLower !== 'wing_id';
      })
      .map((col) => {
        if (col.children) {
          return { ...col, children: mapColDefs(col.children) };
        }

        const fieldLower = col.field?.toLowerCase() || '';
        const isWingName = fieldLower === 'wing name' || fieldLower === 'wing';
        const isSNo = fieldLower === 's no' || fieldLower === 's.no' || fieldLower === 'sno';

        const pinned = (isSNo || isWingName) ? 'left' : undefined;

        return {
          ...col,
          pinned,
          filter: true,
          sortable: true,
          resizable: true,
          minWidth: col.width || 120,
          cellRenderer: (params) => {
            if (params.value === null || params.value === undefined) return '';

            // 1. Click Wing Name -> go to Division Report
            if (isWingName && currentView.type === 'abstract') {
              return (
                <button
                  className="text-blue-600 font-bold hover:text-blue-800 underline cursor-pointer"
                  onClick={() => {
                    const wingId = params.data["Wing ID"] || params.data["wing_id"] || 0;
                    setDrillDownPath(prev => [...prev, {
                      type: 'division',
                      wingId,
                      title: `Division Wise Report - ${params.value}`
                    }]);
                  }}
                >
                  {params.value}
                </button>
              );
            }

            return params.value;
          }
        };
      });
  }, [currentView]);

  const fetchDrillDownData = useCallback(() => {
    setDrillDownLoading(true);
    setDrillDownError(null);
    let endpoint = '';

    if (currentView.type === 'abstract') {
      endpoint = '/consultantapp-report';
    } else if (currentView.type === 'division') {
      endpoint = `/cadivision-report/${currentView.wingId}/`;
    } else if (currentView.type === 'candidates_wing') {
      endpoint = `/wingwise-cacandidate/${currentView.wingId}/`;
    } else if (currentView.type === 'candidates_div') {
      endpoint = `/divisionwise-cacandidate/${currentView.divisionId}/`;
    }

    if (!endpoint) return;

    axios.get(`http://localhost:3000${endpoint}`)
      .then(res => {
        const fetchedData = res.data?.rowData || res.data?.value || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setDrillDownData(fetchedData);

        if (res.data?.columnDefs) {
          setDrillDownColDefs(mapColDefs(res.data.columnDefs));
        } else {
          if (fetchedData.length > 0) {
            const fallbackDefs = Object.keys(fetchedData[0])
              .filter(key => {
                const keyLower = key.toLowerCase();
                return keyLower !== 'wing id' && keyLower !== 'wing_id';
              })
              .map((key) => {
                const isNumerical = fetchedData.some(row => typeof row[key] === 'number');
                const isIdColumn = key.toLowerCase().includes('id');

                const keyLower = key.toLowerCase();
                const isWingName = keyLower === 'wing name' || keyLower === 'wing';
                const isSNo = keyLower === 's no' || keyLower === 's.no' || keyLower === 'sno';
                const pinned = (isSNo || isWingName) ? 'left' : undefined;

                return {
                  field: key,
                  headerName: key.replace(/_/g, ' ').toUpperCase(),
                  minWidth: 150,
                  filter: true,
                  sortable: true,
                  pinned,
                  cellRenderer: (isNumerical && !isIdColumn) ? (params) => {
                    if (params.value === null || params.value === undefined) return '';
                    return params.value;
                  } : undefined
                };
              });
            setDrillDownColDefs(fallbackDefs);
          } else {
            setDrillDownColDefs([]);
          }
        }
      })
      .catch(err => {
        console.error("Error loading CA drill-down data:", err);
        setDrillDownError("Failed to load report data.");
      })
      .finally(() => setDrillDownLoading(false));
  }, [currentView, mapColDefs]);

  useEffect(() => {
    fetchDrillDownData();
  }, [drillDownPath, fetchDrillDownData]);

  const handleExport = (type) => {
    if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `${currentView.title.replace(/\s+/g, '_')}_export.csv`
        });
        if (triggerNotification) {
          triggerNotification(`Report exported to Excel (CSV) successfully!`);
        }
      } else {
        alert("Grid is not ready for export yet.");
      }
    } else if (type === 'PDF') {
      if (triggerNotification) {
        triggerNotification(`Preparing PDF document...`);
      }

      const printWindow = window.open('', '_blank');
      const title = currentView.title || 'Report';

      let headersHtml = '';
      drillDownColDefs.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      const visibleRows = currentView.type === 'abstract'
        ? drillDownData.filter(item => !wingFilter || item["Wing Name"] === wingFilter)
        : drillDownData;

      visibleRows.forEach((row, rowIndex) => {
        rowsHtml += '<tr>';
        drillDownColDefs.forEach(col => {
          if (col.headerName) {
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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
        {drillDownPath.length > 1 && (
          <button
            onClick={() => setDrillDownPath(prev => prev.slice(0, -1))}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
            title="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h3 className="text-base md:text-lg font-black text-slate-800 font-display">
            {drillDownPath.length === 1 ? 'Report No.: 2.3A - Abstract ( Wing Wise ) - Consultant Appointment' : currentView.title}
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-semibold text-slate-500 mt-1">
            <span>As On date: <strong className="text-slate-700">30-6-2026</strong></span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span>(Report for the Month - <strong className="text-slate-700">June 2026</strong>)</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <ExportButtons
            onExportExcel={() => handleExport('Excel')}
            onExportPdf={() => handleExport('PDF')}
          />
        </div>

        {currentView.type === 'abstract' && (
          <div className="w-full sm:max-w-xs">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Wing</label>
            <select
              value={wingFilter}
              onChange={(e) => setWingFilter(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700"
            >
              <option value="">--Show All--</option>
              {localWings.map(w => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
            </select>
          </div>
        )}
      </div>

      {drillDownError ? (
        <div className="text-red-500 font-bold p-4 bg-red-50 rounded-xl border border-red-200">
          {drillDownError}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-2xl shadow-sm ag-theme-quartz ca-report-grid overflow-hidden">
            <Table
              rowData={
                currentView.type === 'abstract'
                  ? drillDownData.filter(item => !wingFilter || item["Wing Name"] === wingFilter)
                  : drillDownData
              }
              columnDefs={drillDownColDefs}
              loading={drillDownLoading}
              pagination={true}
              paginationPageSize={10}
              enableExport={false}
              onGridReady={(params) => setGridApi(params.api)}
              defaultColDef={{
                minWidth: 95,
                filter: true,
                sortable: true,
                resizable: true
              }}
            />
            <style dangerouslySetInnerHTML={{
              __html: `
              .ca-report-grid.ag-theme-quartz {
                border-radius: 16px !important;
              }
              .ca-report-grid .ag-root-wrapper {
                border-radius: 16px !important;
              }
              .ca-report-grid .ag-header {
                background-color: #bc3d5ceb !important;
              }
              .ca-report-grid .ag-header-cell-label {
                color: white !important;
              }
            `}} />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Total Rows: {drillDownData.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}
