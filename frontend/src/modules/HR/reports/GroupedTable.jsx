import { useMemo } from 'react';
import Table from '../../../components/Table';
import { cellValue, headerLabel, leafColumns } from './reportUtils';

const isNumeric = (v) => v !== '' && v != null && !Number.isNaN(Number(v));

// Rows are wrapped so report fields can never clash with the grid's own keys, and so each row
// keeps its position in the report (serial numbers use it, not the grid's row index).
const wrapRows = (rows) => rows.map((row, i) => ({ row, i }));

// Fixed row height: long names are clamped to two lines (full text on hover), so every cell
// in a row stays vertically centred on the same line.
const ROW_HEIGHT = 46;
const SERIAL_WIDTH = 76;
// Rows per page; the grand-total row stays pinned below every page and covers all rows.
const PAGE_SIZE = 10;
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
        headerLabel(col).length,
        ...rows.map((r, i) => String(cellValue(col, r, i)).length),
        0
      );
      return Math.min(PINNED_MAX, Math.max(PINNED_MIN, Math.round(longest * 7.2 + 40)));
    };

    // colId from the column's position in the header tree (unique, stable across renders).
    const toGrid = (col, path) => {
      if (Array.isArray(col.children) && col.children.length) {
        return {
          headerName: headerLabel(col),
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
        headerName: headerLabel(col),
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
      <Table
        rowData={rowData}
        columnDefs={gridColumns}
        pinnedBottomRowData={pinnedBottomRowData}
        loading={loading}
        loadingMessage="Loading report..."
        pagination
        paginationPageSize={PAGE_SIZE}
        rowHeight={ROW_HEIGHT}
        color="var(--module-report-header-bg, #4b2424)"
        suppressMovableColumns
        overlayNoRowsTemplate={`<span class="text-sm font-semibold text-slate-500">${emptyMessage}</span>`}
        defaultColDef={{ resizable: true, sortable: false, filter: false }}
      />
    </div>
  );
}
