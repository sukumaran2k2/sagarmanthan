import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Edit,
  Eye,
  Trash2,
  Search,
  X,
  ChevronDown,
  Filter,
  FileText,
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import {
  getWrapColumnProps,
  renderWrappedText,
} from '../../../utils/tableCellWrap';

function formatDate(value) {
  if (!value || value === '--') return '--';
  return String(value).slice(0, 10);
}

export default function NoteListTable({
  rows = [],
  loading = false,
  wings = [],
  divisions = [],
  statusOptions = [],
  canEdit = false,
  canView = false,
  canDelete = false,
  filters,
  onFiltersChange,
  category = 'active',
  onCategoryChange,
  counts = { active: 0, completed: 0 },
  page = 1,
  pageSize = 10,
  pagination = { total: 0, page: 1, limit: 10, totalPages: 0 },
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  onDocs,
}) {
  const [gridApi, setGridApi] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    wing: true,
    division: true,
    status: true,
    remarks: true,
    docs: true,
    lastUpdated: true,
    actions: true,
  });

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDivisions = useMemo(() => {
    if (!filters.wingId || filters.wingId === 'All') return divisions;
    return divisions.filter(
      (d) => d.wing_id == null || String(d.wing_id) === String(filters.wingId)
    );
  }, [divisions, filters.wingId]);

  const displayRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.map((item, index) => ({ ...item, sNo: start + index + 1 }));
  }, [rows, page, pageSize]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.wingId && filters.wingId !== 'All') count += 1;
    if (filters.divisionId && filters.divisionId !== 'All') count += 1;
    if (filters.status && filters.status !== 'All') count += 1;
    return count;
  }, [filters.wingId, filters.divisionId, filters.status]);

  const showActions = (canEdit || canView || canDelete) && visibleCols.actions;

  const columnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo',
        headerName: 'S.No',
        minWidth: 90,
        cellClass: 'font-mono text-slate-600 text-center',
        headerClass: 'text-center',
      },
      {
        field: 'subject',
        headerName: 'Name of the Subject',
        flex: 1.8,
        minWidth: 200,
        ...getWrapColumnProps('font-bold text-slate-800'),
        cellRenderer: (params) => renderWrappedText(params.value, 'font-bold text-slate-800'),
        hide: !visibleCols.subject,
      },
      {
        field: 'wing',
        headerName: 'Wing',
        flex: 1,
        minWidth: 120,
        ...getWrapColumnProps('text-slate-600 font-medium'),
        cellRenderer: (params) => renderWrappedText(params.value, 'text-slate-600 font-medium'),
        hide: !visibleCols.wing,
      },
      {
        field: 'division',
        headerName: 'Division',
        flex: 1,
        minWidth: 120,
        ...getWrapColumnProps('text-slate-600 font-medium'),
        cellRenderer: (params) => renderWrappedText(params.value, 'text-slate-600 font-medium'),
        hide: !visibleCols.division,
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 1.2,
        minWidth: 140,
        hide: !visibleCols.status,
        ...getWrapColumnProps(),
        cellRenderer: (params) =>
          renderWrappedText(params.value, 'text-xs font-black uppercase text-[#0f417a]'),
      },
      {
        field: 'remarks',
        headerName: 'Remarks',
        flex: 1.3,
        minWidth: 160,
        ...getWrapColumnProps('text-slate-600'),
        cellRenderer: (params) => renderWrappedText(params.value, 'text-slate-600 text-xs'),
        hide: !visibleCols.remarks,
      },
      {
        field: 'docCount',
        headerName: 'Docs',
        minWidth: 90,
        hide: !visibleCols.docs,
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          return (
            <button
              type="button"
              onClick={() => onDocs?.(row)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#0f417a] hover:underline cursor-pointer"
              title="Documents"
            >
              <FileText className="h-3.5 w-3.5" />
              {row.docCount || 0}
            </button>
          );
        },
      },
      {
        field: 'lastUpdated',
        headerName: 'Last Updated Date',
        minWidth: 140,
        hide: !visibleCols.lastUpdated,
        valueFormatter: (p) => formatDate(p.value),
        cellClass: 'font-mono text-slate-600 text-center',
      },
    ];

    if (showActions) {
      cols.push({
        headerName: 'Update',
        field: 'actions',
        minWidth: 110,
        width: 110,
        pinned: 'right',
        sortable: false,
        filter: false,
        headerClass: 'text-center',
        cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          return (
            <div className="flex items-center justify-center space-x-1.5 h-full w-full py-1">
              {canEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit?.(row)}
                  title="Edit Note"
                  className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
                >
                  <Edit className="h-4 w-4" />
                </button>
              ) : canView ? (
                <button
                  type="button"
                  onClick={() => onEdit?.(row)}
                  title="View Note"
                  className="p-1.5 hover:bg-blue-50 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-lg transition cursor-pointer"
                >
                  <Eye className="h-4 w-4" />
                </button>
              ) : null}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete?.(row)}
                  className="p-1.5 hover:bg-rose-50 dark:hover:bg-slate-800 text-rose-600 dark:text-rose-400 rounded-lg transition cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        },
      });
    }
    return cols;
  }, [canEdit, canView, canDelete, onEdit, onDelete, onDocs, visibleCols, showActions]);

  const setFilter = (key, value) => {
    onFiltersChange?.({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange?.({
      ...filters,
      wingId: 'All',
      divisionId: 'All',
      status: 'All',
    });
  };

  const handleExport = (type) => {
    if (type === 'Copy') {
      let tsv = '';
      const headers = [];
      columnDefs.forEach((col) => {
        if (col.headerName && col.headerName !== 'Update' && !col.hide) {
          headers.push(col.headerName);
        }
      });
      tsv += `${headers.join('\t')}\n`;
      displayRows.forEach((row) => {
        const line = [];
        columnDefs.forEach((col) => {
          if (col.headerName && col.headerName !== 'Update' && !col.hide) {
            let val = '';
            if (col.field === 'sNo') val = row.sNo;
            else if (col.field === 'lastUpdated') val = formatDate(row.lastUpdated);
            else val = row[col.field] ?? '';
            line.push(String(val).replace(/\t/g, ' ').replace(/\n/g, ' '));
          }
        });
        tsv += `${line.join('\t')}\n`;
      });
      navigator.clipboard.writeText(tsv).catch(() => {});
      return;
    }

    if (type === 'Excel') {
      if (!gridApi) return;
      gridApi.exportDataAsCsv({
        fileName: 'Cabinet_Notes_MoPSW_Register_export.csv',
        columnKeys: columnDefs
          .filter((c) => c.field && c.headerName !== 'Update' && !c.hide)
          .map((c) => c.field),
      });
      return;
    }

    if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;
      let headersHtml = '';
      columnDefs.forEach((col) => {
        if (col.headerName && col.headerName !== 'Update' && !col.hide) {
          headersHtml += `<th style="border:1px solid #cbd5e1;padding:10px;text-align:left;background:#0f417a;color:#fff;font-size:11px;font-weight:bold;text-transform:uppercase;">${col.headerName}</th>`;
        }
      });
      let rowsHtml = '';
      displayRows.forEach((row) => {
        rowsHtml += '<tr>';
        columnDefs.forEach((col) => {
          if (col.headerName && col.headerName !== 'Update' && !col.hide) {
            let val = '';
            if (col.field === 'sNo') val = row.sNo;
            else if (col.field === 'lastUpdated') val = formatDate(row.lastUpdated);
            else val = row[col.field] ?? '';
            rowsHtml += `<td style="border:1px solid #e2e8f0;padding:8px;font-size:11px;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });
      printWindow.document.write(`
        <html><head><title>Cabinet Notes MoPSW</title>
        <style>body{font-family:system-ui,sans-serif;color:#1e293b;padding:20px}h1{font-size:18px;color:#0f417a}table{width:100%;border-collapse:collapse;margin-top:15px}</style>
        </head><body>
        <h1>Cabinet Notes MoPSW Register</h1>
        <p style="font-size:11px;color:#64748b">Generated on: ${new Date().toLocaleDateString()}</p>
        <table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
        <script>window.onload=function(){window.print();window.close()}</script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  const filterSelectClass =
    'w-full px-3 py-2 text-xs font-semibold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer';

  const visibilityCols = [
    { key: 'subject', label: 'Name of the Subject' },
    { key: 'wing', label: 'Wing' },
    { key: 'division', label: 'Division' },
    { key: 'status', label: 'Status' },
    { key: 'remarks', label: 'Remarks' },
    { key: 'docs', label: 'Docs' },
    { key: 'lastUpdated', label: 'Last Updated' },
    ...(canEdit || canView || canDelete ? [{ key: 'actions', label: 'Update' }] : []),
  ];

  return (
    <div className="space-y-4 animate-fade-in relative text-slate-800 dark:text-slate-100">
      <div className="flex items-center space-x-1 border-b border-slate-200 dark:border-slate-800 select-none">
        <button
          type="button"
          onClick={() => onCategoryChange?.('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            category === 'active'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Active ({counts.active})
        </button>
        <button
          type="button"
          onClick={() => onCategoryChange?.('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            category === 'completed'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-50/70 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
        >
          Completed ({counts.completed})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200'
              }`}
            >
              <Filter size={14} className="text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`}
              />
            </button>

            {activeFiltersCount > 0 && (
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

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, remarks..."
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => setFilter('search', '')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total:{' '}
              <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">
                {pagination.total}
              </span>
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 shadow-xs"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Toggle Columns
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleCols({
                          subject: true,
                          wing: true,
                          division: true,
                          status: true,
                          remarks: true,
                          docs: true,
                          lastUpdated: true,
                          actions: true,
                        })
                      }
                      className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Show All
                    </button>
                  </div>
                  {visibilityCols.map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[key]}
                        onChange={() =>
                          setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton
              onCopy={() => handleExport('Copy')}
              color="#0f417a"
              hoverBg="#f1f5f9"
            />
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#1e5ea8"
            />
          </div>
        </div>

        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Notes
                </span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center space-x-1 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Wing
                </label>
                <select
                  value={filters.wingId === 'All' ? '' : filters.wingId}
                  onChange={(e) =>
                    onFiltersChange?.({
                      ...filters,
                      wingId: e.target.value || 'All',
                      divisionId: 'All',
                    })
                  }
                  className={filterSelectClass}
                >
                  <option value="">All Wings</option>
                  {wings.map((w) => (
                    <option key={w.wing_id} value={w.wing_id}>
                      {w.wing_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Division
                </label>
                <select
                  value={filters.divisionId === 'All' ? '' : filters.divisionId}
                  onChange={(e) => setFilter('divisionId', e.target.value || 'All')}
                  className={filterSelectClass}
                >
                  <option value="">All Divisions</option>
                  {filteredDivisions.map((d) => (
                    <option key={d.division_id} value={d.division_id}>
                      {d.division_name}
                    </option>
                  ))}
                </select>
              </div>

              {category === 'active' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Stage
                  </label>
                  <select
                    value={filters.status === 'All' ? '' : filters.status}
                    onChange={(e) => setFilter('status', e.target.value || 'All')}
                    className={filterSelectClass}
                  >
                    <option value="">All Stages</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="ag-theme-quartz w-full relative border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <Table
            rowData={displayRows}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            color="#0f417a"
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{
              minWidth: 90,
              filter: false,
              sortable: true,
              resizable: true,
            }}
          />
          {pagination.totalPages > 0 && (
            <TablePagination
              currentPage={Math.max(0, page - 1)}
              totalPages={pagination.totalPages}
              totalRows={pagination.total}
              pageSize={pageSize}
              onPageChange={(pageIndex) => onPageChange?.(pageIndex + 1)}
              color="#0f417a"
            />
          )}
        </div>
      </div>
    </div>
  );
}
