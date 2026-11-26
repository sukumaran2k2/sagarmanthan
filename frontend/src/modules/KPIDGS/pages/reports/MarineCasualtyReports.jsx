import { useEffect, useMemo, useState } from 'react';
import TableWithToolbar from '../../../../components/TableWithToolbar';
import { exportGridToExcel, exportGridToPdf } from '../../../../utils/exportGridReport';
import { useNotifier, COMMON_TOASTS } from '../../../../utils/notify';
import { CASUALTY_TYPES, QUARTER_LABELS, YEAR_WISE_COUNTS } from '../../data/marineCasualty';

// K-2.5 Marine Casualty reports, laid out like the other K-2.x reports: centred title and As On
// date, then the brown table with search, copy and Excel / PDF.
//   K-2.5.1 / 2.5.3 / 2.5.4  a year against the one before it, by quarter (Jan-Mar ... Oct-Dec),
//                            per casualty type and row, with each casualty type's total and the
//                            grand total. The year can be picked (default: the latest with data).
//   K-2.5.2                  every year's seven counts and its total.
// Every figure comes from the saved entries; the totals follow the rows the search shows.

const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';
const REPORT_COL_DEF = { sortable: false, filter: false, suppressHeaderMenuButton: true, suppressHeaderFilterButton: true, resizable: true };
const centre = { headerClass: 'text-center', cellClass: 'text-center flex items-center justify-center' };
const bold = (p) => (p.node?.rowPinned ? { fontWeight: 700 } : null);
const pickerCls = 'text-xs px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#4b2424] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer';
const num = (v) => Number(v || 0);
const fmt = (v) => num(v).toLocaleString('en-IN');
const today = () => new Date().toLocaleDateString('en-GB');
const fileCode = (code) => code.replace('-', '').replace(/\./g, '_');

// Rows matching the search, numbered in the order shown (ids and sNo are not searched)
function useSearch(rows) {
  const [query, setQuery] = useState('');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const found = q
      ? rows.filter((r) => Object.entries(r).some(([k, v]) => !k.includes('id') && k !== 'sNo' && String(v ?? '').toLowerCase().includes(q)))
      : rows;
    return found.map((r, i) => ({ ...r, sNo: i + 1 }));
  }, [rows, query]);
  return [query, setQuery, shown];
}

const leafColumns = (cols) => cols.flatMap((c) => (c.children ? leafColumns(c.children) : [c]));

function copyRows(columns, rows, notify, title) {
  if (!rows.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
  const leaves = leafColumns(columns);
  const tsv = [leaves.map((c) => c.headerName), ...rows.map((r) => leaves.map((c) => r?.[c.field] ?? ''))]
    .map((line) => line.join('\t')).join('\n');
  navigator.clipboard.writeText(tsv).then(
    () => notify(COMMON_TOASTS.copySuccess(rows.length, title)),
    () => notify(COMMON_TOASTS.copyFailed()),
  );
}

function ReportHeading({ title, period }) {
  return (
    <div className="flex flex-col items-center text-center space-y-1 pt-2 flex-shrink-0">
      <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">{title}</h2>
      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
        As On date: <span className="underline">{today()}</span>
      </div>
      {period && <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">({period})</div>}
    </div>
  );
}

// Loads a report; params change (e.g. the picked year) loads it again
function useReport(fetchFn, params, what, notify) {
  const [state, setState] = useState({ key: null, data: null });
  const key = JSON.stringify(params);
  useEffect(() => {
    let cancelled = false;
    fetchFn(JSON.parse(key))
      .then((res) => { if (!cancelled) setState({ key, data: res.data }); })
      .catch((err) => {
        if (cancelled) return;
        console.error(`Error loading ${what}:`, err);
        notify(COMMON_TOASTS.loadFailed(what));
        setState({ key, data: null });
      });
    return () => { cancelled = true; };
  }, [fetchFn, key, what, notify]);
  return { data: state.data, loading: state.key !== key };
}

function ReportTable({ title, period, columns, rows, pinned, loading, controls, fileName, searchPlaceholder, triggerNotification, flat }) {
  const notify = useNotifier(triggerNotification);
  const exportable = (fn) => () => (rows.length ? fn() : notify(COMMON_TOASTS.nothingToExport()));
  return (
    <div className={flat ? 'flex flex-col flex-1 min-h-0 h-full space-y-3' : 'module-card space-y-4'}>
      <ReportHeading title={title} period={period} />
      <div className={flat ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <TableWithToolbar
          rowData={rows}
          columnDefs={columns}
          loading={loading}
          color={BROWN}
          hoverColor={BROWN_HOVER}
          searchPlaceholder={searchPlaceholder}
          searchTerm={controls.query}
          onSearchChange={controls.setQuery}
          exportFileName={fileName}
          pagination={false}
          defaultColDef={REPORT_COL_DEF}
          pinnedBottomRowData={pinned}
          headerHeight={46}
          fillHeight={flat}
          triggerNotification={triggerNotification}
          extraLeftToolbarContent={controls.picker}
          onCopy={() => copyRows(columns, [...rows, ...pinned], notify, title)}
          onExportExcel={exportable(() => notify(COMMON_TOASTS.excelExported(exportGridToExcel({ title, subtitle: period, columns, rows, pinnedRows: pinned, fileName }), 'The report')))}
          onExportPdf={exportable(() => notify(COMMON_TOASTS.excelExported(exportGridToPdf({ title, subtitle: period, columns, rows, pinnedRows: pinned, fileName, brand: BROWN }), 'The report')))}
        />
      </div>
    </div>
  );
}

const QUARTER_FIELDS = ['q1', 'q2', 'q3', 'q4'];
const yearFields = (tag) => [...QUARTER_FIELDS.map((q) => `${tag}_${q}`), `${tag}_total`];

/* ---------------- K-2.5.1 / 2.5.3 / 2.5.4: year against the one before, by quarter ---------------- */
export function MarineQuarterReport({ code, title, fileTitle, fetchFn, triggerNotification, flat = false }) {
  const notify = useNotifier(triggerNotification);
  const [year, setYear] = useState(null); // null = the latest year with data
  const { data, loading } = useReport(fetchFn, year ? { year } : {}, title, notify);
  const rows = useMemo(() => data?.rowData || [], [data]);
  const [query, setQuery, shown] = useSearch(rows);
  const rowLabel = data?.rowLabel || 'Name';
  const current = data?.year;
  const previous = data?.previousYear;

  const columns = useMemo(() => {
    const quarterCols = (tag, y) => [
      ...QUARTER_LABELS.map((label, q) => ({ headerName: `${label} '${String(y ?? '').slice(-2)}`, field: `${tag}_${QUARTER_FIELDS[q]}`, minWidth: 105, flex: 1, ...centre, valueFormatter: (p) => fmt(p.value), cellStyle: bold })),
      { headerName: `Total in ${y ?? '-'}`, field: `${tag}_total`, minWidth: 105, flex: 1, ...centre, valueFormatter: (p) => fmt(p.value), cellStyle: { fontWeight: 700 } },
    ];
    return [
      { headerName: 'S.No', field: 'sNo', cellDataType: false, minWidth: 70, maxWidth: 90, pinned: 'left', ...centre },
      { headerName: 'Casualty Type', field: 'casualty_type', minWidth: 140, pinned: 'left', ...centre, cellStyle: bold },
      { headerName: rowLabel, field: 'name', minWidth: 200, pinned: 'left', wrapText: true, autoHeight: true, ...centre, cellStyle: bold },
      { headerName: `Previous Year (${previous ?? '-'})`, headerClass: 'text-center', children: quarterCols('prev', previous) },
      { headerName: `Current Year (${current ?? '-'})`, headerClass: 'text-center', children: quarterCols('curr', current) },
    ];
  }, [rowLabel, previous, current]);

  // Totals of the rows shown: per casualty type, then all
  const pinned = useMemo(() => {
    const fields = [...yearFields('prev'), ...yearFields('curr')];
    const sum = (list, label) => fields.reduce((acc, f) => ({ ...acc, [f]: list.reduce((s, r) => s + num(r[f]), 0) }), { sNo: '', casualty_type: '', name: label });
    const types = [...new Set(shown.map((r) => r.casualty_type))].sort((a, b) => CASUALTY_TYPES.indexOf(a) - CASUALTY_TYPES.indexOf(b));
    return [...types.map((t) => sum(shown.filter((r) => r.casualty_type === t), `${t} Total`)), ...(types.length > 1 ? [sum(shown, 'Grand Total')] : [])];
  }, [shown]);

  const heading = `Form No. ${code} - ${title}`;
  const period = current ? `Previous Year ${previous} and Current Year ${current}` : '';
  const yearChoices = data?.years?.length ? data.years : (current ? [current] : []);
  const picker = (
    <select className={pickerCls} aria-label="Report year" value={current ?? ''} onChange={(e) => setYear(Number(e.target.value))}>
      {yearChoices.map((y) => <option key={y} value={y}>{`${y - 1} vs ${y}`}</option>)}
    </select>
  );
  return (
    <ReportTable
      title={heading}
      period={period}
      columns={columns}
      rows={shown}
      pinned={pinned}
      loading={loading}
      controls={{ query, setQuery, picker }}
      fileName={`DGS_${fileCode(code)}_Marine_Casualty_${fileTitle}`}
      searchPlaceholder={`Search casualty type or ${rowLabel.toLowerCase()}...`}
      triggerNotification={triggerNotification}
      flat={flat}
    />
  );
}

/* ---------------- K-2.5.2 Year-wise ---------------- */
export function MarineYearWiseReport({ code = 'K-2.5.2', fetchFn, triggerNotification, flat = false }) {
  const notify = useNotifier(triggerNotification);
  const params = useMemo(() => ({}), []);
  const { data, loading } = useReport(fetchFn, params, 'Marine Casualty Incidents - Year-wise', notify);
  const rows = useMemo(() => data?.rowData || [], [data]);
  const [query, setQuery, shown] = useSearch(rows);

  const columns = useMemo(() => [
    { headerName: 'S.No', field: 'sNo', cellDataType: false, minWidth: 70, maxWidth: 90, pinned: 'left', ...centre },
    { headerName: 'Year', field: 'year', cellDataType: false, minWidth: 100, pinned: 'left', ...centre, cellStyle: bold },
    ...YEAR_WISE_COUNTS.map((c) => ({ headerName: c.label, field: c.column, minWidth: 120, flex: 1, ...centre, valueFormatter: (p) => fmt(p.value), cellStyle: bold })),
    { headerName: 'Total Incidents', field: 'total_incidents', minWidth: 120, flex: 1, ...centre, valueFormatter: (p) => fmt(p.value), cellStyle: { fontWeight: 700 } },
  ], []);

  const pinned = useMemo(() => {
    if (shown.length < 2) return [];
    const fields = [...YEAR_WISE_COUNTS.map((c) => c.column), 'total_incidents'];
    return [fields.reduce((acc, f) => ({ ...acc, [f]: shown.reduce((s, r) => s + num(r[f]), 0) }), { sNo: '', year: 'Total' })];
  }, [shown]);

  const period = rows.length ? `${rows[0].year} to ${rows[rows.length - 1].year}` : '';
  return (
    <ReportTable
      title={`Form No. ${code} - Marine Casualty Incidents - Year-wise`}
      period={period}
      columns={columns}
      rows={shown}
      pinned={pinned}
      loading={loading}
      controls={{ query, setQuery, picker: null }}
      fileName={`DGS_${fileCode(code)}_Marine_Casualty_Year_Wise`}
      searchPlaceholder="Search year..."
      triggerNotification={triggerNotification}
      flat={flat}
    />
  );
}
