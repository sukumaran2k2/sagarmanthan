import { useState, useEffect, useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import ReportTable from '../../../components/ReportTable';
import { useVipStore } from '../store/useVipStore';
import {
  fetchWings,
  fetchVIPWingWiseReport,
  fetchVIPDivisionWiseReport,
  fetchVIPWingDetail,
  fetchVIPDivisionDetail,
  fetchVIPPendencyWingWiseReport,
  fetchVIPPendencyDivisionWiseReport,
  fetchVIPPendencyWingDetail,
  fetchVIPPendencyDivisionDetail,
} from '../api';
import { STAGE_MAPPING, PENDENCY_AGE_MAPPING } from '../utils/constants';
import { FileText, Clock, Filter, ChevronDown, RotateCcw } from 'lucide-react';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

// The report endpoints answer 404 "No data available" when a wing or division simply has
// no references. That is an ordinary empty result, not a failure, so it must not raise the
// red "could not load" toast.
const isEmptyResult = (err) => err?.response?.status === 404;

// Every view in the drilldown names one of these instead of carrying a URL string, so the
// endpoints stay in api.js rather than being rebuilt by hand in the cell renderers.
const REPORT_SOURCES = {
  abstractWings: () => fetchVIPWingWiseReport(),
  abstractDivisions: ({ wingId }) => fetchVIPDivisionWiseReport(wingId),
  abstractWingDetail: ({ wingId, stageId }) => fetchVIPWingDetail(wingId, stageId),
  abstractDivisionDetail: ({ divisionId, stageId }) => fetchVIPDivisionDetail(divisionId, stageId),
  pendencyWings: () => fetchVIPPendencyWingWiseReport(),
  pendencyDivisions: ({ wingId }) => fetchVIPPendencyDivisionWiseReport(wingId),
  pendencyWingDetail: ({ wingId, countDate }) => fetchVIPPendencyWingDetail(wingId, countDate),
  pendencyDivisionDetail: ({ divisionId, countDate }) => fetchVIPPendencyDivisionDetail(divisionId, countDate),
};

export default function Reports({ triggerNotification }) {
  const notify = useNotifier(triggerNotification);

  // Report mode, wing filter and both drill-down trails live in the store, so the report
  // reopens where the user left it instead of resetting on every tab switch.
  const {
    type: reportType,
    wingFilter: selectedWingFilter,
    filterOpen,
    abstractPath,
    pendencyPath,
  } = useVipStore(useShallow((state) => state.report));
  const setReportType = useVipStore((state) => state.setReportType);
  const setSelectedWingFilter = useVipStore((state) => state.setReportWingFilter);
  const setFilterOpen = useVipStore((state) => state.setReportFilterOpen);
  const setDrillDownPath = useVipStore((state) => state.setReportPath);

  const [wingsList, setWingsList] = useState([]);

  // Drilldown navigation stacks for both report modes
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  const [reportCols, setReportCols] = useState([]);

  // Fetch wings list for the filter dropdown via centralized API service
  useEffect(() => {
    let cancelled = false;
    fetchWings()
      .then(res => { if (!cancelled) setWingsList(Array.isArray(res.data) ? res.data : []); })
      .catch(() => {
        if (cancelled) return;
        notify(COMMON_TOASTS.loadFailed('The wing filter list'));
      });
    return () => { cancelled = true; };
  }, [notify]);

  const currentDrillDown = reportType === 'abstract' ? abstractPath : pendencyPath;
  const currentView = currentDrillDown[currentDrillDown.length - 1];

  // Every navigation flips `loading` here rather than inside the fetching effect, so the
  // spinner shows straight away and the effect body stays free of setState.
  const pushView = useCallback((view) => {
    setLoading(true);
    setDrillDownPath(prev => [...prev, view]);
  }, [setDrillDownPath]);

  const handleBack = () => {
    if (currentDrillDown.length > 1) {
      setLoading(true);
      setDrillDownPath(prev => prev.slice(0, -1));
    }
  };

  const handleSwitchReportType = (type) => {
    if (type === reportType) return;
    setLoading(true);
    setReportType(type); // also clears the wing filter
  };

  // Fetch report data for one view using the JWT-authenticated API instance.
  // Returns a cancel function: drilling down quickly starts a second request while the first
  // is still in flight, and without this the slower one could overwrite the newer view's rows.
  const loadReportData = useCallback((view) => {
    const source = REPORT_SOURCES[view.source];
    const request = source
      ? source(view)
      : Promise.reject(new Error(`Unknown VIP report source: ${view.source}`));

    let cancelled = false;
    request
      .then((response) => {
        if (cancelled) return;
        const data = response.data || {};
        setReportData(Array.isArray(data.rowData) ? data.rowData : (Array.isArray(data) ? data : []));
        setReportCols(Array.isArray(data.columnDefs) ? data.columnDefs : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setReportData([]);
        setReportCols([]);
        if (isEmptyResult(err)) return;
        console.error('VIP Reference report fetch failed:', err);
        notify(COMMON_TOASTS.loadFailed('This VIP Reference report'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [notify]);

  // Kept for ReportTable's refresh button, which is an event handler, not an effect
  const fetchReportData = useCallback(() => {
    setLoading(true);
    loadReportData(currentView);
  }, [loadReportData, currentView]);

  // No synchronous setState in the body: `loading` starts true and every navigation sets it
  // before the view changes, so this never forces an extra render pass.
  useEffect(() => loadReportData(currentView), [loadReportData, currentView]);

  // Recursively map cell renderers for drilldown links.
  // The recursion goes through the inner `mapAll`, so the callback never refers to itself
  // before it is declared.
  const mapColumnRenderers = useCallback((cols) => {
    const mapAll = (list) => list.map((col) => {
      // Handle nested column children
      if (col.children) {
        return {
          ...col,
          children: mapAll(col.children)
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
                  pushView(reportType === 'abstract'
                    ? {
                      type: 'division',
                      source: 'abstractDivisions',
                      wingId,
                      wingName,
                      title: `Report No.: 5.1B - Abstract ( Division Wise ) - VIP References (Wing: ${wingName})`
                    }
                    : {
                      type: 'division',
                      source: 'pendencyDivisions',
                      wingId,
                      wingName,
                      title: `Report No.: 5.1B - Pendency ( Division Wise ) - VIP References (Wing: ${wingName})`
                    });
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
          const isLongCol = fieldName === 'Received but yet to be sent for Comments';
          return {
            ...col,
            flex: isLongCol ? 2.5 : 1.5,
            minWidth: isLongCol ? 220 : 140,
            wrapText: true,
            autoHeight: true,
            cellStyle: { textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.5', padding: '8px 12px' },
            cellRenderer: (p) => {
              const countVal = parseInt(p.value, 10);
              if (isNaN(countVal) || countVal <= 0) {
                return <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>;
              }

              const wingId = p.data['Wing Id'] || p.data['Wing ID'] || currentView.wingId;
              const divisionId = p.data['Division ID'] || p.data['Division Id'];
              
              const stageId = STAGE_MAPPING[fieldName];
              const stageLabel = fieldName;

              let detailView = null;

              if (currentView.type === 'division' && divisionId) {
                const divName = p.data['Division Name'] || 'Division';
                detailView = {
                  type: 'detail',
                  source: 'abstractDivisionDetail',
                  divisionId,
                  stageId,
                  title: `VIP Reference Details - Division: ${divName} | Stage: ${stageLabel}`,
                };
              } else if (wingId) {
                const wingName = p.data['Wing Name'] || p.data['Wing'] || currentView.wingName || 'Wing';
                detailView = {
                  type: 'detail',
                  source: 'abstractWingDetail',
                  wingId,
                  stageId,
                  title: `VIP Reference Details - Wing: ${wingName} | Stage: ${stageLabel}`,
                };
              }

              if (!detailView) return p.value;

              return (
                <button
                  type="button"
                  onClick={() => pushView(detailView)}
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
            wrapText: true,
            autoHeight: true,
            cellStyle: { textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.5', padding: '8px 12px' },
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
            wrapText: true,
            autoHeight: true,
            cellStyle: { textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.5', padding: '8px 12px' },
            cellRenderer: (p) => {
              const countVal = parseInt(p.value, 10);
              if (isNaN(countVal) || countVal <= 0) {
                return <span style={{ color: '#94a3b8', fontWeight: 700 }}>—</span>;
              }

              const wingId = p.data['Wing ID'] || p.data['Wing Id'] || currentView.wingId;
              const divisionId = p.data['Division Id'] || p.data['Division ID'];
              const countDate = PENDENCY_AGE_MAPPING[fieldName];

              let detailView = null;

              if (currentView.type === 'division' && divisionId) {
                const divName = p.data['Division Name'] || 'Division';
                detailView = {
                  type: 'detail',
                  source: 'pendencyDivisionDetail',
                  divisionId,
                  countDate,
                  title: `Pending VIP References - Division: ${divName} | Age: ${fieldName}`,
                };
              } else if (wingId) {
                const wingName = p.data['Wing'] || p.data['Wing Name'] || currentView.wingName || 'Wing';
                detailView = {
                  type: 'detail',
                  source: 'pendencyWingDetail',
                  wingId,
                  countDate,
                  title: `Pending VIP References - Wing: ${wingName} | Age: ${fieldName}`,
                };
              }

              if (!detailView) return p.value;

              return (
                <button
                  type="button"
                  onClick={() => pushView(detailView)}
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
            wrapText: true,
            autoHeight: true,
            cellStyle: { textAlign: 'center', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.5', padding: '8px 12px' },
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

      if (fieldName === 'Eoffice File Number' || fieldName === 'Reference Letter Number' || fieldName === 'Received From') {
        return {
          ...col,
          flex: 2,
          minWidth: 200,
          wrapText: true,
          autoHeight: true,
          cellStyle: { whiteSpace: 'normal', lineHeight: '1.5', padding: '8px 12px' }
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
        minWidth: col.minWidth || 120,
        wrapText: true,
        autoHeight: true
      };
    });

    return mapAll(cols);
  }, [currentView, reportType, pushView]);

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

  const exportSubtitle = useMemo(() =>
    `As on date: ${currentDateText.asOn} | Report for the month — ${currentDateText.monthName}`,
  [currentDateText]);

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
    wrapText: true,
    autoHeight: true,
    cellStyle: {
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      lineHeight: '1.5',
      padding: '8px 12px'
    }
  }), []);

  // Only the summary filters by wing - a drill-down is already scoped to one.
  const canFilter = currentView.type === 'summary';
  const activeFilterCount = selectedWingFilter ? 1 : 0;

  // A collapsible Filter button beside the report's Rows selector, with its body opening
  // under the toolbar through ReportTable's filterPanel slot - the same control the Data
  // List and the Cabinet Notes report use.
  const filterButton = canFilter ? (
    <button
      type="button"
      onClick={() => setFilterOpen(open => !open)}
      aria-expanded={filterOpen}
      title={filterOpen ? 'Hide report filters' : 'Show report filters'}
      className={`inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[9px] border text-xs font-bold transition cursor-pointer ${
        filterOpen || activeFilterCount > 0
          ? 'bg-[#f7f3f3] border-[#d7c4b7] text-[#4b2424] dark:bg-slate-800 dark:border-slate-600 dark:text-[#eadede]'
          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      <Filter size={14} className="text-[#4b2424] dark:text-[#eadede]" />
      <span>Filter</span>
      {activeFilterCount > 0 && (
        <span className="bg-[#4b2424] dark:bg-[#8c5757] text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
          {activeFilterCount}
        </span>
      )}
      <ChevronDown size={14} className={`transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} />
    </button>
  ) : null;

  const filterBody = canFilter && filterOpen ? (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full sm:w-auto sm:min-w-[260px] flex-1 sm:max-w-sm">
        <label className="block text-[11px] font-extrabold text-[#4b2424] dark:text-[#eadede] mb-1 uppercase tracking-wider">
          Wing
        </label>
        <select
          value={selectedWingFilter}
          onChange={(e) => setSelectedWingFilter(e.target.value)}
          className="w-full text-xs px-3 py-2 bg-white dark:bg-slate-800 border border-[#d7c4b7] dark:border-slate-700 rounded-xl font-bold text-[#4b2424] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#8c5757]/30 cursor-pointer truncate"
        >
          <option value="">-- Show All --</option>
          {wingsList.map(w => (
            <option key={w.wing_id || w.wing_name} value={w.wing_id || w.wing_name}>
              {w.wing_name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => setSelectedWingFilter('')}
        disabled={activeFilterCount === 0}
        className="px-3.5 py-2 bg-[#f5eeea] dark:bg-slate-800 hover:bg-[#ebdcd0] dark:hover:bg-slate-700 text-[#4b2424] dark:text-[#eadede] font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#f5eeea] dark:disabled:hover:bg-slate-800"
      >
        <RotateCcw size={14} />
        <span>Reset Filter</span>
      </button>
    </div>
  ) : null;

  return (
    <div className="space-y-6 animate-fade-in w-full">
      
      {/* Top Report Switcher Pill Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3 select-none overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => handleSwitchReportType('abstract')}
          className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
            reportType === 'abstract'
              ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-400 rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span>Abstract & Detailed Report</span>
        </button>

        <button
          type="button"
          onClick={() => handleSwitchReportType('pendency')}
          className={`flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
            reportType === 'pendency'
              ? 'border-[#4b2424] text-[#4b2424] bg-[#f7f3f3] dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-400 rounded-t-lg shadow-sm'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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
          totalLabel="Total"
          pagination={currentView.type === 'detail'}
          loading={loading}
          onRefresh={fetchReportData}
          triggerNotification={triggerNotification}
          exportSubtitle={exportSubtitle}
          autoHeaderHeight={true}
          toolbarExtra={filterButton}
          filterPanel={filterBody}
        />
      </div>
    </div>
  );
}
