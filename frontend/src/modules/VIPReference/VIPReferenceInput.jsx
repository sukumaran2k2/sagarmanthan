import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Edit
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';

import FilterBar from './FilterBar';
import ReferenceForm from './ReferenceForm';

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_STEPS = {
  1: 'Received at Ministry',
  2: 'Submitted for Approval',
  3: 'Comments Sought',
  4: 'Comments Received',
  5: 'Reply Furnished',
  6: 'Disposed'
};

export default function VIPReferenceInput({ vipReferences, setVipReferences, refreshData }) {
  const gridRef = useRef();

  // Dropdown options loaded from database
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  // Server-side reference data
  const [serverVipReferences, setServerVipReferences] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);

  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRef, setEditingRef] = useState(null);

  // Debounced search query
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Fetch wings and divisions from the database on mount
  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_wings")
      .then(res => {
        setWings(res.data || []);
      })
      .catch(err => console.error("Error fetching wings:", err));

    axios.get("http://localhost:3000/mmt-dropdown/mmt_division")
      .then(res => {
        setDivisions(res.data || []);
      })
      .catch(err => console.error("Error fetching divisions:", err));
  }, []);

  // Fetch references dynamically from the server based on pagination and filters
  const fetchReferences = () => {
    axios.get("http://localhost:3000/vip-reference", {
      params: {
        page: currentPage,
        limit: entriesLimit,
        wing: selectedWing,
        division: selectedDivision,
        status: selectedStatus,
        search: debouncedSearch
      }
    })
      .then(res => {
        const dataArray = res.data.data || [];
        const mapped = dataArray.map(r => {
          const steps = {
            1: r.received_at_ministry || 'No',
            2: r.submitted_for_approval || 'No',
            3: r.comments_sought || 'No',
            4: r.comments_received || 'No',
            5: r.reply_furnished || 'No',
            6: r.disposed || 'No'
          };
          const dates = {
            1: r.received_at_ministry_date ? new Date(r.received_at_ministry_date).toISOString().split('T')[0] : '',
            2: r.submitted_for_approval_date ? new Date(r.submitted_for_approval_date).toISOString().split('T')[0] : '',
            3: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            4: r.comments_received_date ? new Date(r.comments_received_date).toISOString().split('T')[0] : '',
            5: r.reply_furnished_date ? new Date(r.reply_furnished_date).toISOString().split('T')[0] : '',
            6: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.vip_reference_id,
            subject: r.subject || '',
            eofficeFile: r.eoffice_file_number || '',
            wing: r.wing_name || '',
            division: r.division_name || '',
            refNumber: r.ref_letter_num || '',
            receivedFrom: r.received_from || '',
            remarks: r.remarks || '',
            deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
            statusSteps: steps,
            statusDates: dates,
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : ''
          };
        });
        setServerVipReferences(mapped);
        setTotalEntries(res.data.pagination?.total || 0);
      })
      .catch(err => console.error("Error loading VIP references:", err));
  };

  useEffect(() => {
    fetchReferences();
  }, [currentPage, entriesLimit, selectedWing, selectedDivision, selectedStatus, debouncedSearch]);

  const getRefStatusText = (steps) => {
    let currentStatus = 'Draft';
    for (let i = 1; i <= 6; i++) {
      if (steps[i] === 'Yes') {
        currentStatus = STATUS_STEPS[i];
      }
    }
    return currentStatus;
  };

  const handleOpenAdd = () => {
    setEditingRef(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (refData) => {
    setEditingRef(refData);
    setIsFormOpen(true);
  };

  const handleSaveRef = async (formData) => {
    const wingObj = wings.find(w => w.wing_name === formData.wing) || { wing_id: 1 };
    const divisionObj = divisions.find(d => d.division_name === formData.division) || { division_id: 1 };
    const wingId = wingObj.wing_id;
    const divisionId = divisionObj.division_id;

    let selectedStage = 1;
    for (let i = 1; i <= 6; i++) {
      if (formData.statusSteps[i] === 'Yes') {
        selectedStage = i;
      }
    }

    const payload = {
      vipSubject: formData.subject,
      eofficeFileNumber: formData.eofficeFile,
      wing: wingId,
      division: divisionId,
      referenceLetterNumber: formData.refNumber,
      receivedFrom: formData.receivedFrom,
      vipReceivedMinistry: formData.statusSteps[1] || 'No',
      vipReceivedMinistryDate: formData.statusDates[1] || '',
      vipSubmittedForApproval: formData.statusSteps[2] || 'No',
      vipSubmittedForApprovalDate: formData.statusDates[2] || '',
      vipCommentsSought: formData.statusSteps[3] || 'No',
      vipCommentsSoughtDate: formData.statusDates[3] || '',
      vipCommentsReceived: formData.statusSteps[4] || 'No',
      vipCommentsReceivedDate: formData.statusDates[4] || '',
      vipReplyFurnished: formData.statusSteps[5] || 'No',
      vipReplyFurnishedDate: formData.statusDates[5] || '',
      vipDisposed: formData.statusSteps[6] || 'No',
      vipDisposedDate: formData.statusDates[6] || '',
      vipRemarks: formData.remarks,
      selectedStage: selectedStage,
      deadline: formData.deadline || '',
      userID: 1
    };

    try {
      if (editingRef) {
        payload.vipReferenceID = editingRef.id;
        await axios.put("http://localhost:3000/vip-reference", payload);
      } else {
        await axios.post("http://localhost:3000/vip-reference", payload);
      }
      setIsFormOpen(false);
      fetchReferences();
      if (refreshData) refreshData();
    } catch (err) {
      console.error("Error saving VIP reference:", err);
      alert("Failed to save VIP reference.");
    }
  };

  const totalPages = Math.ceil(totalEntries / entriesLimit);

  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const gridPage = gridRef.current.api.paginationGetCurrentPage() + 1;
      if (gridPage !== currentPage) {
        setCurrentPage(gridPage);
      }
    }
  };

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
      setCurrentPage(page);
    }
  };

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1 + (currentPage - 1) * entriesLimit,
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center'
    },
    {
      headerName: 'Subject',
      field: 'subject',
      width: 280,
      minWidth: 200,
      pinned: 'left',
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-700 flex items-center py-2 border-r border-slate-100 font-semibold whitespace-normal'
    },
    {
      headerName: 'Wing',
      field: 'wing',
      minWidth: 120,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'Division',
      field: 'division',
      minWidth: 120,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'Status',
      field: 'statusSteps',
      minWidth: 180,
      cellClass: 'text-center font-bold text-slate-800 border-r border-slate-100 flex items-center justify-center',
      cellRenderer: (params) => {
        const text = getRefStatusText(params.value);
        let style = 'bg-slate-50 text-slate-700 border-slate-200';
        if (text === 'Disposed') {
          style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (text === 'Comments Received' || text === 'Reply Furnished') {
          style = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (text === 'Comments Sought' || text === 'Submitted for Approval') {
          style = 'bg-amber-50 text-amber-700 border-amber-200';
        }
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 text-[10px] rounded-full border ${style}`}>
            {text}
          </span>
        );
      }
    },
    {
      headerName: 'Reference Letter Number',
      field: 'refNumber',
      minWidth: 180,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'Received From',
      field: 'receivedFrom',
      minWidth: 200,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-600 flex items-center py-2 border-r border-slate-100 font-semibold whitespace-normal'
    },
    {
      headerName: 'Remarks',
      field: 'remarks',
      minWidth: 220,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-550 flex items-center py-2 border-r border-slate-100 font-medium whitespace-normal',
      valueFormatter: (params) => params.value || '--'
    },
    {
      headerName: 'Last Updated Date',
      field: 'lastUpdated',
      minWidth: 150,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'Update',
      field: 'id',
      width: 90,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => handleOpenEdit(params.data)}
          className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
          title="Update VIP Letter status"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )
    }
  ], [currentPage, entriesLimit]);

  const handleGridWheel = (e) => {
    if (gridRef.current && gridRef.current.api) {
      const scrollAmount = e.deltaY;
      const gridContainer = gridRef.current.api.getGridBodyViewportElement?.() || gridRef.current.api.getGridBodyElement?.();
      if (gridContainer) {
        gridContainer.scrollLeft += scrollAmount;
      }
    }
  };

  return (
    <div className="space-y-6">
      {isFormOpen ? (
        <ReferenceForm
          editingRef={editingRef}
          onClose={() => setIsFormOpen(false)}
          onSave={handleSaveRef}
          wings={wings}
          divisions={divisions}
          statusSteps={STATUS_STEPS}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm hover:shadow transition cursor-pointer self-start md:self-auto"
            >
              <Plus className="h-4 w-4" />
              <span>Register VIP Letter</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Show</span>
                <select
                  value={entriesLimit}
                  onChange={(e) => {
                    setEntriesLimit(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Entries</span>
              </div>
            </div>
          </div>

          {isFiltersExpanded && (
            <FilterBar
              selectedWing={selectedWing}
              setSelectedWing={setSelectedWing}
              selectedDivision={selectedDivision}
              setSelectedDivision={setSelectedDivision}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
              wings={wings}
              divisions={divisions}
              statusSteps={STATUS_STEPS}
              setCurrentPage={setCurrentPage}
            />
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-700"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>
            <div className="text-xs font-semibold text-slate-500">
              Showing {totalEntries} entries
            </div>
          </div>

          <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
            <AgGridReact
              ref={gridRef}
              theme="legacy"
              rowData={serverVipReferences}
              columnDefs={colDefs}
              pagination={true}
              paginationPageSize={entriesLimit}
              suppressPaginationPanel={true}
              onPaginationChanged={onPaginationChanged}
              domLayout="autoHeight"
              rowHeight={55}
              headerHeight={45}
              suppressColumnVirtualisation={true}
              autoSizeStrategy={{
                type: 'fitGridWidth',
                defaultMinWidth: 90
              }}
            />

            <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
              <span className="text-slate-500 font-medium text-center sm:text-left">
                Showing <span className="font-bold text-slate-800">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
                <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of{' '}
                <span className="font-bold text-slate-800">{totalEntries}</span> entries
              </span>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                  if (totalPages > 6 && Math.abs(currentPage - p) > 1 && p !== 1 && p !== totalPages) {
                    if (p === 2 || p === totalPages - 1) {
                      return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${currentPage === p
                        ? 'bg-[#0f417a] text-white shadow-sm'
                        : 'border border-slate-200 text-slate-655 hover:bg-slate-50'
                        }`}
                    >
                      {p}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-660 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
