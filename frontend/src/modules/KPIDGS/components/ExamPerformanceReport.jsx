import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import RestrictedAccess from '../../../components/RestrictedAccess';
import { useKPIDGSPermissions } from '../hooks/useKPIDGSPermissions';
import { exportGridToExcel, exportGridToPdf } from '../../../utils/exportGridReport';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import { examAsOnDate, examReportMonth, examTotalsRow } from '../utils/examReport';

// Themed to match the other DGS report pages (brown toolbar + headers).
const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';

// Shared cell / header styling on the backend's grouped column defs. The backend pins the five
// label columns (about 850px), which would leave no room for the figures in the report pane, so
// only S.No stays pinned here.
const style = (d) => {
  const { pinned, ...rest } = d; // eslint-disable-line no-unused-vars
  return {
    ...rest,
    headerClass: `${d.headerClass || ''} text-center`.trim(),
    ...(d.children ? { children: d.children.map(style) } : {
      minWidth: d.width || 130,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-center flex items-center justify-center',
      cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
    }),
  };
};

// K-2.3.1 - Exam Overall Performance Statistics. Same rules as the earlier portal page: the
// backend sends grouped columns + rows; a Total row is kept under the table and worked out again
// from the rows still shown whenever the search, a column filter or the sort changes.
function ExamPerformanceReportContent({
  code, title, fetchFn, triggerNotification, flat = false, filenameSuffix = 'Exam_Overall_Performance',
}) {
  const notify = useNotifier(triggerNotification);
  const [rows, setRows] = useState([]);
  const [serverCols, setServerCols] = useState([]);
  // Each report mounts afresh when opened, so it starts out loading
  const [loading, setLoading] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState('');
  // Rows the grid shows after search / filters / sort; null until the grid reports them
  const [shownRows, setShownRows] = useState(null);
  const shownRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchFn()
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data?.rowData) ? res.data.rowData : []);
        setServerCols(Array.isArray(res?.data?.columnDefs) ? res.data.columnDefs : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setRows([]);
        setServerCols([]);
        // 404 = nothing entered yet; the backend says so in `error`
        if (err?.response?.status === 404) {
          setEmptyMessage(err.response.data?.error || 'No data available');
          return;
        }
        console.error(`Error loading report ${code}:`, err);
        notify(COMMON_TOASTS.loadFailed(title));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchFn, code, title, notify]);

  // Keep the rows the grid shows, in its order. Only updates state when they really changed,
  // so the Total row (pinned, outside the row model) does not loop back into this.
  const onGridReady = useCallback((params) => {
    const read = () => {
      const next = [];
      params.api.forEachNodeAfterFilterAndSort((node) => { if (node.data) next.push(node.data); });
      const prev = shownRef.current;
      if (prev && prev.length === next.length && prev.every((r, i) => r === next[i])) return;
      shownRef.current = next;
      setShownRows(next);
    };
    params.api.addEventListener('modelUpdated', read);
    read();
  }, []);

  const visible = shownRows ?? rows;
  const totalsRow = useMemo(() => examTotalsRow(visible), [visible]);

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (p) => (p.data?._isTotal ? 'Total' : (p.node?.rowIndex ?? 0) + 1),
      cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
      minWidth: 70, maxWidth: 90, pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
    },
    ...serverCols.map(style),
  ], [serverCols]);

  const fileBase = `DGS_${code.replace(/\./g, '_')}_${filenameSuffix}`;
  const fullTitle = `Form No. ${code} - ${title}`;
  const asOn = examAsOnDate();
  const month = examReportMonth();
  const subtitle = `As on date: ${asOn} | Report for the Month - ${month}`;

  // Export columns: S.No from a plain field (the file writer has no grid row index)
  const exportColumns = useMemo(
    () => [{ headerName: 'S.No', field: '_sno' }, ...serverCols],
    [serverCols],
  );
  const exportRows = () => visible.map((r, i) => ({ ...r, _sno: i + 1 }));
  const exportPinned = () => (totalsRow ? [{ ...totalsRow, _sno: 'Total' }] : []);

  const handleCopy = () => {
    if (!visible.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
    const leaves = [];
    const walk = (defs, prefix) => defs.forEach((d) => {
      if (d.children) walk(d.children, prefix ? `${prefix} - ${d.headerName}` : d.headerName);
      else leaves.push({ field: d.field, header: prefix || d.headerName });
    });
    walk(exportColumns, '');
    const lines = [...exportRows(), ...exportPinned()]
      .map((r) => leaves.map((l) => r[l.field] ?? '').join('\t'));
    navigator.clipboard.writeText([leaves.map((l) => l.header).join('\t'), ...lines].join('\n'))
      .then(() => notify(COMMON_TOASTS.copySuccess(visible.length, 'from the report')))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };

  const download = (type) => {
    if (!visible.length) { notify(COMMON_TOASTS.nothingToExport()); return; }
    try {
      const options = {
        title: fullTitle, subtitle, columns: exportColumns,
        rows: exportRows(), pinnedRows: exportPinned(), fileName: fileBase,
      };
      const file = type === 'pdf'
        ? exportGridToPdf({ ...options, brand: BROWN })
        : exportGridToExcel(options);
      notify(COMMON_TOASTS.excelExported(file, 'The report'));
    } catch (err) {
      console.error(`Error exporting ${code}:`, err);
      notify(COMMON_TOASTS.exportFailed());
    }
  };

  return (
    <div className={flat ? 'flex flex-col flex-1 min-h-0 h-full space-y-3' : 'module-card space-y-4'}>
      <div className="flex flex-col items-center text-center pt-2 flex-shrink-0">
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{fullTitle}</h2>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            As on date: <strong className="text-[#4b2424] dark:text-blue-400">{asOn}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>
            Report for the month — <strong className="text-[#4b2424] dark:text-blue-400">{month}</strong>
          </span>
        </div>
        {emptyMessage && (
          <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-400">{emptyMessage}</p>
        )}
      </div>

      <div className={flat ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <TableWithToolbar
          rowData={rows}
          columnDefs={colDefs}
          pinnedBottomRowData={totalsRow ? [totalsRow] : undefined}
          loading={loading}
          color={BROWN}
          hoverColor={BROWN_HOVER}
          searchPlaceholder="Search type, grade, subject..."
          exportFileName={fileBase}
          pagination
          paginationPageSize={10}
          onCopy={handleCopy}
          onExportExcel={() => download('excel')}
          onExportPdf={() => download('pdf')}
          onGridReady={onGridReady}
          headerHeight={46}
          fillHeight={flat}
          triggerNotification={triggerNotification}
        />
      </div>
    </div>
  );
}

// K-2.3 reports need KPI_DGS read (the backend checks the same); without it nothing is fetched
export default function ExamPerformanceReport(props) {
  const { canView } = useKPIDGSPermissions();
  if (!canView) return <RestrictedAccess moduleName={`Form No. ${props.code}`} />;
  return <ExamPerformanceReportContent {...props} />;
}
