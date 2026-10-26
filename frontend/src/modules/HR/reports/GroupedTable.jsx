import { useMemo } from 'react';
import Table from '../../../components/Table';
import { cellValue, leafColumns } from './reportUtils';
import { REPORT_THEME as T } from './theme';

const isNumeric = (v) => v !== '' && v != null && !Number.isNaN(Number(v));

// Rows are wrapped so report fields can never clash with the grid's own keys, and so each row
// keeps its position in the report (serial numbers use it, not the grid's row index).
const wrapRows = (rows) => rows.map((row, i) => ({ row, i }));

// Fixed row height: long names are clamped to two lines (full text on hover), so every cell
// in a row stays vertically centred on the same line.
const ROW_HEIGHT = 46;
const SERIAL_WIDTH = 76;
// Pinned name columns are sized to their longest value (two-line wrap allowed), within these bounds.
const PINNED_MIN = 110;
const PINNED_MAX = 240;

function TextCell({ value }) {
  return (
    <span title={value === '' ? undefined : String(value)} className="line-clamp-2 whitespace-normal break-words leading-[17px]">
      {value}
    </span>
  );
}

/**
 * Report table on the shared ag-grid Table, in the Capex report style: one dark header colour
 * for every header level (grouped headers), and a pinned dark grand-total row.
 * Columns: { headerName, field, children, value(row, index), align, minWidth, emphasis }.
 *
 * Alignment: S.No and text columns (department, organisation, post...) are left-aligned;
 * number columns are centred. A column's own `align` wins.
 */
export default function GroupedTable({ columns, rows, totals, loading, emptyMessage = 'No data available' }) {
  const gridColumns = useMemo(() => {
    const leaves = leafColumns(columns);
    // A column is numeric when every non-empty value in it is a number; the serial column
    // (it has a value() getter) is always left-aligned.
    const alignOf = new Map(
      leaves.map((col) => {
        if (col.align) return [col, col.align];
        if (col.value) return [col, 'left'];
        const values = rows.map((r, i) => cellValue(col, r, i)).filter((v) => v !== '');
        return [col, values.length && values.every(isNumeric) ? 'center' : 'left'];
      })
    );

    // S.No and the leading name columns (Department, Organisation...) are frozen on the left,
    // so they stay in view while the number columns scroll sideways.
    const pinned = new Set();
    for (const col of columns) {
      const isLeaf = !(Array.isArray(col.children) && col.children.length);
      if (!isLeaf || alignOf.get(col) !== 'left') break;
      pinned.add(col);
    }
    // ~7px per character at 12px bold, plus cell padding; long names wrap onto a second line.
    const pinnedWidth = (col) => {
      const longest = Math.max(
        String(col.headerName ?? col.field ?? '').length,
        ...rows.map((r, i) => String(cellValue(col, r, i)).length),
        0
      );
      return Math.min(PINNED_MAX, Math.max(PINNED_MIN, Math.round(longest * 7.2 + 40)));
    };

    // colId from the column's position in the header tree (unique, stable across renders).
    const toGrid = (col, path) => {
      if (Array.isArray(col.children) && col.children.length) {
        return {
          headerName: col.headerName ?? col.field ?? '',
          headerClass: 'hr-rpt-group',
          marryChildren: true,
          children: col.children.map((c, i) => toGrid(c, `${path}-${i}`)),
        };
      }
      const align = alignOf.get(col) || 'center';
      const serial = Boolean(col.value);
      const frozen = pinned.has(col);
      return {
        colId: `c${path}`,
        headerName: col.headerName ?? col.field ?? '',
        headerClass: [align === 'left' ? 'hr-rpt-head-left' : 'hr-rpt-head-center', serial ? 'hr-rpt-head-serial' : ''].filter(Boolean),
        // S.No has a fixed width that column fitting never squeezes (its header stays on one line).
        ...(serial
          ? { width: SERIAL_WIDTH, minWidth: SERIAL_WIDTH, maxWidth: SERIAL_WIDTH, suppressSizeToFit: true, resizable: false }
          : frozen
            ? { width: pinnedWidth(col), minWidth: PINNED_MIN, suppressSizeToFit: true }
            : { minWidth: col.minWidth }),
        pinned: frozen ? 'left' : undefined,
        lockPinned: frozen,
        sortable: false,
        filter: false,
        cellRenderer: align === 'left' && !serial ? TextCell : undefined,
        valueGetter: (p) => {
          if (p.node.rowPinned) return col.value ? '' : totals?.[col.field] ?? '';
          return cellValue(col, p.data.row, p.data.i);
        },
        cellClass: [
          align === 'left' ? 'hr-rpt-left' : 'hr-rpt-center',
          col.emphasis ? 'hr-rpt-emphasis' : '',
          col.value ? 'hr-rpt-serial' : '',
        ].filter(Boolean),
        cellStyle: { textAlign: align },
      };
    };
    return columns.map((c, i) => toGrid(c, String(i)));
  }, [columns, rows, totals]);

  const rowData = useMemo(() => wrapRows(rows), [rows]);
  const pinnedBottomRowData = useMemo(() => (totals && rows.length ? [{ total: true }] : undefined), [totals, rows.length]);

  return (
    <div className={`hr-report-grid ${rows.length ? "hr-report-has-rows" : ""}`}>
      <style>{`
        .hr-report-grid .ag-header-cell.hr-rpt-head-left .ag-header-cell-label { justify-content: flex-start !important; }
        .hr-report-grid .ag-header-cell.hr-rpt-head-left .ag-header-cell-text { text-align: left !important; }
        .hr-report-grid .ag-header-cell.hr-rpt-head-center .ag-header-cell-label { justify-content: center !important; }
        .hr-report-grid .ag-header-cell.hr-rpt-head-serial .ag-header-cell-text { white-space: nowrap !important; word-break: keep-all !important; }
        .hr-report-grid .ag-header-cell, .hr-report-grid .ag-header-group-cell { border-right: 1px solid ${T.headBorder} !important; }
        .hr-report-grid .ag-header-group-cell { border-bottom: 1px solid ${T.headBorder} !important; }
        .hr-report-grid .ag-header-group-cell-label { justify-content: center !important; }
        .hr-report-grid .ag-cell { border-right: 1px solid ${T.line} !important; font-size: 12px; }
        .hr-report-grid .ag-cell.hr-rpt-left { justify-content: flex-start !important; }
        .hr-report-grid .ag-cell.hr-rpt-center { justify-content: center !important; }
        .hr-report-grid .ag-cell.hr-rpt-serial { font-weight: 600; color: #334155; }
        .hr-report-grid .ag-cell.hr-rpt-emphasis { font-weight: 700; color: ${T.brand}; }
        .hr-report-grid .ag-row { border-bottom: 1px solid ${T.line} !important; }
        .hr-report-grid .ag-row-odd:not(.ag-row-pinned) { background-color: ${T.tint} !important; }
        .hr-report-grid .ag-row-even:not(.ag-row-pinned) { background-color: #ffffff !important; }
        .dark .hr-report-grid .ag-row-odd:not(.ag-row-pinned) { background-color: #0f172a !important; }
        .dark .hr-report-grid .ag-row-even:not(.ag-row-pinned) { background-color: #111827 !important; }
        /* No hover highlight: rows keep their stripe colour under the pointer. */
        .hr-report-grid .ag-root-wrapper { --ag-row-hover-color: transparent; }
        .hr-report-grid .ag-row-hover::before { display: none !important; }
        /* Auto-height grids reserve a 150px body; with rows, fit the body to them (no gap above the total). */
        .hr-report-has-rows .ag-layout-auto-height .ag-center-cols-viewport,
        .hr-report-has-rows .ag-layout-auto-height .ag-center-cols-container { min-height: 0 !important; }
        .hr-report-grid .ag-pinned-left-header, .hr-report-grid .ag-pinned-left-cols-container .ag-row,
        .hr-report-grid .ag-pinned-left-floating-bottom { border-right: 2px solid ${T.headBorder} !important; }
        .hr-report-grid .ag-row-pinned { background-color: ${T.brand} !important; border-top: 4px solid ${T.totalTopBorder} !important; }
        .hr-report-grid .ag-row-pinned .ag-cell { color: #ffffff !important; font-weight: 900; border-right-color: ${T.headBorder} !important; }
        .hr-report-grid .ag-row-pinned .ag-cell.hr-rpt-left { text-transform: uppercase; letter-spacing: 0.05em; }
        .dark .hr-report-grid .ag-cell.hr-rpt-serial { color: #cbd5e1; }
        .dark .hr-report-grid .ag-cell.hr-rpt-emphasis { color: #fca5a5 !important; }
      `}</style>
      <Table
        rowData={rowData}
        columnDefs={gridColumns}
        pinnedBottomRowData={pinnedBottomRowData}
        loading={loading}
        loadingMessage="Loading report..."
        pagination={false}
        rowHeight={ROW_HEIGHT}
        color={T.brand}
        suppressMovableColumns
        overlayNoRowsTemplate={`<span class="text-sm font-semibold text-slate-500">${emptyMessage}</span>`}
        defaultColDef={{ resizable: true, sortable: false, filter: false }}
      />
    </div>
  );
}
