import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { exportRowsToFile } from '../../../utils/exportGridReport';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

// Brown theme shared by the other modules' report tables (AuditPara, Bills,
// Attendance Report, etc.). Kept here as a constant so both the header band
// and the toolbar buttons stay in sync.
const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';

/*
 * K-2.1.1 (Addition) and K-2.1.2 (Deletion) share the same layout:
 *   - banner with "Form No. K-2.1.x - Abstract - Flagging - <kind> of Ships & Tonnage"
 *   - "As On date" + "Report for the Month"
 *   - Two-level column header: Previous FY group (4 cols) + Current FY group (4 cols)
 *   - One row per MMD + a Total row at the bottom
 *
 * The data shape is the same for both; only the title/file-name and the
 * verb ("Addition" vs "Deletion") differ.
 */
export default function FlaggingReport({ kind, code, fetchFn, triggerNotification, flat = false }) {
  const notify = useNotifier(triggerNotification);
  const [meta, setMeta] = useState({
    prevFyLabel: '',
    currFyUpto: '',
    asOnDate: '',
    reportMonth: '',
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFn()
      .then((res) => {
        if (cancelled) return;
        const body = res?.data || {};
        const list = Array.isArray(body.rowData) ? body.rowData : [];
        setRows(list);
        setMeta({
          prevFyLabel: body.prevFyLabel || '',
          currFyUpto: body.currFyUpto || '',
          asOnDate: body.asOnDate || '',
          reportMonth: body.reportMonth || '',
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error loading flagging ${kind} report:`, err);
        notify(COMMON_TOASTS.loadFailed(titleFor(kind)));
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fetchFn, kind, notify]);

  // Append a Total row at the bottom. ag-Grid's pinnedBottomRowData keeps it
  // stuck under the normal rows and outside any sorting the user might trigger.
  const totalsRow = useMemo(() => {
    if (!rows.length) return null;
    return rows.reduce(
      (t, r) => ({
        _isTotal: true,
        mmd_name: 'Total',
        prev_received:   t.prev_received   + num(r.prev_received),
        prev_registered: t.prev_registered + num(r.prev_registered),
        prev_pending:    t.prev_pending    + num(r.prev_pending),
        prev_tonnage:    t.prev_tonnage    + num(r.prev_tonnage),
        curr_received:   t.curr_received   + num(r.curr_received),
        curr_registered: t.curr_registered + num(r.curr_registered),
        curr_pending:    t.curr_pending    + num(r.curr_pending),
        curr_tonnage:    t.curr_tonnage    + num(r.curr_tonnage),
      }),
      { prev_received: 0, prev_registered: 0, prev_pending: 0, prev_tonnage: 0,
        curr_received: 0, curr_registered: 0, curr_pending: 0, curr_tonnage: 0 },
    );
  }, [rows]);

  const colDefs = useMemo(() => {
    const centre = {
      headerClass: 'text-center',
      cellClass: 'text-center flex items-center justify-center',
    };
    // Per-column minWidth sized to its header text so "NO. OF APPLICATIONS RECEIVED"
    // doesn't wrap into three awkward lines. Numbers align to approximate pixel
    // widths of the uppercase header text at the current font / weight.
    const numeric = (field, headerName, minWidth = 170) => ({
      headerName, field, minWidth, flex: 1, ...centre,
      valueFormatter: (p) => (p.value == null || p.value === '' ? '0' : String(p.value)),
      cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
    });
    return [
      {
        headerName: 'S.No',
        valueGetter: (p) => (p.data?._isTotal ? 'Total' : (p.node?.rowIndex ?? 0) + 1),
        maxWidth: 90,
        minWidth: 70,
        ...centre,
        cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
      },
      { headerName: 'MMD Name', field: 'mmd_name', minWidth: 160, flex: 1, ...centre,
        cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null) },
      {
        headerName: `During the Previous FY (${meta.prevFyLabel || '-'})`,
        headerClass: 'text-center',
        children: [
          numeric('prev_received',   'No. of Applications Received', 185),
          numeric('prev_registered', 'No. of Registered Ships',      170),
          numeric('prev_pending',    'No. of Pending Ships',          160),
          numeric('prev_tonnage',    'Total Tonnage',                 135),
        ],
      },
      {
        headerName: `During the Current FY-upto ${meta.currFyUpto || '-'}`,
        headerClass: 'text-center',
        children: [
          numeric('curr_received',   'No. of Applications Received', 185),
          numeric('curr_registered', 'No. of Registered Ships',      170),
          numeric('curr_pending',    'No. of Pending Ships',          160),
          numeric('curr_tonnage',    'Total Tonnage',                 135),
        ],
      },
    ];
  }, [meta.prevFyLabel, meta.currFyUpto]);

  const kindLabel = kind === 'deletion' ? 'Deletion' : 'Addition';
  const title = `Form No. ${code} - Abstract - Flagging- ${kindLabel} of Ships & Tonnage`;
  const fileBase = `DGS_${code.replace(/\./g, '_')}_Flagging_${kindLabel}`;

  // Flattened rows used by every export path, so Excel / PDF / Copy produce the
  // same 10 columns including the FY labels in the header strings.
  const flatRowsForExport = useMemo(() => {
    const data = rows.map((r, i) => [
      i + 1,
      r.mmd_name,
      num(r.prev_received), num(r.prev_registered), num(r.prev_pending), num(r.prev_tonnage),
      num(r.curr_received), num(r.curr_registered), num(r.curr_pending), num(r.curr_tonnage),
    ]);
    if (totalsRow) {
      data.push([
        'Total', '',
        totalsRow.prev_received, totalsRow.prev_registered, totalsRow.prev_pending, totalsRow.prev_tonnage,
        totalsRow.curr_received, totalsRow.curr_registered, totalsRow.curr_pending, totalsRow.curr_tonnage,
      ]);
    }
    return data;
  }, [rows, totalsRow]);

  const flatHeaders = [
    'S.No', 'MMD Name',
    `Prev FY (${meta.prevFyLabel}) - Applications Received`,
    `Prev FY (${meta.prevFyLabel}) - Registered Ships`,
    `Prev FY (${meta.prevFyLabel}) - Pending Ships`,
    `Prev FY (${meta.prevFyLabel}) - Total Tonnage`,
    `Current FY upto ${meta.currFyUpto} - Applications Received`,
    `Current FY upto ${meta.currFyUpto} - Registered Ships`,
    `Current FY upto ${meta.currFyUpto} - Pending Ships`,
    `Current FY upto ${meta.currFyUpto} - Total Tonnage`,
  ];

  const handleCopy = () => {
    if (!rows.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
    const tsv = [flatHeaders.join('\t'), ...flatRowsForExport.map((r) => r.join('\t'))].join('\n');
    navigator.clipboard.writeText(tsv)
      .then(() => notify(COMMON_TOASTS.copySuccess(rows.length, title)))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };

  const exportExcel = () => {
    if (!rows.length) { notify(COMMON_TOASTS.nothingToExport()); return; }
    const ws = XLSX.utils.aoa_to_sheet([flatHeaders, ...flatRowsForExport]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const fileName = `${fileBase}.xlsx`;
    XLSX.writeFile(wb, fileName);
    notify(COMMON_TOASTS.excelExported(fileName));
  };

  const exportPdf = () => {
    if (!rows.length) { notify(COMMON_TOASTS.nothingToExport()); return; }
    exportRowsToFile('pdf', {
      title,
      headers: [
        'S.No', 'MMD Name',
        'Prev FY: App. Rcvd', 'Prev FY: Reg. Ships', 'Prev FY: Pending', 'Prev FY: Tonnage',
        'Curr FY: App. Rcvd', 'Curr FY: Reg. Ships', 'Curr FY: Pending', 'Curr FY: Tonnage',
      ],
      rows: flatRowsForExport,
      fileName: fileBase,
    });
  };

  // Flat mode (merged layout): the outer right-pane is a fixed-height flex column.
  // Title/meta stay pinned at the top; the TableWithToolbar fills the rest and ag-Grid
  // handles the body scroll internally.
  const outerClass = flat
    ? 'flex flex-col flex-1 min-h-0 h-full space-y-3'
    : 'module-card space-y-4';

  return (
    <div className={outerClass}>
      <div className="flex flex-col items-center text-center space-y-1 pt-2 flex-shrink-0">
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          As On date: <span className="underline">{meta.asOnDate || '-'}</span>
        </div>
        <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          (Report for the Month - {meta.reportMonth || '-'})
        </div>
      </div>

      <div className={flat ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <TableWithToolbar
          rowData={rows}
          columnDefs={colDefs}
          loading={loading}
          color={BROWN}
          hoverColor={BROWN_HOVER}
          searchPlaceholder="Search MMD..."
          exportFileName={fileBase}
          pagination
          paginationPageSize={10}
          onCopy={handleCopy}
          onExportExcel={exportExcel}
          onExportPdf={exportPdf}
          pinnedBottomRowData={totalsRow ? [totalsRow] : undefined}
          headerHeight={46}
          fillHeight={flat}
          triggerNotification={triggerNotification}
        />
      </div>
    </div>
  );
}

function titleFor(kind) {
  return kind === 'deletion'
    ? 'Flagging - Deletion of Ships & Tonnage'
    : 'Flagging - Addition of Ships & Tonnage';
}

function num(v) {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
