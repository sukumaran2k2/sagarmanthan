import { useState, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Copy, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  CheckCircle2,
  ArrowLeft,
  Check,
  Edit
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import { WINGS, DIVISIONS, CATEGORIES, STATUS_STEPS } from './constants';

ModuleRegistry.registerModules([AllCommunityModule]);

export default function AuditParaInput({ auditParas, setAuditParas }) {
  const gridRef = useRef();
  
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);

  // Form View State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPara, setEditingPara] = useState(null);

  // Form Fields
  const [formNumber, setFormNumber] = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formWing, setFormWing] = useState('Ports');
  const [formDivision, setFormDivision] = useState('PD-III');
  const [formCategory, setFormCategory] = useState('Audit Para');
  const [formRemarks, setFormRemarks] = useState('');
  const [formStatusSteps, setFormStatusSteps] = useState({
    1: 'Yes', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No'
  });
  const [formStatusDates, setFormStatusDates] = useState({});

  const getParaStatusText = (steps) => {
    let currentStatus = 'Draft';
    for (let i = 1; i <= 7; i++) {
      if (steps[i] === 'Yes') {
        currentStatus = STATUS_STEPS[i];
      }
    }
    return currentStatus;
  };

  const handleOpenAdd = () => {
    setEditingPara(null);
    setFormNumber('');
    setFormSubject('');
    setFormWing('Ports');
    setFormDivision('PD-III');
    setFormCategory('Audit Para');
    setFormRemarks('');
    setFormStatusSteps({
      1: 'Yes', 2: 'No', 3: 'No', 4: 'No', 5: 'No', 6: 'No', 7: 'No'
    });
    setFormStatusDates({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (para) => {
    setEditingPara(para);
    setFormNumber(para.number);
    setFormSubject(para.subject);
    setFormWing(para.wing);
    setFormDivision(para.division);
    setFormCategory(para.category);
    setFormRemarks(para.remarks || '');
    setFormStatusSteps({ ...para.statusSteps });
    setFormStatusDates(para.statusDates || {});
    setIsFormOpen(true);
  };

  const handleSavePara = (e) => {
    e.preventDefault();
    if (!formNumber.trim() || !formSubject.trim()) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    // Word count check for remarks
    const wordCount = formRemarks.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount > 250) {
      alert('Remarks cannot exceed 250 words.');
      return;
    }

    if (editingPara) {
      // Update
      setAuditParas(prev => prev.map(p => p.id === editingPara.id ? {
        ...p,
        number: formNumber,
        subject: formSubject,
        wing: formWing,
        division: formDivision,
        category: formCategory,
        remarks: formRemarks,
        statusSteps: formStatusSteps,
        statusDates: formStatusDates
      } : p));
    } else {
      // Add
      const newId = auditParas.length > 0 ? Math.max(...auditParas.map(p => p.id)) + 1 : 1;
      setAuditParas(prev => [
        {
          id: newId,
          number: formNumber,
          subject: formSubject,
          wing: formWing,
          division: formDivision,
          category: formCategory,
          remarks: formRemarks,
          statusSteps: formStatusSteps,
          statusDates: formStatusDates
        },
        ...prev
      ]);
    }

    setIsFormOpen(false);
  };

  // Filter and Search logic
  const filteredData = useMemo(() => {
    let result = [...auditParas];

    if (selectedWing !== 'All') {
      result = result.filter(p => p.wing.toLowerCase() === selectedWing.toLowerCase());
    }
    if (selectedDivision !== 'All') {
      result = result.filter(p => p.division.toLowerCase() === selectedDivision.toLowerCase());
    }
    if (selectedCategory !== 'All') {
      result = result.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }
    if (selectedStatus !== 'All') {
      result = result.filter(p => getParaStatusText(p.statusSteps).toLowerCase() === selectedStatus.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.number.toLowerCase().includes(q) ||
        p.subject.toLowerCase().includes(q) ||
        p.wing.toLowerCase().includes(q) ||
        p.division.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [auditParas, selectedWing, selectedDivision, selectedCategory, selectedStatus, searchQuery]);

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
      headerName: 'Audit Para Number',
      field: 'number',
      minWidth: 260,
      pinned: 'left',
      cellClass: 'font-semibold text-slate-700 flex items-center pl-4 border-r border-slate-200 hover:text-blue-700 cursor-pointer'
    },
    {
      headerName: 'Subject',
      field: 'subject',
      minWidth: 320,
      wrapText: true,
      autoHeight: true,
      cellClass: 'text-slate-650 flex items-center py-2 border-r border-slate-100 font-medium whitespace-normal'
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
      headerName: 'Category',
      field: 'category',
      minWidth: 130,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-semibold text-blue-700'
    },
    {
      headerName: 'Status',
      field: 'statusSteps',
      minWidth: 240,
      cellClass: 'text-center font-bold text-slate-800 border-r border-slate-100 flex items-center justify-center',
      cellRenderer: (params) => {
        const text = getParaStatusText(params.value);
        let style = 'bg-slate-50 text-slate-700 border-slate-200';
        if (text === 'Dropped') {
          style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else if (text.startsWith('Comments Received')) {
          style = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (text.startsWith('Comments Sought') || text === 'Under Clarification') {
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
      headerName: 'Update',
      field: 'id',
      width: 90,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => handleOpenEdit(params.data)}
          className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
          title="Update Audit Para Details"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )
    }
  ], [currentPage, entriesLimit]);

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

  const handleExport = (type) => {
    console.log(`${type} exported.`);
  };

  const updateStepValue = (step, val) => {
    setFormStatusSteps(prev => ({
      ...prev,
      [step]: val
    }));
  };

  if (isFormOpen) {
    return (
      <div className="space-y-6 animate-fade-in pb-12">
        {/* Form Page Header Card wrapper */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a]">
          {/* Header Title Bar */}
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                {editingPara ? 'Modify Audit Para Record' : 'Add Audit Para'}
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
          <form onSubmit={handleSavePara} className="p-6 space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Audit Para Number*</label>
                <input
                  type="text"
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  placeholder="e.g. 9.1 of Report no. 7/2025"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Wing*</label>
                  <select
                    value={formWing}
                    onChange={(e) => setFormWing(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    {WINGS.filter(w => w !== 'All').map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Division*</label>
                  <select
                    value={formDivision}
                    onChange={(e) => setFormDivision(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    {DIVISIONS.filter(d => d !== 'All').map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Category*</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    {CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Subject*</label>
              <textarea
                value={formSubject}
                onChange={(e) => setFormSubject(e.target.value)}
                rows={3}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                placeholder="Enter Audit Para Subject..."
              />
            </div>

            {/* Status Steps Flow */}
            <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-4">
              <span className="block text-xs font-bold text-slate-800 border-b border-slate-200 pb-2">Status Timeline Steps</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {[1, 2, 3, 4, 5, 6, 7].map(step => (
                  <div key={step} className="flex flex-col p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-2">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-semibold text-slate-700">{step}. {STATUS_STEPS[step]}</span>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`step-${step}`}
                            checked={formStatusSteps[step] === 'Yes'}
                            onChange={() => {
                              updateStepValue(step, 'Yes');
                              if (!formStatusDates[step]) {
                                const today = new Date().toISOString().split('T')[0];
                                setFormStatusDates(prev => ({ ...prev, [step]: today }));
                              }
                            }}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-655">Yes</span>
                        </label>
                        <label className="flex items-center space-x-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`step-${step}`}
                            checked={formStatusSteps[step] === 'No'}
                            onChange={() => {
                              updateStepValue(step, 'No');
                            }}
                            className="h-3 w-3 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs font-bold text-slate-655">No</span>
                        </label>
                      </div>
                    </div>
                    {formStatusSteps[step] === 'Yes' && (step === 1 || step === 2) && (
                      <div className="w-full pt-1 border-t border-slate-100 flex items-center justify-between gap-2 animate-fade-in">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {step === 1 ? 'Date of receipt of para' : 'Date'}
                        </span>
                        <input
                          type="date"
                          value={formStatusDates[step] || ''}
                          onChange={(e) => setFormStatusDates(prev => ({ ...prev, [step]: e.target.value }))}
                          className="text-[10px] px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Remarks (Max length of words should not exceed 250)</label>
              <textarea
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                rows={4}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                placeholder="Enter additional remarks..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-5 py-2 bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition cursor-pointer"
              >
                {editingPara ? 'Save Changes' : 'Save Record'}
              </button>
            </div>

          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Search and Filters panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <button
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className={`w-full flex items-center justify-between text-left transition cursor-pointer ${isFiltersExpanded ? 'pb-3 border-b border-slate-100 mb-4' : ''}`}
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wider font-display">Filter Registry</span>
          </div>
          <div className="text-slate-450">
            {isFiltersExpanded ? <ChevronRight className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </button>

        {isFiltersExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5 animate-fade-in">
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Wing</label>
              <select
                value={selectedWing}
                onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Division</label>
              <select
                value={selectedDivision}
                onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                <option value="All">All</option>
                {Object.values(STATUS_STEPS).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Database toolbar */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handleExport('Clipboard')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>Copy</span>
          </button>
          <button
            onClick={() => handleExport('Excel')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>Excel</span>
          </button>
          <button
            onClick={() => handleExport('PDF')}
            className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-500 whitespace-nowrap">Show</span>
            <select
              value={entriesLimit}
              onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-slate-500 whitespace-nowrap">entries</span>
          </div>

          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Audit Para</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={paginatedData}
          columnDefs={colDefs}
          defaultColDef={{ minWidth: 80, suppressSizeToFit: false }}
          pagination={true}
          paginationPageSize={entriesLimit}
          suppressPaginationPanel={true}
          onPaginationChanged={onPaginationChanged}
          domLayout="autoHeight"
          rowHeight={48}
          headerHeight={48}
          suppressColumnVirtualisation={true}
          autoSizeStrategy={{
            type: 'fitCellContents'
          }}
          onFirstDataRendered={(params) => {
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) {
              params.api.sizeColumnsToFit();
            }
          }}
          onGridSizeChanged={(params) => {
            const allCols = params.api.getAllGridColumns();
            params.api.autoSizeColumns(allCols);
            const totalColWidth = allCols.reduce((sum, col) => sum + col.getActualWidth(), 0);
            const containerWidth = (params.api.getGridBodyViewportElement?.() || params.api.getGridBodyElement?.())?.clientWidth || 0;
            if (containerWidth > 0 && totalColWidth < containerWidth) {
              params.api.sizeColumnsToFit();
            }
          }}
        />

        {/* Custom Pagination Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4 font-semibold">
          <span className="text-slate-505 font-medium text-center sm:text-left">
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
                    : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
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
  );
}
