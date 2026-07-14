import React, { useState, useEffect, useCallback } from 'react';
import Table from '../../../components/Table';
import { ChevronLeft, FileSpreadsheet, Download } from 'lucide-react';
import axios from 'axios';
import ExportButtons from '../../../components/ExportButtons';

export default function Reports({ triggerNotification }) {
  const [drillDownPath, setDrillDownPath] = useState([
    { type: 'summary', title: 'Report No. 2.2A - Abstract ( Wing & Division Wise ) - Young Professionals' }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [gridApi, setGridApi] = useState(null);

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
          { field: 'S No', headerName: 'S.No', width: 80, minWidth: 80, cellClass: 'font-mono text-center' },
          { field: 'Wing', headerName: 'Wing', flex: 1.5, minWidth: 150 },
          { field: 'Division', headerName: 'Division', flex: 1.5, minWidth: 150 },
          {
            field: 'In Position',
            headerName: 'In Position',
            flex: 1,
            minWidth: 120,
            cellClass: 'text-center font-bold text-blue-600 dark:text-blue-400',
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
                    className="text-blue-600 dark:text-blue-400 font-bold hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
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
        setColumns([
          { field: 'S No', headerName: 'S.No', width: 70, minWidth: 70, pinned: 'left', cellClass: 'font-mono text-center font-bold' },
          { field: 'Name', headerName: 'Name', width: 160, minWidth: 150, pinned: 'left', cellClass: 'font-bold text-slate-800 dark:text-slate-200' },
          { field: 'Qualification', headerName: 'Qualification', width: 140, minWidth: 150 },
          { field: 'Experience (Years)', headerName: 'Experience', width: 110, minWidth: 110, cellClass: 'text-center font-semibold' },
          { field: 'Skills', headerName: 'Skill', width: 180, minWidth: 120, cellClass: 'font-semibold' },
          { field: 'Role', headerName: 'Role', width: 150, minWidth: 120 },
          { field: 'Salary (per month)', headerName: 'Salary', width: 120, minWidth: 100, valueFormatter: params => params.value ? `₹${Number(params.value).toLocaleString('en-IN')}` : '--' },
          { field: 'Appointment Date', headerName: 'Date of Appointment', width: 155, minWidth: 185, cellClass: 'text-center font-medium' },
          {
            field: 'Document',
            headerName: 'Appointment Order',
            width: 160,
            minWidth: 180,
            cellClass: 'text-center',
            cellRenderer: (params) => {
              const fileName = params.value;
              if (fileName) {
                return (
                  <a
                    href={`http://localhost:3000/download-yp-document?fileName=${encodeURIComponent(fileName)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 font-bold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                  >
                    <span>Download</span>
                  </a>
                );
              }
              return <span className="text-slate-400 dark:text-slate-500 font-medium">--</span>;
            }
          },
          { field: 'Created At', headerName: 'Created At', width: 150, minWidth: 120, cellClass: 'text-center text-slate-550 dark:text-slate-400 font-medium' },
          { field: 'Created By', headerName: 'Created By', width: 130, minWidth: 120, cellClass: 'text-slate-655 dark:text-slate-350 font-semibold' },
          { field: 'Last Updated At', headerName: 'Last Updated At', width: 150, minWidth: 150, cellClass: 'text-center text-slate-550 dark:text-slate-400 font-medium' }
        ]);
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
      columns.forEach(col => {
        if (col.headerName) {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      data.forEach((row, rowIndex) => {
        rowsHtml += '<tr>';
        columns.forEach(col => {
          if (col.headerName) {
            let val = '';
            if (col.field === 'S No' || col.field === 'sNo') {
              val = rowIndex + 1;
            } else if (col.valueFormatter) {
              val = col.valueFormatter({ value: row[col.field], data: row });
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
          <h3 className="text-base md:text-lg font-black text-slate-800 dark:text-slate-100 font-display">
            {currentView.title}
          </h3>
          <div className="flex flex-col sm:flex-row items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1">
            <span>As On date: <strong className="text-slate-700 dark:text-slate-200">30-6-2026</strong></span>
            <span className="hidden sm:inline text-slate-355 dark:text-slate-700">|</span>
            <span>(Report for the Month - <strong className="text-slate-700 dark:text-slate-200">June 2026</strong>)</span>
          </div>
        </div>
      </div>

      {/* AG Grid table wrapper */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm ag-theme-quartz yp-report-grid">
        <Table
          rowData={data}
          columnDefs={columns}
          loading={loading}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 20, 50]}
          enableExport={false} // Disable Table.jsx built-in top-right Export CSV button
          onFirstDataRendered={(params) => {
            if (currentView.type === 'drilldown') {
              params.api.autoSizeAllColumns(false);
            }
          }}
          onGridReady={(params) => setGridApi(params.api)}
          defaultColDef={{
            minWidth: 95,
            filter: true,
            sortable: true,
            resizable: true
          }}
        />
        {/* Style injection to style the column headers red */}
        <style dangerouslySetInnerHTML={{
          __html: `
          .yp-report-grid .ag-header {
            background-color: #bc3d5ceb !important;
          }
        `}} />
      </div>

      {/* Export Options & Total count at the bottom */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <ExportButtons
          onExportExcel={() => handleExport('Excel')}
          onExportPdf={() => handleExport('PDF')}
        />
        <div className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wider">
          Total Rows: {data.length}
        </div>
      </div>
    </div>
  );
}
