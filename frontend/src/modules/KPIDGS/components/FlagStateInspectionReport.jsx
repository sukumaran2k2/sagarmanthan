import { useEffect, useMemo, useState } from 'react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { exportRowsToFile } from '../../../utils/exportGridReport';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

// Themed to match the other DGS report pages (brown toolbar + headers).
const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';

// Local date as YYYY-MM-DD (toISOString uses UTC and can read yesterday in IST).
const asOnDate = () => new Date().toLocaleDateString('en-CA');

// e.g. "November 2026"
const reportMonth = () =>
  new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Flattens the backend's grouped column defs into leaf columns with their path prefix for export.
// Columns marked `hide: true` (e.g. the raw No. of Deficiency / No. of NIL-Deficiency fields on
// K-2.6.2-6 reports) are dropped here, so export CSVs and the pinned Total row mirror exactly
// the visible grid — the Avg Def Index / Nil-Def Rate derivation still reads those raw columns
// directly from serverCols, so excluding them here doesn't affect the Total's accuracy.
const leavesOf = (defs, prefix = '') =>
  defs.flatMap((d) => {
    if (d.hide === true) return [];
    if (d.children) return leavesOf(d.children, d.headerName);
    return [{ field: d.field, header: prefix ? `${prefix} - ${d.headerName}` : d.headerName }];
  });

// Role lookup based on the backend's human headerName, which is stable across K-2.6.2-6
// (unlike the field aliases, which flip between singular / plural "Deficiency" / "Deficiencies"
// and other inconsistencies). Returns one of:
//   'inspection' | 'detention' | 'deficiency' | 'nilDeficiency' | 'avgDefIndex' | 'nilDefRate'
// or null when the column doesn't match any K-2.6 metric.
function roleOfHeader(headerName) {
  if (!headerName) return null;
  const h = String(headerName).trim();
  // Order matters: specific derived-rate roles are checked first so they are not swept into
  // the broader Deficiency / NIL-Deficiency buckets.
  if (/Average\s+Deficiency\s+Index/i.test(h)) return 'avgDefIndex';
  if (/Nil[-\s]?Deficiency\s+Rate|Nil[-\s]?Def\s*Rate/i.test(h)) return 'nilDefRate';
  if (/^No\.?\s*of\s*NIL[-\s]?Deficien/i.test(h)) return 'nilDeficiency';
  if (/^No\.?\s*of\s*Deficien/i.test(h)) return 'deficiency';
  if (/^No\.?\s*of\s*Detentions?/i.test(h)) return 'detention';
  if (/^No\.?\s*of\s*Inspections?/i.test(h)) return 'inspection';
  return null;
}

// Simple numeric sum across rows for a given field, skipping blanks.
function sumField(rows, field) {
  return rows.reduce((s, r) => s + num(r[field]), 0);
}

// Inspection-weighted sum of `metricField` across rows: Σ(row[metric] × row[insp]).
// Used to re-derive the Total row's Avg Def Index / Nil-Def Rate from the per-row values the
// backend already publishes, rather than relying on raw deficiency columns the backend marks
// hidden and that may be absent from rowData.
function weightedSumField(rows, metricField, weightField) {
  return rows.reduce((s, r) => s + num(r[metricField]) * num(r[weightField]), 0);
}

// True when the column holds numeric values in at least one fetched row.
// Keeps the label column (Name of MMD, shipType, Category…) out of the Total row.
function isNumericColumn(rows, field) {
  if (!field) return false;
  for (const r of rows) {
    const v = r[field];
    if (v == null || v === '') continue;
    if (Number.isFinite(Number(v))) return true;
    return false;
  }
  return false;
}

// Within a backend period group (e.g. "During the Previous FY (…)"), walk its DIRECT metric
// children and resolve the field for each role by headerName. A metric child may itself wrap
// its field in a children node (for the "A/B/C/D" letter header), so this also unwraps that.
function resolvePeriodFields(group) {
  const out = {};
  (group.children || []).forEach((child) => {
    const role = roleOfHeader(child.headerName);
    if (!role) return;
    // Prefer the field on the direct child; fall back to the first leaf's field inside it.
    let field = child.field;
    if (!field && Array.isArray(child.children) && child.children[0]) {
      field = child.children[0].field;
    }
    if (field) out[role] = field;
  });
  return out;
}

// Builds a pinned-bottom totals row for the current rowData. Raw Inspection / Detention /
// Deficiency / NilDeficiency columns (and K-2.6.1's `totalShips*` columns) are summed, and
// Avg Def Index / Nil-Def Rate columns are re-derived per period group using the inspection-
// weighted mean of each row's own published rate — algebraically Σ(def) / Σ(insp).
function buildTotalsRow(rows, leaves, labelField, serverCols) {
  if (!rows.length) return null;
  const t = { _isTotal: true };
  if (labelField) t[labelField] = '';

  // First collect the Avg Def Index / Nil-Def Rate fields for every period group so the
  // naive sum pass below can skip them. Without this, the first pass would deposit a
  // meaningless sum-of-rates into those cells and the override step would have to clean up.
  const derivedFields = new Set();
  (serverCols || []).forEach((group) => {
    if (!group.children) return;
    const fields = resolvePeriodFields(group);
    if (fields.avgDefIndex) derivedFields.add(fields.avgDefIndex);
    if (fields.nilDefRate) derivedFields.add(fields.nilDefRate);
  });

  // 1. Sum every numeric leaf except the label and the derived rate columns. Duplicate-field
  //    leaves (e.g. an `A/B/C` letter header that re-declares its parent's field) are summed
  //    once via `summedField`.
  const summedField = new Set();
  leaves.forEach((l) => {
    if (!l.field || l.field === labelField) return;
    if (derivedFields.has(l.field)) return;
    if (summedField.has(l.field)) return;
    if (!isNumericColumn(rows, l.field)) return;
    t[l.field] = sumField(rows, l.field);
    summedField.add(l.field);
  });

  // 2. Re-derive Avg Def Index / Nil-Def Rate per period group. Prefer the exact raw formula
  //    Σ(deficiency) / Σ(inspection); if the hidden raw columns aren't present in rowData,
  //    fall back to the inspection-weighted mean of each row's own published rate, which is
  //    algebraically identical modulo per-row rounding.
  (serverCols || []).forEach((group) => {
    if (!group.children) return;
    const fields = resolvePeriodFields(group);
    if (!fields.inspection) return;
    if (!fields.avgDefIndex && !fields.nilDefRate) return;

    const inspSum = sumField(rows, fields.inspection);
    const hasRawDef = fields.deficiency && rows.some((r) => r[fields.deficiency] != null);
    const hasRawNil = fields.nilDeficiency && rows.some((r) => r[fields.nilDeficiency] != null);

    if (fields.avgDefIndex) {
      let value = 0;
      if (inspSum) {
        if (hasRawDef) {
          const defSum = sumField(rows, fields.deficiency);
          value = Number((defSum / inspSum).toFixed(2));
        } else {
          const weighted = weightedSumField(rows, fields.avgDefIndex, fields.inspection);
          value = Number((weighted / inspSum).toFixed(2));
        }
      }
      t[fields.avgDefIndex] = value;
    }

    if (fields.nilDefRate) {
      let value = 0;
      if (inspSum) {
        if (hasRawNil) {
          const nilSum = sumField(rows, fields.nilDeficiency);
          value = Number(((nilSum / inspSum) * 100).toFixed(2));
        } else {
          const weighted = weightedSumField(rows, fields.nilDefRate, fields.inspection);
          value = Number((weighted / inspSum).toFixed(2));
        }
      }
      t[fields.nilDefRate] = value;
    }
  });

  return t;
}

// The first non-numeric leaf column (e.g. "Name of MMD" or "shipType"): used to label the
// Total row and as the Search column focus so the toolbar's search hits the most useful column.
function firstLabelField(serverCols) {
  const [first] = serverCols;
  if (!first) return null;
  if (first.children) return firstLabelField(first.children);
  return first.field || null;
}

export default function FlagStateInspectionReport({
  code, title, fetchFn, triggerNotification, flat = false, showTotal = true, filenameSuffix = 'Flag_State_Inspection',
}) {
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
        // Backend sends { columnDefs, rowData }. Fall back to bare array for pages that still
        // return rows only (old shape or empty responses).
        const data = res?.data;
        if (Array.isArray(data?.rowData) && Array.isArray(data?.columnDefs)) {
          setRows(data.rowData);
          setServerCols(data.columnDefs);
        } else if (Array.isArray(data)) {
          setRows(data);
          setServerCols([]);
        } else if (Array.isArray(data?.data)) {
          setRows(data.data);
          setServerCols([]);
        } else {
          setRows([]);
          setServerCols([]);
        }
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

  // Apply shared cell / header styling to the backend's column defs and add a numeric formatter.
  const style = (d) => ({
    ...d,
    headerClass: `${d.headerClass || ''} text-center`.trim(),
    cellClass: 'text-center flex items-center justify-center',
    ...(d.children ? { children: d.children.map(style) } : {
      minWidth: 150,
      cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
    }),
  });

  const colDefs = useMemo(() => {
    const serial = {
      headerName: 'S.No',
      valueGetter: (p) => (p.data?._isTotal ? 'Total' : (p.node?.rowIndex ?? 0) + 1),
      cellStyle: (p) => (p.data?._isTotal ? { fontWeight: 700 } : null),
      minWidth: 70, maxWidth: 90, pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
    };
    return [serial, ...serverCols.map(style)];
  }, [serverCols]);

  const leaves = useMemo(() => leavesOf(serverCols), [serverCols]);
  const labelField = useMemo(() => firstLabelField(serverCols), [serverCols]);

  const totalsRow = useMemo(() => (
    showTotal ? buildTotalsRow(rows, leaves, labelField, serverCols) : null
  ), [rows, leaves, labelField, serverCols, showTotal]);

  const fileBase = `DGS_${code.replace(/\./g, '_')}_${filenameSuffix}`;

  const exportTable = () => {
    const line = (r) => leaves.map((l) => (r[l.field] ?? ''));
    const out = rows.map((r, i) => [i + 1, ...line(r)]);
    if (totalsRow) out.push(['Total', ...line(totalsRow)]);
    return { headers: ['S.No', ...leaves.map((l) => l.header)], rows: out };
  };

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
    const file = exportRowsToFile(type, {
      title: `Form No. ${code} - ${title}`,
      headers, rows: out, fileName: fileBase,
    });
    notify(COMMON_TOASTS.excelExported(file));
  };

  return (
    <div className={flat ? 'flex flex-col flex-1 min-h-0 h-full space-y-3' : 'module-card space-y-4'}>
      <div className="flex flex-col items-center text-center pt-2 flex-shrink-0">
        <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
          Form No. {code} - {title}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>
            As on date: <strong className="text-[#4b2424] dark:text-blue-400">{asOnDate()}</strong>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span>
            Report for the month — <strong className="text-[#4b2424] dark:text-blue-400">{reportMonth()}</strong>
          </span>
        </div>
      </div>

      <div className={flat ? 'flex-1 min-h-0 flex flex-col' : ''}>
        <TableWithToolbar
          rowData={rows}
          columnDefs={colDefs}
          pinnedBottomRowData={totalsRow ? [totalsRow] : undefined}
          loading={loading}
          color={BROWN}
          hoverColor={BROWN_HOVER}
          searchPlaceholder="Search records..."
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
