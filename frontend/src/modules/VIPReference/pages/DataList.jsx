import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Search, X, Edit, Trash2, BarChart3, List, ChevronDown, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import ConfirmModal from '../../../components/ConfirmModal';
import FilterSelect from '../../../components/FilterSelect';
import { fetchVIPReferences, deleteVIPReference } from '../api';
import { STAGE_STEPS } from '../utils/constants';
import { useVipStore } from '../store/useVipStore';
import { getCurrentUserId } from '../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { VIP_TOASTS } from '../toastMessages';
import { exportRowsToFile } from '../../../utils/exportGridReport';

const BRAND = '#0f417a';
const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#60a5fa', '#93c5fd', '#10b981'];

function getRefStageText(steps) {
  let currentStage = 'Draft';
  for (let i = 1; i <= 6; i++) {
    if (steps?.[i] === 'Yes') {
      currentStage = STAGE_STEPS[i];
    }
  }
  return currentStage;
}

// One definition of what a VIP Reference looks like outside the grid, so Copy, Excel and PDF
// all produce the same columns and all three follow the Visibility toggles.
// `key` matches a key in the store's visibleCols.
const EXPORT_COLUMNS = [
  { key: 'subject', label: 'Subject', value: (r) => r.subject || '' },
  { key: 'wing', label: 'Wing', value: (r) => r.wing || '' },
  { key: 'division', label: 'Division', value: (r) => r.division || '' },
  { key: 'stage', label: 'Reference Stage', value: (r) => getRefStageText(r.stageSteps) },
  { key: 'refNumber', label: 'Reference Letter No', value: (r) => r.refNumber || '' },
  { key: 'receivedFrom', label: 'Received From', value: (r) => r.receivedFrom || '' },
  { key: 'remarks', label: 'Remarks', value: (r) => r.remarks || '' },
  { key: 'deadline', label: 'Deadline', value: (r) => r.deadline || '' },
  { key: 'lastUpdated', label: 'Last Updated', value: (r) => r.lastUpdated || '' },
];

const toRow = (r, idx) => {
  const day = (v) => (v ? new Date(v).toISOString().split('T')[0] : '');
  const steps = {
    1: r.received_at_ministry_date ? 'Yes' : 'No',
    2: r.submitted_for_approval_date ? 'Yes' : 'No',
    3: r.comments_sought_date ? 'Yes' : 'No',
    4: r.comments_received_date ? 'Yes' : 'No',
    5: r.reply_furnished_date ? 'Yes' : 'No',
    6: r.disposed_date ? 'Yes' : 'No',
  };
  return {
    sNo: idx + 1,
    id: r.vip_reference_id,
    subject: r.subject || '',
    eofficeFile: r.eoffice_file_number || '',
    wing: r.wing_name || '',
    division: r.division_name || '',
    refNumber: r.ref_letter_num || '',
    receivedFrom: r.received_from || '',
    remarks: r.remarks || '',
    deadline: day(r.deadline),
    stageSteps: steps,
    statusDates: {
      1: day(r.received_at_ministry_date),
      2: day(r.submitted_for_approval_date),
      3: day(r.comments_sought_date),
      4: day(r.comments_received_date),
      5: day(r.reply_furnished_date),
      6: day(r.disposed_date),
    },
    statusRemarks: {
      1: r.vip_received_ministry_remark || '',
      2: r.vip_submitted_for_approval_remark || '',
      3: r.vip_comments_sought_remark || '',
      4: r.vip_comments_received_remark || '',
      5: r.vip_reply_furnished_remark || '',
      6: r.vip_disposed_remark || '',
    },
    lastUpdated: day(r.updated_date),
  };
};

export default function DataList({
  onEdit,
  triggerNotification,
  canEdit = false,
  canRemove = false,
}) {
  const notify = useNotifier(triggerNotification);

  const { wings, divisions } = useVipStore(useShallow(state => ({
    wings: state.wings,
    divisions: state.divisions,
  })));

  const {
    activeCategory, searchTerm, debouncedSearch, selectedWing, selectedDivision,
    selectedStage, showFilterPanel, pageSize, viewMode, visibleCols,
  } = useVipStore(useShallow(state => ({
    activeCategory: state.activeCategory,
    searchTerm: state.searchTerm,
    debouncedSearch: state.debouncedSearch,
    selectedWing: state.selectedWing,
    selectedDivision: state.selectedDivision,
    selectedStage: state.selectedStage,
    showFilterPanel: state.showFilterPanel,
    pageSize: state.pageSize,
    viewMode: state.viewMode,
    visibleCols: state.visibleCols,
  })));

  const {
    setActiveCategory, setSearchTerm, setDebouncedSearch, setSelectedWing, setSelectedDivision,
    setSelectedStage, setShowFilterPanel, setPageSize, setViewMode, setVisibleCols, resetFilters,
  } = useVipStore(useShallow(state => ({
    setActiveCategory: state.setActiveCategory,
    setSearchTerm: state.setSearchTerm,
    setDebouncedSearch: state.setDebouncedSearch,
    setSelectedWing: state.setSelectedWing,
    setSelectedDivision: state.setSelectedDivision,
    setSelectedStage: state.setSelectedStage,
    setShowFilterPanel: state.setShowFilterPanel,
    setPageSize: state.setPageSize,
    setViewMode: state.setViewMode,
    setVisibleCols: state.setVisibleCols,
    resetFilters: state.resetFilters,
  })));

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(handler);
  }, [searchTerm, setDebouncedSearch]);

  const activeFiltersCount = (selectedWing !== 'All' ? 1 : 0) + (selectedDivision !== 'All' ? 1 : 0) + (selectedStage !== 'All' ? 1 : 0);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Nothing is set synchronously here: `loading` starts true, and a reload flips it before
  // bumping reloadToken, so the effect body never triggers an extra render pass.
  useEffect(() => {
    let cancelled = false;
    fetchVIPReferences()
      .then(res => {
        if (cancelled) return;
        const dataArray = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setRowData(dataArray.map(toRow));
      })
      .catch(() => {
        if (cancelled) return;
        setRowData([]);
        notify(COMMON_TOASTS.loadFailed('VIP References'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [notify, reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken(t => t + 1);
  }, []);

  const filteredDivisions = useMemo(() => {
    if (selectedWing === 'All') return divisions.map(d => d.division_name);
    const wingObj = wings.find(w => w.wing_name === selectedWing);
    if (!wingObj) return [];
    return divisions
      .filter(d => d.wing_id === wingObj.wing_id)
      .map(d => d.division_name);
  }, [selectedWing, wings, divisions]);

  const filteredData = useMemo(() => {
    let res = rowData;

    if (activeCategory === 'active') {
      res = res.filter(r => r.stageSteps?.[6] !== 'Yes');
    } else {
      res = res.filter(r => r.stageSteps?.[6] === 'Yes');
    }

    if (selectedWing !== 'All') {
      res = res.filter(r => r.wing === selectedWing);
    }
    if (selectedDivision !== 'All') {
      res = res.filter(r => r.division === selectedDivision);
    }
    if (selectedStage !== 'All') {
      res = res.filter(r => getRefStageText(r.stageSteps) === selectedStage);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      res = res.filter(r =>
        (r.subject || '').toLowerCase().includes(q) ||
        (r.refNumber || '').toLowerCase().includes(q) ||
        (r.receivedFrom || '').toLowerCase().includes(q) ||
        (r.wing || '').toLowerCase().includes(q) ||
        (r.division || '').toLowerCase().includes(q)
      );
    }
    return res;
  }, [rowData, activeCategory, selectedWing, selectedDivision, selectedStage, debouncedSearch]);

  const activeCount = useMemo(() => rowData.filter(r => r.stageSteps?.[6] !== 'Yes').length, [rowData]);
  const disposedCount = useMemo(() => rowData.filter(r => r.stageSteps?.[6] === 'Yes').length, [rowData]);

  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(r => {
      const stage = getRefStageText(r.stageSteps);
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return Object.keys(counts).map(key => ({
      name: key,
      'Pending References': counts[key],
    }));
  }, [filteredData]);

  const handleDelete = useCallback((row) => setPendingDelete(row), []);

  const confirmDelete = async () => {
    const row = pendingDelete;
    const userId = getCurrentUserId();
    if (!userId) {
      notify(VIP_TOASTS.deleteFailed(row?.subject, 'Your session has expired. Please log in again.'));
      setPendingDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await deleteVIPReference(row.id, userId);
      notify(VIP_TOASTS.deleted(row.subject));
      reload();
    } catch (err) {
      console.error('Error deleting VIP reference:', err);
      notify(VIP_TOASTS.deleteFailed(row.subject, getErrorMessage(err)));
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  const exportCols = useCallback(
    () => EXPORT_COLUMNS.filter(c => visibleCols[c.key]),
    [visibleCols]
  );

  const handleExport = (type) => {
    const cols = exportCols();
    const rows = filteredData;
    const scopeTitle = `VIP References - ${activeCategory.toUpperCase()}`;

    if (cols.length === 0) {
      notify(COMMON_TOASTS.nothingToExport());
      return;
    }

    if (type === 'Copy') {
      if (rows.length === 0) {
        notify(COMMON_TOASTS.nothingToCopy());
        return;
      }
      let tsv = ['S.No', ...cols.map(c => c.label)].join('\t') + '\n';
      rows.forEach((row, i) => {
        tsv += [i + 1, ...cols.map(c => String(c.value(row)).replace(/[\t\n]/g, ' '))].join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv).then(
        () => notify(COMMON_TOASTS.copySuccess(rows.length, 'matching the filters')),
        () => notify(COMMON_TOASTS.copyFailed()),
      );
      return;
    }

    if (rows.length === 0) {
      notify(COMMON_TOASTS.nothingToExport());
      return;
    }
    // Excel (.xlsx) / PDF of every filtered row, straight to a file (no print dialog or new tab)
    const file = exportRowsToFile(type === 'PDF' ? 'pdf' : 'excel', {
      title: scopeTitle,
      headers: ['S.No', ...cols.map(c => c.label)],
      rows: rows.map((row, i) => [i + 1, ...cols.map(c => c.value(row))]),
      fileName: `VIP_References_${activeCategory}`,
    });
    notify(COMMON_TOASTS.excelExported(file, 'Every filtered reference'));
  };

  const showActions = canEdit || canRemove;

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: 'node.rowIndex + 1',
      width: 80,
      minWidth: 80,
      maxWidth: 80,
      pinned: 'left',
      suppressSizeToFit: true,
      cellClass: 'text-center flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 font-mono border-r border-slate-100 dark:border-slate-800',
    },
    {
      headerName: 'Subject of VIP Reference',
      field: 'subject',
      width: 480,
      minWidth: 420,
      wrapText: true,
      autoHeight: true,
      cellClass: 'font-semibold text-slate-800 dark:text-slate-100 flex items-center py-2.5 border-r border-slate-100 dark:border-slate-800 whitespace-normal leading-relaxed',
      hide: !visibleCols.subject,
    },
    {
      headerName: 'Wing',
      field: 'wing',
      width: 190,
      minWidth: 160,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
      hide: !visibleCols.wing,
    },
    {
      headerName: 'Division',
      field: 'division',
      width: 210,
      minWidth: 180,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
      hide: !visibleCols.division,
    },
    {
      headerName: 'Current Stage',
      field: 'stageSteps',
      width: 240,
      minWidth: 200,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-center flex items-center justify-center font-bold border-r border-slate-100 dark:border-slate-800',
      hide: !visibleCols.stage,
      cellRenderer: (params) => {
        const stageText = getRefStageText(params.value);
        const color = activeCategory === 'disposed' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500';
        return <span className={color}>{stageText}</span>;
      },
      valueFormatter: (params) => getRefStageText(params.value),
    },
    {
      headerName: 'Reference Letter Number',
      field: 'refNumber',
      width: 230,
      minWidth: 190,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
      hide: !visibleCols.refNumber,
    },
    {
      headerName: 'Received From',
      field: 'receivedFrom',
      width: 260,
      minWidth: 220,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-600 dark:text-slate-300 flex items-center py-2 border-r border-slate-100 dark:border-slate-800 font-semibold whitespace-normal',
      hide: !visibleCols.receivedFrom,
    },
    {
      headerName: 'Remarks',
      field: 'remarks',
      width: 380,
      minWidth: 320,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-500 dark:text-slate-400 flex items-center py-2 border-r border-slate-100 dark:border-slate-800 font-medium whitespace-normal',
      valueFormatter: (params) => params.value || '--',
      hide: !visibleCols.remarks,
    },
    {
      headerName: 'Deadline',
      field: 'deadline',
      width: 150,
      minWidth: 130,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
      hide: !visibleCols.deadline,
      valueFormatter: (params) => params.value || '--',
    },
    {
      headerName: 'Last Updated Date',
      field: 'lastUpdated',
      width: 170,
      minWidth: 150,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
      hide: !visibleCols.lastUpdated,
    },
    {
      headerName: 'Action',
      field: 'id',
      width: 110,
      minWidth: 110,
      pinned: 'right',
      hide: !showActions,
      cellClass: 'text-center flex items-center justify-center gap-1',
      cellRenderer: (params) => (
        <>
          {canEdit && (
            <button
              type="button"
              onClick={() => onEdit?.(params.data)}
              className="p-1.5 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-lg text-orange-500 hover:text-orange-600 dark:text-orange-400 transition cursor-pointer"
              title="Update VIP Letter status"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={() => handleDelete(params.data)}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg text-red-600 dark:text-red-400 transition cursor-pointer"
              title="Delete VIP Reference"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </>
      ),
    },
  ], [visibleCols, onEdit, activeCategory, canEdit, canRemove, showActions, handleDelete]);

  const stageOptions = useMemo(() => Object.values(STAGE_STEPS)
    .filter(stage => activeCategory === 'disposed' ? stage === 'Disposed' : stage !== 'Disposed'),
  [activeCategory]);

  return (
    <div className="space-y-4 animate-fade-in relative">
      <div className="module-subtabs-strip">
        <button
          type="button"
          onClick={() => setActiveCategory('active')}
          className={`module-subtab-btn ${activeCategory === 'active' ? 'active' : ''}`}
        >
          ACTIVE ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('disposed')}
          className={`module-subtab-btn ${activeCategory === 'disposed' ? 'active' : ''}`}
        >
          DISPOSED ({disposedCount})
        </button>
      </div>

      <div className="module-card space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel(prev => !prev)}
              className={`module-filter-btn ${showFilterPanel || activeFiltersCount > 0 ? 'active' : ''}`}
            >
              <Filter className="h-4 w-4" style={{ color: BRAND }} />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none" style={{ backgroundColor: BRAND }}>
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`} />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  notify(COMMON_TOASTS.filtersReset());
                }}
                className="module-reset-btn"
              >
                Reset
              </button>
            )}
          </div>

          <div className="hidden lg:block flex-1" />

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Subject / File..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="module-toolbar-chip">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer p-0"
                aria-label="Rows per page"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="module-toolbar-chip uppercase tracking-wider">
              Total: {filteredData.length}
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="module-toolbar-chip cursor-pointer"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {EXPORT_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={!!visibleCols[col.key]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => handleExport('Copy')} color={BRAND} hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => handleExport('Excel')} onExportPdf={() => handleExport('PDF')} color={BRAND} hoverColor="#1e5ea8" />

            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 shadow text-[#0f417a] dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-700'}`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${viewMode === 'chart' ? 'bg-white dark:bg-slate-900 shadow text-[#0f417a] dark:text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-700'}`}
                title="Chart View"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {showFilterPanel && (
          <div className="module-filter-panel grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
            <FilterSelect
              label="Wing"
              value={selectedWing}
              onChange={setSelectedWing}
              options={wings.map(w => w.wing_name)}
              allLabel="All Wings"
            />
            <FilterSelect
              label="Division"
              value={selectedDivision}
              onChange={setSelectedDivision}
              options={filteredDivisions}
              allLabel="All Divisions"
            />
            <FilterSelect
              label="Status / Stage"
              value={selectedStage}
              onChange={setSelectedStage}
              options={stageOptions}
              allLabel="All Statuses"
            />
          </div>
        )}

        {viewMode === 'table' ? (
          <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
            <Table
              rowData={filteredData}
              columnDefs={colDefs}
              pagination={true}
              paginationPageSize={pageSize}
              loading={loading}
            />
          </div>
        ) : (
          <div className="w-full h-[280px] sm:h-[350px] p-2 sm:p-4 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                  <Tooltip cursor={{ fill: 'rgba(15, 65, 122, 0.05)' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Pending References" fill={BRAND} radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm font-semibold text-slate-500">No data available for chart representation.</p>
            )}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!pendingDelete}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete VIP Reference"
        message={pendingDelete
          ? `"${pendingDelete.subject}" will be deleted along with its stage history. This cannot be undone.`
          : ''}
      />
    </div>
  );
}
