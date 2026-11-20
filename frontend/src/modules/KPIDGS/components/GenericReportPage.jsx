import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

// Brown theme used by every DGS *Reports* page (toolbar buttons + table header).
// Kept in sync with FlaggingReport.jsx so all K-2.x reports read as one module.
// Data List reuses this same renderer but overrides the colour to blue below.
const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';

// Generic report renderer: fetches via `fetchFn`, shows a toolbar+ag-grid.
// Column defs are inferred from the first row when `columns` is omitted.
export default function GenericReportPage({
  code, title, fetchFn, columns = null, triggerNotification,
  backTo = '/kpi/dgs/reports', backLabel = 'Back to Reports', showBack = true,
  flat = false,
  color = BROWN,
  hoverColor = BROWN_HOVER,
  // Optional saved list state (KPI DGS store). Left undefined, the table keeps its own state.
  searchTerm,
  onSearchChange,
  visibleCols,
  onVisibleColsChange,
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
      ...Object.keys(first).map((k) => {
        const heading = toHeading(k);
        return {
          headerName: heading,
          field: k,
          flex: 1,
          // Give each column enough room so its header doesn't shrink to 2-3 lines.
          // Derived from the header text length so short labels stay compact and
          // long labels like "No Of Applications Received" get real room.
          minWidth: headerMinWidth(heading),
          wrapText: true,
          autoHeight: true,
          cellClass: 'text-center text-slate-700 flex items-center justify-center',
        };
      }),
    ];
  }, [rows, columns]);

  return (
    <div className={flat ? 'space-y-4' : 'module-card space-y-4'}>
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
        color={color}
        hoverColor={hoverColor}
        searchPlaceholder="Search records..."
        exportFileName={`dgs_${code.replace(/\./g, '_')}`}
        fillHeight={flat}
        triggerNotification={triggerNotification}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        visibleCols={visibleCols}
        onVisibleColsChange={onVisibleColsChange}
      />
    </div>
  );
}

function toHeading(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Approximate pixel width for the header text when rendered in the table's
// uppercase bold style. Caps between 150px (short labels) and 260px (very long
// labels) so columns never shrink to unreadable widths yet don't eat the viewport.
function headerMinWidth(heading) {
  const len = heading.length;
  // ~8px per uppercase character + ~40px chrome (filter icon, padding).
  const estimated = len * 8 + 40;
  return Math.max(150, Math.min(260, estimated));
}
