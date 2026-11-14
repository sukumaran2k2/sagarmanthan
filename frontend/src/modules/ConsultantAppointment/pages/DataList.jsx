import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Table from '../../../components/Table';
import { Search, X, Edit, Trash2, ChevronDown, Users, Filter, Plus } from 'lucide-react';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import CandidateDrilldownView from './CandidateDrilldownView';
import TablePagination from '../../../components/TablePagination';
import { fetchConsultantAppointments } from '../api';
import { useShallow } from 'zustand/react/shallow';
import { useCaStore } from '../store/useCaStore';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';
import { formatDateTime, toInputDate, tsvCell } from '../formatters';
import { exportRowsToFile, exportGridApiToExcel } from '../../../utils/exportGridReport';

const STAGES = [
  { key: 'adminApproval', label: 'Admin Approval for engaging Consultant' },
  { key: 'tenderPublished', label: 'Tender Published' },
  { key: 'preBidQueries', label: 'Pre-bid Queries Responded' },
  { key: 'bidReceived', label: 'Bid Received' },
  { key: 'techBidFinalized', label: 'Technical Bid Finalized' },
  { key: 'finBidFinalized', label: 'Financial Bid Finalized' },
  { key: 'workOrderIssued', label: 'Work Order Issued' },
  { key: 'contractSigned', label: 'Contract Signed' },
];

// Contract Signed is the completed state, so it is not offered as a pending stage
const COMPLETED_STAGE_ID = 8;


// Fallback only: the Status column shows the stage the server reports, because that is what
// the Stage filter matches on. Deriving it from the dates instead let a row display one
// stage while the filter placed it under another.
const getStatusFromStages = (stages) => {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (stages[STAGES[i].key]) {
      return STAGES[i].label;
    }
  }
  return 'No Status';
};

function parseAppointmentRow(b) {
  const stages = {
    adminApproval: !!b.admin_approval_for_nkg_consultant_date,
    adminApprovalDate: toInputDate(b.admin_approval_for_nkg_consultant_date),
    tenderPublished: !!b.tender_published_date,
    tenderPublishedDate: toInputDate(b.tender_published_date),
    preBidQueries: !!b.pre_bid_queries_responded_date,
    preBidQueriesDate: toInputDate(b.pre_bid_queries_responded_date),
    bidReceived: !!b.bid_received_date,
    bidReceivedDate: toInputDate(b.bid_received_date),
    techBidFinalized: !!b.technical_bid_finalized_date,
    techBidFinalizedDate: toInputDate(b.technical_bid_finalized_date),
    finBidFinalized: !!b.financial_bid_finalized_date,
    finBidFinalizedDate: toInputDate(b.financial_bid_finalized_date),
    workOrderIssued: !!b.work_order_issued_date,
    workOrderIssuedDate: toInputDate(b.work_order_issued_date),
    contractSigned: !!b.contract_signed_date,
    contractSignedDate: toInputDate(b.contract_signed_date),
  };

  const remarks = {
    adminApproval: b.admin_approval_for_nkg_consultant_remarks || '',
    tenderPublished: b.tender_published_remarks || '',
    preBidQueries: b.pre_bid_queries_responded_remarks || '',
    bidReceived: b.bid_received_remarks || '',
    techBidFinalized: b.technical_bid_finalized_remarks || '',
    finBidFinalized: b.financial_bid_finalized_remarks || '',
    workOrderIssued: b.work_order_issued_remarks || '',
    contractSigned: b.contract_signed_remarks || '',
  };

  return {
    id: b.consultant_appointment_id,
    wing_id: b.wing,
    division_id: b.division,
    wing: b.wing_name || 'Unknown',
    division: b.division_name || 'Unknown',
    appointmentType: b.appointment_type || 'Full Time',
    numResources: b.number_of_resources || 1,
    // stage_name is the value the Stage filter compares against, so showing it keeps the
    // filter and the column in agreement
    status: b.stage_name || getStatusFromStages(stages),
    stages,
    remarks,
    created_date: b.created_date,
    updated_date: b.updated_date,
    lastUpdated: formatDateTime(b.updated_date || b.created_date),
    createdDateFormatted: formatDateTime(b.created_date),
    updatedDateFormatted: formatDateTime(b.updated_date),
    raw: b,
  };
}

export default function DataList({
  onEdit,
  onDelete,
  onAddClick,
  wings = [],
  divisions = [],
  triggerNotification,
  canEdit = true,
  canAdd = true,
  canRemove = true
}) {
  // Zustand CA Store (filter/pagination slice only; wings & divisions come from props)
  const {
    activeStatusTab: activeTab,
    setActiveStatusTab: setActiveTab,
    searchTerm,
    setSearchTerm,
    debouncedSearch,
    setDebouncedSearch,
    selectedWing,
    setSelectedWing,
    selectedDivision,
    setSelectedDivision,
    selectedStage,
    setSelectedStage,
    showFilterPanel,
    setShowFilterPanel,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    resetFilters
  } = useCaStore(useShallow(state => ({
    activeStatusTab: state.activeStatusTab,
    setActiveStatusTab: state.setActiveStatusTab,
    searchTerm: state.searchTerm,
    setSearchTerm: state.setSearchTerm,
    debouncedSearch: state.debouncedSearch,
    setDebouncedSearch: state.setDebouncedSearch,
    selectedWing: state.selectedWing,
    setSelectedWing: state.setSelectedWing,
    selectedDivision: state.selectedDivision,
    setSelectedDivision: state.setSelectedDivision,
    selectedStage: state.selectedStage,
    setSelectedStage: state.setSelectedStage,
    showFilterPanel: state.showFilterPanel,
    setShowFilterPanel: state.setShowFilterPanel,
    currentPage: state.currentPage,
    setCurrentPage: state.setCurrentPage,
    pageSize: state.pageSize,
    setPageSize: state.setPageSize,
    resetFilters: state.resetFilters
  })));

  // Stage names come from the master table so the filter sends a value the server can match
  const stageMaster = useCaStore(state => state.stages);
  const stageOptions = useMemo(() => {
    const names = stageMaster
      .filter(s => activeTab !== 'pending' || s.stage_id !== COMPLETED_STAGE_ID)
      .map(s => s.stage_name)
      .filter(Boolean);
    return names;
  }, [stageMaster, activeTab]);

  // Drilldown is view state for this page only; it must not outlive the Data List
  const [drilldownAppointment, setDrilldownAppointment] = useState(null);

  // Delete confirmation overlay state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const gridApiRef = useRef(null);
  const notify = useNotifier(triggerNotification);

  const [pendingCount, setPendingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);

  // Reset stage filter when switching tabs (store setters already reset to page 1)
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'completed') setSelectedStage('');
  };

  const activeFiltersCount = (selectedWing ? 1 : 0) + (selectedDivision ? 1 : 0) + (selectedStage ? 1 : 0);

  // Column visibility states
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const colDropdownRef = useRef(null);
  const [visibleCols, setVisibleCols] = useState({
    wing: true,
    division: true,
    appointmentType: true,
    status: true,
    numResources: true,
    lastUpdated: true
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, setDebouncedSearch]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (colDropdownRef.current && !colDropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Only the latest request may update state (avoids out-of-order responses)
  const latestRequestRef = useRef(0);
  const fetchData = useCallback(async () => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    setLoading(true);
    try {
      const res = await fetchConsultantAppointments({
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch,
        wing: selectedWing,
        division: selectedDivision,
        status: activeTab,
        stage: selectedStage
      });
      if (isStale()) return;

      const payload = res.data;
      if (payload && payload.data && payload.pagination) {
        const parsed = (payload.data || []).map((item, idx) => ({
          ...parseAppointmentRow(item),
          sNo: (payload.pagination.page - 1) * payload.pagination.limit + idx + 1
        }));
        setData(parsed);
        setTotalCount(payload.pagination.total || 0);
        setTotalPages(payload.pagination.totalPages || 1);
        if (payload.pagination.allCount !== undefined) {
          setPendingCount(payload.pagination.pendingCount || 0);
          setCompletedCount(payload.pagination.completedCount || 0);
        }
      } else {
        setData([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      if (isStale()) return;
      console.error("Error fetching consultant appointments:", err);
      setData([]);
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedWing, selectedDivision, activeTab, selectedStage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const wingOptions = useMemo(() => {
    return wings.map(w => ({
      value: w.wing_name,
      label: w.wing_name,
      wing_id: w.wing_id
    }));
  }, [wings]);

  const divisionOptions = useMemo(() => {
    if (!selectedWing) return [];
    let filtered;
    const matchingWing = wings.find(w => 
      (w.wing_name && String(w.wing_name) === String(selectedWing)) || 
      (w.wing_id && String(w.wing_id) === String(selectedWing))
    );
    const targetWingId = matchingWing ? matchingWing.wing_id : null;
    if (targetWingId !== undefined && targetWingId !== null) {
      filtered = divisions.filter(d => String(d.wing_id) === String(targetWingId));
    } else {
      filtered = divisions.filter(d => String(d.wing_name) === String(selectedWing));
    }
    return filtered.map(d => ({
      value: d.division_name,
      label: d.division_name
    }));
  }, [divisions, wings, selectedWing]);

  // Sync division selection if current division is not in filtered list
  useEffect(() => {
    if (selectedDivision) {
      const exists = divisionOptions.some(d => String(d.value) === String(selectedDivision));
      if (!exists) {
        setSelectedDivision('');
      }
    }
  }, [divisionOptions, selectedDivision, setSelectedDivision]);
  const handleExport = (type) => {
    if (type === 'Copy') {
      if (gridApiRef.current) {
        let tsv = '';
        const headers = [];
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Action') {
            headers.push(col.headerName);
          }
        });
        tsv += headers.join('\t') + '\n';
        
        data.forEach((row) => {
          const line = [];
          columnDefs.forEach(col => {
            if (col.headerName && col.headerName !== 'Action') {
              const val = row[col.field] !== undefined ? row[col.field] : '';
              line.push(tsvCell(val));
            }
          });
          tsv += line.join('\t') + '\n';
        });

        navigator.clipboard.writeText(tsv)
          .then(() => notify(COMMON_TOASTS.copySuccess(data.length)))
          .catch(() => notify(COMMON_TOASTS.copyFailed()));
      } else {
        notify(COMMON_TOASTS.tableNotReady('copy'));
      }
    } else if (type === 'Excel') {
      if (gridApiRef.current) {
        // Excel (.xlsx) of the table as shown; cells are stored as text, so nothing runs as a formula
        const file = exportGridApiToExcel(gridApiRef.current, { title: 'Consultant Appointment - Data List', fileName: `Consultant_Appointment_Page_${currentPage}` });
        notify(COMMON_TOASTS.excelExported(file));
      } else {
        notify(COMMON_TOASTS.tableNotReady('export'));
      }
    } else if (type === 'PDF') {
      // PDF straight to a file (no print dialog or new tab): the columns on show
      const pdfCols = columnDefs.filter((col) => col.headerName && col.headerName !== 'Action' && !col.hide);
      const file = exportRowsToFile('pdf', {
        title: 'Consultant Appointment - Data List',
        headers: pdfCols.map((col) => col.headerName),
        rows: data.map((row) => pdfCols.map((col) => row[col.field] ?? '')),
        fileName: 'Consultant_Appointment_Data_List',
      });
      notify(COMMON_TOASTS.excelExported(file));
    }
  };

  // Open overlay instead of window.confirm
  const handleDeleteRow = useCallback((row) => {
    setDeleteTarget(row);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, onDelete, fetchData]);

  const showDeleteAction = canRemove && !!onDelete;

  const columnDefs = useMemo(() => {
    const cols = [
      {
        field: 'sNo',
        headerName: 'S.No',
        minWidth: 80,
        width: 85,
        wrapText: true,
        autoHeight: true,
        cellClass: 'font-mono text-slate-800 dark:text-white font-bold text-center flex items-center justify-center',
        headerClass: 'text-center',
        pinned: 'left',
        cellStyle: { textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center' }
      },
      {
        field: 'wing',
        headerName: 'Wing',
        flex: 1.5,
        minWidth: 150,
        wrapText: true,
        autoHeight: true,
        cellClass: 'font-bold text-slate-800 dark:text-white flex items-center',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4', display: 'flex', alignItems: 'center' },
        hide: !visibleCols.wing,
        pinned: 'left'
      },
      {
        field: 'division',
        headerName: 'Division',
        flex: 1.2,
        minWidth: 130,
        wrapText: true,
        autoHeight: true,
        headerClass: 'text-center',
        cellClass: 'text-slate-700 dark:text-slate-100 font-medium text-center flex items-center justify-center',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
        hide: !visibleCols.division
      },
      {
        field: 'appointmentType',
        headerName: 'Appointment Type',
        flex: 1.2,
        minWidth: 140,
        wrapText: true,
        autoHeight: true,
        headerClass: 'text-center',
        cellClass: 'text-slate-700 dark:text-slate-100 font-medium text-center flex items-center justify-center',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' },
        hide: !visibleCols.appointmentType
      },
      {
        field: 'status',
        headerName: 'Status',
        flex: 3,
        minWidth: 260,
        wrapText: true,
        autoHeight: true,
        cellClass: 'font-semibold text-blue-700 dark:text-blue-400 flex items-center',
        cellStyle: { whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4', display: 'flex', alignItems: 'center' },
        hide: !visibleCols.status
      },
      {
        field: 'numResources',
        headerName: 'Number of Resources',
        flex: 1,
        minWidth: 155,
        wrapText: true,
        autoHeight: true,
        headerClass: 'text-center',
        cellClass: 'flex items-center justify-center',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params) => {
          const row = params.data;
          const count = params.value || 1;
          return (
            <div className="flex items-center justify-center w-full h-full py-1">
              <button
                type="button"
                onClick={() => setDrilldownAppointment(row)}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-[#0f417a] dark:bg-blue-950/60 dark:hover:bg-blue-900/60 dark:text-blue-300 font-extrabold text-xs rounded-lg border border-blue-200 dark:border-blue-800 transition cursor-pointer shadow-sm hover:scale-105 active:scale-95 group"
                title="Click to view candidate details & documents"
              >
                <Users className="h-3.5 w-3.5 text-[#0f417a] dark:text-blue-400 group-hover:scale-110 transition-transform" />
                <span>{count}</span>
              </button>
            </div>
          );
        },
        hide: !visibleCols.numResources
      },
      {
        field: 'lastUpdated',
        headerName: 'Last Updated',
        flex: 1.3,
        minWidth: 165,
        wrapText: true,
        autoHeight: true,
        cellClass: 'font-mono text-slate-700 dark:text-slate-300 text-xs font-semibold text-center flex items-center justify-center',
        cellStyle: { textAlign: 'center', justifyContent: 'center', display: 'flex', alignItems: 'center', whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: '1.4' },
        headerClass: 'text-center',
        hide: !visibleCols.lastUpdated
      }
    ];

    if (canEdit || canRemove) {
      cols.push({
        headerName: 'Action',
        width: 110,
        pinned: 'right',
        lockPinned: true,
        suppressMovable: true,
        wrapText: true,
        autoHeight: true,
        headerClass: 'text-center',
        cellClass: 'text-center flex items-center justify-center',
        cellStyle: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
        cellRenderer: (params) => {
          const row = params.data;
          return (
            <div className="flex items-center justify-center space-x-1.5 w-full h-full py-1">
              {canEdit && (
                <button
                  onClick={() => onEdit(row)}
                  className="p-1.5 hover:bg-orange-50 dark:hover:bg-slate-800 rounded-lg text-orange-500 hover:text-orange-600 dark:text-orange-400 transition cursor-pointer"
                  title="Update Appointment"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              {showDeleteAction && (
                <button
                  onClick={() => handleDeleteRow(row)}
                  className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 rounded text-red-600 dark:text-red-400 transition cursor-pointer"
                  title="Delete Appointment"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        }
      });
    }

    return cols;
  }, [visibleCols, canEdit, canRemove, showDeleteAction, onEdit, handleDeleteRow]);

  if (drilldownAppointment) {
    return (
      <CandidateDrilldownView
        appointment={drilldownAppointment}
        onBack={() => {
          setDrilldownAppointment(null);
          fetchData();
        }}
        triggerNotification={triggerNotification}
        canEdit={canEdit}
        canAdd={canAdd}
        canRemove={canRemove}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Sub-Tabs: PENDING, CONTRACT SIGNED */}
      <div className="module-subtabs-strip">
        <button
          onClick={() => handleTabChange('pending')}
          className={`module-subtab-btn ${activeTab === 'pending' ? 'active' : ''}`}
        >
          PENDING ({pendingCount})
        </button>
        <button
          onClick={() => handleTabChange('completed')}
          className={`module-subtab-btn ${activeTab === 'completed' ? 'active' : ''}`}
        >
          CONTRACT SIGNED ({completedCount})
        </button>
      </div>

      <div className="module-card space-y-4">

        {/* Search, Filters and Actions Toolbar matching centralized format */}
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
          
          {/* 1. Left: Dedicated Filter Button + Reset */}
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

          {/* 2. Middle Spacer */}
          <div className="hidden lg:block flex-1" />

          {/* 3. Right: Search Input + Row Count + Total + Visibility + Copy + Export + Add */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            
            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Wing, Division or Status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full module-search-input"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
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
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                }}
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
              Total: {totalCount}
            </div>

            {/* Column Visibility Dropdown */}
            <div className="relative" ref={colDropdownRef}>
              <button
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
                      <span>{col === 'appointmentType' ? 'Appointment Type' : col === 'numResources' ? 'Num Resources' : col === 'lastUpdated' ? 'Last Updated' : col}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Copy Button */}
            <CopyButton
              onCopy={() => handleExport('Copy')}
              color="#0f417a"
              hoverBg="#f1f5f9"
            />

            {/* Export Dropdown */}
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#1e5ea8"
            />

            {/* Add Appointment (matches the OVOD Data List) */}
            {canAdd && onAddClick && (
              <button
                type="button"
                onClick={onAddClick}
                className="px-3.5 py-1.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Appointment</span>
              </button>
            )}
          </div>
        </div>

        {/* Collapsible Filter Panel matching YP / GMIS style */}
        {showFilterPanel && (
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
            {/* Wing Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Wing
              </label>
              <div className="relative">
                <select
                  value={selectedWing}
                  onChange={(e) => setSelectedWing(e.target.value)}
                  className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <option value="">All Wings</option>
                  {wingOptions.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Division Selector */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Division
              </label>
              <div className="relative">
                <select
                  value={selectedDivision}
                  onChange={(e) => setSelectedDivision(e.target.value)}
                  disabled={!selectedWing}
                  className={`appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer ${
                    !selectedWing ? 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800/60' : ''
                  }`}
                >
                  <option value="">
                    {!selectedWing ? 'Select Wing First' : 'All Divisions'}
                  </option>
                  {divisionOptions.map((d) => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Stage Selector */}
            {activeTab !== 'completed' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Stage
                </label>
                <div className="relative">
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="appearance-none w-full text-xs pl-2.5 pr-8 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0f417a] font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    <option value="">All Stages</option>
                    {stageOptions.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            )}
          </div>
        )}

      <div className="ag-theme-quartz module-datalist-grid w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
        <Table
          rowData={data}
          columnDefs={columnDefs}
          loading={loading}
          pagination={false}
          enableExport={false}
          onGridReady={(params) => { gridApiRef.current = params.api; }}
          defaultColDef={{
            minWidth: 90,
            filter: false,
            sortable: true,
            resizable: true,
            wrapText: true,
            autoHeight: true,
            cellStyle: {
              whiteSpace: 'normal',
              wordBreak: 'break-word',
              lineHeight: '1.4',
              display: 'flex',
              alignItems: 'center'
            }
          }}
        />

        {/* Server-Side Pagination Bar */}
        <TablePagination
          currentPage={currentPage - 1}
          totalPages={totalPages}
          totalRows={totalCount}
          pageSize={pageSize}
          onPageChange={(zeroIdx) => setCurrentPage(zeroIdx + 1)}
          onPrevPage={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          onNextPage={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          color="#0f417a"
        />
      </div>
      </div>

      {/* Delete Confirmation Overlay */}
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
                  Delete Consultant Appointment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Are you sure you want to delete this record? This will also remove associated candidate records and documents.
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
                  {deleteTarget.wing} — {deleteTarget.division}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {deleteTarget.appointmentType} • {deleteTarget.status}
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
                {deleting ? 'Deleting...' : 'Delete Appointment'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
