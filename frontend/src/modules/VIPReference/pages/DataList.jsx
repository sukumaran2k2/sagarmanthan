import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Edit, BarChart3, List, ChevronDown, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { STAGE_STEPS } from '../utils/constants';
// Adjust this path to wherever your store file lives
import useVIPReferenceStore from '../store/vipReferenceStore';

const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#60a5fa', '#93c5fd', '#10b981'];

// Pure helper - no need to live inside the component
const getRefStageText = (steps) => {
  let currentStage = 'Draft';
  for (let i = 1; i <= 6; i++) {
    if (steps?.[i] === 'Yes') {
      currentStage = STAGE_STEPS[i];
    }
  }
  return currentStage;
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default function DataList({ onEdit, triggerNotification }) {
  // ---------- Zustand store (individual selectors = fewer re-renders) ----------
  const rowData = useVIPReferenceStore((s) => s.vipReferences);
  const wings = useVIPReferenceStore((s) => s.wings);
  const divisions = useVIPReferenceStore((s) => s.divisions);
  const loading = useVIPReferenceStore((s) => s.loading);
  const fetchData = useVIPReferenceStore((s) => s.fetchData);
  const fetchDropdowns = useVIPReferenceStore((s) => s.fetchDropdowns);

  // Keep latest notification callback without re-triggering fetch effects
  const notifyRef = useRef(triggerNotification);
  useEffect(() => {
    notifyRef.current = triggerNotification;
  }, [triggerNotification]);

  const [gridApi, setGridApi] = useState(null);

  // ---------- Initial data load ----------
  useEffect(() => {
    fetchData().catch(() => {
      notifyRef.current?.('Failed to load VIP reference list.', 'error');
    });
  }, [fetchData]);

  useEffect(() => {
    if (wings.length === 0 || divisions.length === 0) {
      fetchDropdowns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchDropdowns]);

  // ---------- Local UI state ----------
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'
  const [activeCategory, setActiveCategory] = useState('active'); // 'active' | 'disposed'
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (activeCategory === 'disposed') {
      setSelectedStage('All');
    }
  }, [activeCategory]);

  const activeFiltersCount =
    (selectedWing !== 'All' ? 1 : 0) +
    (selectedDivision !== 'All' ? 1 : 0) +
    (selectedStage !== 'All' ? 1 : 0);

  // Column visibility checklist
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    subject: true,
    wing: true,
    division: true,
    stage: true,
    refNumber: true,
    receivedFrom: true,
    remarks: true,
    deadline: true,
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

  // ---------- Derived data ----------
  // Divisions limited to the selected wing (returns objects)
  const filteredDivisions = useMemo(() => {
    if (selectedWing === 'All') return divisions;
    const wingObj = wings.find((w) => w.wing_name === selectedWing);
    if (!wingObj) return [];
    return divisions.filter((d) => d.wing_id === wingObj.wing_id);
  }, [selectedWing, wings, divisions]);

  const filteredData = useMemo(() => {
    let res = rowData;

    // Category (Active vs Disposed)
    res =
      activeCategory === 'active'
        ? res.filter((r) => r.stageSteps?.[6] !== 'Yes')
        : res.filter((r) => r.stageSteps?.[6] === 'Yes');

    if (selectedWing !== 'All') {
      res = res.filter((r) => r.wing === selectedWing);
    }

    if (selectedDivision !== 'All') {
      res = res.filter((r) => r.division === selectedDivision);
    }

    if (selectedStage !== 'All') {
      res = res.filter((r) => getRefStageText(r.stageSteps) === selectedStage);
    }

    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      res = res.filter(
        (r) =>
          (r.subject || '').toLowerCase().includes(q) ||
          (r.eofficeFile || '').toLowerCase().includes(q) ||
          (r.refNumber || '').toLowerCase().includes(q) ||
          (r.receivedFrom || '').toLowerCase().includes(q) ||
          (r.wing || '').toLowerCase().includes(q) ||
          (r.division || '').toLowerCase().includes(q)
      );
    }

    return res;
  }, [rowData, activeCategory, selectedWing, selectedDivision, selectedStage, debouncedSearch]);

  const activeCount = useMemo(
    () => rowData.filter((r) => r.stageSteps?.[6] !== 'Yes').length,
    [rowData]
  );
  const disposedCount = useMemo(
    () => rowData.filter((r) => r.stageSteps?.[6] === 'Yes').length,
    [rowData]
  );

  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach((r) => {
      const stage = getRefStageText(r.stageSteps);
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return Object.keys(counts).map((key) => ({
      name: key,
      'Pending References': counts[key],
    }));
  }, [filteredData]);

  const resetFilters = () => {
    setSelectedWing('All');
    setSelectedDivision('All');
    setSelectedStage('All');
    setSearchQuery('');
    triggerNotification?.('Filters have been reset', 'info');
  };

  // ---------- Export / Copy ----------
  const handleExport = (type) => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (type === 'Copy') {
      const headers = [
        'S.No', 'Subject', 'E-Office File', 'Wing', 'Division', 'Reference Stage',
        'Reference Letter No', 'Received From', 'Remarks', 'Deadline', 'Last Updated',
      ];
      let tsv = headers.join('\t') + '\n';

      filteredData.forEach((row, idx) => {
        const line = [
          idx + 1,
          row.subject || '',
          row.eofficeFile || '',
          row.wing || '',
          row.division || '',
          getRefStageText(row.stageSteps),
          row.refNumber || '',
          row.receivedFrom || '',
          row.remarks || '',
          row.deadline || '',
          row.lastUpdated || '',
        ];
        tsv += line.join('\t') + '\n';
      });

      navigator.clipboard
        .writeText(tsv)
        .then(() => triggerNotification?.('VIP References data copied to clipboard!', 'success'))
        .catch(() => triggerNotification?.('Failed to copy table data.', 'error'));
    } else if (type === 'Excel') {
      const fileName = `VIP_References_${activeCategory}_${todayStr}.csv`;

      if (gridApi) {
        gridApi.exportDataAsCsv({ fileName });
      } else {
        const headers = [
          'S.No', 'Subject', 'E-Office File', 'Wing', 'Division', 'Stage',
          'Ref Letter No', 'Received From', 'Remarks', 'Deadline', 'Last Updated',
        ];
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += headers.map((h) => `"${h}"`).join(',') + '\n';

        filteredData.forEach((row, idx) => {
          const line = [
            idx + 1,
            row.subject || '',
            row.eofficeFile || '',
            row.wing || '',
            row.division || '',
            getRefStageText(row.stageSteps),
            row.refNumber || '',
            row.receivedFrom || '',
            row.remarks || '',
            row.deadline || '',
            row.lastUpdated || '',
          ]
            .map((val) => `"${String(val).replace(/"/g, '""')}"`)
            .join(',');
          csvContent += line + '\n';
        });

        const link = document.createElement('a');
        link.setAttribute('href', encodeURI(csvContent));
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      triggerNotification?.('VIP Reference data exported to CSV/Excel successfully!', 'success');
    } else if (type === 'PDF') {
      triggerNotification?.('Preparing printable PDF document...', 'info');
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        triggerNotification?.('Pop-up blocked. Please allow pop-ups to export PDF.', 'error');
        return;
      }
      const title = `VIP References - ${activeCategory.toUpperCase()}`;

      const th = (label, align = 'center') =>
        `<th style="border: 1px solid #cbd5e1; padding: 8px; text-align: ${align}; background-color: #f8fafc; font-size: 11px;">${label}</th>`;

      const headersHtml = [
        th('S.No'),
        th('Subject', 'left'),
        th('E-Office File'),
        th('Wing / Division', 'left'),
        th('Stage'),
        th('Received From', 'left'),
        th('Last Updated'),
      ].join('');

      const rowsHtml = filteredData
        .map(
          (row, idx) => `
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px;">${idx + 1}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; max-width: 250px;">${escapeHtml(row.subject)}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px;">${escapeHtml(row.eofficeFile)}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${escapeHtml(row.wing)} / ${escapeHtml(row.division)}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${escapeHtml(getRefStageText(row.stageSteps))}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${escapeHtml(row.receivedFrom)}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px;">${escapeHtml(row.lastUpdated)}</td>
          </tr>`
        )
        .join('');

      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #1e293b; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              h2 { margin: 0; color: #0f417a; font-size: 18px; }
              p { margin: 4px 0 15px 0; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <h2>Ministry of Ports, Shipping and Waterways</h2>
            <p>${title} | Generated on ${new Date().toLocaleDateString()}</p>
            <table>
              <thead><tr>${headersHtml}</tr></thead>
              <tbody>${rowsHtml}</tbody>
            </table>
            <script>window.onload = function() { window.print(); window.close(); };<\/script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // ---------- AG-Grid column definitions ----------
  const colDefs = useMemo(
    () => [
      {
        headerName: 'S.No',
        valueGetter: 'node.rowIndex + 1',
        width: 80,
        minWidth: 80,
        maxWidth: 80,
        pinned: 'left',
        suppressSizeToFit: true,
        cellClass:
          'text-center flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 font-mono border-r border-slate-100 dark:border-slate-800',
      },
      {
        headerName: 'Subject of VIP Reference',
        field: 'subject',
        width: 480,
        minWidth: 420,
        wrapText: true,
        autoHeight: true,
        cellClass:
          'font-semibold text-slate-800 dark:text-slate-100 flex items-center py-2.5 border-r border-slate-100 dark:border-slate-800 whitespace-normal leading-relaxed',
        hide: !visibleCols.subject,
      },
      {
        headerName: 'E-Office File No',
        field: 'eofficeFile',
        width: 200,
        minWidth: 180,
        cellClass:
          'text-center flex items-center justify-center font-mono font-bold text-blue-700 dark:text-blue-400 border-r border-slate-100 dark:border-slate-800',
      },
      {
        headerName: 'Wing',
        field: 'wing',
        width: 190,
        minWidth: 160,
        wrapText: true,
        autoHeight: true,
        cellClass:
          'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
        hide: !visibleCols.wing,
      },
      {
        headerName: 'Division',
        field: 'division',
        width: 210,
        minWidth: 180,
        wrapText: true,
        autoHeight: true,
        cellClass:
          'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
        hide: !visibleCols.division,
      },
      {
        headerName: 'Current Stage',
        field: 'stageSteps',
        width: 240,
        minWidth: 200,
        wrapText: true,
        autoHeight: true,
        cellClass:
          'text-center flex items-center justify-center font-bold border-r border-slate-100 dark:border-slate-800',
        hide: !visibleCols.stage,
        cellRenderer: (params) => {
          const stageText = getRefStageText(params.value);
          const color =
            activeCategory === 'disposed'
              ? 'text-emerald-600 dark:text-emerald-500'
              : 'text-rose-600 dark:text-rose-500';
          return <span className={color}>{stageText}</span>;
        },
        valueFormatter: (params) => getRefStageText(params.value),
      },
      {
        headerName: 'Reference Letter Number',
        field: 'refNumber',
        width: 230,
        minWidth: 190,
        cellClass:
          'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
        hide: !visibleCols.refNumber,
      },
      {
        headerName: 'Received From',
        field: 'receivedFrom',
        width: 260,
        minWidth: 220,
        wrapText: true,
        autoHeight: true,
        cellClass:
          'text-slate-600 dark:text-slate-300 flex items-center py-2 border-r border-slate-100 dark:border-slate-800 font-semibold whitespace-normal',
        hide: !visibleCols.receivedFrom,
      },
      {
        headerName: 'Remarks',
        field: 'remarks',
        width: 380,
        minWidth: 320,
        wrapText: true,
        autoHeight: true,
        cellClass:
          'text-slate-500 dark:text-slate-400 flex items-center py-2 border-r border-slate-100 dark:border-slate-800 font-medium whitespace-normal',
        valueFormatter: (params) => params.value || '--',
        hide: !visibleCols.remarks,
      },
      {
        headerName: 'Deadline',
        field: 'deadline',
        width: 150,
        minWidth: 130,
        cellClass:
          'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
        hide: !visibleCols.deadline,
        valueFormatter: (params) => params.value || '--',
      },
      {
        headerName: 'Last Updated Date',
        field: 'lastUpdated',
        width: 170,
        minWidth: 150,
        cellClass:
          'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
        hide: !visibleCols.lastUpdated,
      },
      {
        headerName: 'Action',
        field: 'id',
        width: 90,
        minWidth: 90,
        pinned: 'right',
        cellClass: 'text-center flex items-center justify-center',
        cellRenderer: (params) => (
          <button
            type="button"
            onClick={() => onEdit?.(params.data)}
            className="p-1.5 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-lg text-orange-500 hover:text-orange-600 dark:text-orange-400 transition cursor-pointer"
            title="Update VIP Letter status"
          >
            <Edit className="h-4 w-4" />
          </button>
        ),
      },
    ],
    [visibleCols, onEdit, activeCategory]
  );

  const categoryTabClass = (isActive) =>
    `px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
      isActive
        ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
        : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
    }`;

  const selectClass =
    'w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer';
  const labelClass =
    'text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider';

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Category selector tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          type="button"
          onClick={() => setActiveCategory('active')}
          className={categoryTabClass(activeCategory === 'active')}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('disposed')}
          className={categoryTabClass(activeCategory === 'disposed')}
        >
          Disposed ({disposedCount})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        {/* Search & Actions Row */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          {/* Left: Filter button + Reset */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setShowFilterPanel((prev) => !prev)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                showFilterPanel || activeFiltersCount > 0
                  ? 'bg-blue-50 border-blue-300 text-[#0f417a] dark:bg-blue-950/50 dark:border-blue-700 dark:text-blue-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Filter className="h-4 w-4 text-[#0f417a] dark:text-blue-400" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="bg-[#0f417a] dark:bg-blue-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {activeFiltersCount}
                </span>
              )}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${showFilterPanel ? 'rotate-180' : ''}`}
              />
            </button>

            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Middle spacer */}
          <div className="hidden lg:block flex-1" />

          {/* Right: Search + Rows + Total + Visibility + Copy + Export + View toggle */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Subject / File..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rows limit */}
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

            {/* Total badge */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredData.length}
            </div>

            {/* Column visibility */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map((col) => (
                    <label
                      key={col}
                      className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() => setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>
                        {col === 'refNumber'
                          ? 'Ref Number'
                          : col === 'receivedFrom'
                          ? 'Received From'
                          : col === 'lastUpdated'
                          ? 'Last Updated'
                          : col}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Copy */}
            <CopyButton onCopy={() => handleExport('Copy')} color="#0f417a" hoverBg="#f1f5f9" />

            {/* Export */}
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#1e5ea8"
            />

            {/* View toggle */}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50 dark:bg-slate-800 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-slate-900 shadow text-[#0f417a] dark:text-blue-400 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-slate-900 shadow text-[#0f417a] dark:text-blue-400 font-bold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Chart View"
              >
                <BarChart3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Collapsible filter panel */}
        {showFilterPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
            {/* Wing */}
            <div className="space-y-1">
              <label className={labelClass}>Wing</label>
              <div className="relative">
                <select
                  value={selectedWing}
                  onChange={(e) => {
                    setSelectedWing(e.target.value);
                    setSelectedDivision('All');
                  }}
                  className={selectClass}
                >
                  <option value="All">All Wings</option>
                  {wings.map((w) => (
                    <option key={w.wing_id || w.wing_name} value={w.wing_name}>
                      {w.wing_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Division */}
            <div className="space-y-1">
              <label className={labelClass}>Division</label>
              <div className="relative">
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  className={selectClass}
                >
                  <option value="All">All Divisions</option>
                  {filteredDivisions.map((d) => (
                    <option key={d.division_id || d.division_name} value={d.division_name}>
                      {d.division_name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Status / Stage */}
            <div className="space-y-1">
              <label className={labelClass}>Status / Stage</label>
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className={selectClass}
                >
                  <option value="All">All Statuses</option>
                  {Object.values(STAGE_STEPS)
                    .filter((stage) =>
                      activeCategory === 'disposed' ? stage === 'Disposed' : stage !== 'Disposed'
                    )
                    .map((stage) => (
                      <option key={stage} value={stage}>
                        {stage}
                      </option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>
        )}

        {/* View mode: Table vs Chart */}
        {viewMode === 'table' ? (
          <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
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
              <p className="text-sm font-semibold text-slate-500">
                No data available for chart representation.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
