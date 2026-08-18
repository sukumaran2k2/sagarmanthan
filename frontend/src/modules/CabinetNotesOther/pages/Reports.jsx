import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReportTable from '../../../components/ReportTable';
import {
  fetchCabinetMinistryReport,
  fetchDetailMinistryReport,
  fetchCabinetMinistryPendencyReport,
  fetchDetailMinistryPendencyReport,
  fetchMinistryList
} from '../api';

const STAGE_MAP = {
  'No of Cabinet Notes': 'all',
  'Total Cabinet Notes': 'all',
  'Status Not Recorded': '0',
  'Received but yet to be sent for Comments': '1',
  'Received (Pending Comments)': '1',
  'Sent for Comments': '2',
  'Comments Received': '3',
  'File submitted for Approval': '4',
  'File Submitted': '4',
  'Reply furnished to other ministry': '5',
  'Reply Furnished': '5',
};

const cleanMinistryName = (name) => {
  if (!name) return '';
  const parts = String(name).split(',').map(s => s.trim()).filter(Boolean);
  return Array.from(new Set(parts)).join(' / ') || String(name);
};

function linkButton(label, onClick) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-transparent border-0 text-[#4b2424] dark:text-[#eadede] font-extrabold underline cursor-pointer text-[13px] p-0 hover:opacity-80"
    >
      {label}
    </button>
  );
}

function formatAsOnDate(date = new Date()) {
  return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
}

function formatReportMonth(date = new Date()) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export default function Reports({ triggerNotification }) {
  const [reportType, setReportType] = useState('pendency'); // 'pendency' | 'stagewise'
  const [drillDownPath, setDrillDownPath] = useState([
    {
      type: 'summary',
      title: 'Report No.: 6.2 - Pendency (Abstract) - Cabinet Notes/Bills from other Ministry'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [reportCols, setReportCols] = useState([]);

  // Ministry dropdown state fetched from /mmt-dropdown/mmt_ministry
  const [ministryList, setMinistryList] = useState([]);
  const [selectedMinistry, setSelectedMinistry] = useState('');

  useEffect(() => {
    fetchMinistryList()
      .then(res => {
        const list = res.data || [];
        setMinistryList(Array.isArray(list) ? list : []);
      })
      .catch(err => console.error("Error loading ministry dropdown:", err));
  }, []);

  const currentView = drillDownPath[drillDownPath.length - 1];

  const handleTabChange = (type) => {
    setReportType(type);
    setDrillDownPath([
      {
        type: 'summary',
        title: type === 'pendency'
          ? 'Report No.: 6.2 - Pendency (Abstract) - Cabinet Notes/Bills from other Ministry'
          : 'Report No.: 6.2 - Abstract - Cabinet Notes from Other Ministry'
      }
    ]);
  };

  const handleBack = () => {
    if (drillDownPath.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const buildColumnsFromData = (rows) => {
    if (!rows || rows.length === 0) return [];
    const sample = rows[0];
    return Object.keys(sample).map(key => ({
      headerName: key,
      field: key,
      sortable: true,
      filter: true
    }));
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (currentView.type === 'summary') {
        if (reportType === 'stagewise') {
          try {
            const res = await fetchCabinetMinistryReport();
            const rawRows = res.data?.rowData || (Array.isArray(res.data) ? res.data : []);
            const cleanedRows = rawRows.map(r => ({
              ...r,
              'Name of the Ministry/Department Received from': cleanMinistryName(r['Name of the Ministry/Department Received from'])
            }));
            setData(cleanedRows);
            if (res.data?.columnDefs && res.data.columnDefs.length > 0) {
              setReportCols(res.data.columnDefs);
            } else {
              setReportCols(buildColumnsFromData(cleanedRows));
            }
          } catch (err) {
            console.warn("Backend report endpoint error:", err);
            setData([]);
            setReportCols([]);
          }
        } else {
          // Pendency Report Summary
          try {
            const res = await fetchCabinetMinistryPendencyReport();
            const rawRows = res.data?.rowData || (Array.isArray(res.data) ? res.data : []);
            const cleanedRows = rawRows.map(r => ({
              ...r,
              'Name of the Ministry/Department Received from': cleanMinistryName(r['Name of the Ministry/Department Received from'])
            }));
            setData(cleanedRows);
            if (res.data?.columnDefs && res.data.columnDefs.length > 0) {
              setReportCols(res.data.columnDefs);
            } else {
              setReportCols(buildColumnsFromData(cleanedRows));
            }
          } catch (err) {
            console.warn("Backend pendency report endpoint error:", err);
            setData([]);
            setReportCols([]);
          }
        }
      } else if (currentView.type === 'detail') {
        let targetMinId = currentView.ministryId;
        if (!targetMinId || targetMinId === 'all' || targetMinId === '0') {
          const found = ministryList.find(m => cleanMinistryName(m.ministry_name || m.name) === cleanMinistryName(currentView.ministryName));
          if (found) targetMinId = found.ministry_id || found.id;
        }

        if (targetMinId) {
          try {
            if (reportType === 'stagewise') {
              const stageId = STAGE_MAP[currentView.stageKey] || 'all';
              const res = await fetchDetailMinistryReport(targetMinId, stageId);
              const rawRows = res.data?.rowData || (Array.isArray(res.data) ? res.data : []);
              const cols = (res.data?.columnDefs && res.data.columnDefs.length > 0) ? res.data.columnDefs : buildColumnsFromData(rawRows);
              const cleanedRows = rawRows.map(r => ({
                ...r,
                'Ministry Name': cleanMinistryName(r['Ministry Name'])
              }));
              setData(cleanedRows);
              setReportCols(cols);
            } else {
              let pendencyCountParam = 25;
              if (currentView.pendencyKey?.includes('31-60')) pendencyCountParam = 45;
              else if (currentView.pendencyKey?.includes('More') || currentView.pendencyKey?.includes('61')) pendencyCountParam = 61;

              const res = await fetchDetailMinistryPendencyReport(targetMinId, pendencyCountParam);
              const rawRows = res.data?.rowData || (Array.isArray(res.data) ? res.data : []);
              const cols = (res.data?.columnDefs && res.data.columnDefs.length > 0) ? res.data.columnDefs : buildColumnsFromData(rawRows);
              const cleanedRows = rawRows.map(r => ({
                ...r,
                'Ministry Name': cleanMinistryName(r['Ministry Name'])
              }));
              setData(cleanedRows);
              setReportCols(cols);
            }
          } catch (err) {
            console.warn("Backend detail endpoint error:", err);
            setData([]);
            setReportCols([]);
          }
        } else {
          setData([]);
          setReportCols([]);
        }
      }
    } catch (err) {
      console.error("Error loading report data:", err);
      setData([]);
      setReportCols([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, reportType, ministryList]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Column map renderers matching Parliamentary Issues burgundy style (#4b2424)
  const mapColumnRenderers = useCallback(
    (cols) =>
      cols.map((col) => {
        if (col.children) {
          return { ...col, children: mapColumnRenderers(col.children) };
        }

        const field = col.field || col.key || '';
        const header = col.headerName || col.label || '';
        const calcMinWidth = Math.max(130, header.length * 9 + 40);

        const baseCol = {
          ...col,
          filter: true,
          minWidth: col.minWidth || calcMinWidth,
          cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        };

        // Leftmost S.No formatting
        if (field === 'S No' || field === 'S.No' || header === 'S No' || header === 'S.No') {
          return {
            ...baseCol,
            pinned: 'left',
            lockPinned: true,
            suppressMovable: true,
            width: col.width || 75,
            minWidth: 65,
            cellRenderer: (p) => {
              if (p.node.rowPinned === 'bottom') return '';
              return (
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    color: '#4b2424',
                  }}
                >
                  {p.value}
                </span>
              );
            },
          };
        }

        // Ministry Name formatting in summary view (Plain text, no drilldown hyperlink matching original report)
        if (
          (field === 'Name of the Ministry/Department Received from' ||
           field === 'Ministry Name' ||
           header === 'Name of the Ministry/Department Received from' ||
           header === 'Ministry Name') &&
          currentView.type === 'summary'
        ) {
          return {
            ...baseCol,
            pinned: 'left',
            minWidth: col.minWidth || 280,
            cellStyle: { textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', paddingLeft: '12px' },
            cellRenderer: (p) => {
              if (p.node.rowPinned === 'bottom' || p.value === 'Total') {
                return <span className="font-extrabold text-[#4b2424] dark:text-[#eadede]">Total</span>;
              }
              return (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {cleanMinistryName(p.value) || '—'}
                </span>
              );
            },
          };
        }

        // Numeric Count Cell formatting - No drilldown for 0
        return {
          ...baseCol,
          cellRenderer: (p) => {
            if (p.node.rowPinned === 'bottom') {
              return (
                <span className="font-black text-[#4b2424] dark:text-[#eadede]">
                  {p.value !== undefined && p.value !== null && p.value !== '' ? p.value : 0}
                </span>
              );
            }
            const val = p.value;
            const countVal = Number(val);
            if (typeof val === 'number') {
              if (countVal <= 0) {
                return <span className="text-slate-400 dark:text-slate-500">-</span>;
              }
              if (currentView.type === 'summary') {
                // If it's Total No of Cabinet Ministry in Pendency Report, DO NOT render hyperlink (Plain text count)
                if (reportType === 'pendency' && (field.includes('Total') || header.includes('Total'))) {
                  return <span className="font-bold text-slate-800 dark:text-slate-200">{countVal}</span>;
                }

                const minId = p.data?.['Ministry Id'] ?? p.data?.['Ministry ID'] ?? p.data?.ministry_id;
                const minName = p.data?.['Name of the Ministry/Department Received from'] || p.data?.['Ministry Name'] || 'Ministry';
                return linkButton(String(countVal), () => {
                  setDrillDownPath((prev) => [
                    ...prev,
                    {
                      type: 'detail',
                      title: reportType === 'stagewise'
                        ? `Report No.: 6.2 - Detailed Ministry Notes - ${minName} (${field})`
                        : `Report No.: 6.2 - Detailed Ministry Pendency - ${minName} (${field})`,
                      ministryId: minId,
                      ministryName: minName,
                      stageKey: reportType === 'stagewise' ? field : undefined,
                      pendencyKey: reportType === 'pendency' ? field : undefined,
                    },
                  ]);
                });
              }
            }
            return val || '-';
          },
        };
      }),
    [currentView, reportType]
  );

  const columns = useMemo(() => {
    const mapped = mapColumnRenderers(reportCols);
    const isSerial = (col) => {
      const field = col.field || col.key || '';
      const header = col.headerName || col.label || '';
      return field === 'S No' || field === 'S.No' || header === 'S No' || header === 'S.No';
    };
    const isMinistryId = (col) => {
      const field = col.field || col.key || '';
      const header = col.headerName || col.label || '';
      return field === 'Ministry Id' || field === 'Ministry ID' || header === 'Ministry Id' || header === 'Ministry ID';
    };

    const serial = mapped.filter(isSerial);
    let rest = mapped.filter((col) => !isSerial(col) && !isMinistryId(col));

    if (reportType === 'pendency' && currentView.type === 'summary') {
      const orderMap = {
        'Name of the Ministry/Department Received from': 1,
        'Ministry Name': 1,
        'Total No of Cabinet Ministry': 2,
        '0-30 Days': 3,
        '31-60 Days': 4,
        'More than 60 Days': 5
      };
      rest.sort((a, b) => {
        const keyA = a.field || a.headerName || '';
        const keyB = b.field || b.headerName || '';
        return (orderMap[keyA] || 99) - (orderMap[keyB] || 99);
      });
    }

    return [...serial, ...rest];
  }, [mapColumnRenderers, reportCols, reportType, currentView.type]);

  const reportSubtitle = useMemo(() => {
    const asOn = formatAsOnDate();
    const month = formatReportMonth();
    return (
      <>
        {currentView?.ministryName && (
          <>
            <span>
              For Ministry:{' '}
              <strong className="text-[#4b2424] dark:text-[#eadede]">{currentView.ministryName}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-600">•</span>
          </>
        )}
        <span>
          As On date:{' '}
          <strong className="text-[#4b2424] dark:text-[#eadede] underline">{asOn}</strong>
        </span>
        <span className="text-slate-300 dark:text-slate-600">•</span>
        <span>
          (Report for the Month -{' '}
          <strong className="text-[#4b2424] dark:text-[#eadede]">{month}</strong>)
        </span>
      </>
    );
  }, [currentView?.ministryName]);

  const filteredData = useMemo(() => {
    if (!selectedMinistry) return data;
    return data.filter(row => {
      const mId = String(row['Ministry Id'] ?? row['Ministry ID'] ?? row.ministry_id ?? '');
      const mName = cleanMinistryName(row['Name of the Ministry/Department Received from'] || row['Ministry Name'] || row.ministry_name || '');
      return mId === String(selectedMinistry) || mName === cleanMinistryName(selectedMinistry);
    });
  }, [data, selectedMinistry]);

  const pinnedBottomRowData = useMemo(() => {
    if (!filteredData || filteredData.length === 0 || currentView.type !== 'summary') return undefined;

    const totalRow = {};
    const sample = filteredData[0];

    Object.keys(sample).forEach((key) => {
      if (key === 'S No' || key === 'S.No') {
        totalRow[key] = '';
      } else if (
        key === 'Name of the Ministry/Department Received from' ||
        key === 'Ministry Name' ||
        key === 'Ministry'
      ) {
        totalRow[key] = 'Total';
      } else if (key === 'Ministry Id' || key === 'Ministry ID') {
        totalRow[key] = '';
      } else {
        let sum = 0;
        let isNumericCol = false;

        filteredData.forEach((row) => {
          const val = row[key];
          if (typeof val === 'number' || (typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '')) {
            isNumericCol = true;
            sum += Number(val) || 0;
          }
        });

        if (isNumericCol) {
          totalRow[key] = sum;
        } else {
          totalRow[key] = '';
        }
      }
    });

    return [totalRow];
  }, [filteredData, currentView.type]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Sub-tabs & Ministry Dropdown filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-1 mb-2 select-none px-1 overflow-x-auto">
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleTabChange('pendency')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              reportType === 'pendency'
                ? 'border-[#4b2424] text-[#4b2424] dark:border-[#eadede] dark:text-[#eadede] bg-[#f7f3f3] dark:bg-slate-800 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            PENDENCY REPORT
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('stagewise')}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              reportType === 'stagewise'
                ? 'border-[#4b2424] text-[#4b2424] dark:border-[#eadede] dark:text-[#eadede] bg-[#f7f3f3] dark:bg-slate-800 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            ABSTRACT & DETAILED REPORT
          </button>
        </div>

        {/* Ministry Dropdown Filter (Fetched from /mmt-dropdown/mmt_ministry) */}
        {drillDownPath.length === 1 && (
          <div className="flex items-center space-x-2 shrink-0 py-1">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
              Ministry:
            </label>
            <select
              value={selectedMinistry}
              onChange={(e) => setSelectedMinistry(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:border-[#4b2424] cursor-pointer max-w-[260px] truncate"
            >
              <option value="">-- All Ministries --</option>
              {ministryList.map((m) => {
                const id = m.ministry_id || m.id;
                const name = cleanMinistryName(m.ministry_name || m.name);
                return (
                  <option key={id || name} value={id || name}>
                    {name}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {/* Main Container Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <ReportTable
          title={currentView.title}
          eyebrow={currentView.title}
          subtitle={reportSubtitle}
          showBackButton={drillDownPath.length > 1}
          onBack={handleBack}
          rawData={filteredData}
          viewData={filteredData}
          pinnedBottomRowData={pinnedBottomRowData}
          columns={columns}
          loading={loading}
          onRefresh={fetchReportData}
          pagination={true}
          brandColor="#4b2424"
          brandColorHover="#6b3535"
          accentColor="#f7f3f3"
          oddRowColor="#f8faf6"
          themeClass="yp-pro-grid"
          triggerNotification={triggerNotification}
        />
      </div>
    </div>
  );
}
