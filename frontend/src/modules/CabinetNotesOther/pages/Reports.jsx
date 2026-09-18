import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReportTable from '../../../components/ReportTable';
import { Filter, ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
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
  // Sub-tabs order: 1st Abstract & Detailed Report ('stagewise'), 2nd Pendency Report ('pendency')
  const [reportType, setReportType] = useState('stagewise');
  const [drillDownPath, setDrillDownPath] = useState([
    {
      type: 'summary',
      title: 'Report No.: 6.2 - Abstract - Cabinet Notes from Other Ministry'
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [reportCols, setReportCols] = useState([]);

  // Ministry dropdown filter state matching Capex style
  const [ministryList, setMinistryList] = useState([]);
  const [selectedMinistry, setSelectedMinistry] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(true);

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
    setSelectedMinistry('');
    setDrillDownPath([
      {
        type: 'summary',
        title: type === 'stagewise'
          ? 'Report No.: 6.2 - Abstract - Cabinet Notes from Other Ministry'
          : 'Report No.: 6.2 - Pendency (Abstract) - Cabinet Notes/Bills from other Ministry'
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
        if (reportType === 'stagewise') {
          try {
            const stageCode = STAGE_MAP[currentView.stageKey] || currentView.stageKey || 'all';
            const res = await fetchDetailMinistryReport(currentView.ministryId, stageCode);
            const rawRows = res.data?.rowData || (Array.isArray(res.data) ? res.data : []);
            const cleanedRows = rawRows.map(r => ({
              ...r,
              'Ministry Name': cleanMinistryName(r['Ministry Name'])
            }));
            setData(cleanedRows);
            if (res.data?.columnDefs && res.data.columnDefs.length > 0) {
              setReportCols(res.data.columnDefs);
            } else {
              setReportCols(buildColumnsFromData(cleanedRows));
            }
          } catch (err) {
            console.warn("Backend detail endpoint error:", err);
            setData([]);
            setReportCols([]);
          }
        } else {
          // Pendency Detail Report
          try {
            let countDateParam = '25';
            const pKey = String(currentView.pendencyKey || '').toLowerCase();
            if (pKey.includes('31-60') || pKey.includes('31 to 60')) {
              countDateParam = '45';
            } else if (pKey.includes('more than 60') || pKey.includes('61')) {
              countDateParam = '61';
            }

            const res = await fetchDetailMinistryPendencyReport(currentView.ministryId, countDateParam);
            const rawRows = res.data?.rowData || (Array.isArray(res.data) ? res.data : []);
            const cleanedRows = rawRows.map(r => ({
              ...r,
              'Ministry Name': cleanMinistryName(r['Ministry Name'])
            }));
            setData(cleanedRows);
            if (res.data?.columnDefs && res.data.columnDefs.length > 0) {
              setReportCols(res.data.columnDefs);
            } else {
              setReportCols(buildColumnsFromData(cleanedRows));
            }
          } catch (err) {
            console.warn("Backend pendency detail endpoint error:", err);
            setData([]);
            setReportCols([]);
          }
        }
      }
    } catch (e) {
      console.error("Fetch report error:", e);
      setData([]);
      setReportCols([]);
    } finally {
      setLoading(false);
    }
  }, [currentView, reportType]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

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
              if (p.node.rowPinned === 'bottom' || p.value === 'Total' || p.value === 'TOTAL (C)' || String(p.value).toUpperCase().startsWith('TOTAL')) {
                return <span className="font-black text-[#4b2424] dark:text-[#eadede] tracking-wider uppercase">TOTAL (C)</span>;
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
    const rest = mapped.filter((c) => !isSerial(c) && !isMinistryId(c));

    if (currentView.type === 'summary' && reportType === 'pendency') {
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
        totalRow[key] = 'TOTAL (C)';
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
      {/* Sub-tabs toolbar (1st ABSTRACT & DETAILED REPORT, 2nd PENDENCY REPORT) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-3 select-none px-1 overflow-x-auto">
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
      </div>

      {/* Collapsible Filter Section (Capex Report Style) */}
      {drillDownPath.length === 1 && (
        <div className="border border-[#e8d5c8] rounded-xl overflow-hidden bg-[#fcf9f7] dark:bg-slate-900 dark:border-slate-800 shadow-sm">
          {/* Toggle Header */}
          <button
            type="button"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="w-full px-4 py-3 bg-[#f5eeea] dark:bg-slate-800 hover:bg-[#ebdcd0] dark:hover:bg-slate-700 transition flex items-center justify-between text-xs font-extrabold text-[#4b2424] dark:text-[#eadede] cursor-pointer select-none"
          >
            <div className="flex items-center space-x-2">
              <Filter size={15} className="text-[#4b2424] dark:text-[#eadede]" />
              <span>Report Filters & Controls</span>
              {selectedMinistry !== '' && (
                <span className="px-2 py-0.5 bg-[#4b2424] text-white text-[10px] rounded-full font-bold">
                  Active Filters
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-[11px] text-[#6e3939] dark:text-slate-300 font-bold">
                {isFilterOpen ? 'Collapse' : 'Expand Filters'}
              </span>
              {isFilterOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {/* Collapsible Filter Body */}
          {isFilterOpen && (
            <div className="p-4 space-y-4 border-t border-[#e8d5c8] dark:border-slate-800 bg-white dark:bg-slate-900 animate-fade-in text-left">
              <div className="flex flex-wrap items-end justify-between gap-4">
                {/* Ministry Dropdown Filter */}
                <div className="min-w-[260px] flex-1 max-w-sm">
                  <label className="block text-xs font-extrabold text-[#4b2424] dark:text-[#eadede] mb-1">
                    Ministry
                  </label>
                  <select
                    value={selectedMinistry}
                    onChange={(e) => setSelectedMinistry(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-[#fcf9f7] dark:bg-slate-800 border border-[#d7c4b7] dark:border-slate-700 rounded-xl font-bold text-[#4b2424] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8c5757]/30 cursor-pointer truncate"
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

                {/* Reset Filters Button */}
                <div>
                  <button
                    type="button"
                    onClick={() => setSelectedMinistry('')}
                    className="px-3.5 py-2 bg-[#f5eeea] dark:bg-slate-800 hover:bg-[#ebdcd0] dark:hover:bg-slate-700 text-[#4b2424] dark:text-[#eadede] font-bold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Reset Filters</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
