import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
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
  GitBranch,
  CheckCircle2,
  UploadCloud,
  ArrowLeft
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';


// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const WINGS = ['All', 'Ministry of Finance', 'Ministry of Culture', 'Ministry of Commerce and Industry', 'Ministry of Mines', 'Ministry of Housing and Urban Affairs', 'Ministry of Labour and Employment', 'Ministry of Defence', 'Ministry of Road Transport and Highways', 'Ministry of Communications', 'Ministry of Micro, Small and Medium Enterprises', 'Ministry of Environment, Forest and Climate Change', 'Ministry of Fisheries, Animal Husbandry and Dairying', 'Ministry of Skill Development and Entrepreneurship', 'Ministry of Steel', 'Ministry of Earth Sciences'];
const DIVISIONS = ['All', 'Comments Received', 'Reply Furnished'];


const STATUS_STEPS = {
  1: 'Preliminary DCN Prepared',
  2: 'Preliminary DCN Approved by Minister',
  3: 'Circulated for IMC',
  4: 'IMC Comments Received',
  5: 'Final DCN to be Prepared',
  6: 'Final DCN Approved by Minister',
  7: 'DCN Approved', // Has Dcm been approved?
  8: 'Advance Copy Sent to PMO & Cab',
  9: 'Approved by Cabinet',
  10: 'On Hold',
  11: 'Completed'
};

export default function CabinetNotesInput({ notes, setNotes }) {
  const gridRef = useRef();
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notification, setNotification] = useState(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isDatabaseExpanded, setIsDatabaseExpanded] = useState(false);

  // Form View State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  
  // Fields required by MoPSW
  const [formSubject, setFormSubject] = useState('');
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [formStatusSteps, setFormStatusSteps] = useState({
    1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No', 8: 'No', 9: 'No', 10: 'No', 11: 'No'
  });
  const [formStatusDates, setFormStatusDates] = useState({});

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const getNoteStatusFromSteps = (steps) => {
    let currentStatus = 'Draft';
    for (let i = 1; i <= 11; i++) {
      if (steps[i] === 'Yes') {
        currentStatus = STATUS_STEPS[i];
      }
    }
    return currentStatus;
  };

  const getStepsFromNoteStatus = (status) => {
    const steps = { 1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No', 8: 'No', 9: 'No', 10: 'No', 11: 'No' };
    let foundMatch = false;
    for (let i = 11; i >= 1; i--) {
      if (status === STATUS_STEPS[i] || foundMatch) {
        steps[i] = 'Yes';
        foundMatch = true;
      }
    }
    return steps;
  };

  const handleOpenAdd = () => {
    setEditingNote(null);
    setFormSubject('');
    setFormWing('');
    setFormDivision('');
    setFormRemarks('');
    setFormFile(null);
    setFormStatusSteps({
      1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No', 8: 'No', 9: 'No', 10: 'No', 11: 'No'
    });
    setFormStatusDates({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = useCallback((note) => {
    setEditingNote(note);
    setFormSubject(note.subject);
    setFormWing(note.wing);
    setFormDivision(note.division);
    setFormRemarks(note.remarks || '');
    setFormFile(note.fileName ? { name: note.fileName } : null);
    setFormStatusSteps(getStepsFromNoteStatus(note.status));
    setFormStatusDates(note.statusDates || {});
    setIsFormOpen(true);
  }, []);

  const handleSaveNote = (e) => {
    e.preventDefault();
    if (!formWing) {
      triggerNotification('Please select a Wing.');
      return;
    }
    if (!formDivision) {
      triggerNotification('Please select a Division.');
      return;
    }

    const calculatedStatus = getNoteStatusFromSteps(formStatusSteps);

    if (editingNote) {
      // Edit note
      setNotes(prev => prev.map(n => n.id === editingNote.id ? {
        ...n,
        subject: formSubject,
        wing: formWing,
        division: formDivision,
        remarks: formRemarks,
        status: calculatedStatus,
        statusDates: formStatusDates,
        fileName: formFile ? formFile.name : null
      } : n));
      triggerNotification('Cabinet note updated successfully.');
    } else {
      // Add note
      const newNote = {
        id: Date.now(),
        subject: formSubject,
        wing: formWing,
        division: formDivision,
        remarks: formRemarks,
        status: calculatedStatus,
        statusDates: formStatusDates,
        fileName: formFile ? formFile.name : null
      };
      setNotes(prev => [newNote, ...prev]);
      triggerNotification('Cabinet note registered successfully.');
    }
    setIsFormOpen(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        triggerNotification('Only PDF files are supported.');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        triggerNotification('File size exceeds the 20 MB limit.');
        return;
      }
      setFormFile({ name: file.name, size: file.size });
      triggerNotification(`File "${file.name}" selected.`);
    }
  };

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchWing = selectedWing === 'All' || n.wing === selectedWing;
      const matchDivision = selectedDivision === 'All' || n.status === selectedDivision;
      return matchWing && matchDivision;
    });
  }, [notes, selectedWing, selectedDivision]);

  // Apply Quick Search to AG Grid
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('quickFilterText', searchQuery);
    }
  }, [searchQuery]);

  // Sync entriesLimit with AG Grid Pagination Page Size
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('paginationPageSize', entriesLimit);
    }
  }, [entriesLimit]);

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
    }
  };

  // Handle AG Grid page change labels
  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const page = gridRef.current.api.paginationGetCurrentPage() + 1;
      const total = gridRef.current.api.paginationGetTotalPages();
      setCurrentPage(page);
      setTotalPages(total || 1);
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
      valueGetter: 'node.rowIndex + 1',
      width: 70,
      maxWidth: 80,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-550 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center text-[11px]',
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
      headerName: 'Wing/Ministry',
      field: 'wing',
      minWidth: 200,
      cellClass: 'text-slate-600 font-bold border-r border-slate-100 flex items-center text-[11px]',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Status',
      field: 'status',
      minWidth: 160,
      cellClass: 'text-slate-655 font-bold border-r border-slate-100 flex items-center text-[11px]',
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

  ], [handleOpenEdit]);

  // If Form Page is open, render the Form Page directly
  if (isFormOpen) {
    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* Toast Notification */}
        {notification && (
          <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in animate-pulse">
            <div className="p-1 bg-emerald-50 rounded-lg">
              <Check className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold leading-tight">Notification</p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
            </div>
          </div>
        )}

        {/* Form Page Header Card wrapper */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a]">
          
          {/* Header Title Bar */}
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                {editingNote ? 'Modify Cabinet Note Record' : 'Add Cabinet Notes-Other Ministry'}
              </h3>
              <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
            </div>
            <button 
              onClick={() => setIsFormOpen(false)} 
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Database</span>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleSaveNote} className="p-6 space-y-6">
            
            {/* Subject */}
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
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 transition-all font-semibold text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Wing & Division Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Wing */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Wing*
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formWing}
                    onChange={(e) => setFormWing(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-250 rounded-xl appearance-none focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="">--Select Wing--</option>
                    {WINGS.filter(w => w !== 'All').map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              {/* Division */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Division*
                </label>
                <div className="relative">
                  <select 
                    required
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-250 rounded-xl appearance-none focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  >
                    <option value="">--Select Division--</option>
                    {DIVISIONS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Status Checklist Yes/No */}
            <div className="space-y-3">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3 text-[11px] font-semibold text-slate-755">
                {Object.entries(STATUS_STEPS).map(([stepKey, stepName]) => {
                  const isYes = formStatusSteps[stepKey] === 'Yes';
                  return (
                    <div 
                      key={stepKey} 
                      className={`flex flex-col py-2 px-3 rounded-lg border transition-all ${
                        isYes 
                          ? 'bg-slate-50 border-emerald-200 shadow-sm' 
                          : 'bg-slate-50/50 border-slate-150'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="truncate max-w-[160px] sm:max-w-[200px]" title={stepName}>
                          {stepKey === '7' ? '7. Has Dcm been approved?' : `${stepKey}. ${stepName}`}
                        </span>
                        
                        <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                          {/* Yes Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setFormStatusSteps(prev => ({ ...prev, [stepKey]: 'Yes' }));
                              if (!formStatusDates[stepKey]) {
                                const today = new Date().toISOString().split('T')[0];
                                setFormStatusDates(prev => ({ ...prev, [stepKey]: today }));
                              }
                            }}
                            className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${
                              isYes 
                                ? 'bg-emerald-600 text-white shadow-sm font-black' 
                                : 'bg-white border border-slate-250 text-slate-655 hover:bg-slate-100'
                            }`}
                          >
                            Yes
                          </button>
                          
                          {/* No Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setFormStatusSteps(prev => ({ ...prev, [stepKey]: 'No' }));
                              setFormStatusDates(prev => {
                                const copy = { ...prev };
                                delete copy[stepKey];
                                return copy;
                              });
                            }}
                            className={`px-3 py-1 rounded font-black transition-all text-[10px] cursor-pointer ${
                              !isYes 
                                ? 'bg-rose-600 text-white shadow-sm font-black' 
                                : 'bg-white border border-slate-255 text-slate-655 hover:bg-slate-100'
                            }`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {/* Completion Date Field (Visible only when Yes is selected) */}
                      {isYes && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 mt-1.5 w-full animate-fade-in">
                          <span className="text-[9px] text-slate-500 font-bold uppercase">Date:</span>
                          <input 
                            type="date"
                            value={formStatusDates[stepKey] || ''}
                            onChange={(e) => setFormStatusDates(prev => ({ ...prev, [stepKey]: e.target.value }))}
                            className="px-2 py-0.5 border border-slate-300 rounded bg-white text-[10px] focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700 w-32"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Remarks & Upload Document Row */}
            <div className="grid grid-cols-1 md:grid-cols-10 gap-6">
              
              {/* Remarks (70%) */}
              <div className="md:col-span-7 space-y-1.5 flex flex-col">
                <div className="flex justify-between items-center">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Remarks (Max length of words should not exceed 250)
                  </label>
                  <span className="text-[10px] text-slate-400 font-bold">
                    {formRemarks ? formRemarks.split(/\s+/).filter(Boolean).length : 0} / 250 words
                  </span>
                </div>
                <textarea 
                  rows={3.5}
                  value={formRemarks}
                  onChange={(e) => {
                    const words = e.target.value.split(/\s+/).filter(Boolean);
                    if (words.length <= 250) {
                      setFormRemarks(e.target.value);
                    }
                  }}
                  placeholder="Enter remarks..."
                  className="w-full flex-1 text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50 transition-all font-semibold text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Upload Document (30%) */}
              <div className="md:col-span-3 space-y-1.5 flex flex-col">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Upload Document
                </label>
                <div className="border-2 border-dashed border-slate-250 rounded-xl p-3 bg-slate-50/50 flex flex-col items-center justify-center space-y-1 hover:bg-slate-50 hover:border-blue-400 transition cursor-pointer relative flex-1 min-h-[92px]">
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-700 truncate max-w-[180px]">
                      {formFile ? `Selected: ${formFile.name}` : 'Upload file or Drag & Drop'}
                    </p>
                    <p className="text-[8px] text-slate-450 font-bold mt-0.5">
                      PDF only. Max. 20 MB.
                    </p>
                  </div>
                </div>
              </div>

            </div>

            {/* Form Actions Footer */}
            <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsFormOpen(false)}
                className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
              >
                Discard
              </button>
              <button 
                type="submit"
                className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
              >
                Submit
              </button>
            </div>

          </form>

        </div>
      </div>
    );
  }

  // Render main Database List View
  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in animate-pulse">
          <div className="p-1 bg-emerald-50 rounded-lg">
            <Check className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold leading-tight">Notification</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{notification}</p>
          </div>
        </div>
      )}

      {/* Header Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Cabinet Notes database & input register
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          {isDatabaseExpanded ? (
            <>
              <button 
                onClick={() => triggerNotification('All Data Export initiated.')}
                className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold hover:bg-emerald-100/50 transition cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>All Data</span>
              </button>

              <button 
                onClick={handleOpenAdd}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-105 text-black border border-white font-bold text-xs rounded-lg transition-all duration-200 cursor-pointer hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-md font-sans"
              >
                <Plus className="h-4 w-4 text-emerald-800 hover:text-white" />
                <span>Add Notes</span>
              </button>

              <button 
                onClick={() => setIsDatabaseExpanded(false)}
                className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg border border-slate-255 shadow-sm transition cursor-pointer"
              >
                <span>Collapse</span>
                <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsDatabaseExpanded(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer"
            >
              <span>View Detailed Report</span>
            </button>
          )}
        </div>
      </div>

      {isDatabaseExpanded ? (
        <>
          {/* Collapsible Filters Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <button 
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="w-full flex items-center justify-between text-left transition cursor-pointer select-none"
            >
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 font-display">Cabinet Notes Filters</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
                {isFiltersExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </div>
            </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Name Of The Ministry</label>
                  <select 
                     value={selectedWing} 
                     onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
                     className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  >
                     {WINGS.map(w => <option key={w} value={w}>{w === 'All' ? 'Show all' : w}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select 
                     value={selectedDivision} 
                     onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
                     className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  >
                     {DIVISIONS.map(d => <option key={d} value={d}>{d === 'All' ? 'Show all' : d}</option>)}
                  </select>
                </div>
              </div>
          </div>

          {/* Table Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            
            {/* Table Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-1.5">
                <button onClick={() => triggerNotification('Copied to clipboard.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"><Copy className="h-3.5 w-3.5" /> Copy</button>
                <button onClick={() => triggerNotification('Excel export initiated.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-600 flex items-center gap-1.5 cursor-pointer"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
                <button onClick={() => triggerNotification('PDF export initiated.')} className="px-3 py-1.5 hover:bg-slate-100 rounded text-xs font-bold text-slate-655 flex items-center gap-1.5 cursor-pointer"><FileText className="h-3.5 w-3.5" /> PDF</button>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">Show</span>
                  <select 
                    value={entriesLimit} 
                    onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); }}
                    className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                  </select>
                  <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">entries</span>
                </div>

                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold w-56 text-slate-750"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Main Responsive Table */}
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
                  const containerWidth = params.api.getGridBodyElement()?.clientWidth || 0;
                  if (containerWidth > 0 && totalColWidth < containerWidth) {
                    params.api.sizeColumnsToFit();
                  }
                }}
              />

              {/* Custom Pagination Footer */}
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
                        className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                          currentPage === p
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
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </>
      ) : (
        /* KPI Insights Grid (Visible only when Database table is collapsed) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in pt-4 border-t border-slate-100">

          {/* 2. Ministry-wise KPI */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 shadow-inner">
            <div className="flex items-center space-x-2 text-rose-600 font-bold">
              <GitBranch className="h-4.5 w-4.5 text-rose-600" />
              <span className="text-[11px] uppercase tracking-wider font-display text-slate-700">Ministry Wise Counts</span>
            </div>
            <div className="divide-y divide-slate-150 font-semibold text-xs text-slate-700 max-h-[220px] overflow-y-auto pr-1">
              {Object.entries(
                notes.reduce((acc, n) => {
                  acc[n.wing] = (acc[n.wing] || 0) + 1;
                  return acc;
                }, {})
              ).sort((a, b) => b[1] - a[1]).map(([ministry, count]) => (
                <div key={ministry} className="flex justify-between py-2 items-center">
                  <span className="truncate max-w-[200px]" title={ministry}>{ministry}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-extrabold">{count} notes</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Topic-wise KPI */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 shadow-inner">
            <div className="flex items-center space-x-2 text-emerald-600 font-bold">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              <span className="text-[11px] uppercase tracking-wider font-display text-slate-700">Topic Wise Distribution</span>
            </div>
            <div className="divide-y divide-slate-150 font-semibold text-xs text-slate-700 max-h-[220px] overflow-y-auto pr-1">
              {(() => {
                const topics = {
                  'Amendments & Bills': 0,
                  'Policies & Guidelines': 0,
                  'Infrastructure & Development': 0,
                  'Other Matters': 0
                };
                notes.forEach(n => {
                  const sub = n.subject.toLowerCase();
                  if (sub.includes('amendment') || sub.includes('bill') || sub.includes('act')) {
                    topics['Amendments & Bills']++;
                  } else if (sub.includes('policy') || sub.includes('guidelines')) {
                    topics['Policies & Guidelines']++;
                  } else if (sub.includes('development') || sub.includes('infrastructure') || sub.includes('project')) {
                    topics['Infrastructure & Development']++;
                  } else {
                    topics['Other Matters']++;
                  }
                });
                return Object.entries(topics)
                  .sort((a, b) => b[1] - a[1])
                  .map(([topic, count]) => (
                    <div key={topic} className="flex justify-between py-2 items-center">
                      <span>{topic}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                        topic.includes('Amendments') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                        topic.includes('Policies') ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                        topic.includes('Infrastructure') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {count} notes
                      </span>
                    </div>
                  ));
              })()}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
