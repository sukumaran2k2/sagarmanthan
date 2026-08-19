import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Edit,
  Trash2,
  Plus,
  Search,
  X,
  ChevronDown,
  Columns3,
} from 'lucide-react';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { stageNamesForIssueType } from '../utils/stageHelpers';

function formatDate(value) {
  if (!value || value === '--') return '--';
  return String(value).slice(0, 10);
}

export default function IssueListTable({
  rows = [],
  loading = false,
  wings = [],
  divisions = [],
  issueTypeOptions = [],
  stages = [],
  canEdit = false,
  canDelete = false,
  canCreate = false,
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
  onAdd,
  notify,
}) {
  const [gridApi, setGridApi] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    wing: true,
    division: true,
    issueType: true,
    status: true,
    remarks: true,
    lastUpdated: true,
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

  const issueTypeSelected = filters.issueType && filters.issueType !== 'All';

  const stageOptions = useMemo(() => {
    if (!issueTypeSelected) return [];
    return stageNamesForIssueType(stages, filters.issueType, { excludeCompleted: true });
  }, [stages, filters.issueType, issueTypeSelected]);

  const displayRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.map((item, index) => ({ ...item, sNo: start + index + 1 }));
  }, [rows, page, pageSize]);

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
        cellClass: 'font-bold text-slate-800',
        hide: !visibleCols.subject,
      },
      {
        field: 'wing',
        headerName: 'Wing',
        flex: 1,
        minWidth: 120,
        cellClass: 'text-slate-600 font-medium',
        hide: !visibleCols.wing,
      },
      {
        field: 'division',
        headerName: 'Division',
        flex: 1,
        minWidth: 120,
        cellClass: 'text-slate-600 font-medium',
        hide: !visibleCols.division,
      },
      {
        field: 'issueType',
        headerName: 'Issue Type',
        flex: 1.2,
        minWidth: 150,
        cellClass: 'text-slate-700 font-semibold',
        hide: !visibleCols.issueType,
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 1.2,
        minWidth: 140,
        hide: !visibleCols.status,
        cellRenderer: (params) => (
          <span className="text-xs font-black uppercase text-[#0f417a]">
            {params.value || '-'}
          </span>
        ),
      },
      {
        field: 'remarks',
        headerName: 'Remarks',
        flex: 1.3,
        minWidth: 140,
        cellClass: 'text-slate-600',
        hide: !visibleCols.remarks,
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

    if (canEdit || canDelete) {
      cols.push({
        headerName: 'Update',
        minWidth: 110,
        sortable: false,
        filter: false,
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          return (
            <div className="flex items-center justify-center gap-1 w-full h-full py-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onEdit?.(row)}
                  className="p-1.5 hover:bg-slate-100 rounded text-[#0f417a] transition cursor-pointer"
                  title="Update"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete?.(row)}
                  className="p-1.5 hover:bg-rose-50 rounded text-rose-600 transition cursor-pointer"
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
  }, [canEdit, canDelete, onEdit, onDelete, visibleCols]);

  const setFilter = (key, value) => {
    onFiltersChange?.({ ...filters, [key]: value });
  };

  const handleCategoryChange = (next) => {
    onCategoryChange?.(next);
  };

  const handleIssueTypeChange = (value) => {
    onFiltersChange?.({
      ...filters,
      issueType: value || 'All',
      status: 'All',
    });
  };

  const clearFilters = () => {
    onFiltersChange?.({
      wingId: 'All',
      divisionId: 'All',
      issueType: 'All',
      status: 'All',
      search: '',
    });
  };

  const hasActiveFilters =
    filters.search ||
    (filters.wingId && filters.wingId !== 'All') ||
    (filters.divisionId && filters.divisionId !== 'All') ||
    (filters.issueType && filters.issueType !== 'All') ||
    (filters.status && filters.status !== 'All');

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
      navigator.clipboard.writeText(tsv)
        .then(() => {
          notify?.('Parliamentary issues copied to clipboard!', 'success');
        })
        .catch(() => {
          notify?.('Failed to copy to clipboard.', 'error');
        });
      return;
    }

    if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: 'Parliamentary_Issues_Register_export.csv',
          columnKeys: columnDefs
            .filter((c) => c.field && c.headerName !== 'Update' && !c.hide)
            .map((c) => c.field),
        });
        notify?.('Parliamentary issues exported to CSV successfully!', 'success');
      } else {
        notify?.('Exporting table data...', 'info');
      }
      return;
    }

    if (type === 'PDF') {
      notify?.('Preparing PDF document for Parliamentary issues...', 'info');
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
        <html><head><title>Parliamentary Issues</title>
        <style>body{font-family:system-ui,sans-serif;color:#1e293b;padding:20px}h1{font-size:18px;color:#0f417a}table{width:100%;border-collapse:collapse;margin-top:15px}</style>
        </head><body>
        <h1>Parliamentary Issues Register</h1>
        <p style="font-size:11px;color:#64748b">Generated on: ${new Date().toLocaleDateString()}</p>
        <table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
        <script>window.onload=function(){window.print();window.close()}</script>
        </body></html>
      `);
      printWindow.document.close();
    }
  };

  const selectClass =
    'appearance-none text-xs pl-3 pr-7 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 cursor-pointer min-w-[120px]';

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          type="button"
          onClick={() => handleCategoryChange('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            category === 'active'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Active ({counts.active})
        </button>
        <button
          type="button"
          onClick={() => handleCategoryChange('completed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            category === 'completed'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Completed ({counts.completed})
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative">
              <select
                value={filters.wingId === 'All' ? '' : filters.wingId}
                onChange={(e) =>
                  onFiltersChange?.({
                    ...filters,
                    wingId: e.target.value || 'All',
                    divisionId: 'All',
                  })
                }
                className={selectClass}
              >
                <option value="">All Wings</option>
                {wings.map((w) => (
                  <option key={w.wing_id} value={w.wing_id}>
                    {w.wing_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="relative">
              <select
                value={filters.divisionId === 'All' ? '' : filters.divisionId}
                onChange={(e) => setFilter('divisionId', e.target.value || 'All')}
                className={`${selectClass} min-w-[130px]`}
              >
                <option value="">All Divisions</option>
                {filteredDivisions.map((d) => (
                  <option key={d.division_id} value={d.division_id}>
                    {d.division_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {category === 'active' && (
              <div className="relative">
                <select
                  value={filters.issueType === 'All' ? '' : filters.issueType}
                  onChange={(e) => handleIssueTypeChange(e.target.value)}
                  className={`${selectClass} min-w-[150px]`}
                >
                  <option value="">All Issue Types</option>
                  {issueTypeOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            )}

            {category === 'active' && (
              <div className="relative">
                <select
                  value={filters.status === 'All' ? '' : filters.status}
                  onChange={(e) => setFilter('status', e.target.value || 'All')}
                  disabled={!issueTypeSelected}
                  className={`${selectClass} min-w-[140px] ${
                    issueTypeSelected ? '' : 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  <option value="">
                    {issueTypeSelected ? 'All Stages' : 'Select issue type first'}
                  </option>
                  {stageOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            )}

            <div className="relative min-w-[160px] max-w-xs flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilter('search', e.target.value)}
                placeholder="Search…"
                className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700"
              />
              {filters.search ? (
                <button
                  type="button"
                  onClick={() => setFilter('search', '')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-slate-500 hover:text-[#0f417a] px-2 py-2"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Rows</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                className="text-xs font-bold text-slate-700 bg-transparent border-0 focus:outline-none cursor-pointer"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-wider text-[#0f417a]">
              Total: {pagination.total}
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
              hoverColor="#1d5594"
            />

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-[#0f417a] hover:bg-slate-50"
              >
                <Columns3 className="h-3.5 w-3.5" />
                Columns
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 space-y-1">
                  {Object.keys(visibleCols).map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[key]}
                        onChange={() =>
                          setVisibleCols((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                      />
                      {key === 'lastUpdated'
                        ? 'Last Updated'
                        : key === 'issueType'
                          ? 'Issue Type'
                          : key.charAt(0).toUpperCase() + key.slice(1)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {canCreate && (
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-[#1d5594] text-white text-xs font-bold rounded-lg shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Issues
              </button>
            )}
          </div>
        </div>

        <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
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
              filter: true,
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
