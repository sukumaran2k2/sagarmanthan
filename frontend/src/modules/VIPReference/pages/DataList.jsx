import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, X, Edit, BarChart3, List, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import Table from '../../../components/Table';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { fetchVIPReferences, fetchWings, fetchDivisions } from '../api';
import { STAGE_STEPS } from '../utils/constants';

export default function DataList({
  wings = [],
  divisions = [],
  onEdit,
  triggerNotification
}) {
  const [gridApi, setGridApi] = useState(null);

  // Wings & Divisions local state (with automatic dropdown fetch fallback)
  const [localWings, setLocalWings] = useState(wings);
  const [localDivisions, setLocalDivisions] = useState(divisions);

  useEffect(() => {
    if (wings && wings.length > 0) {
      setLocalWings(wings);
    } else {
      fetchWings()
        .then(res => setLocalWings(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error("Error fetching wings in DataList:", err));
    }
  }, [wings]);

  useEffect(() => {
    if (divisions && divisions.length > 0) {
      setLocalDivisions(divisions);
    } else {
      fetchDivisions()
        .then(res => setLocalDivisions(Array.isArray(res.data) ? res.data : []))
        .catch(err => console.error("Error fetching divisions in DataList:", err));
    }
  }, [divisions]);

  // Reference data
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'chart'

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const [activeCategory, setActiveCategory] = useState('active'); // 'active' | 'disposed'

  useEffect(() => {
    if (activeCategory === 'disposed') {
      setSelectedStage('All');
    }
  }, [activeCategory]);

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
    lastUpdated: true
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

  // Fetch references dynamically from backend
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
            6: r.disposed_date ? 'Yes' : 'No'
          };
          const dates = {
            1: r.received_at_ministry_date ? new Date(r.received_at_ministry_date).toISOString().split('T')[0] : '',
            2: r.submitted_for_approval_date ? new Date(r.submitted_for_approval_date).toISOString().split('T')[0] : '',
            3: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            4: r.comments_received_date ? new Date(r.comments_received_date).toISOString().split('T')[0] : '',
            5: r.reply_furnished_date ? new Date(r.reply_furnished_date).toISOString().split('T')[0] : '',
            6: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : ''
          };
          const remarksByStage = {
          1: r.vip_received_ministry_remark || '',
          2: r.vip_submitted_for_approval_remark || '',
          3: r.vip_comments_sought_remark || '',
          4: r.vip_comments_received_remark || '',
          5: r.vip_reply_furnished_remark || '',
          6: r.vip_disposed_remark || ''
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
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : ''
          };
        });
        setRowData(mapped);
      })
      .catch(err => {
        console.error("Error loading VIP references:", err);
        triggerNotification?.("Failed to load VIP reference list.", "error");
      })
      .finally(() => setLoading(false));
  }, [triggerNotification]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getRefStageText = (steps) => {
    let currentStage = 'Draft';
    for (let i = 1; i <= 6; i++) {
      if (steps?.[i] === 'Yes') {
        currentStage = STAGE_STEPS[i];
      }
    }
    return currentStage;
  };

  // Dynamically filter divisions based on selected wing
  const filteredDivisions = useMemo(() => {
    if (selectedWing === 'All') return divisions.map(d => d.division_name);
    const selectedWingObj = wings.find(w => w.wing_name === selectedWing);
    if (!selectedWingObj) return [];
    return divisions
      .filter(d => d.wing_id === selectedWingObj.wing_id)
      .map(d => d.division_name);
  }, [selectedWing, wings, divisions]);

  // Instant client-side filtering based on Wing, Division, Status / Stage, Category, and Search
  const filteredData = useMemo(() => {
    let res = rowData;

    // Filter by Category (Active vs Disposed)
    if (activeCategory === 'active') {
      res = res.filter(r => r.stageSteps?.[6] !== 'Yes');
    } else {
      res = res.filter(r => r.stageSteps?.[6] === 'Yes');
    }

    // Filter by Wing
    if (selectedWing !== 'All') {
      res = res.filter(r => r.wing === selectedWing);
    }

    // Filter by Division
    if (selectedDivision !== 'All') {
      res = res.filter(r => r.division === selectedDivision);
    }

    // Filter by Stage / Status
    if (selectedStage !== 'All') {
      res = res.filter(r => getRefStageText(r.stageSteps) === selectedStage);
    }

    // Filter by Search Query
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      res = res.filter(r =>
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

  const activeCount = useMemo(() => rowData.filter(r => r.stageSteps?.[6] !== 'Yes').length, [rowData]);
  const disposedCount = useMemo(() => rowData.filter(r => r.stageSteps?.[6] === 'Yes').length, [rowData]);

  // Chart Data Preparation
  const chartData = useMemo(() => {
    const counts = {};
    filteredData.forEach(r => {
      const stage = getRefStageText(r.stageSteps);
      counts[stage] = (counts[stage] || 0) + 1;
    });

    return Object.keys(counts).map(key => ({
      name: key,
      'Pending References': counts[key]
    }));
  }, [filteredData]);

  const COLORS = ['#0f417a', '#1e5ea8', '#3b82f6', '#60a5fa', '#93c5fd', '#10b981'];

  // Handle Export / Copy
  const handleExport = (type) => {
    if (type === 'Copy') {
      let tsv = '';
      const headers = ['S.No', 'Subject', 'E-Office File', 'Wing', 'Division', 'Reference Stage', 'Reference Letter No', 'Received From', 'Remarks', 'Deadline', 'Last Updated'];
      tsv += headers.join('\t') + '\n';

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
          row.lastUpdated || ''
        ];
        tsv += line.join('\t') + '\n';
      });

      navigator.clipboard.writeText(tsv)
        .then(() => {
          triggerNotification?.('VIP References data copied to clipboard!', 'success');
        })
        .catch(() => {
          triggerNotification?.('Failed to copy table data.', 'error');
        });
    } else if (type === 'Excel') {
      if (gridApi) {
        gridApi.exportDataAsCsv({
          fileName: `VIP_References_${activeCategory}_${new Date().toISOString().split('T')[0]}.csv`
        });
        triggerNotification?.('VIP Reference data exported to CSV/Excel successfully!', 'success');
      } else {
        let csvContent = 'data:text/csv;charset=utf-8,';
        csvContent += ['S.No', 'Subject', 'E-Office File', 'Wing', 'Division', 'Stage', 'Ref Letter No', 'Received From', 'Remarks', 'Deadline', 'Last Updated'].map(h => `"${h}"`).join(',') + '\n';
        
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
            row.lastUpdated || ''
          ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
          csvContent += line + '\n';
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `VIP_References_${activeCategory}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        triggerNotification?.('VIP Reference data exported to CSV/Excel successfully!', 'success');
      }
    } else if (type === 'PDF') {
      triggerNotification?.('Preparing printable PDF document...', 'info');
      const printWindow = window.open('', '_blank');
      const title = `VIP References - ${activeCategory.toUpperCase()}`;

      let headersHtml = `
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; background-color: #f8fafc; font-size: 11px;">S.No</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; background-color: #f8fafc; font-size: 11px;">Subject</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; background-color: #f8fafc; font-size: 11px;">E-Office File</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; background-color: #f8fafc; font-size: 11px;">Wing / Division</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; background-color: #f8fafc; font-size: 11px;">Stage</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; background-color: #f8fafc; font-size: 11px;">Received From</th>
        <th style="border: 1px solid #cbd5e1; padding: 8px; text-align: center; background-color: #f8fafc; font-size: 11px;">Last Updated</th>
      `;

      let rowsHtml = '';
      filteredData.forEach((row, idx) => {
        rowsHtml += `
          <tr>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px;">${idx + 1}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px; max-width: 250px;">${row.subject || ''}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px;">${row.eofficeFile || ''}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${row.wing} / ${row.division}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px; font-weight: bold;">${getRefStageText(row.stageSteps)}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${row.receivedFrom || ''}</td>
            <td style="border: 1px solid #e2e8f0; padding: 6px; text-align: center; font-size: 11px;">${row.lastUpdated || ''}</td>
          </tr>
        `;
      });

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
            <script>window.onload = function() { window.print(); window.close(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // AG-Grid Columns Definition
  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: 'node.rowIndex + 1',
      width: 70,
      minWidth: 70,
      maxWidth: 80,
      cellClass: 'text-center flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 font-mono border-r border-slate-100 dark:border-slate-800'
    },
    {
      headerName: 'Subject of VIP Reference',
      field: 'subject',
      flex: 2,
      minWidth: 260,
      wrapText: true,
      autoHeight: true,
      cellClass: 'font-semibold text-slate-800 dark:text-slate-100 flex items-center py-2.5 border-r border-slate-100 dark:border-slate-800 whitespace-normal leading-relaxed',
      hide: !visibleCols.subject
    },
    {
      headerName: 'E-Office File No',
      field: 'eofficeFile',
      width: 150,
      minWidth: 140,
      cellClass: 'text-center flex items-center justify-center font-mono font-bold text-blue-700 dark:text-blue-400 border-r border-slate-100 dark:border-slate-800'
    },
    {
      headerName: 'Wing',
      field: 'wing',
      width: 140,
      minWidth: 130,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
      hide: !visibleCols.wing
    },
    {
      headerName: 'Division',
      field: 'division',
      width: 150,
      minWidth: 140,
      cellClass: 'text-center flex items-center justify-center font-semibold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800',
      hide: !visibleCols.division
    },
    {
      headerName: 'Current Stage',
      field: 'stageSteps',
      width: 180,
      minWidth: 170,
      cellClass: 'text-center flex items-center justify-center font-bold border-r border-slate-100 dark:border-slate-800',
      hide: !visibleCols.stage,
      cellRenderer: (params) => {
        const stageText = getRefStageText(params.value);
        const color = activeCategory === 'disposed' ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500';
        return <span className={color}>{stageText}</span>;
      },
      valueFormatter: (params) => getRefStageText(params.value)
    },
    {
      headerName: 'Reference Letter Number',
      field: 'refNumber',
      width: 190,
      minWidth: 180,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
      hide: !visibleCols.refNumber
    },
    {
      headerName: 'Received From',
      field: 'receivedFrom',
      width: 200,
      minWidth: 180,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-600 dark:text-slate-300 flex items-center py-2 border-r border-slate-100 dark:border-slate-800 font-semibold whitespace-normal',
      hide: !visibleCols.receivedFrom
    },
    {
      headerName: 'Remarks',
      field: 'remarks',
      width: 200,
      minWidth: 180,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-500 dark:text-slate-400 flex items-center py-2 border-r border-slate-100 dark:border-slate-800 font-medium whitespace-normal',
      valueFormatter: (params) => params.value || '--',
      hide: !visibleCols.remarks
    },
    {
      headerName: 'Deadline',
      field: 'deadline',
      width: 130,
      minWidth: 120,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
      hide: !visibleCols.deadline,
      valueFormatter: (params) => params.value || '--'
    },
    {
      headerName: 'Last Updated Date',
      field: 'lastUpdated',
      width: 150,
      minWidth: 140,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 dark:border-slate-800 font-medium',
      hide: !visibleCols.lastUpdated
    },
    {
      headerName: 'Action',
      field: 'id',
      width: 80,
      minWidth: 80,
      pinned: 'right',
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          type="button"
          onClick={() => onEdit?.(params.data)}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[#0f417a] dark:text-blue-400 transition cursor-pointer"
          title="Update VIP Letter status"
        >
          <Edit className="h-4 w-4" />
        </button>
      )
    }
  ], [visibleCols, onEdit, activeCategory]);

  const hasActiveFilters = selectedWing !== 'All' || selectedDivision !== 'All' || selectedStage !== 'All' || searchQuery !== '';

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Category selector tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 mb-4 select-none px-1">
        <button
          type="button"
          onClick={() => setActiveCategory('active')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeCategory === 'active'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Active ({activeCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('disposed')}
          className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
            activeCategory === 'disposed'
              ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
              : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
          }`}
        >
          Disposed ({disposedCount})
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">

        {/* Search & Actions Row with Wing, Division, Status & Search Filters */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">

          {/* Left Cluster: Wing, Division, Status & Search Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 w-full lg:w-auto">
            
            {/* Wing Filter */}
            <div className="relative">
              <select
                value={selectedWing}
                onChange={(e) => {
                  setSelectedWing(e.target.value);
                  setSelectedDivision('All');
                }}
                className="appearance-none text-xs pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer min-w-[130px]"
              >
                <option value="All">All Wings</option>
                {localWings.map(w => (
                  <option key={w.wing_id || w.wing_name} value={w.wing_name}>
                    {w.wing_name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Division Filter */}
            <div className="relative">
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="appearance-none text-xs pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer min-w-[130px]"
              >
                <option value="All">All Divisions</option>
                {filteredDivisions.map(d => (
                  <option key={d.division_id || d.division_name || d} value={d.division_name || d}>
                    {d.division_name || d}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            {/* Status / Stage Filter */}
            <div className="relative">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="appearance-none text-xs pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer min-w-[130px]"
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

            {/* Search Input */}
            <div className="relative min-w-[160px] max-w-xs flex-1">
              <input
                type="text"
                placeholder="Search Subject / File..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#0f417a] font-semibold text-slate-700 dark:text-slate-200"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedWing('All');
                  setSelectedDivision('All');
                  setSelectedStage('All');
                  setSearchQuery('');
                }}
                className="flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 px-2.5 py-2 rounded-lg border border-rose-200 hover:bg-rose-50 transition cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Clear filters</span>
              </button>
            )}
          </div>

          {/* Right Cluster: Rows Select + Total Badge + Copy + Visibility + Export + Chart/Table Toggle */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0 w-full lg:w-auto justify-end">
            
            {/* Rows Limit Select Dropdown */}
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

            {/* Total Count Badge */}
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
              Total: <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">{filteredData.length}</span>
            </div>

            {/* Copy Button */}
            <CopyButton
              onCopy={() => handleExport('Copy')}
              color="#0f417a"
              hoverBg="#f1f5f9"
            />

            {/* Visibility Checklist */}
            <div className="relative" ref={colDropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
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

            {/* Export Dropdown */}
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#1e5ea8"
            />

            {/* View Toggle */}
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

        {/* View Mode: Table vs Chart */}
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
              <p className="text-sm font-semibold text-slate-500">No data available for chart representation.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
