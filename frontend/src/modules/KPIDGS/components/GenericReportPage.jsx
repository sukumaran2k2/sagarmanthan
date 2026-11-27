import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import TableWithToolbar from '../../../components/TableWithToolbar';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import { readGridForExport, toClipboardText, saveGridFile } from '../utils/gridExport';
import * as XLSX from 'xlsx';
import { exportRowsToFile } from '../../../utils/exportGridReport';

// Brown theme used by every DGS *Reports* page (toolbar buttons + table header).
// Kept in sync with FlaggingReport.jsx so all K-2.x reports read as one module.
// Data List reuses this same renderer but overrides the colour to blue below.
const BROWN = '#4b2424';
const BROWN_HOVER = '#6b3535';


const totalCellStyle = (p) => (p.data?._isTotal ? { fontWeight: 700 } : null);
const CUMULATIVE_CODE = 'K-2.1.3';

const LEAF_TITLES = { Ships: 'No. of Registered Ships', Tonnage: 'Total Tonnage' };

// "During the Previous FY (2025-2026) - Ships" -> ['During the Previous FY (2025-2026)', 'Ships']
const splitKey = (key) => {
  const i = key.lastIndexOf(' - ');
  return i < 0 ? null : [key.slice(0, i), key.slice(i + 3)];
};

const buildGroupedCols = (keys) => {
  const groups = [];
  keys.forEach((key) => {
    const parts = splitKey(key);
    if (!parts) return;
    const [grp, leaf] = parts;
    let g = groups.find((x) => x.headerName === grp);
    if (!g) { g = { headerName: grp, headerClass: 'text-center', children: [] }; groups.push(g); }
    g.children.push({
      headerName: LEAF_TITLES[leaf] || leaf,
      field: key,
      flex: 1,
      minWidth: 170,
      // minWidth: leaf === 'Ships' ? 240 : 150,
      headerClass: 'text-center',
      cellClass: 'text-center text-slate-700 flex items-center justify-center',
      cellStyle: totalCellStyle,
    });
  });
  return groups;
};
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
  defaultVisible,
  centerTitle = false,
  showTotal = false,
}) {
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState({ asOnDate: '', reportMonth: '' });

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
        if (data && !Array.isArray(data)) {
          setMeta({
            asOnDate: data.asOnDate || '',
            reportMonth: data.reportMonth || '',
          });
        }
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
    const isCumulative = code === CUMULATIVE_CODE;

    const sno = {
      headerName: 'S.No',
      valueGetter: (p) =>
        p.data?._isTotal
          ? 'Total'
          : (p.node?.rowIndex ?? 0) + 1,
      minWidth: 80,
      maxWidth: 100,
      cellClass:
        'text-center text-slate-500 flex items-center justify-center',
      cellStyle: totalCellStyle,
      ...(isCumulative && { pinned: 'left' }),
    };

    let dataColumns;

    // Custom columns
    if (columns && columns.length) {
      dataColumns = columns;

    // Cumulative report
    } else if (rows.length && isCumulative) {
      dataColumns = [
        sno,
        {
          headerName: 'MMD Name',
          field: 'MMD Name',
          minWidth: 160,
          pinned: 'left',
          cellClass:
            'text-center text-slate-700 flex items-center justify-center',
          cellStyle: totalCellStyle,
        },
        ...buildGroupedCols(Object.keys(rows[0])),
      ];

    // Normal report
    } else if (rows.length) {
      dataColumns = [
        sno,
        ...Object.keys(rows[0])
          .filter((key) => !SKIP_KEY.test(key))
          .map((key) => {
            const heading = toHeading(key);

            return {
              headerName: heading,
              field: key,
              flex: 1,
              minWidth: headerMinWidth(heading),
              wrapText: true,
              autoHeight: true,
              cellClass:
                'text-center text-slate-700 flex items-center justify-center',
              cellStyle: totalCellStyle,
              valueFormatter: (p) => showDate(p.value),
              hide: defaultVisible
                ? !defaultVisible.includes(key)
                : false,
            };
          }),
      ];

    // Empty report
    } else {
      dataColumns = [
        {
          ...sno,
          valueGetter: (p) =>
            p.data?._isTotal
              ? ''
              : (p.node?.rowIndex ?? 0) + 1,
        },
      ];
    }

    return [
      ...dataColumns,

      // Action column
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
              cellClass:
                'text-center flex items-center justify-center',
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
  }, [
    rows,
    columns,
    showEditAction,
    onEditRow,
    defaultVisible,
    code,
  ]);


  const shownRows = useMemo(() => (filterRows ? filterRows(rows) : rows), [filterRows, rows]);
  const showBanner = centerTitle || Boolean(meta.asOnDate);
  const reportTitle = exportTitle || `Form No. ${code} - Abstract - ${title}`;
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

  const flatKeys = useMemo(
    () => (rows.length ? Object.keys(rows[0]).filter((k) => k !== 'month_number') : []),
    [rows],
  );
  
  const flatHeaders = useMemo(() => [
  'S.No',
  ...flatKeys.map((k) => {
    if (code !== CUMULATIVE_CODE) return toHeading(k);
    const p = splitKey(k);
    return p ? `${p[0]} - ${LEAF_TITLES[p[1]] || p[1]}` : k;
  }),
], [flatKeys, code]);













  // Total row (K-2.1.3): sums every numeric column of the rows currently shown
  const labelKey = useMemo(
    () => flatKeys.find((k) => shownRows.some((r) => typeof r[k] === 'string')) || flatKeys[0],
    [flatKeys, shownRows],
  );
  
     const wantTotal = showTotal || code === CUMULATIVE_CODE;

  const totalsRow = useMemo(() => {
    if (!wantTotal || !shownRows.length) return null;
    const t = { _isTotal: true };
    flatKeys.forEach((k) => {
      if (k === labelKey) { t[k] = 'Total'; return; }
      t[k] = Math.round(
        shownRows.reduce((s, r) => s + (Number(r[k]) || 0), 0) * 100,
      ) / 100;
    });
    return t;
  }, [wantTotal, shownRows, flatKeys, labelKey]);

  const flatRows = useMemo(() => {
    const data = shownRows.map((r, i) => [i + 1, ...flatKeys.map((k) => r[k] ?? '')]);
    if (totalsRow) {
      data.push(['Total', ...flatKeys.map((k) => (k === labelKey ? '' : totalsRow[k]))]);
    }
    return data;
  }, [shownRows, flatKeys, totalsRow, labelKey]);
  const flatHandlers = {
    onCopy: () => {
      if (!shownRows.length) { notify(COMMON_TOASTS.nothingToCopy()); return; }
      const tsv = [flatHeaders.join('\t'), ...flatRows.map((r) => r.join('\t'))].join('\n');
      navigator.clipboard.writeText(tsv)
        .then(() => notify(COMMON_TOASTS.copySuccess(shownRows.length, reportTitle)))
        .catch(() => notify(COMMON_TOASTS.copyFailed()));
    },
    onExportExcel: () => {
      if (!shownRows.length) { notify(COMMON_TOASTS.nothingToExport()); return; }
      const ws = XLSX.utils.aoa_to_sheet([flatHeaders, ...flatRows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      const name = `${fileName}.xlsx`;
      XLSX.writeFile(wb, name);
      notify(COMMON_TOASTS.excelExported(name));
    },
    onExportPdf: () => {
      if (!shownRows.length) { notify(COMMON_TOASTS.nothingToExport()); return; }
      exportRowsToFile('pdf', {
        title: reportTitle,
        headers: flatHeaders,
        rows: flatRows,
        fileName,
      });
    },
  };

  const gridHandlers = exportTitle ? {
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

  // const exportHandlers = centerTitle ? flatHandlers : gridHandlers;
  const exportHandlers = showBanner ? flatHandlers : gridHandlers;

  return (
   <div className={flat ? 'space-y-4' : 'module-card space-y-4'}>
      {showBanner ? (
        <div className="flex flex-col items-center text-center space-y-1 pt-2 flex-shrink-0">
          <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100">
            {`Form No. ${code} - Abstract - ${title}`}
          </h2>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            As On date: <span className="underline">{meta.asOnDate || '-'}</span>
          </div>
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            (Report for the Month - {meta.reportMonth || '-'})
          </div>
        </div>
      ) : (
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
      )}

      {renderAboveTable ? renderAboveTable(rows) : null}

      <TableWithToolbar
        rowData={shownRows}
        columnDefs={colDefs}
        loading={loading}
        color={color}
        hoverColor={hoverColor}
        headerHeight={code === CUMULATIVE_CODE ? 46 : undefined}
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
        pinnedBottomRowData={totalsRow ? [totalsRow] : undefined}
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
// Serial / id columns that should not appear as their own column
const SKIP_KEY = /^(month_number|sr_?no|s_?no)$/i;

// 2026-11-01T00:00:00.000Z -> 01/11/2026 ; everything else passes through
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T|$)/;
const showDate = (value) => {
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString('en-GB', { timeZone: 'UTC' });
    }
  }
  return value;
};