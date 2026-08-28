import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReportTable from '../../../components/ReportTable';
import  {axiosInstance, fetchWings } from '../api.js';
import { STAGE_MAPPING, PENDENCY_AGE_MAPPING } from '../utils/constants';
import { FileText, Clock, Filter } from 'lucide-react';

export default function Reports({ triggerNotification }) {
  // Active Report Type: 'abstract' | 'pendency'
  const [reportType, setReportType] = useState('abstract');
  const [wingsList, setWingsList] = useState([]);
  const [selectedWingFilter, setSelectedWingFilter] = useState('');

  // Drilldown navigation stacks for both report modes
  const [abstractDrillDown, setAbstractDrillDown] = useState([
    {
      type: 'summary',
      url: '/vipwingwise-report',
      title: 'Report No.: 5.1A - Abstract ( Wing Wise ) - VIP References'
    }
  ]);

  const [pendencyDrillDown, setPendencyDrillDown] = useState([
    {
      type: 'summary',
      url: '/vip-pendencywingwise-report',
      title: 'Report No.: 5.1A - Pendency ( Wing Wise ) - VIP References'
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [reportCols, setReportCols] = useState([]);

  // Fetch wings list for the filter dropdown via centralized API service
  useEffect(() => {
    fetchWings()
      .then(res => setWingsList(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.warn('Could not fetch wings dropdown:', err.message));
  }, []);

  const currentDrillDown = reportType === 'abstract' ? abstractDrillDown : pendencyDrillDown;
  const setDrillDownPath = reportType === 'abstract' ? setAbstractDrillDown : setPendencyDrillDown;
  const currentView = currentDrillDown[currentDrillDown.length - 1];

  const handleBack = () => {
    if (currentDrillDown.length > 1) {
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const handleSwitchReportType = (type) => {
    if (type === reportType) return;
    setReportType(type);
    setSelectedWingFilter('');
  };

  // Fetch report data on view changes using JWT-authenticated API instance
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(currentView.url);
      const data = response.data || {};
      
      const rawRows = Array.isArray(data.rowData) ? data.rowData : (Array.isArray(data) ? data : []);
      const rawCols = Array.isArray(data.columnDefs) ? data.columnDefs : [];
      
      setReportData(rawRows);
      setReportCols(rawCols);
    } catch (err) {
      console.warn("VIP Reference report fetch notice:", err.response?.data?.error || err.message);
      setReportData([]);
      setReportCols([]);
    } finally {
      setLoading(false);
    }
  }, [currentView.url]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Recursively map cell renderers for drilldown links
  const mapColumnRenderers = useCallback((cols) => {
    return cols.map((col) => {
      // Handle nested column children
      if (col.children) {
        return {
          ...col,
          children: mapColumnRenderers(col.children)
        };
      }

      const fieldName = col.field || '';

      // 1. Click Wing Name / Division Name to drilldown
      if ((fieldName === 'Wing Name' || fieldName === 'Wing') && currentView.type === 'summary') {
        return {
          ...col,
          pinned: 'left',
          flex: reportType === 'pendency' ? 3 : 2,
          minWidth: 200,
          cellRenderer: (p) => {
            const wingId = p.data['Wing Id'] || p.data['Wing ID'] || p.data['Wing id'];
            const wingName = p.value;
            if (!wingId || !wingName || wingName === 'Total') {
              return <strong style={{ fontWeight: 800, color: '#4b2424' }}>{p.value}</strong>;
            }

            return (
              <button
                type="button"
                onClick={() => {
                  if (reportType === 'abstract') {
                    setDrillDownPath(prev => [
                      ...prev,
                      {
                        type: 'division',
                        wingId,
                        wingName,
                        url: `/vipdivisionwise-report/${wingId}/`,
                        title: `Report No.: 5.1B - Abstract ( Division Wise ) - VIP References (Wing: ${wingName})`
                      }
                    ]);
                  } else {
                    setDrillDownPath(prev => [
                      ...prev,
                      {
                        type: 'division',
                        wingId,
                        wingName,
                        url: `/vip-pendencydivisionwise-report/${wingId}/`,
                        title: `Report No.: 5.1B - Pendency ( Division Wise ) - VIP References (Wing: ${wingName})`
                      }
                    ]);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4b2424',
                  fontWeight: 800,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '13px'
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {p.value}
              </button>
            );
          }
        };
      }

      if (fieldName === 'Division Name' && currentView.type === 'division') {
        return {
          ...col,
          pinned: 'left',
          flex: reportType === 'pendency' ? 3 : 2,
          minWidth: 200,
          cellRenderer: (p) => {
            if (p.value === 'Total') {
              return <strong style={{ fontWeight: 800, color: '#4b2424' }}>Total</strong>;
            }
            return <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">{p.value}</span>;
          }
        };
      }

      // 2. Abstract Report: Click stage count cell value to drilldown to Detail view
      // "No of VIP Reference" is explicitly NON-CLICKABLE
      if (reportType === 'abstract') {
        const isStageCount = STAGE_MAPPING[fieldName] !== undefined;

        if (isStageCount) {
          return {
            ...col,
            flex: 1,
            minWidth: 100,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => {
              const countVal = parseInt(p.value, 10);
              if (isNaN(countVal) || countVal <= 0) {
                return <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>;
              }

              const wingId = p.data['Wing Id'] || p.data['Wing ID'] || currentView.wingId;
              const divisionId = p.data['Division ID'] || p.data['Division Id'];
              
              const stageId = STAGE_MAPPING[fieldName];
              const stageLabel = fieldName;

              let detailUrl = '';
              let detailTitle = '';

              if (currentView.type === 'division' && divisionId) {
                const divName = p.data['Division Name'] || 'Division';
                detailUrl = `/getvip-divisionwise/${divisionId}/${stageId}`;
                detailTitle = `VIP Reference Details - Division: ${divName} | Stage: ${stageLabel}`;
              } else if (wingId) {
                const wingName = p.data['Wing Name'] || p.data['Wing'] || currentView.wingName || 'Wing';
                detailUrl = `/getvip-wingwise/${wingId}/${stageId}`;
                detailTitle = `VIP Reference Details - Wing: ${wingName} | Stage: ${stageLabel}`;
              }

              if (!detailUrl) return p.value;

              return (
                <button
                  type="button"
                  onClick={() => {
                    setDrillDownPath(prev => [
                      ...prev,
                      {
                        type: 'detail',
                        url: detailUrl,
                        title: detailTitle
                      }
                    ]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4b2424',
                    fontWeight: 800,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {p.value}
                </button>
              );
            }
          };
        }

        if (fieldName === 'No of VIP Reference') {
          return {
            ...col,
            flex: 1.2,
            minWidth: 140,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => (
              <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>
                {p.value || '0'}
              </span>
            )
          };
        }
      }

      // 3. Pendency Report: Click pendency age bucket to drilldown to Detail view
      // Fits to screen width with proportional flex on all columns
      if (reportType === 'pendency') {
        const isAgeBucket = PENDENCY_AGE_MAPPING[fieldName] !== undefined;

        if (isAgeBucket) {
          return {
            ...col,
            flex: 1.5,
            minWidth: 120,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => {
              const countVal = parseInt(p.value, 10);
              if (isNaN(countVal) || countVal <= 0) {
                return <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>;
              }

              const wingId = p.data['Wing ID'] || p.data['Wing Id'] || currentView.wingId;
              const divisionId = p.data['Division Id'] || p.data['Division ID'];
              const countDate = PENDENCY_AGE_MAPPING[fieldName];

              let detailUrl = '';
              let detailTitle = '';

              if (currentView.type === 'division' && divisionId) {
                const divName = p.data['Division Name'] || 'Division';
                detailUrl = `/getvippendency-divisionwise/${divisionId}/${countDate}`;
                detailTitle = `Pending VIP References - Division: ${divName} | Age: ${fieldName}`;
              } else if (wingId) {
                const wingName = p.data['Wing'] || p.data['Wing Name'] || currentView.wingName || 'Wing';
                detailUrl = `/getvippendency-wingwise/${wingId}/${countDate}`;
                detailTitle = `Pending VIP References - Wing: ${wingName} | Age: ${fieldName}`;
              }

              if (!detailUrl) return p.value;

              return (
                <button
                  type="button"
                  onClick={() => {
                    setDrillDownPath(prev => [
                      ...prev,
                      {
                        type: 'detail',
                        url: detailUrl,
                        title: detailTitle
                      }
                    ]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#4b2424',
                    fontWeight: 800,
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.75'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
                >
                  {p.value}
                </button>
              );
            }
          };
        }

        if (fieldName === 'Total No of Pending VIP References') {
          return {
            ...col,
            flex: 2,
            minWidth: 160,
            cellStyle: { textAlign: 'center' },
            cellRenderer: (p) => (
              <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '12px' }}>
                {p.value || '0'}
              </span>
            )
          };
        }
      }

      // Styled Monospace S.No
      if (fieldName === 'S No' || fieldName === 'S.No') {
        return {
          ...col,
          pinned: 'left',
          width: 70,
          minWidth: 60,
          maxWidth: 80,
          cellStyle: { textAlign: 'center' },
          cellRenderer: (p) => (
            <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 11, fontFamily: 'monospace' }}>
              {p.value}
            </span>
          )
        };
      }

      // Wrap text for subjects in detail view
      if (fieldName === 'Subject') {
        return {
          ...col,
          flex: 2.5,
          minWidth: 280,
          wrapText: true,
          autoHeight: true,
          cellStyle: { whiteSpace: 'normal', lineHeight: '1.5', padding: '10px 8px' }
        };
      }

      return {
        ...col,
        flex: col.flex || 1,
        minWidth: col.minWidth || 120
      };
    });
  }, [currentView, reportType, setDrillDownPath]);

  // Filter raw rows based on Wing Dropdown Filter if selected
  const filteredData = useMemo(() => {
    if (!selectedWingFilter) return reportData;
    return reportData.filter(row => {
      const wId = String(row['Wing Id'] || row['Wing ID'] || row['Wing id'] || '');
      const wName = String(row['Wing Name'] || row['Wing'] || '').toLowerCase();
      return wId === String(selectedWingFilter) || wName.includes(selectedWingFilter.toLowerCase());
    });
  }, [reportData, selectedWingFilter]);

  const mappedCols = useMemo(() => {
    // Hide internal ID fields
    const filterIds = reportCols.filter(col => {
      const fieldLower = (col.field || '').toLowerCase();
      return fieldLower !== 'wing id' && fieldLower !== 'division id';
    });
    return mapColumnRenderers(filterIds);
  }, [reportCols, mapColumnRenderers]);

  // Calculate bottom summary pinned row
  const pinnedBottomRowData = useMemo(() => {
    if (currentView.type === 'detail' || filteredData.length === 0) return undefined;

    const summaryRow = {
      'S No': '',
      'Wing Name': 'Total',
      'Wing': 'Total',
      'Division Name': 'Total'
    };

    const keysToSum = [
      'No of VIP Reference',
      'No Status',
      'Received but yet to be sent for Comments',
      'Submitted for Approval',
      'Comments Sought',
      'Comments Received',
      'Reply Furnished',
      'Disposed',
      'Total No of Pending VIP References',
      '0-30 Days',
      '31-60 Days',
      'More Than 60 Days'
    ];

    keysToSum.forEach(key => {
      let total = 0;
      let hasCol = false;
      filteredData.forEach(row => {
        if (row[key] !== undefined && row[key] !== null) {
          hasCol = true;
          total += parseInt(row[key], 10) || 0;
        }
      });
      if (hasCol) {
        summaryRow[key] = total;
      }
    });

    return [summaryRow];
  }, [filteredData, currentView.type]);

  const currentDateText = useMemo(() => {
    const today = new Date();
    const day = today.getDate();
    const monthIndex = today.getMonth();
    const year = today.getFullYear();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return {
      asOn: `${day}-${monthIndex + 1}-${year}`,
      monthName: `${monthNames[monthIndex]} ${year}`
    };
  }, []);

  const subtitle = useMemo(() => (
    <>
      <span>As on date: <strong style={{ color: '#4b2424' }}>{currentDateText.asOn}</strong></span>
      <span style={{ color: '#eadede' }}>•</span>
      <span>Report for the month — <strong style={{ color: '#4b2424' }}>{currentDateText.monthName}</strong></span>
    </>
  ), [currentDateText]);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
    flex: 1,
    minWidth: 100,
    cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' }
  }), []);

  return (
    <div className="space-y-6 animate-fade-in w-full">
      
      {/* Top Report Switcher Pill Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 select-none">
        <button
          type="button"
          onClick={() => handleSwitchReportType('abstract')}
          className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            reportType === 'abstract'
              ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-400 rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Abstract & Detailed Report</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchReportType('pendency')}
          className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            reportType === 'pendency'
              ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-400 rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Pendency Report</span>
        </button>
      </div>

      {/* Main Report Table (Full Width Fitted) */}
      <div className="w-full">
        <ReportTable
          title={currentView.title}
          subtitle={subtitle}
          rawData={filteredData}
          viewData={filteredData}
          columns={mappedCols}
          defaultColDef={defaultColDef}
          showBackButton={currentDrillDown.length > 1}
          onBack={handleBack}
          themeClass="yp-pro-grid"
          brandColor="#4b2424"
          brandColorHover="#6b3535"
          accentColor="#f7f3f3"
          oddRowColor="#f8faf6"
          pinnedBottomRowData={pinnedBottomRowData}
          totalLabel="Total Rows"
          pagination={currentView.type === 'detail'}
          loading={loading}
          onRefresh={fetchReportData}
          triggerNotification={triggerNotification}
          toolbarExtra={
            currentView.type === 'summary' && (
              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-[#4b2424]">Wing:</label>
                <select
                  value={selectedWingFilter}
                  onChange={(e) => setSelectedWingFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-[#e8d5d5] rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-1 focus:ring-[#4b2424]"
                >
                  <option value="">-- Show All --</option>
                  {wingsList.map(w => (
                    <option key={w.wing_id || w.wing_name} value={w.wing_id || w.wing_name}>
                      {w.wing_name}
                    </option>
                  ))}
                </select>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
