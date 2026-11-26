import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import { readGridForExport, toClipboardText, saveGridFile } from '../utils/gridExport';

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
  showEditAction = false,
  onEditRow,
  // Optional saved list state (KPI DGS store). Left undefined, the table keeps its own state.
  searchTerm,
  onSearchChange,
  visibleCols,
  onVisibleColsChange,
  // Optional filters. Left undefined, every fetched row is shown and no filter controls appear.
  filterRows, // (allRows) => rows to show
  filterToolbar, // node next to the search box (e.g. the Filter button)
  renderFilterPanel, // (allRows) => node under the toolbar (e.g. the filter panel), or null
  renderAboveTable, // (allRows) => node above the toolbar (e.g. tabs that split the rows), or null
  // Optional standard exports (as CSL / Capex): with an export title, Copy / Excel (.xlsx) / PDF
  // save the list as shown (all rows after search, filters and sort; visible columns; cells as
  // displayed). Left undefined, the table's own Copy / CSV / print are used.
  exportTitle,
  exportFileName,
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
  const dataColumns = columns && columns.length
    ? columns
    : rows.length
      ? [
          {
            headerName: 'S.No',
            valueGetter: (p) => p.node.rowIndex + 1,
            minWidth: 80,
            maxWidth: 100,
            cellClass: 'text-center font-bold text-slate-500 flex items-center justify-center',
          },
          ...Object.keys(rows[0])
            .filter((key) => key !== 'month_number')
            .map((key) => {
              const heading = toHeading(key);

              return {
                headerName: heading,
                field: key,
                flex: 1,
                minWidth: headerMinWidth(heading),
                wrapText: true,
                autoHeight: true,
                cellClass: 'text-center text-slate-700 flex items-center justify-center',
              };
            }),
        ]
      : [
          {
            headerName: 'S.No',
            valueGetter: (p) => p.node.rowIndex + 1,
            minWidth: 80,
          },
        ];

  return [
    ...dataColumns,
    ...(showEditAction
      ? [
          {
            headerName: 'Action',
            colId: 'action',
            pinned: 'right',
            minWidth: 90,
            maxWidth: 110,
            sortable: false,
            filter: false,
            cellClass: 'text-center flex items-center justify-center',
            cellRenderer: (params) => (
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => onEditRow?.(params.data)}
                  className="inline-flex items-center justify-center h-7 w-7 bg-amber-400 hover:bg-amber-500 text-white rounded transition cursor-pointer"
                  title="Edit entry"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];
  }, [rows, columns, showEditAction, onEditRow]);


  const shownRows = useMemo(() => (filterRows ? filterRows(rows) : rows), [filterRows, rows]);
  const gridApiRef = useRef(null);
  const fileName = exportFileName || `dgs_${code.replace(/\./g, '_')}`;

  // The grid as shown, or null after telling the user why there is nothing to export
  const readGrid = (action) => {
    const grid = readGridForExport(gridApiRef.current);
    if (!grid) {
      notify(COMMON_TOASTS.tableNotReady(action));
      return null;
    }
    if (!grid.rows.length) {
      notify(action === 'copy' ? COMMON_TOASTS.nothingToCopy() : COMMON_TOASTS.nothingToExport());
      return null;
    }
    return grid;
  };

  const saveAs = (type) => {
    const grid = readGrid('export');
    if (!grid) return;
    try {
      const file = saveGridFile(type, grid, { title: exportTitle, fileName });
      notify(COMMON_TOASTS.excelExported(file, 'The list'));
    } catch (err) {
      console.error(`Error exporting ${code}:`, err);
      notify(COMMON_TOASTS.exportFailed());
    }
  };

  const exportHandlers = exportTitle ? {
    onCopy: () => {
      const grid = readGrid('copy');
      if (!grid) return;
      navigator.clipboard.writeText(toClipboardText(grid)).then(
        () => notify(COMMON_TOASTS.copySuccess(grid.rows.length, 'from the list')),
        () => notify(COMMON_TOASTS.copyFailed()),
      );
    },
    onExportExcel: () => saveAs('excel'),
    onExportPdf: () => saveAs('pdf'),
  } : {};

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

      {renderAboveTable ? renderAboveTable(rows) : null}

      <TableWithToolbar
        rowData={shownRows}
        columnDefs={colDefs}
        loading={loading}
        color={color}
        hoverColor={hoverColor}
        searchPlaceholder="Search records..."
        exportFileName={fileName}
        fillHeight={flat}
        triggerNotification={triggerNotification}
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        visibleCols={visibleCols}
        onVisibleColsChange={onVisibleColsChange}
        extraLeftToolbarContent={filterToolbar}
        belowToolbarContent={renderFilterPanel ? renderFilterPanel(rows) : null}
        onGridReady={(params) => { gridApiRef.current = params.api; }}
        {...exportHandlers}
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
