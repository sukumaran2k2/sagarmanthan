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
  ArrowLeft
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const WINGS = ['All', 'Ports', 'Administration', 'IWT', 'Sagarmala', 'Shipping', 'Special Initiatives & Projects'];
const DIVISIONS = ['All', 'PC-I', 'PD-I', 'PD-II', 'PD-III', 'PPP', 'IWT-I', 'IWT-II', 'Sagarmala-I', 'Shipping-II', 'Special Initiatives & Projects'];
const ISSUE_TYPES = ['All', 'Assurance'];
const STATUSES = ['All', 'No Status', 'Received At Ministry'];

export default function ParliamentaryIssuesInput({ issues, setIssues }) {
  const gridRef = useRef();
  const [selectedWing, setSelectedWing] = useState('All');
  const [selectedDivision, setSelectedDivision] = useState('All');
  const [selectedIssueType, setSelectedIssueType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [notification, setNotification] = useState(null);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [isDatabaseExpanded, setIsDatabaseExpanded] = useState(false);

  // Form View State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  
  const [formSubject, setFormSubject] = useState('');
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formIssueType, setFormIssueType] = useState('');
  const [formStatus, setFormStatus] = useState('');
  const [formRemarks, setFormRemarks] = useState('');

  const triggerNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingIssue(null);
    setFormSubject('');
    setFormWing('');
    setFormDivision('');
    setFormIssueType('Assurance');
    setFormStatus('No Status');
    setFormRemarks('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = useCallback((issue) => {
    setEditingIssue(issue);
    setFormSubject(issue.subject);
    setFormWing(issue.wing);
    setFormDivision(issue.division);
    setFormIssueType(issue.issueType);
    setFormStatus(issue.status);
    setFormRemarks(issue.remarks || '');
    setIsFormOpen(true);
  }, []);

  const handleSaveIssue = (e) => {
    e.preventDefault();
    if (!formWing) {
      triggerNotification('Please select a Wing.');
      return;
    }
    if (!formDivision) {
      triggerNotification('Please select a Division.');
      return;
    }

    if (editingIssue) {
      setIssues(prev => prev.map(i => i.id === editingIssue.id ? {
        ...i,
        subject: formSubject,
        wing: formWing,
        division: formDivision,
        issueType: formIssueType,
        status: formStatus,
        remarks: formRemarks
      } : i));
      triggerNotification('Parliamentary issue updated successfully.');
    } else {
      const newIssue = {
        id: Date.now(),
        subject: formSubject,
        wing: formWing,
        division: formDivision,
        issueType: formIssueType,
        status: formStatus,
        remarks: formRemarks
      };
      setIssues(prev => [newIssue, ...prev]);
      triggerNotification('Parliamentary issue added successfully.');
    }
    setIsFormOpen(false);
  };

  const filteredIssues = useMemo(() => {
    return issues.filter(i => {
      const matchWing = selectedWing === 'All' || i.wing === selectedWing;
      const matchDivision = selectedDivision === 'All' || i.division === selectedDivision;
      const matchIssueType = selectedIssueType === 'All' || i.issueType === selectedIssueType;
      const matchStatus = selectedStatus === 'All' || i.status === selectedStatus;
      return matchWing && matchDivision && matchIssueType && matchStatus;
    });
  }, [issues, selectedWing, selectedDivision, selectedIssueType, selectedStatus]);

  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('quickFilterText', searchQuery);
    }
  }, [searchQuery]);

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
      headerName: 'Wing',
      field: 'wing',
      minWidth: 140,
      cellClass: 'text-slate-600 font-bold border-r border-slate-100 flex items-center text-[11px]',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Division',
      field: 'division',
      minWidth: 130,
      cellClass: 'text-slate-655 font-mono font-bold border-r border-slate-100 flex items-center text-[11px]',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Issue Type',
      field: 'issueType',
      minWidth: 130,
      cellClass: 'text-slate-700 font-semibold border-r border-slate-100 flex items-center text-[11px]',
      headerClass: 'border-r border-blue-900/30'
    },
    {
      headerName: 'Status',
      field: 'status',
      minWidth: 160,
      cellClass: 'border-r border-slate-100 flex items-center text-[11px]',
      headerClass: 'border-r border-blue-900/30',
      cellRenderer: (params) => {
        const status = params.value || '';
        return (
          <div className="flex items-center h-full">
            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
              status.includes('Received') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
              'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {status}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Update',
      minWidth: 90,
      cellClass: 'text-center flex items-center justify-center text-[11px]',
      cellRenderer: (params) => {
        const issue = params.data;
        return (
          <div className="flex items-center justify-center h-full">
            <button 
              onClick={() => handleOpenEdit(issue)}
              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
              title="Edit Issue Details"
            >
              <Edit className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      }
    }
  ], [handleOpenEdit]);

  if (isFormOpen) {
    return (
      <div className="space-y-6 animate-fade-in">
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

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a]">
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                {editingIssue ? 'Modify Parliamentary Issue' : 'Add Parliamentary Issue'}
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

          <form onSubmit={handleSaveIssue} className="p-6 space-y-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Wing*</label>
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

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Division*</label>
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Issue Type*</label>
                <div className="relative">
                  <select 
                    required
                    value={formIssueType}
                    onChange={(e) => setFormIssueType(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-250 rounded-xl appearance-none focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  >
                    {ISSUE_TYPES.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Status*</label>
                <div className="relative">
                  <select 
                    required
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full text-xs pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-250 rounded-xl appearance-none focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  >
                    {STATUSES.filter(s => s !== 'All').map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-450">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Remarks</label>
              <textarea 
                rows={3}
                value={formRemarks}
                onChange={(e) => setFormRemarks(e.target.value)}
                placeholder="Enter remarks..."
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800 placeholder-slate-400"
              />
            </div>

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
                className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="h-2 w-2 rounded-full bg-blue-600"></span>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Parliamentary Issues database & input register
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
                <Plus className="h-4 w-4 text-emerald-800" />
                <span>Add Parliamentary Issues</span>
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
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <button 
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="w-full flex items-center justify-between text-left transition cursor-pointer select-none"
            >
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 font-display">Parliamentary Issues Filters</span>
              </div>
              <div className="flex items-center space-x-1.5 text-slate-400">
                <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
                {isFiltersExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
              </div>
            </button>

            {isFiltersExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-4 border-t border-slate-100 animate-fade-in">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Wing</label>
                  <select 
                    value={selectedWing} 
                    onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  >
                    {WINGS.map(w => <option key={w} value={w}>{w === 'All' ? 'Show all' : w}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Division</label>
                  <select 
                    value={selectedDivision} 
                    onChange={(e) => { setSelectedDivision(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  >
                    {DIVISIONS.map(d => <option key={d} value={d}>{d === 'All' ? 'Show all' : d}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Issue Type</label>
                  <select 
                    value={selectedIssueType} 
                    onChange={(e) => { setSelectedIssueType(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  >
                    {ISSUE_TYPES.map(t => <option key={t} value={t}>{t === 'All' ? 'Show All' : t}</option>)}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</label>
                  <select 
                    value={selectedStatus} 
                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
                  >
                    {STATUSES.map(s => <option key={s} value={s}>{s === 'All' ? 'Show All' : s}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
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

            <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
              <AgGridReact 
                ref={gridRef}
                theme="legacy"
                rowData={filteredIssues}
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

              <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4">
                <span className="text-slate-500 font-medium text-center sm:text-left">
                  Showing <span className="font-bold text-slate-800">{filteredIssues.length > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
                  <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, filteredIssues.length)}</span> of{' '}
                  <span className="font-bold text-slate-800">{filteredIssues.length}</span> entries
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
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 shadow-inner">
            <div className="flex items-center space-x-2 text-rose-600 font-bold">
              <GitBranch className="h-4.5 w-4.5 text-rose-600" />
              <span className="text-[11px] uppercase tracking-wider font-display text-slate-700">Wing Wise Counts</span>
            </div>
            <div className="divide-y divide-slate-150 font-semibold text-xs text-slate-700 max-h-[220px] overflow-y-auto pr-1">
              {Object.entries(
                issues.reduce((acc, i) => {
                  acc[i.wing] = (acc[i.wing] || 0) + 1;
                  return acc;
                }, {})
              ).sort((a, b) => b[1] - a[1]).map(([wing, count]) => (
                <div key={wing} className="flex justify-between py-2 items-center">
                  <span className="truncate max-w-[200px]" title={wing}>{wing}</span>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded text-[10px] font-extrabold">{count} issues</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 shadow-inner">
            <div className="flex items-center space-x-2 text-emerald-600 font-bold">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
              <span className="text-[11px] uppercase tracking-wider font-display text-slate-700">Status Wise Counts</span>
            </div>
            <div className="divide-y divide-slate-150 font-semibold text-xs text-slate-700 max-h-[220px] overflow-y-auto pr-1">
              {Object.entries(
                issues.reduce((acc, i) => {
                  acc[i.status] = (acc[i.status] || 0) + 1;
                  return acc;
                }, {})
              ).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div key={status} className="flex justify-between py-2 items-center">
                  <span>{status}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                    status.includes('Received') ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-slate-100 text-slate-700 border border-slate-200'
                  }`}>
                    {count} issues
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
