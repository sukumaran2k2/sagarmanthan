import { useEffect, useMemo, useRef, useState } from 'react';
import { Edit, Trash2, Filter, ChevronDown, X } from 'lucide-react';
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
const FILTER_FIELDS = [
  { id: 'year', label: 'Year', match: /(^|_)year$|Year$/i },
  { id: 'month', label: 'Month', match: MONTH_KEY },
  { id: 'mmd', label: 'MMD Name', match: /mmd/i },
];

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
  const [showFilterPanel, setShowFilterPanel] = useState(false);
   const [filters, setFilters] = useState({}); // column key -> selected value ('' = all)
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
const filterFields = useMemo(() => {
  return FILTER_FIELDS.map((f) => {
    const key = columnKeys.find((k) => f.match.test(k));
    if (!key) return null;

    const vals = [...new Set(rows.map((r) => r[key]).filter((v) => v !== null && v !== undefined && v !== ''))];

    vals.sort((a, b) => {
      if (f.id === 'year') return Number(b) - Number(a);              // newest year first
      if (f.id === 'month') return Number(a) - Number(b);             // Jan -> Dec
      return String(a).localeCompare(String(b), undefined, { numeric: true });
    });

    return {
      key,
      label: f.label,
      options: vals.map((v) => ({ value: String(v), label: String(showValue(key, v)) })),
    };
  }).filter(Boolean);
}, [rows, columnKeys]);

const activeFiltersCount = Object.values(filters).filter(Boolean).length;



const setFilter = (key, value) => {
  setFilters((prev) => ({ ...prev, [key]: value }));
  setPage(0);
};

const clearFilters = () => {
  setFilters({});
  setSearch('');
  setPage(0);
  notify?.('Filters reset');
};

const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  return rows.filter((r) => {
    for (const [k, v] of Object.entries(filters)) {
      if (v && String(r[k]) !== v) return false;
    }
    if (!q) return true;
    return columnKeys.some((k) => String(showValue(k, r[k]) ?? '').toLowerCase().includes(q));
  });
}, [rows, search, columnKeys, filters]);

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

      ...(onEdit
  ? [
      {
        headerName: 'Actions',
        field: 'id',
        pinned: 'right',
        minWidth: 80,
        sortable: false,
        cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (params) => (
          <button
            onClick={() => onEdit(params.data)}
            className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
            title="Update Entry"
          >
            <Edit className="h-4 w-4" />
          </button>
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
       <div className="flex flex-wrap items-center gap-2.5">
  <button
    type="button"
    onClick={() => setShowFilterPanel((open) => !open)}
    className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
  >
    <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
    <span>Filter</span>
    {activeFiltersCount > 0 && (
      <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
        {activeFiltersCount}
      </span>
    )}
    <ChevronDown size={14} className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
  </button>

  {(activeFiltersCount > 0 || search) && (
    <button
      type="button"
      onClick={clearFilters}
      className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/40 dark:hover:bg-rose-950/30 transition cursor-pointer"
    >
      <X className="h-3 w-3" />
      <span>Reset Filters</span>
    </button>
  )}
</div>

{showFilterPanel && (
  <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {filterFields.map((f) => (
        <div key={f.key}>
          <label className="module-form-label">{f.label}</label>
          <select
            value={filters[f.key] || ''}
            onChange={(e) => setFilter(f.key, e.target.value)}
            className="module-form-select"
          >
            <option value="">All {f.label}s</option>
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  </div>
)}
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
