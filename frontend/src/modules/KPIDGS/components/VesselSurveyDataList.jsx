import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit, Trash2 } from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import DataListToolbar from '../../../components/DataListToolbar';
import { COMMON_TOASTS } from '../../../utils/notify';
import { cellText } from '../../../utils/cellText';
import { exportRowsToFile } from '../../../utils/exportGridReport';
import { MONTHS } from '../data/periodOptions';
import * as api from '../api';

const PAGE_SIZE = 10;
const CELL =
  'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-200';

// Keys that are never shown as columns (ids and audit fields). `id` stays in the
// row data because Edit and Delete need it.
const HIDDEN_KEY = /(^id$|_id$|Id$|^created|^updated)/i;

// Columns whose key is "month", "survey_month", "surveyMonth", etc.
const MONTH_KEY = /(^|_)month$|Month$/;

// 1-12 (number or numeric string) -> month name; anything else passes through
const showValue = (key, value) => {
  if (!MONTH_KEY.test(key)) return value;
  const m = MONTHS.find((x) => Number(x.value) === Number(value));
  return m ? m.label : value;
};

// "no_of_surveyors_posted" / "noOfSurveyorsPosted" -> "No Of Surveyors Posted"
const humanize = (key) =>
  key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());

// Accept a plain array or a wrapped response
const toRows = (res) => {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.rows)) return d.rows;
  if (Array.isArray(d?.result)) return d.result;
  return [];
};

export default function VesselSurveyDataList({ onEdit, onDelete, notify }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0); // zero-based
  const [hidden, setHidden] = useState({}); // column key -> false when unticked in Visibility
  const gridRef = useRef(null);

  useEffect(() => {
    api
      .fetchVesselSurveyList()
      .then((res) => {
        const list = toRows(res);
        console.log('vessel survey response:', res?.data, 'first row:', list[0]);
        setRows(list);
      })
      .catch((err) => {
        console.error('Vessel survey list failed:', err);
        notify?.(COMMON_TOASTS.loadFailed('Vessel survey list'));
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  // Columns come from the data itself, so no field names are hard-coded
  const columnKeys = useMemo(
    () => Object.keys(rows[0] || {}).filter((k) => !HIDDEN_KEY.test(k)),
    [rows],
  );
  const columnLabels = useMemo(
    () => Object.fromEntries(columnKeys.map((k) => [k, humanize(k)])),
    [columnKeys],
  );
  const visibleCols = useMemo(
    () => Object.fromEntries(columnKeys.map((k) => [k, hidden[k] !== false])),
    [columnKeys, hidden],
  );
  const setVisibleCols = (updater) => {
    const next = typeof updater === 'function' ? updater(visibleCols) : updater;
    setHidden(next);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
   return rows.filter((r) => columnKeys.some((k) => String(showValue(k, r[k]) ?? '').toLowerCase().includes(q)));
  }, [rows, search, columnKeys]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const exportTable = () => {
    const cols = columnKeys.filter((c) => visibleCols[c]);
    return {
      headers: ['S.No', ...cols.map((c) => columnLabels[c])],
      rows: filtered.map((r, i) => [i + 1, ...cols.map((c) => cellText(showValue(c, r[c])))]),
    };
  };

  const handleCopy = async () => {
    const { headers, rows: out } = exportTable();
    try {
      await navigator.clipboard.writeText([headers, ...out].map((r) => r.join('\t')).join('\n'));
      notify?.(COMMON_TOASTS.copySuccess(out.length));
    } catch {
      notify?.(COMMON_TOASTS.copyFailed());
    }
  };

  const download = (type) => {
    const { headers, rows: out } = exportTable();
    const file = exportRowsToFile(type, {
      title: 'Vessel Survey Data List',
      headers,
      rows: out,
      fileName: 'vessel_survey',
    });
    notify?.(COMMON_TOASTS.excelExported(file));
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this vessel survey entry?')) return;
    try {
      await onDelete(row);
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const colDefs = useMemo(
    () => [
      {
        headerName: 'S.No',
        pinned: 'left',
        minWidth: 80,
        valueGetter: (p) => p.node.rowIndex + 1 + safePage * PAGE_SIZE,
        cellClass:
          'text-center font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center border-r border-slate-100 dark:border-slate-700',
      },
      ...columnKeys
        .filter((k) => visibleCols[k])
        .map((k) => ({
        headerName: columnLabels[k],
        field: k,
        flex: 1,
        minWidth: 120,
        cellClass: CELL,
        valueFormatter: (p) => showValue(k, p.value),
      })),

      ...(onEdit || onDelete
        ? [
            {
              headerName: 'Actions',
              field: 'id',
              pinned: 'right',
              minWidth: onEdit && onDelete ? 110 : 80,
              sortable: false,
              cellClass: 'text-center flex items-center justify-center gap-1',
              cellRenderer: (params) => (
                <>
                  {onEdit && (
                    <button
                      onClick={() => onEdit(params.data)}
                      className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                      title="Update Entry"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => handleDelete(params.data)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                      title="Delete Vessel Survey Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </>
              ),
            },
          ]
        : []),
    ],
    [columnKeys, columnLabels, visibleCols, onEdit, onDelete, safePage], // eslint-disable-line
  );

  return (
    <div className="space-y-4">
      <DataListToolbar
        searchTerm={search}
        onSearchChange={(v) => {
          setSearch(typeof v === 'string' ? v : v?.target?.value ?? '');
          setPage(0);
        }}
        searchPlaceholder="Search records..."
        totalRows={loading ? '...' : filtered.length}
        onCopy={handleCopy}
        onExportExcel={() => download('excel')}
        onExportPdf={() => download('pdf')}
        visibleCols={visibleCols}
        onVisibleColsChange={setVisibleCols}
        columnLabels={columnLabels}
      />

      <div className="ag-theme-quartz module-datalist-grid rounded-xl border border-slate-200 dark:border-slate-700 shadow-md overflow-x-auto">
        <Table
          ref={gridRef}
          theme="legacy"
          rowData={pageRows}
          columnDefs={colDefs}
          loading={loading}
          pagination={false}
          domLayout="autoHeight"
          rowHeight={50}
          headerHeight={56}
          suppressColumnVirtualisation={true}
          enableExport={false}
          color="#0f417a"
          defaultColDef={{
            filter: false,
            sortable: true,
            resizable: true,
            wrapHeaderText: true,
            autoHeaderHeight: true,
          }}
        />
      </div>

      {totalPages > 1 && (
        <TablePagination
          currentPage={safePage}
          totalPages={totalPages}
          totalRows={filtered.length}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          color="#0f417a"
        />
      )}
    </div>
  );
}
