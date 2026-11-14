import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, X, Edit, BarChart3, List, ChevronDown, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { fetchVIPReferences } from '../api';
import { STAGE_STEPS } from '../utils/constants';
import { useVipStore } from '../store/useVipStore';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import { exportRowsToFile, exportGridApiToExcel } from '../../../utils/exportGridReport';

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

export default function DataList({
  onEdit,
  triggerNotification,
  canEdit = true,
}) {
  const notify = useNotifier(triggerNotification);

  const wings = useVipStore(state => state.wings);
  const divisions = useVipStore(state => state.divisions);

  const activeCategory = useVipStore(state => state.activeCategory);
  const searchTerm = useVipStore(state => state.searchTerm);
  const debouncedSearch = useVipStore(state => state.debouncedSearch);
  const selectedWing = useVipStore(state => state.selectedWing);
  const selectedDivision = useVipStore(state => state.selectedDivision);
  const selectedStage = useVipStore(state => state.selectedStage);
  const showFilterPanel = useVipStore(state => state.showFilterPanel);
  const pageSize = useVipStore(state => state.pageSize);
  const viewMode = useVipStore(state => state.viewMode);
  const visibleCols = useVipStore(state => state.visibleCols);

  const setActiveCategory = useVipStore(state => state.setActiveCategory);
  const setSearchTerm = useVipStore(state => state.setSearchTerm);
  const setDebouncedSearch = useVipStore(state => state.setDebouncedSearch);
  const setSelectedWing = useVipStore(state => state.setSelectedWing);
  const setSelectedDivision = useVipStore(state => state.setSelectedDivision);
  const setSelectedStage = useVipStore(state => state.setSelectedStage);
  const setShowFilterPanel = useVipStore(state => state.setShowFilterPanel);
  const setPageSize = useVipStore(state => state.setPageSize);
  const setViewMode = useVipStore(state => state.setViewMode);
  const setVisibleCols = useVipStore(state => state.setVisibleCols);
  const resetFilters = useVipStore(state => state.resetFilters);

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gridApi, setGridApi] = useState(null);

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

  const fetchData = useCallback(() => {
    setLoading(true);
    fetchVIPReferences()
      .then(res => {
        const dataArray = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const mapped = dataArray.map((r, idx) => {
          const steps = {
            1: r.received_at_ministry_date ? 'Yes' : 'No',
            2: r.submitted_for_approval_date ? 'Yes' : 'No',
            3: r.comments_sought_date ? 'Yes' : 'No',
            4: r.comments_received_date ? 'Yes' : 'No',
            5: r.reply_furnished_date ? 'Yes' : 'No',
            6: r.disposed_date ? 'Yes' : 'No',
          };
          const dates = {
            1: r.received_at_ministry_date ? new Date(r.received_at_ministry_date).toISOString().split('T')[0] : '',
            2: r.submitted_for_approval_date ? new Date(r.submitted_for_approval_date).toISOString().split('T')[0] : '',
            3: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            4: r.comments_received_date ? new Date(r.comments_received_date).toISOString().split('T')[0] : '',
            5: r.reply_furnished_date ? new Date(r.reply_furnished_date).toISOString().split('T')[0] : '',
            6: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : '',
          };
          const remarksByStage = {
            1: r.vip_received_ministry_remark || '',
            2: r.vip_submitted_for_approval_remark || '',
            3: r.vip_comments_sought_remark || '',
            4: r.vip_comments_received_remark || '',
            5: r.vip_reply_furnished_remark || '',
            6: r.vip_disposed_remark || '',
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
            deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
            stageSteps: steps,
            statusDates: dates,
            statusRemarks: remarksByStage,
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : '',
          };
        });
        setRowData(mapped);
      })
      .catch(() => {
        notify(COMMON_TOASTS.loadFailed('VIP References'));
      })
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const handleExport = (type) => {
    const headers = ['S.No', 'Subject', 'Wing', 'Division', 'Reference Stage', 'Reference Letter No', 'Received From', 'Remarks', 'Deadline', 'Last Updated'];

    const buildRowValues = (row, idx) => [
      idx + 1,
      row.subject || '',
      row.wing || '',
      row.division || '',
      getRefStageText(row.stageSteps),
      row.refNumber || '',
      row.receivedFrom || '',
      row.remarks || '',
      row.deadline || '',
      row.lastUpdated || '',
    ];

    if (type === 'Copy') {
      if (filteredData.length === 0) {
        notify(COMMON_TOASTS.nothingToCopy());
        return;
      }
      let tsv = headers.join('\t') + '\n';
      filteredData.forEach((row, idx) => {
        tsv += buildRowValues(row, idx).join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv)
        .then(() => notify(COMMON_TOASTS.copySuccess(filteredData.length)))
        .catch(() => notify(COMMON_TOASTS.copyFailed()));
    } else if (type === 'Excel') {
      if (filteredData.length === 0) {
        notify(COMMON_TOASTS.nothingToExport());
        return;
      }
      // Excel (.xlsx): the table as shown, or the same rows when the grid is not ready
      const fileName = `VIP_References_${activeCategory}`;
      const file = gridApi
        ? exportGridApiToExcel(gridApi, { title: `VIP References - ${activeCategory.toUpperCase()}`, fileName })
        : exportRowsToFile('excel', { title: `VIP References - ${activeCategory.toUpperCase()}`, headers, rows: filteredData.map((row, idx) => buildRowValues(row, idx)), fileName });
      notify(COMMON_TOASTS.excelExported(file));
    } else if (type === 'PDF') {
      if (filteredData.length === 0) {
        notify(COMMON_TOASTS.nothingToExport());
        return;
      }
      // PDF straight to a file (no print dialog or new tab): the columns on show
      const file = exportRowsToFile('pdf', {
        title: `VIP References - ${activeCategory.toUpperCase()}`,
        headers: ['S.No', 'Subject', 'Wing / Division', 'Stage', 'Received From', 'Last Updated'],
        rows: filteredData.map((row, idx) => [idx + 1, row.subject, `${row.wing ?? ''} / ${row.division ?? ''}`, getRefStageText(row.stageSteps), row.receivedFrom, row.lastUpdated]),
        fileName: `VIP_References_${activeCategory}`,
      });
      notify(COMMON_TOASTS.excelExported(file));
    }
  };

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
      width: 90,
      minWidth: 90,
      pinned: 'right',
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => {
        if (!canEdit) return null;
        return (
          <button
            type="button"
            onClick={() => onEdit?.(params.data)}
            className="p-1.5 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-lg text-orange-500 hover:text-orange-600 dark:text-orange-400 transition cursor-pointer"
            title="Update VIP Letter status"
          >
            <Edit className="h-4 w-4" />
          </button>
        );
      },
    },
  ], [visibleCols, onEdit, activeCategory, canEdit]);

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
              <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
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
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
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
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredData.length}
            </div>

            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map(col => (
                    <label key={col} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col === 'refNumber' ? 'Ref Number' : col === 'receivedFrom' ? 'Received From' : col === 'lastUpdated' ? 'Last Updated' : col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton onCopy={() => handleExport('Copy')} color="#0f417a" hoverBg="#f1f5f9" />
            <ExportDropdown onExportExcel={() => handleExport('Excel')} onExportPdf={() => handleExport('PDF')} color="#0f417a" hoverColor="#1e5ea8" />

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
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Wing</label>
              <div className="relative">
                <select
                  value={selectedWing}
                  onChange={(e) => setSelectedWing(e.target.value)}
                  className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="All">All Wings</option>
                  {wings.map(w => (
                    <option key={w.wing_id || w.wing_name} value={w.wing_name}>{w.wing_name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Division</label>
              <div className="relative">
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="All">All Divisions</option>
                  {filteredDivisions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status / Stage</label>
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  {Object.values(STAGE_STEPS)
                    .filter(stage => activeCategory === 'disposed' ? stage === 'Disposed' : stage !== 'Disposed')
                    .map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {viewMode === 'table' ? (
          <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
            <Table
              rowData={filteredData}
              columnDefs={colDefs}
              pagination={true}
              paginationPageSize={pageSize}
              paginationPageSizeSelector={[10, 25, 50, 100]}
              loading={loading}
              onGridReady={(params) => setGridApi(params.api)}
            />
          </div>
        ) : (
          <div className="w-full h-[350px] p-4 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight={600} />
                  <YAxis stroke="#64748b" fontSize={11} fontWeight={600} />
                  <Tooltip cursor={{ fill: 'rgba(15, 65, 122, 0.05)' }} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="Pending References" fill="#0f417a" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
    </div>
  );
}
