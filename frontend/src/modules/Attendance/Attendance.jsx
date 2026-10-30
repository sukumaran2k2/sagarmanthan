import { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import UploadPage from './pages/UploadPage';
import FilesPage from './pages/FilesPage';
import DataListPage from './pages/DataListPage';
import ReportPage from './pages/ReportPage';
import { axiosInstance as api } from '../../api';
import { useNotifier, COMMON_TOASTS } from '../../utils/notify';
import { getModuleCrud } from '../../utils/modulePermissions';
import { useAttendanceStore } from './store/useAttendanceStore';

const BASE = '/governance/attendance';
// Older links used ?subtab=upload|files|data|report
const LEGACY_SUBTABS = { upload: 'upload', files: 'files', data: 'data-list', report: 'report' };

export default function AttendanceView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const crud = getModuleCrud('ATTENDANCE');
  const canUpload = crud.create || crud.update;

  const setFilters = useAttendanceStore((state) => state.setFilters);
  const setReportPeriod = useAttendanceStore((state) => state.setReportPeriod);

  // Every uploaded attendance row (the DataList filters these in the browser), tagged
  // with the request it answers; an upload bumps reloadKey to refetch
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState(null); // { key, rows, failed }
  useEffect(() => {
    let cancelled = false;
    api.get('/employee-attendance-view')
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.rowData || [];
        if (!cancelled) setResult({ key: reloadKey, rows });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Attendance records could not be loaded:', err);
        setResult({ key: reloadKey, rows: [], failed: true });
        notify(COMMON_TOASTS.loadFailed('The attendance records'));
      });
    return () => { cancelled = true; };
  }, [reloadKey, notify]);
  const loading = result?.key !== reloadKey;
  const rows = useMemo(() => (loading ? [] : result.rows), [loading, result]);
  const years = useMemo(() => [...new Set(rows.map((r) => r.Year).filter(Boolean).map(String))], [rows]);

  const tabs = useMemo(() => [
    ...(canUpload ? [{ id: 'upload', label: 'Upload Attendance' }] : []),
    { id: 'files', label: 'View Files' },
    { id: 'data-list', label: 'Data List' },
    { id: 'report', label: 'Report' },
  ], [canUpload]);
  const currentTab = tabs.find((t) => location.pathname.includes(`/${t.id}`))?.id || tabs[0].id;
  const defaultTab = LEGACY_SUBTABS[new URLSearchParams(location.search).get('subtab')] || tabs[0].id;

  // After an upload: show that period's rows, and have the report open on it
  const handleUploaded = useCallback((period) => {
    setReloadKey((k) => k + 1);
    setFilters({ month: period.month, year: period.year, week: String(period.week) });
    setReportPeriod(period);
    navigate(`${BASE}/data-list`, { replace: true });
  }, [navigate, setFilters, setReportPeriod]);

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">Employee Attendance</h1>
          <p className="module-header-subtitle">Monitor punctuality, daily work duration, and wing-wise attendance.</p>
        </div>
        <InternalNavigation tabs={tabs} currentTab={currentTab} onTabChange={(id) => navigate(`${BASE}/${id}`)} />
      </div>

      <Routes>
        <Route index element={<Navigate to={defaultTab} replace />} />
        <Route path="upload" element={canUpload
          ? <UploadPage notify={notify} onUploaded={handleUploaded} />
          : <Navigate to="../data-list" replace />} />
        <Route path="files" element={<FilesPage notify={notify} reloadKey={reloadKey} canDelete={crud.delete} onDeleted={() => setReloadKey((k) => k + 1)} />} />
        <Route path="data-list" element={
          <DataListPage notify={notify} rows={rows} loading={loading} loadError={!loading && !!result.failed} onRetry={() => setReloadKey((k) => k + 1)} />
        } />
        <Route path="report" element={<ReportPage notify={notify} years={years} />} />
        <Route path="*" element={<Navigate to={defaultTab} replace />} />
      </Routes>
    </div>
  );
}
