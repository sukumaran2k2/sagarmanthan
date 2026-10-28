import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Filter, AlertCircle, RefreshCw } from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import AttendanceKpiHeader from '../components/AttendanceKpiHeader';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS } from '../../../utils/notify';
import { exportTableRows } from '../../../utils/exportTableRows';
import { useAttendanceStore } from '../store/useAttendanceStore';
import { ATTENDANCE_TOASTS } from '../toastMessages';
import { kpisFromReport } from '../utils/attendanceKpis';
import { MONTHS, formatTimeStr, secondsToTime } from '../utils/attendanceUtils';

const WEEKS = [1, 2, 3, 4, 5];
const HIDDEN = new Set(['Year', 'Month', 'Week', 'WingID']);
const asRows = (data) => (Array.isArray(data) ? data : data?.rowData || []);

// Which employees a report column counts, as the server's detail endpoint names it
const detailType = (column) => {
  const c = column.toLowerCase();
  if (c.includes('intime before')) return 'beforeIn';
  if (c.includes('intime after')) return 'afterIn';
  if (c.includes('outtime before')) return 'beforeOut';
  if (c.includes('less than')) return 'avgWorkCount';
  if (c === 'average working hours') return 'avgWorkHours';
  return 'noOfEmp';
};

// Report cell text: the wing-wise Average Working Hours is a decimal number of hours
const cellText = (key, value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'Average Working Hours') return secondsToTime(Number(value) * 3600);
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return formatTimeStr(value);
};

export default function ReportPage({ notify, years }) {
  const period = useAttendanceStore((state) => state.reportPeriod);
  const setPeriod = useAttendanceStore((state) => state.setReportPeriod);
  const pageSize = useAttendanceStore((state) => state.pageSize);
  const setPageSize = useAttendanceStore((state) => state.setPageSize);

  // First visit: open on the latest uploaded period
  useEffect(() => {
    if (period) return undefined;
    let cancelled = false;
    const now = new Date();
    const fallback = { month: MONTHS[now.getMonth()], year: String(now.getFullYear()), week: 1 };
    api.get('/employee-attendance-check')
      .then((res) => {
        const latest = asRows(res.data)[0];
        if (!cancelled) setPeriod(latest ? { month: latest.Month, year: String(latest.Year), week: Number(latest.Week) || 1 } : fallback);
      })
      .catch((err) => {
        console.error('Latest attendance period could not be loaded:', err);
        if (!cancelled) setPeriod(fallback);
      });
    return () => { cancelled = true; };
  }, [period, setPeriod]);

  // Wing-wise summary for the period, tagged with the request it answers
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = period ? JSON.stringify([period.month, period.year, period.week, reloadKey]) : null;
  const [summary, setSummary] = useState(null); // { key, rows, failed }
  useEffect(() => {
    if (!requestKey) return undefined;
    let cancelled = false;
    api.get(`/employee-attendance-weekone-report/${period.month}/${period.year}/${period.week}`)
      .then((res) => { if (!cancelled) setSummary({ key: requestKey, rows: asRows(res.data) }); })
      .catch((err) => {
        if (cancelled) return;
        // 404 = nothing uploaded for that week
        if (err.response?.status !== 404) {
          console.error('Attendance report could not be loaded:', err);
          notify(COMMON_TOASTS.loadFailed('The attendance report'));
        }
        setSummary({ key: requestKey, rows: [], failed: err.response?.status !== 404 });
      });
    return () => { cancelled = true; };
  }, [requestKey, period, notify]);
  const loading = !requestKey || summary?.key !== requestKey;
  const summaryRows = useMemo(() => (loading ? [] : summary.rows), [loading, summary]);

  // Drill-down: the employees behind one report cell
  const [detail, setDetail] = useState(null); // { wing, wingId, column }
  const detailKey = detail && requestKey ? JSON.stringify([requestKey, detail.wingId, detail.column]) : null;
  const [detailResult, setDetailResult] = useState(null); // { key, rows }
  useEffect(() => {
    if (!detailKey) return undefined;
    let cancelled = false;
    api.get(`/employee-attendance-weekone-detail/${period.year}/${period.month}/${encodeURIComponent(detail.wingId)}/0/${detailType(detail.column)}/${period.week}`)
      .then((res) => { if (!cancelled) setDetailResult({ key: detailKey, rows: asRows(res.data) }); })
      .catch((err) => {
        if (cancelled) return;
        console.error('Attendance detail could not be loaded:', err);
        setDetailResult({ key: detailKey, rows: [] });
        notify(ATTENDANCE_TOASTS.detailFailed(detail.wing));
      });
    return () => { cancelled = true; };
  }, [detailKey, detail, period, notify]);
  const detailLoading = !!detailKey && detailResult?.key !== detailKey;
  const detailRows = useMemo(() => (detailKey && !detailLoading ? detailResult.rows : []), [detailKey, detailLoading, detailResult]);

  const changePeriod = (changes) => {
    setDetail(null);
    setPeriod(changes);
  };

  const summaryKeys = useMemo(() => (summaryRows[0] ? Object.keys(summaryRows[0]).filter((k) => !HIDDEN.has(k)) : []), [summaryRows]);
  const summaryColumns = useMemo(() => summaryKeys.map((key) => {
    const isWing = key === 'Wing';
    return {
      headerName: key,
      field: key,
      flex: isWing ? 2 : 1,
      minWidth: isWing ? 180 : 140,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      pinned: isWing ? 'left' : null,
      cellClass: isWing
        ? 'font-semibold text-[#0f417a] dark:text-blue-400 flex items-center'
        : 'text-center font-bold flex items-center justify-center cursor-pointer hover:bg-amber-50/80 dark:hover:bg-amber-950/30',
      valueFormatter: (p) => cellText(key, p.value),
      onCellClicked: (p) => {
        if (!p.data || p.data.Wing === 'Total' || !p.data.WingID) return;
        setDetail({ wing: p.data.Wing, wingId: p.data.WingID, column: isWing ? 'Number Of Employees' : key });
      },
    };
  }), [summaryKeys]);

  const detailKeys = useMemo(() => (detailRows[0] ? Object.keys(detailRows[0]) : []), [detailRows]);
  const detailColumns = useMemo(() => [
    { headerName: 'S.No', width: 70, pinned: 'left', valueGetter: (p) => p.node.rowIndex + 1, cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center' },
    ...detailKeys.map((key) => ({
      headerName: key,
      field: key,
      flex: /name/i.test(key) ? 2 : 1,
      minWidth: /name/i.test(key) ? 180 : 120,
      cellClass: /name/i.test(key) ? 'font-semibold flex items-center' : 'text-center flex items-center justify-center',
      valueFormatter: (p) => cellText(key, p.value),
    })),
  ], [detailKeys]);

  const kpis = useMemo(() => kpisFromReport(summaryRows), [summaryRows]);

  // Copy / Excel / PDF export the table on show
  const handleExport = (type) => {
    const keys = detail ? detailKeys : summaryKeys;
    exportTableRows(type, {
      columns: keys.map((k) => ({ key: k, label: k, value: (r) => cellText(k, r[k]) })),
      rows: detail ? detailRows : summaryRows,
      fileName: detail ? `Attendance_${detail.wing}_${period.month}_${period.year}_Week${period.week}` : `Attendance_Report_${period?.month}_${period?.year}_Week${period?.week}`,
      title: detail ? `Attendance - ${detail.wing} - ${detail.column}` : `Attendance Report - Week ${period?.week}, ${period?.month} ${period?.year}`,
      notify,
    });
  };

  const yearOptions = [...new Set([...(years || []), period?.year].filter(Boolean))].sort().reverse();
  const selectClass = 'module-form-select !w-auto !py-2';

  return (
    <div className="space-y-6">
      {!detail && (
        <AttendanceKpiHeader
          totalEmployeesStat={kpis.employees}
          avgWorkingHoursFormatted={kpis.avgWorkingHours}
          punctualArrivalRate={kpis.punctualRate}
          earlyCheckoutRate={kpis.earlyCheckoutRate}
        />
      )}

      <div className="module-card space-y-5">
        {/* Period */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-slate-700 dark:text-slate-200">
              <Filter size={14} className="text-[#0f417a] dark:text-blue-400" /> Report Period
            </span>
            <select value={period?.month || ''} onChange={(e) => changePeriod({ month: e.target.value })} className={selectClass} disabled={!period}>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={period?.year || ''} onChange={(e) => changePeriod({ year: e.target.value })} className={selectClass} disabled={!period}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={period?.week || ''} onChange={(e) => changePeriod({ week: Number(e.target.value) })} className={selectClass} disabled={!period}>
              {WEEKS.map((w) => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="px-3.5 py-2 bg-[#0f417a] hover:bg-[#0c3361] text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {detail ? (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer flex items-center gap-1.5 font-bold text-xs"
              >
                <ChevronLeft size={16} />
                <span>Back to Summary</span>
              </button>
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Form No.: 1.3B - Detailed - Attendance Sheet</h3>
                <p className="text-xs font-semibold text-slate-500">
                  {detail.wing} · {detail.column} · Week {period.week}, {period.month} {period.year}
                </p>
              </div>
            </div>
          ) : (
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              Abstract Summary Report {period ? `(Week ${period.week}, ${period.month} ${period.year})` : ''}
            </h3>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0">
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <CopyButton onCopy={() => handleExport('copy')} color="#4b2424" hoverBg="#fdf8f6" />
            <ExportDropdown onExportExcel={() => handleExport('excel')} onExportPdf={() => handleExport('pdf')} color="#4b2424" hoverColor="#381b1b" />
          </div>
        </div>

        {!detail && !loading && summary?.failed && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-3 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-200">
            <span className="flex items-center gap-2 text-xs font-semibold"><AlertCircle className="h-5 w-5 text-rose-600" /> The report could not be loaded.</span>
            <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl cursor-pointer">Retry</button>
          </div>
        )}
        {!detail && !loading && !summary?.failed && summaryRows.length === 0 && (
          <p className="text-xs font-semibold text-slate-500">No attendance has been uploaded for Week {period.week}, {period.month} {period.year}.</p>
        )}
        {!detail && summaryRows.length > 0 && (
          <p className="text-[11px] font-semibold text-slate-500">Choose a count to see the employees behind it.</p>
        )}

        <div className="yp-pro-grid ag-theme-quartz">
          {detail ? (
            <Table rowData={detailRows} columnDefs={detailColumns} loading={detailLoading} pagination={true} paginationPageSize={pageSize} domLayout="autoHeight" color="#4b2424" />
          ) : (
            <Table rowData={summaryRows} columnDefs={summaryColumns} loading={loading} pagination={true} paginationPageSize={pageSize} domLayout="autoHeight" color="#4b2424" />
          )}
        </div>
      </div>
    </div>
  );
}
