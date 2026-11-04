import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import Table from '../../../components/Table';
import { Search, X, Edit, Trash2, ChevronDown, Filter } from 'lucide-react';
import { deleteBill } from '../api';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import ConfirmModal from '../../../components/ConfirmModal';
import { exportDataListToCsv } from '../../../utils/exportDataListCsv';
import { COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { useBillsStore } from '../store/useBillsStore';
import { BILLS_TOASTS } from '../toastMessages';

const STAGES = {
  0: 'No Status',
  1: 'Draft Bill Prepared',
  2: 'Pre-DCN & Draft Bill Approved by Minister',
  3: 'Circulated for IMC',
  4: 'IMC Comments Received',
  5: 'DCN & Draft Bill Prepared',
  6: 'DCN & Draft Bill Approved by Minister',
  7: 'Submitted for Legal Vetting',
  8: 'Legal Vetting to be Completed',
  9: 'Final DCN & Draft Bill Approved by Minister',
  10: 'Advance Copy to be Sent to PMO & Cab Sectt.',
  11: 'Approved by Cabinet',
  12: 'Bill Introduced in Parliament',
  13: 'Bill Passed',
  14: 'Bill Notified',
  15: 'Completed'
};

// Column labels for copy / Excel / PDF, by visibility key
const EXPORT_COLUMNS = [
  { key: 'subject', field: 'subject', label: 'Name of the Subject' },
  { key: 'wing', field: 'wing_name', label: 'Wing' },
  { key: 'division', field: 'division_name', label: 'Division' },
  { key: 'stage', field: 'stage', label: 'Stage' },
];

// The bill's current stage is tbl_bill.stage_id (as in 2.0, the Dashboard and Reports), not
// worked out from the dates: 2.0 bills often have stages done without a date.
// Passed, Notified and Completed bills are disposed (the Dashboard uses the same rule).
const DISPOSED_FROM_STAGE = 13;
const stageOf = (item) => Number(item.stage_id) || 0;
const isDisposed = (item) => stageOf(item) >= DISPOSED_FROM_STAGE;
const getBillStageText = (item) => STAGES[stageOf(item)] || STAGES[0];

const PAGE_SIZES = [10, 25, 50, 100];

export default function DataList({
  rowData,
  loading,
  onEdit,
  onDeleted,
  notify,
  wings = [],
  divisions = [],
  canEdit = true,
  canRemove = false
}) {
  // Category, filters, search, paging, filter panel and columns are kept in the module store
  const {
    activeCategory, filters, searchQuery, pageSize, showFilterPanel, visibleCols,
  } = useBillsStore(useShallow((state) => ({
    activeCategory: state.category,
    filters: state.filters,
    searchQuery: state.searchTerm,
    pageSize: state.pageSize,
    showFilterPanel: state.showFilterPanel,
    visibleCols: state.visibleCols,
  })));
  const actions = useBillsStore(useShallow((state) => ({
    setSearchTerm: state.setSearchTerm,
    setFilters: state.setFilters,
    resetFilters: state.resetFilters,
    setCategory: state.setCategory,
    setPageSize: state.setPageSize,
    setShowFilterPanel: state.setShowFilterPanel,
    setVisibleCols: state.setVisibleCols,
  })));
  const { wing: selectedWing, division: selectedDivision, stage: selectedStage } = filters;
  const setSearchQuery = actions.setSearchTerm;
  const setShowFilterPanel = actions.setShowFilterPanel;
  const setVisibleCols = actions.setVisibleCols;
  const setActiveCategory = actions.setCategory;
  const setPageSize = actions.setPageSize;

  const [dropdownOpen, setDropdownOpen] = useState(false); // Visibility checklist dropdown
  const colDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);



  const wingOptions = useMemo(() => {
    return wings.map(w => ({
      value: w.wing_id,
      label: w.wing_name
    }));
  }, [wings]);

  // Only the chosen wing's divisions
  const divisionOptions = useMemo(() => {
    return divisions
      .filter(d => !selectedWing || String(d.wing_id) === String(selectedWing))
      .map(d => ({
        value: d.division_id,
        label: d.division_name
      }));
  }, [divisions, selectedWing]);

  // Every stage of the tab (active: up to Introduced in Parliament; disposed: Passed onwards)
  const stageOptions = useMemo(() => Object.entries(STAGES)
    .filter(([id]) => (activeCategory === 'disposed') === (Number(id) >= DISPOSED_FROM_STAGE))
    .map(([id, label]) => ({ value: id, label })), [activeCategory]);

  const filteredData = useMemo(() => {
    return rowData.filter(item => {
      if (activeCategory === 'active' && isDisposed(item)) return false;
      if (activeCategory === 'disposed' && !isDisposed(item)) return false;

      const matchesWing = selectedWing
        ? String(item.wing) === String(selectedWing)
        : true;

      const matchesDivision = selectedDivision
        ? String(item.division) === String(selectedDivision)
        : true;

      const matchesStage = selectedStage !== ''
        ? String(stageOf(item)) === String(selectedStage)
        : true;

      // Searches every column on show
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = query
        ? [item.subject, item.wing_name, item.division_name, getBillStageText(item)]
          .some((v) => String(v || '').toLowerCase().includes(query))
        : true;

      return matchesWing && matchesDivision && matchesStage && matchesSearch;
    });
  }, [rowData, selectedWing, selectedDivision, selectedStage, searchQuery, activeCategory]);

  const activeFiltersCount = [selectedWing, selectedDivision, selectedStage].filter(Boolean).length;

  const clearFilters = () => {
    actions.resetFilters();
    notify?.(COMMON_TOASTS.filtersReset());
  };

  const activeCount = useMemo(() => rowData.filter((item) => !isDisposed(item)).length, [rowData]);
  const disposedCount = rowData.length - activeCount;

  // Every filtered row goes to the grid, which pages it, so a column sort covers the whole list

  // The bill waiting for the user to confirm its delete
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = useCallback((bill) => setPendingDelete(bill), []);

  const confirmDelete = async () => {
    const bill = pendingDelete;
    setDeleting(true);
    try {
      await deleteBill(bill.id || bill.bill_id);
      notify?.(BILLS_TOASTS.deleted(bill.subject));
      onDeleted?.();
    } catch (err) {
      console.error("Error deleting bill:", err);
      notify?.(BILLS_TOASTS.deleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  // Rows as exported: the stage is computed, not a field
  const exportRows = () => filteredData.map((row) => ({ ...row, stage: getBillStageText(row) }));
  const exportCols = () => EXPORT_COLUMNS.filter((c) => visibleCols[c.key]);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 90,
      minWidth: 90,
      maxWidth: 95,
      pinned: 'left',
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center border-r border-slate-100 dark:border-slate-800',
      headerClass: 'text-center border-r border-slate-100 dark:border-slate-800'
    },
    {
      field: 'subject',
      headerName: 'Name of the Subject',
      flex: 1,
      minWidth: 250,
      pinned: 'left',
      cellStyle: { textAlign: 'center' },
      cellClass: 'text-center font-semibold text-slate-800 dark:text-slate-200 whitespace-normal leading-normal py-2 border-r border-slate-150 dark:border-slate-800 flex items-center justify-center',
      headerClass: 'border-r border-slate-150 dark:border-slate-800',
      wrapText: true,
      autoHeight: true,
      hide: !visibleCols.subject
    },
    {
      field: 'wing_name',
      headerName: 'Wing',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'text-center flex items-center justify-center text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.wing
    },
    {
      field: 'division_name',
      headerName: 'Division',
      flex: 1.2,
      minWidth: 150,
      cellClass: 'text-center flex items-center justify-center text-slate-700 dark:text-slate-300 font-medium',
      hide: !visibleCols.division
    },
    {
      headerName: 'Stage',
      flex: 1.2,
      minWidth: 180,
      cellClass: 'font-bold text-center flex items-center justify-center',
      hide: !visibleCols.stage,
      cellRenderer: (params) => {
        const stageText = getBillStageText(params.data);
        const color = activeCategory === 'disposed' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500';
        return <span className={color}>{stageText}</span>;
      },
      valueGetter: (params) => getBillStageText(params.data)
    },
    {
      headerName: 'Actions',
      pinned: 'right',
      minWidth: canRemove ? 165 : 120,
      flex: 0.5,
      cellClass: 'text-center flex justify-center items-center gap-1.5',
      cellRenderer: (params) => {
        const bill = params.data;
        return (
          <>
            <button
              onClick={() => onEdit(bill)}
              className="p-1.5 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400 rounded-lg transition cursor-pointer"
              title={canEdit ? "Update Bill" : "View Bill"}
            >
              <Edit className="h-4.5 w-4.5" />
            </button>
            {canRemove && (
              <button
                onClick={() => handleDelete(bill)}
                className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 text-red-600 dark:text-red-400 rounded-lg transition cursor-pointer"
                title="Delete Bill"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            )}
          </>
        );
      }
    }
  ], [onEdit, handleDelete, visibleCols, activeCategory, canEdit, canRemove]);

  const handleExport = (type) => {
    const cols = exportCols();
    const rows = exportRows();
    if (type === 'Copy') {
      let tsv = ['S.No', ...cols.map((c) => c.label)].join('\t') + '\n';
      rows.forEach((row, i) => {
        tsv += [i + 1, ...cols.map((c) => String(row[c.field] ?? '').replace(/[\t\n]/g, ' '))].join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv).then(
        () => notify?.(COMMON_TOASTS.copySuccess(rows.length)),
        () => notify?.(COMMON_TOASTS.copyFailed()),
      );
    } else if (type === 'Excel') {
      // Every filtered row, not just the page on show
      exportDataListToCsv({
        columnLabels: Object.fromEntries(cols.map((c) => [c.field, c.label])),
        visibleCols: Object.fromEntries(cols.map((c) => [c.field, true])),
        rowData: rows,
        fileName: 'Bills_PreConstitutions_Register',
      });
      notify?.(COMMON_TOASTS.excelExported('Bills_PreConstitutions_Register.csv'));
    } else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        notify?.(COMMON_TOASTS.popupBlocked());
        return;
      }
      notify?.(COMMON_TOASTS.pdfPreparing());
      const title = 'Bills / Pre-Constitutions Act Register';
      const escape = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
      const th = (label) => `<th style="border:1px solid #0f417a; padding:10px 14px; text-align:left; background:#0f417a; color:#fff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">${label}</th>`;
      const headersHtml = th('S.No') + cols.map((c) => th(c.label)).join('');
      const rowsHtml = rows.map((row, i) => {
        const td = (v) => `<td style="border:1px solid #e2e8f0; padding:8px 14px; font-size:12px; color:#334155;">${escape(v)}</td>`;
        return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">${td(i + 1)}${cols.map((c) => td(row[c.field])).join('')}</tr>`;
      }).join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: system-ui, sans-serif; color: #1e293b; padding: 24px; }
              h1 { font-size: 18px; margin-bottom: 4px; color: #0f417a; }
              table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            <p style="font-size:11px; color:#64748b; margin:0 0 20px;">Generated on: ${new Date().toLocaleDateString()}</p>
            <table>
              <thead>
                <tr>${headersHtml}</tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            <script>
              window.onload = function() {
                window.print();
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">

      {/* Category selector tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none">
        <button
          onClick={() => setActiveCategory('active')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'active'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Active Bills ({activeCount})
        </button>
        <button
          onClick={() => setActiveCategory('disposed')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${activeCategory === 'disposed'
            ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
            }`}
        >
          Disposed Bills ({disposedCount})
        </button>
      </div>

      {/* Table & Filters */}
      <div className="module-card space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
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
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 px-3.5 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 dark:border-rose-900/30 dark:hover:bg-rose-950/20 transition cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
                <span>Reset Filters</span>
              </button>
            )}

            {/* Search input */}
            <div className="relative w-32">
              <input
                type="text"
                placeholder="Search bills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full module-search-input"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Rows Limit Select Dropdown */}
            {(
              <>
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-950 dark:border-slate-850 dark:text-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0"
                  >
                    {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div className="text-xs font-bold text-slate-555 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
                  Total: {loading ? '...' : filteredData.length}
                </div>

                {/* Column Visibility Dropdown */}
                {(
              <div className="relative" ref={colDropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-xl text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition cursor-pointer flex items-center space-x-1.5 dark:text-slate-200"
                >
                  <span>Visibility</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                    {Object.keys(visibleCols).map(col => (
                      <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={visibleCols[col]}
                          onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                          className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span>{col}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

                <CopyButton onCopy={() => handleExport('Copy')} color="#0f417a" hoverBg="#f1f5f9" />
                <ExportDropdown
                  onExportExcel={() => handleExport('Excel')}
                  onExportPdf={() => handleExport('PDF')}
                  color="#0f417a"
                  hoverColor="#1e5ea8"
                />
              </>
            )}

        </div>

        {showFilterPanel && (
          <div className="bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Filter className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Filter Bills
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
                  value={selectedWing}
                  onChange={(e) => actions.setFilters({ wing: e.target.value, division: '' })}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Show all Wings</option>
                  {wingOptions.map(w => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => actions.setFilters({ division: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Show all Divisions</option>
                  {divisionOptions.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Stage
                </label>
                <select
                  value={selectedStage}
                  onChange={(e) => actions.setFilters({ stage: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">Show all Stages</option>
                  {stageOptions.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        </div>

        <div className="module-datalist-grid">
          <Table
            rowData={filteredData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={pageSize}
            enableExport={false}
            autoSizeStrategy={{
              type: 'fitGridWidth'
            }}
            defaultColDef={{
              minWidth: 100,
              filter: true,
              sortable: true,
              resizable: true,
              autoHeight: true,
              wrapHeaderText: true,
              autoHeaderHeight: true
            }}
          />
        </div>

      </div>

      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Bill"
        message={pendingDelete ? `The bill "${pendingDelete.subject}" will be deleted. This cannot be undone.` : ''}
      />
    </div>
  );
}
