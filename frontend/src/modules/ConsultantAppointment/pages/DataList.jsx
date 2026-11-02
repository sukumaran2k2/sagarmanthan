import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Table from '../../../components/Table';
import { Search, X, Edit, Trash2, ChevronDown, Users, Filter } from 'lucide-react';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import CandidateDrilldownView from './CandidateDrilldownView';
import TablePagination from '../../../components/TablePagination';
import { fetchConsultantAppointments } from '../api';
import { useShallow } from 'zustand/react/shallow';
import { useCaStore } from '../store/useCaStore';
import { useNotifier, COMMON_TOASTS } from '../../../utils/notify';

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

const PENDING_STAGES = [
  'Initiated',
  'Admin Approval for engaging Consultant',
  'Tender Published',
  'Pre-bid Queries Responded',
  'Bid Received',
  'Technical Bid Finalized',
  'Financial Bid Finalized',
  'Work Order Issued',
];

const formatDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');
const formatDateTime = (d) => {
  if (!d) return '';
  const str = typeof d === 'string' ? d : d.toISOString ? d.toISOString() : String(d);
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (match) {
    const y = match[1];
    const m = match[2];
    const day = match[3];
    const hStr = match[4];
    const min = match[5];
    const sec = match[6];
    
    if (hStr === '00' && min === '00' && sec === '00') {
      return `${day}/${m}/${y}`;
    }

    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    h = h ? h : 12;
    const hFormatted = String(h).padStart(2, '0');
    return `${day}/${m}/${y}, ${hFormatted}:${min} ${ampm}`;
  }
  return String(d);
};

const getStatusFromStages = (stages) => {
  for (let i = STAGES.length - 1; i >= 0; i--) {
    if (stages[STAGES[i].key]) {
      return STAGES[i].label;
    }
  }
  return 'Initiated';
};

function parseAppointmentRow(b) {
  const stages = {
    adminApproval: !!b.admin_approval_for_nkg_consultant_date,
    adminApprovalDate: formatDate(b.admin_approval_for_nkg_consultant_date),
    tenderPublished: !!b.tender_published_date,
    tenderPublishedDate: formatDate(b.tender_published_date),
    preBidQueries: !!b.pre_bid_queries_responded_date,
    preBidQueriesDate: formatDate(b.pre_bid_queries_responded_date),
    bidReceived: !!b.bid_received_date,
    bidReceivedDate: formatDate(b.bid_received_date),
    techBidFinalized: !!b.technical_bid_finalized_date,
    techBidFinalizedDate: formatDate(b.technical_bid_finalized_date),
    finBidFinalized: !!b.financial_bid_finalized_date,
    finBidFinalizedDate: formatDate(b.financial_bid_finalized_date),
    workOrderIssued: !!b.work_order_issued_date,
    workOrderIssuedDate: formatDate(b.work_order_issued_date),
    contractSigned: !!b.contract_signed_date,
    contractSignedDate: formatDate(b.contract_signed_date),
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
    status: getStatusFromStages(stages),
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

  // Drilldown is view state for this page only; it must not outlive the Data List
  const [drilldownAppointment, setDrilldownAppointment] = useState(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [gridApi, setGridApi] = useState(null);
  const notify = useNotifier(triggerNotification);

  const [allCount, setAllCount] = useState(0);
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

  // Store setters already reset to page 1 (and clear division on wing change)
  const handleWingChange = (val) => setSelectedWing(val);

  const handleDivisionChange = (val) => setSelectedDivision(val);

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
          setAllCount(payload.pagination.allCount || 0);
          setPendingCount(payload.pagination.pendingCount || 0);
          setCompletedCount(payload.pagination.completedCount || 0);
        }
      } else {
        const list = Array.isArray(payload) ? payload : [];
        const parsed = list.map((item, idx) => ({
          ...parseAppointmentRow(item),
          sNo: idx + 1
        }));
        const total = parsed.length;
        const comp = parsed.filter(item => item.status === 'Contract Signed').length;
        const pend = total - comp;
        setAllCount(total);
        setCompletedCount(comp);
        setPendingCount(pend);

        let filtered = parsed;
        if (activeTab === 'pending') {
          filtered = filtered.filter(item => item.status !== 'Contract Signed');
        } else if (activeTab === 'completed') {
          filtered = filtered.filter(item => item.status === 'Contract Signed');
        }
        if (selectedStage && selectedStage !== 'All Stages') {
          filtered = filtered.filter(item => item.status === selectedStage);
        }
        setData(filtered);
        setTotalCount(filtered.length);
        setTotalPages(Math.ceil(filtered.length / pageSize) || 1);
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
    let filtered = divisions;
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
      if (gridApi) {
        let tsv = '';
        const headers = [];
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Action') {
            headers.push(col.headerName);
          }
        });
        tsv += headers.join('\t') + '\n';
        
        data.forEach((row, rowIndex) => {
          const line = [];
          columnDefs.forEach(col => {
            if (col.headerName && col.headerName !== 'Action') {
              const val = row[col.field] !== undefined ? row[col.field] : '';
              line.push(val);
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
      if (gridApi) {
        const fileName = `Consultant_Appointment_Page_${currentPage}.csv`;
        gridApi.exportDataAsCsv({ fileName });
        notify(COMMON_TOASTS.excelExported(fileName));
      } else {
        notify(COMMON_TOASTS.tableNotReady('export'));
      }
    } else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        notify(COMMON_TOASTS.popupBlocked());
        return;
      }
      notify(COMMON_TOASTS.pdfPreparing());
      const title = 'Consultant Appointment - Data List';

      let headersHtml = '';
      columnDefs.forEach(col => {
        if (col.headerName && col.headerName !== 'Action') {
          headersHtml += `<th style="border: 1px solid #cbd5e1; padding: 10px; text-align: left; background-color: #f8fafc; font-size: 11px; font-weight: bold; text-transform: uppercase;">${col.headerName}</th>`;
        }
      });

      let rowsHtml = '';
      data.forEach((row, rowIndex) => {
        rowsHtml += '<tr>';
        columnDefs.forEach(col => {
          if (col.headerName && col.headerName !== 'Action') {
            const val = row[col.field] !== undefined ? row[col.field] : '';
            rowsHtml += `<td style="border: 1px solid #e2e8f0; padding: 8px; font-size: 11px;">${val}</td>`;
          }
        });
        rowsHtml += '</tr>';
      });

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
              {canRemove && onDelete && (
                <button
                  onClick={async () => {
                    await onDelete(row);
                    fetchData();
                  }}
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
  }, [visibleCols, canEdit, canRemove, onEdit, onDelete, fetchData]);

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
                  onChange={(e) => handleWingChange(e.target.value)}
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
                  onChange={(e) => handleDivisionChange(e.target.value)}
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
                    {(activeTab === 'pending' ? PENDING_STAGES : STAGES.map(s => s.label)).map(stage => (
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
          onGridReady={(params) => setGridApi(params.api)}
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
    </div>
  );
}
