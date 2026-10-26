import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  X,
  Filter,
  ChevronDown, 
  RotateCcw, 
  AlertCircle 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Table from '../../../components/Table';
import TablePagination from '../../../components/TablePagination';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import { 
  fetchOvdOrgListData, 
  deleteOvdAction, 
  getUserIdFromToken 
} from '../api';
import {
  OVOD_WINGS,
  OVOD_VIBHAS,
  OVOD_STATUSES
} from '../utils/constants';
import { useShallow } from 'zustand/react/shallow';
import { useOvodStore } from '../store/useOvodStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../../utils/notify';
import { OVOD_TOASTS } from '../toastMessages';

const COLUMN_LIST = [
  { key: 'sno', label: 'S.No' },
  { key: 'org', label: 'Organisation' },
  { key: 'a1', label: 'Goal (A1)' },
  { key: 'a2', label: 'Intervention (A2)' },
  { key: 'a3', label: 'Action (A3)' },
  { key: 'b1', label: 'Goal (B1)' },
  { key: 'b2', label: 'Intervention (B2)' },
  { key: 'b3', label: 'Action (B3)' },
  { key: 'status', label: 'Current Status' },
  { key: 'date', label: 'Last Updated Date' },
  { key: 'actions', label: 'Action' }
];

/* Sub-tab groups: Active covers both "Yet to ..." and "Under Implementation ..." statuses */
const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'dropped', label: 'Dropped' }
];

const getStatusGroup = (status) => {
  const v = String(status || '').toLowerCase();
  if (v.includes('completed')) return 'completed';
  if (v.includes('dropped')) return 'dropped';
  if (v.includes('yet to') || v.includes('implement') || v.includes('in progress') || v === 'no update') return 'active';
  return null;
};

export default function DataList({ 
  onAddNew, 
  onEdit, 
  triggerNotification 
}) {
  const gridRef = useRef(null);
  const colVisRef = useRef(null);
  const notify = useNotifier(triggerNotification);

  // Status tab, filters, search, pagination and column visibility live in the OVOD store so
  // they survive switching tabs; everything below that is view-only state
  const {
    activeTab, filters, searchTerm, currentPage, pageSize, showFilterPanel, colVisibility
  } = useOvodStore(useShallow((s) => s.dataList));

  const {
    setDataListTab, setDataListFilter, setDataListSearch, setDataListPage, setDataListPageSize,
    setDataListFilterPanel, toggleDataListColumn, resetDataListFilters
  } = useOvodStore(useShallow((s) => ({
    setDataListTab: s.setDataListTab,
    setDataListFilter: s.setDataListFilter,
    setDataListSearch: s.setDataListSearch,
    setDataListPage: s.setDataListPage,
    setDataListPageSize: s.setDataListPageSize,
    setDataListFilterPanel: s.setDataListFilterPanel,
    toggleDataListColumn: s.toggleDataListColumn,
    resetDataListFilters: s.resetDataListFilters
  })));

  const {
    wing: selectedWing,
    org: selectedOrg,
    goalA1: selectedGoalA1,
    interventionA2: selectedInterventionA2,
    actionA3: selectedActionA3,
    goalB1: selectedGoalB1,
    interventionB2: selectedInterventionB2,
    actionB3: selectedActionB3,
    stage: selectedStage,
    vibhas: selectedVibhas
  } = filters;

  const [showColVisibility, setShowColVisibility] = useState(false);
  const [gridApi, setGridApi] = useState(null);

  // Data state
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Close column visibility menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (colVisRef.current && !colVisRef.current.contains(e.target)) {
        setShowColVisibility(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Fetch Action Items Dataset; only the latest request may update state
  const latestRequestRef = useRef(0);
  const loadData = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    setLoading(true);
    try {
      const userId = getUserIdFromToken();
      const res = await fetchOvdOrgListData(userId);
      if (isStale()) return;
      const rawRows = Array.isArray(res) ? res : (res?.data || []);

      const normalized = rawRows.map((item, idx) => ({
        id: item.id || item.Id || item.ID || idx + 1,
        organisation_name: item.ia_name || item.organisation_name || 'Indian Maritime University',
        goal_a1: item['Goal (A1)'] || item.goal_a1 || '-',
        intervention_a2: item['Intervention (A2)'] || item.intervention_a2 || '-',
        action_a3: item['Action (A3)'] || item.action_a3 || '-',
        goal_b1: item['Goal (B1)'] || item.goal_b1 || '-',
        intervention_b2: item['Intervention (B2)'] || item.intervention_b2 || '-',
        action_b3: item['Action (B3)'] || item.action_b3 || '-',
        current_status: item['Current Status'] || item.current_status || 'No Update',
        updated_at: item['Last Updated Date'] ? String(item['Last Updated Date']).slice(0, 10) : '2026-08-31',
        wing: item.Wing || item.wing || '',
        vibhas: item.Vibhas || item.vibhas || ''
      }));

      setActionItems(normalized);
    } catch (err) {
      if (isStale()) return;
      console.warn("OVOD Org List Data error:", err.message);
      setActionItems([]);
      notify(COMMON_TOASTS.loadFailed('The action item list'));
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Tab Status Counts
  const allCount = actionItems.length;

  const tabCounts = useMemo(() => {
    const counts = { active: 0, completed: 0, dropped: 0 };
    actionItems.forEach(item => {
      const group = getStatusGroup(item.current_status);
      if (group) counts[group]++;
    });
    return counts;
  }, [actionItems]);

  // Store setters already return to page 1
  const handleTabChange = (tab) => setDataListTab(tab);

  // Unique Dropdown Options derived dynamically from Data
  const options = useMemo(() => {
    const wings = new Set();
    const orgs = new Set();
    const ga1 = new Set();
    const ia2 = new Set();
    const aa3 = new Set();
    const gb1 = new Set();
    const ib2 = new Set();
    const ab3 = new Set();
    const stages = new Set();
    const vib = new Set();

    actionItems.forEach(item => {
      if (item.wing && item.wing !== '-') wings.add(item.wing);
      if (item.organisation_name && item.organisation_name !== '-') orgs.add(item.organisation_name);
      if (item.goal_a1 && item.goal_a1 !== '-') ga1.add(item.goal_a1);
      if (item.intervention_a2 && item.intervention_a2 !== '-') ia2.add(item.intervention_a2);
      if (item.action_a3 && item.action_a3 !== '-') aa3.add(item.action_a3);
      if (item.goal_b1 && item.goal_b1 !== '-') gb1.add(item.goal_b1);
      if (item.intervention_b2 && item.intervention_b2 !== '-') ib2.add(item.intervention_b2);
      if (item.action_b3 && item.action_b3 !== '-') ab3.add(item.action_b3);
      if (item.current_status && item.current_status !== '-') stages.add(item.current_status);
      if (item.vibhas && item.vibhas !== '-') vib.add(item.vibhas);
    });

    if (wings.size === 0) OVOD_WINGS.forEach(w => w.label !== 'All' && wings.add(w.label));
    OVOD_STATUSES.forEach(s => s.label !== 'Show All' && stages.add(s.label));
    if (vib.size === 0) OVOD_VIBHAS.forEach(v => v.label !== 'Show All' && vib.add(v.label));

    return {
      wings: Array.from(wings).sort(),
      organisations: Array.from(orgs).sort(),
      goalsA1: Array.from(ga1).sort(),
      interventionsA2: Array.from(ia2).sort(),
      actionsA3: Array.from(aa3).sort(),
      goalsB1: Array.from(gb1).sort(),
      interventionsB2: Array.from(ib2).sort(),
      actionsB3: Array.from(ab3).sort(),
      stages: Array.from(stages).sort(),
      vibhas: Array.from(vib).sort()
    };
  }, [actionItems]);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedWing !== '0') count++;
    if (selectedOrg !== '0') count++;
    if (selectedGoalA1 !== '0') count++;
    if (selectedInterventionA2 !== '0') count++;
    if (selectedActionA3 !== '0') count++;
    if (selectedGoalB1 !== '0') count++;
    if (selectedInterventionB2 !== '0') count++;
    if (selectedActionB3 !== '0') count++;
    if (selectedStage !== '0') count++;
    if (selectedVibhas !== '0') count++;
    return count;
  }, [selectedWing, selectedOrg, selectedGoalA1, selectedInterventionA2, selectedActionA3, selectedGoalB1, selectedInterventionB2, selectedActionB3, selectedStage, selectedVibhas]);

  const handleResetFilters = () => {
    resetDataListFilters();
    notify(COMMON_TOASTS.filtersReset());
  };

  // Filtered rows for AG Grid
  const filteredData = useMemo(() => {
    return actionItems.filter(item => {
      // Tab status filter
      if (activeTab !== 'all' && getStatusGroup(item.current_status) !== activeTab) return false;

      if (selectedWing !== '0' && item.wing !== selectedWing) return false;
      if (selectedOrg !== '0' && item.organisation_name !== selectedOrg) return false;
      if (selectedGoalA1 !== '0' && item.goal_a1 !== selectedGoalA1) return false;
      if (selectedInterventionA2 !== '0' && item.intervention_a2 !== selectedInterventionA2) return false;
      if (selectedActionA3 !== '0' && item.action_a3 !== selectedActionA3) return false;
      if (selectedGoalB1 !== '0' && item.goal_b1 !== selectedGoalB1) return false;
      if (selectedInterventionB2 !== '0' && item.intervention_b2 !== selectedInterventionB2) return false;
      if (selectedActionB3 !== '0' && item.action_b3 !== selectedActionB3) return false;
      if (selectedStage !== '0') {
        const itemStatus = String(item.current_status || '').toLowerCase();
        const filterStage = selectedStage.toLowerCase();
        const isNoUpdate = filterStage === 'no update' && (itemStatus === 'no update' || itemStatus === '');
        if (!isNoUpdate && itemStatus !== filterStage) return false;
      }
      if (selectedVibhas !== '0' && item.vibhas !== selectedVibhas) return false;
      
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const combined = `${item.organisation_name || ''} ${item.goal_a1 || ''} ${item.intervention_a2 || ''} ${item.action_a3 || ''} ${item.goal_b1 || ''} ${item.intervention_b2 || ''} ${item.action_b3 || ''} ${item.current_status || ''} ${item.updated_at || ''}`.toLowerCase();
        if (!combined.includes(q)) return false;
      }

      return true;
    });
  }, [actionItems, activeTab, selectedWing, selectedOrg, selectedGoalA1, selectedInterventionA2, selectedActionA3, selectedGoalB1, selectedInterventionB2, selectedActionB3, selectedStage, selectedVibhas, searchTerm]);

  // Paginated Sliced Data
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));

  // Only clamp once the rows have loaded: while loading, the list is empty (one page), and clamping
  // then would wipe the page the store restored after a tab switch
  useEffect(() => {
    if (!loading && currentPage > totalPages && totalPages > 0) {
      setDataListPage(1);
    }
  }, [loading, totalPages, currentPage, setDataListPage]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize).map((row, idx) => ({
      ...row,
      sNo: start + idx + 1
    }));
  }, [filteredData, currentPage, pageSize]);

  // Handle Copy to clipboard matching YP & CA
  const handleCopy = () => {
    if (!filteredData.length) {
      notify(COMMON_TOASTS.nothingToCopy());
      return;
    }
    const headers = ['S.No', 'Organisation', 'Goal (A1)', 'Intervention (A2)', 'Action (A3)', 'Goal (B1)', 'Intervention (B2)', 'Action (B3)', 'Current Status', 'Last Updated Date'];
    const lines = filteredData.map((r, i) => [
      i + 1,
      r.organisation_name,
      r.goal_a1,
      r.intervention_a2,
      r.action_a3,
      r.goal_b1,
      r.intervention_b2,
      r.action_b3,
      r.current_status,
      r.updated_at
    ].join('\t'));

    const text = [headers.join('\t'), ...lines].join('\n');
    navigator.clipboard.writeText(text)
      .then(() => notify(COMMON_TOASTS.copySuccess(filteredData.length, 'matching the current filters')))
      .catch(() => notify(COMMON_TOASTS.copyFailed()));
  };

  // Handle Export to Excel
  const handleExportExcel = () => {
    if (!filteredData.length) {
      notify(COMMON_TOASTS.nothingToExport());
      return;
    }
    const exportRows = filteredData.map((r, i) => ({
      'S.No': i + 1,
      'Organisation': r.organisation_name,
      'Goal (A1)': r.goal_a1,
      'Intervention (A2)': r.intervention_a2,
      'Action (A3)': r.action_a3,
      'Goal (B1)': r.goal_b1,
      'Intervention (B2)': r.intervention_b2,
      'Action (B3)': r.action_b3,
      'Current Status': r.current_status,
      'Last Updated Date': r.updated_at
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DataList");
    const fileName = `OVOD_DataList_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
    notify(COMMON_TOASTS.excelExported(fileName, 'The filtered list'));
  };

  // Handle Export to PDF matching CA format
  const handleExportPdf = () => {
    if (!filteredData.length) {
      notify(COMMON_TOASTS.nothingToExport());
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify(COMMON_TOASTS.popupBlocked());
      return;
    }
    notify(COMMON_TOASTS.pdfPreparing());
    const title = 'OVOD - Strategic Action Items';

    const headers = [
      'S.No', 'Organisation', 'Goal (A1)', 'Intervention (A2)', 
      'Goal (B1)', 'Intervention (B2)', 'Action (B3)', 'Status', 'Date'
    ];

    let headersHtml = headers.map(h => 
      `<th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${h}</th>`
    ).join('');

    let rowsHtml = filteredData.slice(0, 500).map((r, idx) => `
      <tr>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${idx + 1}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.organisation_name || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.goal_a1 || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.intervention_a2 || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.goal_b1 || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.intervention_b2 || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.action_b3 || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.current_status || '-'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px; font-size: 11px;">${r.updated_at || '-'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Google Sans', system-ui, -apple-system, sans-serif; color: #1e293b; padding: 20px; }
            h1 { font-size: 18px; margin-bottom: 5px; color: #0f417a; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p style="font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead><tr>${headersHtml}</tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Handle Delete Confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const userId = getUserIdFromToken();
      await deleteOvdAction(deleteTarget.id, userId);
      notify(OVOD_TOASTS.itemDeleted());
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      notify(OVOD_TOASTS.itemDeleteFailed(getErrorMessage(err)));
    } finally {
      setDeleting(false);
    }
  };

  // AG-Grid Column Definitions matching YP & CA style
  const columnDefs = useMemo(() => [
    {
      headerName: "S.No",
      field: "sNo",
      width: 80,
      minWidth: 70,
      headerClass: "text-center",
      cellClass: "text-center font-bold font-mono text-slate-800 dark:text-white",
      pinned: 'left',
      hide: !colVisibility.sno
    },
    {
      headerName: "Organisation",
      field: "organisation_name",
      width: 175,
      minWidth: 150,
      wrapText: true,
      autoHeight: true,
      pinned: 'left',
      hide: !colVisibility.org,
      cellRenderer: (params) => (
        <span className="font-bold text-slate-800 dark:text-white text-xs break-words whitespace-normal leading-snug py-1 block">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Goal (A1)",
      field: "goal_a1",
      width: 230,
      minWidth: 200,
      wrapText: true,
      autoHeight: true,
      hide: !colVisibility.a1,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-normal leading-snug py-1 block font-medium">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Intervention (A2)",
      field: "intervention_a2",
      width: 230,
      minWidth: 200,
      wrapText: true,
      autoHeight: true,
      hide: !colVisibility.a2,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-normal leading-snug py-1 block">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Action (A3)",
      field: "action_a3",
      width: 190,
      minWidth: 160,
      wrapText: true,
      autoHeight: true,
      hide: !colVisibility.a3,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-normal leading-snug py-1 block">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Goal (B1)",
      field: "goal_b1",
      width: 230,
      minWidth: 200,
      wrapText: true,
      autoHeight: true,
      hide: !colVisibility.b1,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-normal leading-snug py-1 block font-medium">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Intervention (B2)",
      field: "intervention_b2",
      width: 240,
      minWidth: 210,
      wrapText: true,
      autoHeight: true,
      hide: !colVisibility.b2,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 break-words whitespace-normal leading-snug py-1 block">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Action (B3)",
      field: "action_b3",
      width: 230,
      minWidth: 200,
      wrapText: true,
      autoHeight: true,
      hide: !colVisibility.b3,
      cellRenderer: (params) => (
        <span className="text-xs text-slate-800 dark:text-slate-200 font-medium break-words whitespace-normal leading-snug py-1 block">
          {params.value || '-'}
        </span>
      )
    },
    {
      headerName: "Current Status",
      field: "current_status",
      width: 145,
      minWidth: 130,
      headerClass: "text-center",
      cellClass: "text-center font-semibold text-blue-700 dark:text-blue-400 text-xs",
      hide: !colVisibility.status
    },
    {
      headerName: "Last Updated Date",
      field: "updated_at",
      width: 135,
      minWidth: 120,
      headerClass: "text-center",
      cellClass: "font-mono text-slate-700 dark:text-slate-300 text-xs font-semibold text-center",
      hide: !colVisibility.date,
      valueFormatter: (params) => params.value ? String(params.value).slice(0, 10) : '2026-08-31'
    },
    {
      headerName: "Action",
      width: 95,
      minWidth: 90,
      pinned: 'right',
      lockPinned: true,
      suppressMovable: true,
      headerClass: "text-center",
      cellClass: "text-center",
      hide: !colVisibility.actions,
      cellRenderer: (params) => {
        const row = params.data;
        return (
          <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit(row);
              }}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-[#0f417a] dark:text-blue-400 transition cursor-pointer"
              title="Edit B2/B3 Action"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteTarget(row);
              }}
              className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-red-600 dark:text-red-400 transition cursor-pointer"
              title="Delete Action"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      }
    }
  ], [colVisibility, onEdit]);

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* 1. Status Tabs matching YP & CA DataList */}
      <div className="module-subtabs-strip">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`module-subtab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label} ({tab.id === 'all' ? allCount : tabCounts[tab.id]})
          </button>
        ))}
      </div>

      {/* 2. Main White/Dark Card Container */}
      <div className="module-card space-y-4">
        
        {/* Toolbar Header matching YP & CA format */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* Left: Filter Toggle Button + Reset */}
          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            <button
              type="button"
              onClick={() => setDataListFilterPanel(prev => !prev)}
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
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          {/* Middle Spacer */}
          <div className="hidden lg:block flex-1" />

          {/* Right Toolbar Controls: Search + Rows + Total + Visibility + Copy + Export + Add */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Action Items..."
                value={searchTerm}
                onChange={(e) => setDataListSearch(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setDataListSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Rows Limit Select Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 shadow-xs select-none dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => setDataListPageSize(Number(e.target.value))}
                className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer p-0"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>

            {/* Total Count Badge */}
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800">
              Total: {filteredData.length}
            </div>

            {/* Column Visibility Dropdown */}
            <div className="relative" ref={colVisRef}>
              <button
                onClick={() => setShowColVisibility(!showColVisibility)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {showColVisibility && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {COLUMN_LIST.map(col => (
                    <label key={col.key} className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={colVisibility[col.key] !== false}
                        onChange={() => toggleDataListColumn(col.key)}
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <CopyButton
              onCopy={handleCopy}
              color="#0f417a"
              hoverBg="#f1f5f9"
            />

            {/* Export Dropdown */}
            <ExportDropdown
              onExportExcel={handleExportExcel}
              onExportPdf={handleExportPdf}
              color="#0f417a"
              hoverColor="#1e5ea8"
            />

            {/* Add B2/B3 Button */}
            {onAddNew && (
              <button
                onClick={onAddNew}
                className="px-3.5 py-1.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add B2/B3</span>
              </button>
            )}

          </div>
        </div>

        {/* Collapsible Filter Panel matching YP / CA style */}
        {showFilterPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-fade-in">
            {/* Wing */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Ministry Wing
              </label>
              <div className="relative">
                <select
                  value={selectedWing}
                  onChange={(e) => setDataListFilter('wing', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="0">All Wings</option>
                  {options.wings.map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Organisation */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Organisation
              </label>
              <div className="relative">
                <select
                  value={selectedOrg}
                  onChange={(e) => setDataListFilter('org', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="0">All Organisations</option>
                  {options.organisations.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* National Goal A1 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                National Goal (A1)
              </label>
              <div className="relative">
                <select
                  value={selectedGoalA1}
                  onChange={(e) => setDataListFilter('goalA1', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="0">All Goals (A1)</option>
                  {options.goalsA1.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* National Intervention A2 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Intervention (A2)
              </label>
              <div className="relative">
                <select
                  value={selectedInterventionA2}
                  onChange={(e) => setDataListFilter('interventionA2', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="0">All Interventions (A2)</option>
                  {options.interventionsA2.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* National Action A3 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Action (A3)
              </label>
              <div className="relative">
                <select
                  value={selectedActionA3}
                  onChange={(e) => setDataListFilter('actionA3', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="0">All Actions (A3)</option>
                  {options.actionsA3.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Org Goal B1 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Org Goal (B1)
              </label>
              <div className="relative">
                <select
                  value={selectedGoalB1}
                  onChange={(e) => setDataListFilter('goalB1', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="0">All Goals (B1)</option>
                  {options.goalsB1.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Org Intervention B2 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Intervention (B2)
              </label>
              <div className="relative">
                <select
                  value={selectedInterventionB2}
                  onChange={(e) => setDataListFilter('interventionB2', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="0">All Interventions (B2)</option>
                  {options.interventionsB2.map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Org Action B3 */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Action (B3)
              </label>
              <div className="relative">
                <select
                  value={selectedActionB3}
                  onChange={(e) => setDataListFilter('actionB3', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="0">All Actions (B3)</option>
                  {options.actionsB3.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Stage / Status */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Stage / Status
              </label>
              <div className="relative">
                <select
                  value={selectedStage}
                  onChange={(e) => setDataListFilter('stage', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="0">All Stages</option>
                  {options.stages.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Vibhas / Navic */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Vibhas / Navic
              </label>
              <div className="relative">
                <select
                  value={selectedVibhas}
                  onChange={(e) => setDataListFilter('vibhas', e.target.value)}
                  className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer truncate"
                >
                  <option value="0">All Vibhas</option>
                  {options.vibhas.map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

          </div>
        )}

        {/* 3. The AG-Grid Table Container matching YP & CA style */}
        <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            ref={gridRef}
            rowData={paginatedData}
            columnDefs={columnDefs}
            loading={loading}
            pagination={false}
            enableExport={false}
            onGridReady={(params) => setGridApi(params.api)}
            color="#0f417a"
            defaultColDef={{
              minWidth: 90,
              filter: false,
              sortable: true,
              resizable: true
            }}
          />

          {/* 4. Table Pagination matching YP & CA style */}
          <TablePagination
            currentPage={currentPage - 1}
            totalPages={totalPages}
            totalRows={filteredData.length}
            pageSize={pageSize}
            onPageChange={(zeroIdx) => setDataListPage(zeroIdx + 1)}
            onPrevPage={() => setDataListPage(prev => Math.max(1, prev - 1))}
            onNextPage={() => setDataListPage(prev => Math.min(totalPages, prev + 1))}
            color="#0f417a"
          />
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => !deleting && setDeleteTarget(null)}
        >
          <div 
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl animate-scale-up overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Delete Action Item
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to delete this action item? This cannot be undone.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="text-slate-800 dark:text-slate-200 font-bold truncate">
                  {deleteTarget.action_b3 || deleteTarget['Action (B3)'] || deleteTarget.intervention_b2 || deleteTarget['Intervention (B2)']}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {deleteTarget.organisation_name || deleteTarget.ia_name} • {deleteTarget.current_status || deleteTarget['Current Status']}
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2 bg-slate-50/60 dark:bg-slate-950/40">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-3.5 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 transition shadow-xs cursor-pointer"
              >
                {deleting ? 'Deleting...' : 'Delete Action'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
