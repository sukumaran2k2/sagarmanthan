import { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import ModuleFilesHistoryView from '../../../components/ModuleFilesHistoryView';
import { axiosInstance as api } from '../../../api';
import { COMMON_TOASTS } from '../../../utils/notify';
import { useAttendanceStore } from '../store/useAttendanceStore';

const formatDate = (v) => {
  const d = new Date(v);
  return v && !Number.isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '—';
};

// The attendance sheets uploaded through this page (tbl_emp_attendance_file), newest first.
// As in 2.0 the list is read-only: the uploaded rows are what the DataList and Report use.
export default function FilesPage({ notify, reloadKey }) {
  const pageSize = useAttendanceStore((state) => state.pageSize);
  const setPageSize = useAttendanceStore((state) => state.setPageSize);

  const [result, setResult] = useState(null); // { key, rows }
  useEffect(() => {
    let cancelled = false;
    api.get('/employee-attendance-file')
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : res.data?.rowData || [];
        if (!cancelled) setResult({ key: reloadKey, rows: [...rows].sort((a, b) => new Date(b['Date of Upload']) - new Date(a['Date of Upload'])) });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Attendance files could not be loaded:', err);
        setResult({ key: reloadKey, rows: [] });
        notify(COMMON_TOASTS.loadFailed('The uploaded attendance files'));
      });
    return () => { cancelled = true; };
  }, [reloadKey, notify]);
  const loading = result?.key !== reloadKey;

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No', width: 80, pinned: 'left',
      valueGetter: (p) => p.node.rowIndex + 1,
      cellClass: 'font-bold text-slate-500 text-center flex items-center justify-center',
    },
    {
      headerName: 'File Name', field: 'File Name', flex: 3, minWidth: 260,
      cellRenderer: (p) => (
        <span className="flex items-center gap-2 truncate font-semibold text-slate-800 dark:text-slate-100">
          <FileSpreadsheet className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="truncate">{p.value || '—'}</span>
        </span>
      ),
    },
    { headerName: 'Uploaded By', field: 'Uploaded By', flex: 2, minWidth: 160, cellClass: 'text-center flex items-center justify-center', valueFormatter: (p) => p.value || '—' },
    { headerName: 'Date of Upload', field: 'Date of Upload', flex: 2, minWidth: 150, cellClass: 'text-center flex items-center justify-center', valueFormatter: (p) => formatDate(p.value) },
  ], []);

  return (
    <div className="module-card">
      <ModuleFilesHistoryView
        title="Uploaded Attendance Sheets"
        filesList={loading ? [] : result.rows}
        pageSize={pageSize}
        setPageSize={setPageSize}
        historyColDefs={columnDefs}
        loading={loading}
        themeClass="ag-theme-quartz"
      />
    </div>
  );
}
