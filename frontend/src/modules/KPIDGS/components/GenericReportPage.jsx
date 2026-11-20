import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

// Generic report renderer: fetches via `fetchFn`, shows a toolbar+ag-grid.
// Column defs are inferred from the first row when `columns` is omitted.
export default function GenericReportPage({
  code, title, fetchFn, columns = null, triggerNotification,
  backTo = '/kpi/dgs/reports', backLabel = 'Back to Reports', showBack = true,
}) {
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFn()
      .then((res) => {
        if (cancelled) return;
        const data = res?.data;
        // Backend controllers return either an array or { data: [...] }
        const list = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
        setRows(list);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error loading report ${code}:`, err);
        notify(COMMON_TOASTS.loadFailed(title));
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fetchFn, code, title, notify]);

  const colDefs = useMemo(() => {
    if (columns && columns.length) return columns;
    if (!rows.length) return [{ headerName: 'S.No', valueGetter: (p) => p.node.rowIndex + 1, minWidth: 80 }];
    const first = rows[0];
    return [
      { headerName: 'S.No', valueGetter: (p) => p.node.rowIndex + 1, minWidth: 80, maxWidth: 100,
        cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center' },
      ...Object.keys(first).map((k) => ({
        headerName: toHeading(k),
        field: k,
        flex: 1,
        minWidth: 140,
        wrapText: true,
        autoHeight: true,
        cellClass: 'text-center text-slate-700 flex items-center justify-center',
      })),
    ];
  }, [rows, columns]);

  return (
    <div className="module-card space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{code}</span>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
        </div>
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
        )}
      </div>

      <TableWithToolbar
        rowData={rows}
        columnDefs={colDefs}
        loading={loading}
        searchPlaceholder="Search records..."
        exportFileName={`dgs_${code.replace(/\./g, '_')}`}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}

function toHeading(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
