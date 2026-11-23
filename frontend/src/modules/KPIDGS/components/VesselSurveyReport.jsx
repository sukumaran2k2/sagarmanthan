import { useEffect, useMemo, useState } from 'react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { exportRowsToFile } from '../../../utils/exportGridReport';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';

// Backend sends "NaN" (0 / 0) when a target is 0
const pct = (v) => (Number.isFinite(Number(v)) && v !== '' && v != null ? `${Number(v).toFixed(2)}%` : '-');
const isPct = (field) => /^Percent/.test(field || '');

// Group + child headers -> flat leaf list: [{ field, header }]
const leavesOf = (defs, prefix = '') =>
  defs.flatMap((d) => (d.children
    ? leavesOf(d.children, d.headerName)
    : [{ field: d.field, header: prefix ? `${prefix} - ${d.headerName}` : d.headerName }]));

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Total row percentages are worked out from the summed actual / target, not by adding row percentages
const PCT_OF = {
  PercentPrevFY: ['ActualVesselsDuringPreviousFY', 'TargetPrevFY'],
  PercentCurrentFY: ['ActualVesselsDuringCurrentFY', 'TargetCurrentFY'],
  PercentMonthFY: ['ActualVesselsDuringCurrentMonth', 'TargetMonthFY'],
  PercentTotalFY: ['Actual Total for Current FY', 'TargetTotalFY'],
};

export default function VesselSurveyReport({ code, title, fetchFn, triggerNotification, flat = false }) {
  const notify = useNotifier(triggerNotification);
  const [rows, setRows] = useState([]);
  const [serverCols, setServerCols] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchFn()
      .then((res) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data?.rowData) ? res.data.rowData : []);
        setServerCols(Array.isArray(res?.data?.columnDefs) ? res.data.columnDefs : []);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error loading report ${code}:`, err);
        notify(COMMON_TOASTS.loadFailed(title));
        setRows([]);
        setServerCols([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [fetchFn, code, title, notify]);

  const style = (d) => ({
  ...d,
  headerClass: 'text-center',
  cellClass: 'text-center flex items-center justify-center',
  ...(d.children
    ? { children: d.children.map(style) }
    : {
        minWidth: d.field === 'Name of MMD' ? 180 : 150,
        cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
        ...(isPct(d.field) ? { valueFormatter: (p) => pct(p.value) } : {}),
      }),
});

  const colDefs = useMemo(() => [
   {
  headerName: 'S.No',
  valueGetter: (p) => (p.data?._isTotal ? 'Total' : (p.node?.rowIndex ?? 0) + 1),
  cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
  minWidth: 70, maxWidth: 90, pinned: 'left',
  cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
},
    ...serverCols.map(style),
  ], [serverCols]); // eslint-disable-line

  const leaves = useMemo(() => leavesOf(serverCols), [serverCols]);

    const totalsRow = useMemo(() => {
  if (!rows.length) return null;
  const t = { _isTotal: true, 'Name of MMD': '' };
  leaves.forEach((l) => {
    if (l.field && !isPct(l.field) && l.field !== 'Name of MMD') {
      t[l.field] = rows.reduce((sum, r) => sum + num(r[l.field]), 0);
    }
  });
  Object.entries(PCT_OF).forEach(([field, [actual, target]]) => {
    t[field] = t[target] ? (t[actual] / t[target]) * 100 : NaN; // NaN shows as "-"
  });
  return t;
}, [rows, leaves]);

  const exportTable = () => {
  const line = (r) => leaves.map((l) => (isPct(l.field) ? pct(r[l.field]) : r[l.field] ?? ''));
  const out = rows.map((r, i) => [i + 1, ...line(r)]);
  if (totalsRow) out.push(['Total', ...line(totalsRow)]);
  return { headers: ['S.No', ...leaves.map((l) => l.header)], rows: out };
};;



  const fileBase = `DGS_${code.replace(/\./g, '_')}_Vessel_Survey`;

  const handleCopy = () => {
    if (!rows.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
    const { headers, rows: out } = exportTable();
    navigator.clipboard.writeText([headers, ...out].map((r) => r.join('\t')).join('\n'))
      .then(() => notify(COMMON_TOASTS.copySuccess(rows.length, title)))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };

  const download = (type) => {
    if (!rows.length) { notify(COMMON_TOASTS.nothingToExport()); return; }
    const { headers, rows: out } = exportTable();
    const file = exportRowsToFile(type, { title: `Form No. ${code} - ${title}`, headers, rows: out, fileName: fileBase });
    notify(COMMON_TOASTS.excelExported(file));
  };

  return (
    <div className={flat ? 'flex flex-col flex-1 min-h-0 h-full space-y-3' : 'module-card space-y-4'}>
      <div className="flex flex-col items-center text-center pt-2 flex-shrink-0">
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          Form No. {code} - {title}
        </h2>
      </div>

      <div className={flat ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <TableWithToolbar
          rowData={rows}
          columnDefs={colDefs}
          pinnedBottomRowData={totalsRow ? [totalsRow] : undefined}
          loading={loading}
          color={BROWN}
          hoverColor={BROWN_HOVER}
          searchPlaceholder="Search MMD..."
          exportFileName={fileBase}
          pagination
          paginationPageSize={10}
          onCopy={handleCopy}
          onExportExcel={() => download('excel')}
          onExportPdf={() => download('pdf')}
          headerHeight={46}
          fillHeight={flat}
          triggerNotification={triggerNotification}
        />
      </div>
    </div>
  );
}