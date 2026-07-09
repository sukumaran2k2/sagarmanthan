import { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowLeft,
  Edit
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';

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
  1: 'Received at Ministry',
  2: 'Submitted for Approval',
  3: 'Comments Sought',
  4: 'Comments Received',
  5: 'Reply Furnished',
  6: 'Disposed'
};

export default function VIPReferenceInput({ vipReferences, setVipReferences, refreshData }) {
  const gridRef = useRef();

  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRef, setEditingRef] = useState(null);

  // Fields
  const [formSubject, setFormSubject] = useState('');
  const [formEofficeFile, setFormEofficeFile] = useState('');
  const [formWing, setFormWing] = useState('Ports');
  const [formDivision, setFormDivision] = useState('PD-III');
  const [formRefNumber, setFormRefNumber] = useState('');
  const [formReceivedFrom, setFormReceivedFrom] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formDeadline, setFormDeadline] = useState('');
  const [formStatusSteps, setFormStatusSteps] = useState({
    1: 'Yes', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No'
  });
  const [formStatusDates, setFormStatusDates] = useState({});

  const WINGS = DB_WINGS.map(w => w.wing_name);
  const DIVISIONS = DB_DIVISIONS.map(d => d.division_name);

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
    setFormSubject('');
    setFormEofficeFile('');
    setFormWing('Ports');
    setFormDivision('PD-III');
    setFormRefNumber('');
    setFormReceivedFrom('');
    setFormRemarks('');
    setFormDeadline('');
    setFormStatusSteps({
      1: 'Yes', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No'
    });
    setFormStatusDates({ 1: new Date().toISOString().split('T')[0] });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (refData) => {
    setEditingRef(refData);
    setFormSubject(refData.subject);
    setFormEofficeFile(refData.eofficeFile);
    setFormWing(refData.wing);
    setFormDivision(refData.division);
    setFormRefNumber(refData.refNumber);
    setFormReceivedFrom(refData.receivedFrom);
    setFormRemarks(refData.remarks || '');
    setFormDeadline(refData.deadline || '');
    setFormStatusSteps({ ...refData.statusSteps });
    setFormStatusDates(refData.statusDates || {});
    setIsFormOpen(true);
  };

  const handleSaveRef = async (e) => {
    e.preventDefault();
    if (
      !formSubject.trim() ||
      !formEofficeFile.trim() ||
      !formWing.trim() ||
      !formDivision.trim() ||
      !formRefNumber.trim() ||
      !formReceivedFrom.trim()
    ) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    // Step 1 Received Date validation
    if (formStatusSteps[1] === 'Yes' && !formStatusDates[1]) {
      alert('Please enter the Date Received for Step 1.');
      return;
    }

    // Word count check for remarks
    const wordCount = formRemarks.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 250) {
      alert('Remarks cannot exceed 250 words.');
      return;
    }

    const wingObj = DB_WINGS.find(w => w.wing_name === formWing) || { wing_id: 1 };
    const divisionObj = DB_DIVISIONS.find(d => d.division_name === formDivision) || { division_id: 1 };
    const wingId = wingObj.wing_id;
    const divisionId = divisionObj.division_id;

    let selectedStage = 1;
    for (let i = 1; i <= 6; i++) {
      if (formStatusSteps[i] === 'Yes') {
        selectedStage = i;
      }
    }

    const payload = {
      vipSubject: formSubject,
      eofficeFileNumber: formEofficeFile,
      wing: wingId,
      division: divisionId,
      referenceLetterNumber: formRefNumber,
      receivedFrom: formReceivedFrom,
      vipReceivedMinistry: formStatusSteps[1] || 'No',
      vipReceivedMinistryDate: formStatusDates[1] || '',
      vipSubmittedForApproval: formStatusSteps[2] || 'No',
      vipSubmittedForApprovalDate: formStatusDates[2] || '',
      vipCommentsSought: formStatusSteps[3] || 'No',
      vipCommentsSoughtDate: formStatusDates[3] || '',
      vipCommentsReceived: formStatusSteps[4] || 'No',
      vipCommentsReceivedDate: formStatusDates[4] || '',
      vipReplyFurnished: formStatusSteps[5] || 'No',
      vipReplyFurnishedDate: formStatusDates[5] || '',
      vipDisposed: formStatusSteps[6] || 'No',
      vipDisposedDate: formStatusDates[6] || '',
      vipRemarks: formRemarks,
      selectedStage: selectedStage,
      deadline: formDeadline || '',
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
      if (refreshData) refreshData();
    } catch (err) {
      console.error("Error saving VIP reference:", err);
      alert("Failed to save VIP reference.");
    }
  };

  // Filtering and Searching
  const filteredData = useMemo(() => {
    let result = [...vipReferences];

    if (selectedWing !== 'All') {
      result = result.filter(p => p.wing.toLowerCase() === selectedWing.toLowerCase());
    }
    if (selectedDivision !== 'All') {
      result = result.filter(p => p.division.toLowerCase() === selectedDivision.toLowerCase());
    }
    if (selectedStatus !== 'All') {
      result = result.filter(p => getRefStatusText(p.statusSteps).toLowerCase() === selectedStatus.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.subject.toLowerCase().includes(q) ||
        p.refNumber.toLowerCase().includes(q) ||
        p.receivedFrom.toLowerCase().includes(q) ||
        p.wing.toLowerCase().includes(q) ||
        p.division.toLowerCase().includes(q)
      );
    }

    return result;
  }, [vipReferences, selectedWing, selectedDivision, selectedStatus, searchQuery]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / entriesLimit);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * entriesLimit;
    return filteredData.slice(start, start + entriesLimit);
  }, [filteredData, currentPage, entriesLimit]);

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

  const handleStepCheckboxChange = (stepNum, checked) => {
    setFormStatusSteps(prev => {
      const updated = { ...prev };
      if (checked) {
        // Checking a step should check all prior steps
        for (let i = 1; i <= stepNum; i++) {
          updated[i] = 'Yes';
        }
      } else {
        // Unchecking a step should uncheck all subsequent steps
        for (let i = stepNum; i <= 6; i++) {
          updated[i] = 'No';
        }
      }
      return updated;
    });

    setFormStatusDates(prev => {
      const updated = { ...prev };
      if (checked) {
        // Fill dates for checked steps if they do not exist
        const today = new Date().toISOString().split('T')[0];
        for (let i = 1; i <= stepNum; i++) {
          if (!updated[i]) {
            updated[i] = today;
          }
        }
      } else {
        // Clear dates for unchecked steps
        for (let i = stepNum; i <= 6; i++) {
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

  return (
    <div className="space-y-6">
      {isFormOpen ? (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Plus className="h-5 w-5 text-blue-800" />
              {editingRef ? 'Update VIP Reference Letter' : 'Register New VIP Letter'}
            </h2>
            <button
              onClick={() => setIsFormOpen(false)}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSaveRef} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Subject of VIP Reference *</label>
                <textarea
                  value={formSubject}
                  onChange={(e) => setFormSubject(e.target.value)}
                  placeholder="Details of the letter..."
                  required
                  rows={2}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-800 placeholder-slate-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">E-Office File Number *</label>
                <input
                  type="text"
                  value={formEofficeFile}
                  onChange={(e) => setFormEofficeFile(e.target.value)}
                  placeholder="e.g. E-100244"
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Wing *</label>
                <select
                  value={formWing}
                  onChange={(e) => setFormWing(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                >
                  {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Division *</label>
                <select
                  value={formDivision}
                  onChange={(e) => setFormDivision(e.target.value)}
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                >
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Reference Letter Number *</label>
                <input
                  type="text"
                  value={formRefNumber}
                  onChange={(e) => setFormRefNumber(e.target.value)}
                  placeholder="e.g. 647/25"
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Received From (Sender) *</label>
                <input
                  type="text"
                  value={formReceivedFrom}
                  onChange={(e) => setFormReceivedFrom(e.target.value)}
                  placeholder="e.g. Shri Ajay Kumar Mandal, MP"
                  required
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-800"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Remarks</label>
                <textarea
                  value={formRemarks}
                  onChange={(e) => setFormRemarks(e.target.value)}
                  placeholder="Max 250 words"
                  rows={2}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-medium text-slate-800"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Deadline</label>
                <div className="relative">
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  />
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="space-y-3.5">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                Processing Milestone Stages & Action Dates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((stepNum) => {
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
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-250 rounded-lg focus:outline-none focus:border-blue-500 font-semibold text-slate-700"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-850 transition cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
              >
                Save Reference
              </button>
            </div>
          </form>
        </div>
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
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-inner">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Wing</label>
                <select
                  value={selectedWing}
                  onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                >
                  <option value="All">All Wings</option>
                  {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Division</label>
                <select
                  value={selectedDivision}
                  onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                >
                  <option value="All">All Divisions</option>
                  {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                >
                  <option value="All">All Statuses</option>
                  {Object.values(STATUS_STEPS).map(status => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>
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
              rowData={filteredData}
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
