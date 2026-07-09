import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Search,
  Copy,
  FileText,
  Edit,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  UploadCloud,
  ArrowLeft,
  Calendar,
  X
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_STEPS = {
  1: 'Note Received from Ministry',
  2: 'Circulated for comments to Wings',
  3: 'Comments received from Wings',
  4: 'File submitted to Hon\'ble Minister',
  5: 'Reply furnished to Ministry'
};

const DIVISIONS = ['All', 'Comments Received', 'Reply Furnished'];

export default function CabinetNotesInput({
  notes,
  setNotes,
  activeSubTab,
  setActiveSubTab,
  editingNote,
  setEditingNote,
  refreshData,
  ministries = []
}) {
  const gridRef = useRef();
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [notification, setNotification] = useState(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Form Fields
  const [formSubject, setFormSubject] = useState('');
  const [formWing, setFormWing] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formStatusSteps, setFormStatusSteps] = useState({
    1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No'
  });
  const [formStatusDates, setFormStatusDates] = useState({});

  const WINGS = useMemo(() => {
    return ['All', ...ministries.map(m => m.ministry_name)];
  }, [ministries]);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const isFormOpen = activeSubTab === 'add';

  const getNoteStatusFromSteps = (steps) => {
    let currentStatus = 'Draft';
    for (let i = 1; i <= 5; i++) {
      if (steps[i] === 'Yes') {
        currentStatus = STATUS_STEPS[i];
      }
    }
    return currentStatus;
  };

  const getStepsFromNoteStatus = (status) => {
    const steps = { 1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No' };
    let foundMatch = false;
    for (let i = 5; i >= 1; i--) {
      if (status === STATUS_STEPS[i] || foundMatch) {
        steps[i] = 'Yes';
        foundMatch = true;
      }
    }
    return steps;
  };

  useEffect(() => {
    if (activeSubTab === 'add') {
      Promise.resolve().then(() => {
        if (editingNote) {
          setFormSubject(editingNote.subject);
          setFormWing(editingNote.ministryName || editingNote.wing || '');
          setFormRemarks(editingNote.remarks || '');
          setFormDeadline(editingNote.deadline || '');
          setFormStatusSteps(getStepsFromNoteStatus(editingNote.status));
          setFormStatusDates(editingNote.statusDates || {});
        } else {
          setFormSubject('');
          setFormWing('');
          setFormRemarks('');
          setFormDeadline('');
          setFormStatusSteps({
            1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No'
          });
          setFormStatusDates({});
        }
      });
    }
  }, [activeSubTab, editingNote]);

  const handleOpenEdit = useCallback((note) => {
    setEditingNote(note);
    setActiveSubTab('add');
  }, [setEditingNote, setActiveSubTab]);

  const handleSaveNote = async (e) => {
    e.preventDefault();
    if (!formWing) {
      triggerNotification('Please select a Ministry.');
      return;
    }

    const minObj = ministries.find(m => m.ministry_name === formWing) || { ministry_id: 1 };

    let selectedStage = 1;
    for (let i = 1; i <= 5; i++) {
      if (formStatusSteps[i] === 'Yes') {
        selectedStage = i;
      }
    }

    const payload = {
      cabinetSubject: formSubject,
      cabinetMinistryName: minObj.ministry_id,
      cabinetMinistryNameText: formWing,
      eofficeFileNumber: 'E-OTHER-MIN',
      deadline: formDeadline || '',
      receivedMinistry: formStatusSteps[1] || 'No',
      receivedMinistryDate: formStatusDates[1] || '',
      sentForComment: formStatusSteps[2] || 'No',
      sentForCommentDate: formStatusDates[2] || '',
      commentsReceived: formStatusSteps[3] || 'No',
      commentsReceivedDate: formStatusDates[3] || '',
      fileSubmitted: formStatusSteps[4] || 'No',
      fileSubmittedDate: formStatusDates[4] || '',
      replyFurnished: formStatusSteps[5] || 'No',
      replyFurnishedDate: formStatusDates[5] || '',
      wings: [], // Empty array for individual wings sent-comments
      shipping: 'No', shippingDate: '',
      vigilance: 'No', vigilanceDate: '',
      ports: 'No', portsDate: '',
      iwt: 'No', iwtDate: '',
      administration: 'No', administrationDate: '',
      coordI: 'No', coordIDate: '',
      coordII: 'No', coordIIDate: '',
      dgll: 'No', dgllDate: '',
      development: 'No', developmentDate: '',
      finance: 'No', financeDate: '',
      sagarmala: 'No', sagarmalaDate: '',
      remarks: formRemarks,
      selectedMinistryNotesStage: selectedStage,
      userID: 1
    };

    try {
      if (editingNote) {
        payload.ministryCabinetID = editingNote.id;
        await axios.put("http://localhost:3000/cabinet-ministry", payload);
      } else {
        await axios.post("http://localhost:3000/cabinet-ministry", payload);
      }
      if (refreshData) refreshData();
      setActiveSubTab('list');
      setEditingNote(null);
      triggerNotification('Cabinet note saved successfully.');
    } catch (err) {
      console.error("Error saving Cabinet note Other Ministry:", err);
      alert("Failed to save Cabinet Note.");
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchWing = selectedWing === 'All' || (n.ministryName || n.wing || '').toLowerCase() === selectedWing.toLowerCase();
      const matchDivision = selectedDivision === 'All' || n.status.toLowerCase().includes(selectedDivision.toLowerCase());
      return matchWing && matchDivision;
    });
  }, [notes, selectedWing, selectedDivision]);

  const totalPages = Math.ceil(filteredNotes.length / entriesLimit) || 1;

  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * entriesLimit;
    return filteredNotes.slice(start, start + entriesLimit);
  }, [filteredNotes, currentPage, entriesLimit]);

  // Apply Quick Search to AG Grid
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('quickFilterText', searchQuery);
    }
  }, [searchQuery]);

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const page = gridRef.current.api.paginationGetCurrentPage() + 1;
      setCurrentPage(page);
    }
  };

  const handleGridWheel = (e) => {
    const container = e.currentTarget;
    if (container) {
      const gridBodyViewport = container.querySelector('.ag-body-viewport');
      if (gridBodyViewport && gridBodyViewport.scrollWidth > gridBodyViewport.clientWidth) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          gridBodyViewport.scrollLeft += e.deltaY;
          const isAtStart = gridBodyViewport.scrollLeft <= 0 && e.deltaY < 0;
          const isAtEnd = gridBodyViewport.scrollLeft + gridBodyViewport.clientWidth >= gridBodyViewport.scrollWidth && e.deltaY > 0;
          if (!isAtStart && !isAtEnd) {
            e.preventDefault();
          }
        }
      }
    }
  };

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1 + (currentPage - 1) * entriesLimit,
      width: 70,
      maxWidth: 80,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-555 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center text-[11px]',
      headerClass: 'text-center border-r border-blue-900/30'
    },
    {
      headerName: 'Name of the Subject',
      field: 'subject',
      minWidth: 320,
      wrapText: true,
      autoHeight: true,
      pinned: 'left',
      cellClass: 'text-slate-900 font-extrabold whitespace-normal leading-relaxed py-2 border-r border-slate-100 flex items-center text-[11px]',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Ministry / Department',
      field: 'ministryName',
      minWidth: 200,
      cellClass: 'text-slate-655 font-bold border-r border-slate-100 flex items-center text-[11px]',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Status',
      field: 'status',
      minWidth: 200,
      cellClass: 'text-slate-655 font-bold border-r border-slate-100 flex items-center text-[11px] text-blue-800',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Update',
      minWidth: 90,
      cellClass: 'text-center flex items-center justify-center text-[11px]',
      cellRenderer: (params) => {
        const note = params.data;
        return (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => handleOpenEdit(note)}
              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
              title="Edit Note Details"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }
  ], [currentPage, entriesLimit, handleOpenEdit]);

  if (isFormOpen) {
    return (
      <div className="space-y-6 animate-fade-in">
        {notification && (
          <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in">
            <div className="p-1 bg-emerald-50 rounded-lg">
              <Check className="h-4.5 w-4.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Notification</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a]">
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                {editingNote ? 'Modify Cabinet Note Record' : 'Add Cabinet Notes-Other Ministry'}
              </h3>
              <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
            </div>
            <button
              onClick={() => { setActiveSubTab('list'); setEditingNote(null); }}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Database</span>
            </button>
          </div>

          <form onSubmit={handleSaveNote} className="p-6 space-y-6">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Name of the subject*
              </label>
              <textarea
                required
                rows={3}
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                placeholder="Enter Name of the subject..."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Ministry / Department*
                </label>
                <div className="relative">
                  <select
                    required
                    value={formWing}
                    onChange={(e) => setFormWing(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-250 rounded-xl appearance-none focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="">--Select Ministry--</option>
                    {WINGS.filter(w => w !== 'All').map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Deadline Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Milestone Stages
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-[11px] font-semibold text-slate-755">
                {Object.entries(STATUS_STEPS).map(([stepKey, stepName]) => {
                  const isYes = formStatusSteps[stepKey] === 'Yes';
                  return (
                    <div
                      key={stepKey}
                      className={`flex flex-col py-2 px-3 rounded-lg border transition-all ${isYes
                        ? 'bg-white border-blue-200 shadow-sm'
                        : 'bg-slate-50/50 border-slate-150'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate max-w-[160px] sm:max-w-[200px]" title={stepName}>
                          {stepKey}. {stepName}
                        </span>

                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFormStatusSteps(prev => {
                                const updated = { ...prev };
                                const stepNum = parseInt(stepKey);
                                for (let i = 1; i <= stepNum; i++) {
                                  updated[i] = 'Yes';
                                }
                                return updated;
                              });
                              setFormStatusDates(prev => {
                                const updated = { ...prev };
                                const stepNum = parseInt(stepKey);
                                const today = new Date().toISOString().split('T')[0];
                                for (let i = 1; i <= stepNum; i++) {
                                  if (!updated[i]) {
                                    updated[i] = today;
                                  }
                                }
                                return updated;
                              });
                            }}
                            className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${isYes
                              ? 'bg-emerald-600 text-white shadow-sm font-black'
                              : 'bg-white border border-slate-250 text-slate-655 hover:bg-slate-100'
                              }`}
                          >
                            Yes
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setFormStatusSteps(prev => {
                                const updated = { ...prev };
                                const stepNum = parseInt(stepKey);
                                for (let i = stepNum; i <= 5; i++) {
                                  updated[i] = 'No';
                                }
                                return updated;
                              });
                              setFormStatusDates(prev => {
                                const updated = { ...prev };
                                const stepNum = parseInt(stepKey);
                                for (let i = stepNum; i <= 5; i++) {
                                  delete updated[i];
                                }
                                return updated;
                              });
                            }}
                            className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${!isYes
                              ? 'bg-rose-600 text-white shadow-sm font-black'
                              : 'bg-white border border-slate-255 text-slate-655 hover:bg-slate-100'
                              }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {isYes && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 mt-1.5 w-full animate-fade-in">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Date:</span>
                          <input
                            type="date"
                            value={formStatusDates[stepKey] || ''}
                            onChange={(e) => setFormStatusDates(prev => ({ ...prev, [stepKey]: e.target.value }))}
                            className="px-2 py-0.5 border border-slate-300 rounded bg-white text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 w-32 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Remarks
              </label>
              <textarea
                rows={3.5}
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Enter remarks..."
                className="w-full flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('list');
                  setEditingNote(null);
                }}
                className="px-4.5 py-2.5 border border-slate-255 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
              >
                {editingNote ? 'Save Changes' : 'Save Note'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-extrabold text-slate-800 font-display">Cabinet Notes Registry (Other Ministry)</h3>
          <p className="text-xs text-slate-500 font-medium">Record registry and tracking system for notes received from external ministries.</p>
        </div>

        <div className="flex items-end gap-3 self-start sm:self-auto">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">Show</span>
            <select
              value={entriesLimit}
              onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold font-semibold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">entries</span>
          </div>
        </div>
      </div>

      {isFiltersExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4.5 bg-slate-50 rounded-xl border border-slate-200/80">
          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ministry</label>
            <select
              value={selectedWing}
              onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer"
            >
              <option value="All">All Ministries</option>
              {WINGS.filter(w => w !== 'All').map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
            <select
              value={selectedDivision}
              onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer"
            >
              <option value="All">All Statuses</option>
              {Object.values(STATUS_STEPS).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search subject..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-8 pr-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1 pt-1.5">
        <span>Showing {filteredNotes.length} entries</span>
      </div>

      <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={filteredNotes}
          columnDefs={colDefs}
          pagination={true}
          paginationPageSize={entriesLimit}
          suppressPaginationPanel={true}
          onPaginationChanged={onPaginationChanged}
          domLayout="autoHeight"
          rowHeight={64}
          headerHeight={48}
          suppressColumnVirtualisation={true}
          autoSizeStrategy={{
            type: 'fitCellContents'
          }}
          onFirstDataRendered={(params) => {
            const allCols = params.api.getAllGridColumns();
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) {
              params.api.sizeColumnsToFit();
            }
          }}
        />

        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
          <span className="text-slate-500 font-medium text-center sm:text-left">
            Showing <span className="font-bold text-slate-800">{filteredNotes.length > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
            <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, filteredNotes.length)}</span> of{' '}
            <span className="font-bold text-slate-800">{filteredNotes.length}</span> entries
          </span>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-660 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
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
                    : 'border border-slate-200 text-slate-650 hover:bg-slate-50'
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
  );
}
