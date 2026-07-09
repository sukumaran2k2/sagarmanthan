import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Search,
  Copy,
  FileText,
  Download,
  Edit,
  Folder,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  UploadCloud,
  ArrowLeft,
  X
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';

// Register grid modules
ModuleRegistry.registerModules([AllCommunityModule]);

const DB_WINGS = [
  { wing_id: 1, wing_name: "Shipping" },
  { wing_id: 2, wing_name: "Vigilance" },
  { wing_id: 3, wing_name: "Ports" },
  { wing_id: 4, wing_name: "IWT" },
  { wing_id: 5, wing_name: "Administration" },
  { wing_id: 6, wing_name: "Coord-I" },
  { wing_id: 7, wing_name: "Coord-II" },
  { wing_id: 8, wing_name: "DGLL, Parliament & TRW" },
  { wing_id: 9, wing_name: "Development" },
  { wing_id: 10, wing_name: "Finance" },
  { wing_id: 11, wing_name: "Sagarmala" },
  { wing_id: 12, wing_name: "Information Technology" },
  { wing_id: 13, wing_name: "Office of Economic Advisor" },
  { wing_id: 14, wing_name: "Special Initiatives & Projects" }
];

const DB_DIVISIONS = [
  { division_id: 1, division_name: "Shipping-I" },
  { division_id: 2, division_name: "Shipping-II" },
  { division_id: 3, division_name: "Shipping-III" },
  { division_id: 4, division_name: "Vigilance" },
  { division_id: 5, division_name: "PD-I" },
  { division_id: 6, division_name: "PD-II" },
  { division_id: 7, division_name: "PPP" },
  { division_id: 8, division_name: "PHRD" },
  { division_id: 9, division_name: "IWT-I" },
  { division_id: 10, division_name: "IWT-II" },
  { division_id: 11, division_name: "Admn." },
  { division_id: 12, division_name: "Coord-I" },
  { division_id: 13, division_name: "Coord-II" },
  { division_id: 14, division_name: "DGLL, Parl. & TRW" },
  { division_id: 15, division_name: "Devlopment" },
  { division_id: 16, division_name: "Finance" },
  { division_id: 17, division_name: "Sagarmala -I" },
  { division_id: 18, division_name: "Sagarmala -II" },
  { division_id: 19, division_name: "Sagarmala-III , ALHW & Media" },
  { division_id: 20, division_name: "IT" },
  { division_id: 21, division_name: "PD-III" },
  { division_id: 22, division_name: "PD- IV" },
  { division_id: 23, division_name: "Special Initiatives & Projects" }
];

const STATUS_STEPS = {
  1: 'Preliminary DCN Prepared',
  2: 'Preliminary DCN Approved by Minister',
  3: 'Circulated for IMC',
  4: 'IMC Comments Received',
  5: 'Final DCN to be Prepared',
  6: 'Final DCN Approved by Minister',
  7: 'DCN Approved',
  8: 'Advance Copy Sent to PMO & Cab',
  9: 'Approved by Cabinet',
  10: 'On Hold',
  11: 'Completed'
};

const DIVISIONS = ['All', ...DB_DIVISIONS.map(d => d.division_name)];
const STATUSES = ['All', ...Object.values(STATUS_STEPS)];

export default function CabinetNotesInput({
  notes,
  setNotes,
  activeSubTab,
  setActiveSubTab,
  editingNote,
  setEditingNote,
  refreshData
}) {
  const gridRef = useRef();
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [notification, setNotification] = useState(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

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

  const WINGS = DB_WINGS.map(w => w.wing_name);
  const DIVISIONS = DB_DIVISIONS.map(d => d.division_name);

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const isFormOpen = activeSubTab === 'add';

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

  useEffect(() => {
    if (activeSubTab === 'add') {
      Promise.resolve().then(() => {
        if (editingNote) {
          setFormSubject(editingNote.subject);
          setFormWing(editingNote.wing);
          setFormDivision(editingNote.division);
          setFormRemarks(editingNote.remarks || '');
          setFormFile(editingNote.fileName ? { name: editingNote.fileName } : null);
          setFormStatusSteps(getStepsFromNoteStatus(editingNote.status));
          setFormStatusDates(editingNote.statusDates || {});
        } else {
          setFormSubject('');
          setFormWing('');
          setFormDivision('');
          setFormRemarks('');
          setFormFile(null);
          setFormStatusSteps({
            1: 'No', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No', 8: 'No', 9: 'No', 10: 'No', 11: 'No'
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
      triggerNotification('Please select a Wing.');
      return;
    }
    if (!formDivision) {
      triggerNotification('Please select a Division.');
      return;
    }

    const wingObj = DB_WINGS.find(w => w.wing_name === formWing) || { wing_id: 1 };
    const divisionObj = DB_DIVISIONS.find(d => d.division_name === formDivision) || { division_id: 1 };
    const wingId = wingObj.wing_id;
    const divisionId = divisionObj.division_id;

    let selectedCabinetNotesStage = 1;
    for (let i = 1; i <= 11; i++) {
      if (formStatusSteps[i] === 'Yes') {
        selectedCabinetNotesStage = i;
      }
    }

    const payload = {
      subject: formSubject,
      wing: wingId,
      division: divisionId,
      preliDcnPrepared: formStatusSteps[1] || 'No',
      preliDcnPreparedDate: formStatusDates[1] || '',
      preliDcnApproved: formStatusSteps[2] || 'No',
      preliDcnApprovedDate: formStatusDates[2] || '',
      circulatedForImc: formStatusSteps[3] || 'No',
      circulatedForImcDate: formStatusDates[3] || '',
      imcCommentsRec: formStatusSteps[4] || 'No',
      imcCommentsRecDate: formStatusDates[4] || '',
      finalDcnPrepared: formStatusSteps[5] || 'No',
      finalDcnPreparedDate: formStatusDates[5] || '',
      finalDcnApproved: formStatusSteps[6] || 'No',
      finalDcnApprovedDate: formStatusDates[6] || '',
      dcmbeemApproved: formStatusSteps[7] || 'No',
      dcmbeemApprovedDate: formStatusDates[7] || '',
      advanceCopySentToPmo: formStatusSteps[8] || 'No',
      advanceCopySentToPmoDate: formStatusDates[8] || '',
      cabinetApproved: formStatusSteps[9] || 'No',
      cabinetApprovedDate: formStatusDates[9] || '',
      onHold: formStatusSteps[10] || 'No',
      onHoldDate: formStatusDates[10] || '',
      completed: formStatusSteps[11] || 'No',
      completedDate: formStatusDates[11] || '',
      remarks: formRemarks,
      selectedCabinetNotesStage: selectedCabinetNotesStage,
      userID: 1
    };

    try {
      if (editingNote) {
        payload.mopswCabinetID = editingNote.id;
        await axios.put("http://localhost:3000/cabinet-mopsw", payload);
      } else {
        await axios.post("http://localhost:3000/cabinet-mopsw", payload);
      }
      if (refreshData) refreshData();
      setActiveSubTab('list');
      setEditingNote(null);
      triggerNotification('Cabinet note saved successfully.');
    } catch (err) {
      console.error("Error saving Cabinet note MoPSW:", err);
      alert("Failed to save Cabinet Note.");
    }
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
      setFormFile(file);
      triggerNotification(`File "${file.name}" uploaded successfully.`);
    }
  };

  // Checklist multi-stage handlers
  const handleStepCheckboxChange = (stepNum, checked) => {
    setFormStatusSteps(prev => {
      const updated = { ...prev };
      if (checked) {
        // Checking a step checks all prior steps
        for (let i = 1; i <= stepNum; i++) {
          updated[i] = 'Yes';
        }
      } else {
        // Unchecking a step unchecks all subsequent steps
        for (let i = stepNum; i <= 11; i++) {
          updated[i] = 'No';
        }
      }
      return updated;
    });

    setFormStatusDates(prev => {
      const updated = { ...prev };
      if (checked) {
        const today = new Date().toISOString().split('T')[0];
        for (let i = 1; i <= stepNum; i++) {
          if (!updated[i]) {
            updated[i] = today;
          }
        }
      } else {
        for (let i = stepNum; i <= 11; i++) {
          delete updated[i];
        }
      }
      return updated;
    });
  };

  const handleDateChangeForStep = (stepNum, dateVal) => {
    setFormStatusDates(prev => ({
      ...prev,
      [stepNum]: dateVal
    }));
  };

  // Filter notes registry
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    if (selectedWing !== 'All') {
      result = result.filter(n => n.wing.toLowerCase() === selectedWing.toLowerCase());
    }
    if (selectedDivision !== 'All') {
      result = result.filter(n => n.division.toLowerCase() === selectedDivision.toLowerCase());
    }
    if (selectedStatus !== 'All') {
      result = result.filter(n => n.status.toLowerCase() === selectedStatus.toLowerCase());
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.subject.toLowerCase().includes(query) ||
        n.wing.toLowerCase().includes(query) ||
        n.division.toLowerCase().includes(query)
      );
    }

    return result;
  }, [notes, selectedWing, selectedDivision, selectedStatus, searchQuery]);

  const totalPages = Math.ceil(filteredNotes.length / entriesLimit) || 1;


  const paginatedNotes = useMemo(() => {
    const start = (currentPage - 1) * entriesLimit;
    return filteredNotes.slice(start, start + entriesLimit);
  }, [filteredNotes, currentPage, entriesLimit]);

  const totalEntries = filteredNotes.length;

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

  const handleGridWheel = (e) => {
    if (gridRef.current && gridRef.current.api) {
      const scrollAmount = e.deltaY;
      const gridBody = gridRef.current.api.getGridBodyViewportElement?.() || gridRef.current.api.getGridBodyElement?.();
      if (gridBody) {
        gridBody.scrollLeft += scrollAmount;
      }
    }
  };

  const colDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: (params) => params.node.rowIndex + 1 + (currentPage - 1) * entriesLimit,
      width: 75,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-slate-100 bg-slate-50/20 flex items-center justify-center'
    },
    {
      headerName: 'Subject',
      field: 'subject',
      width: 320,
      pinned: 'left',
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-700 flex items-center py-3 border-r border-slate-100 font-semibold whitespace-normal'
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
      minWidth: 130,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'Status',
      field: 'status',
      minWidth: 220,
      cellClass: 'text-center border-r border-slate-100 flex items-center justify-center font-bold text-blue-800'
    },
    {
      headerName: 'Remarks',
      field: 'remarks',
      minWidth: 240,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-500 flex items-center py-3 border-r border-slate-100 whitespace-normal',
      valueFormatter: (params) => params.value || '--'
    },
    {
      headerName: 'Document (PDF)',
      field: 'fileName',
      minWidth: 180,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100',
      cellRenderer: (params) => {
        if (!params.value) return <span className="text-slate-400 font-bold text-[10px]">No File</span>;
        return (
          <button className="inline-flex items-center space-x-1 text-blue-700 hover:text-blue-900 font-bold hover:underline cursor-pointer">
            <Download className="h-3.5 w-3.5" />
            <span className="truncate max-w-[120px] text-xs">{params.value}</span>
          </button>
        );
      }
    },
    {
      headerName: 'Update',
      field: 'id',
      width: 100,
      pinned: 'right',
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => handleOpenEdit(params.data)}
          className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow-sm hover:shadow transition cursor-pointer"
          title="Edit and update milestones"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )
    }
  ], [currentPage, entriesLimit, handleOpenEdit]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] bg-slate-900/95 backdrop-blur text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-2 border border-white/10 animate-fade-in font-semibold text-xs">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {isFormOpen ? (
        /* Form view */
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {editingNote ? 'Modify Cabinet Note' : 'Register New Cabinet Note'}
            </h2>
            <button
              onClick={() => {
                setActiveSubTab('list');
                setEditingNote(null);
              }}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveNote} className="space-y-6 text-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subject Title*</label>
                <input
                  type="text"
                  required
                  placeholder="Enter Cabinet Note subject..."
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Upload Cabinet Note (PDF)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-[38px] border border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition duration-150">
                    <div className="flex items-center space-x-2">
                      <UploadCloud className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600 truncate max-w-[150px]">
                        {formFile ? formFile.name : 'Select PDF File'}
                      </span>
                    </div>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Wing*</label>
                <select
                  value={formWing}
                  onChange={(e) => setFormWing(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="">--Select Wing--</option>
                  {WINGS.filter(w => w !== 'All').map(w => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Division*</label>
                <select
                  value={formDivision}
                  onChange={(e) => setFormDivision(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="">--Select Division--</option>
                  {DIVISIONS.filter(d => d !== 'All').map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Comments Summary</label>
              <textarea
                placeholder="Enter remarks..."
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                rows={3}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold"
              />
            </div>

            {/* Checklist Multi-step flow */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                Processing Milestone Stages & Action Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((stepNum) => {
                  const stepLabel = STATUS_STEPS[stepNum];
                  const isChecked = formStatusSteps[stepNum] === 'Yes';
                  return (
                    <div
                      key={stepNum}
                      className={`p-3.5 rounded-2xl border transition-all ${isChecked ? 'bg-white border-blue-200 shadow-sm' : 'bg-slate-50 border-slate-200'
                        }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => handleStepCheckboxChange(stepNum, e.target.checked)}
                            className="rounded border-slate-350 text-blue-800 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                          />
                          <span>{stepNum}. {stepLabel}</span>
                        </label>
                      </div>

                      {isChecked && (
                        <div className="space-y-1 pl-6">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date of Action</label>
                          <input
                            type="date"
                            value={formStatusDates[stepNum] || ''}
                            onChange={(e) => handleDateChangeForStep(stepNum, e.target.value)}
                            required={isChecked}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-slate-700"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('list');
                  setEditingNote(null);
                }}
                className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
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
      ) : (
        /* List view */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 font-display">Cabinet Notes Registry (MoPSW)</h3>
              <p className="text-xs text-slate-500 font-medium">Record registry and tracking system for drafted, circulated, and cabinet-approved notes.</p>
            </div>

            <div className="flex items-end gap-3 self-start sm:self-auto">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 whitespace-nowrap font-semibold">Show</span>
                <select
                  value={entriesLimit}
                  onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); setCurrentPage(1); }}
                  className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
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

          {/* Filters row panel */}
          {isFiltersExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Wing</label>
                <select
                  value={selectedWing}
                  onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="All">All Wings</option>
                  {WINGS.filter(w => w !== 'All').map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Division</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="All">All Divisions</option>
                  {DIVISIONS.filter(d => d !== 'All').map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-705 cursor-pointer"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
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

          {/* Table search filter bar */}
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 px-1 pt-1.5">
            <span>Showing {filteredNotes.length} entries</span>
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
                const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
                if (containerWidth > 0 && totalColWidth < containerWidth) {
                  params.api.sizeColumnsToFit();
                }
              }}
            />

            {/* Custom Pagination Footer */}
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
      )}
    </div>
  );
}
