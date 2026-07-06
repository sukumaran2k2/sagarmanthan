import React, { useState, useMemo, useEffect } from 'react';
import {
  FileEdit,
  FilePieChart,
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Home,
  X,
  Calendar,
  User,
  Activity,
  Layers,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

// Initial dataset of individual Young Professional posts
const INITIAL_POSTS = [
  // Shipping (6 filled, 4 vacant/in-process -> Total 10)
  { id: 1, wing: 'Shipping', division: 'Shipping-I', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-03-15', candidateDetails: 'Amit Verma' },
  { id: 2, wing: 'Shipping', division: 'Shipping-I', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-04-10', candidateDetails: 'Priya Sharma' },
  { id: 3, wing: 'Shipping', division: 'Shipping-I', status: 'Vacant', vacancyDate: '2025-10-12', advertisedDate: '2025-11-05', appointmentDate: '', candidateDetails: '' },
  { id: 4, wing: 'Shipping', division: 'Shipping-I', status: 'Vacant', vacancyDate: '2025-12-01', advertisedDate: '2026-01-10', appointmentDate: '', candidateDetails: '' },
  { id: 5, wing: 'Shipping', division: 'Shipping-II', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-05-12', candidateDetails: 'Rajesh Kumar' },
  { id: 6, wing: 'Shipping', division: 'Shipping-II', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-06-01', candidateDetails: 'Neha Gupta' },
  { id: 7, wing: 'Shipping', division: 'Shipping-II', status: 'Vacant', vacancyDate: '2026-01-15', advertisedDate: '2026-02-20', appointmentDate: '', candidateDetails: '' },
  { id: 8, wing: 'Shipping', division: 'Shipping-II', status: 'Vacant', vacancyDate: '2026-02-10', advertisedDate: '2026-03-01', appointmentDate: '', candidateDetails: '' },
  { id: 9, wing: 'Shipping', division: 'Shipping-III', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-07-22', candidateDetails: 'Sanjay Dutt' },
  { id: 10, wing: 'Shipping', division: 'Shipping-III', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-08-11', candidateDetails: 'Ritu Phogat' },

  // Ports (6 filled, 2 vacant/in-process -> Total 8)
  { id: 11, wing: 'Ports', division: 'PD-I', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-01-20', candidateDetails: 'Siddharth Singh' },
  { id: 12, wing: 'Ports', division: 'PD-I', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-02-15', candidateDetails: 'Ananya Roy' },
  { id: 13, wing: 'Ports', division: 'PD-I', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-03-22', candidateDetails: 'Vikram Malhotra' },
  { id: 14, wing: 'Ports', division: 'PPP', status: 'Vacant', vacancyDate: '2025-10-01', advertisedDate: '2025-11-15', appointmentDate: '', candidateDetails: '' },
  { id: 15, wing: 'Ports', division: 'PHRD', status: 'Vacant', vacancyDate: '2025-12-05', advertisedDate: '2026-01-10', appointmentDate: '', candidateDetails: '' },
  { id: 16, wing: 'Ports', division: 'PD-II', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-09-01', candidateDetails: 'Aditya Birla' },
  { id: 17, wing: 'Ports', division: 'PD-II', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-10-05', candidateDetails: 'Karan Shah' },
  { id: 18, wing: 'Ports', division: 'PD-II', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-11-12', candidateDetails: 'Deepika Padukone' },

  // IWT (2 filled, 0 vacant -> Total 2)
  { id: 19, wing: 'IWT', division: 'IWT-I', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-12-01', candidateDetails: 'Ishaan Khatter' },
  { id: 20, wing: 'IWT', division: 'IWT-II', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-09-05', candidateDetails: 'Karan Johar' },

  // Administration (3 filled, 0 vacant -> Total 3)
  { id: 21, wing: 'Administration', division: 'Admn.', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-07-19', candidateDetails: 'Sunita Rao' },
  { id: 22, wing: 'Administration', division: 'Admn.', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-08-11', candidateDetails: 'Rahul Dev' },
  { id: 23, wing: 'Administration', division: 'Admn.', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2024-09-15', candidateDetails: 'Vikas Kumar' },

  // Coord-I (1 filled, 0 vacant -> Total 1)
  { id: 24, wing: 'Coord-I', division: 'Coord-I', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2025-01-10', candidateDetails: 'Meera Nair' },

  // Coord-II (1 filled, 0 vacant -> Total 1)
  { id: 25, wing: 'Coord-II', division: 'Coord-II', status: 'Filled', vacancyDate: '', advertisedDate: '', appointmentDate: '2025-02-14', candidateDetails: 'Rohan Sharma' },
];

export default function YoungProfessionalsView({ activeSubTab, setActiveSubTab, triggerNotification, userPermissions }) {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [wingFilter, setWingFilter] = useState('');

  // Form Fields State
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formAppointmentDate, setFormAppointmentDate] = useState('');
  const [formCandidateDetails, setFormCandidateDetails] = useState('');

  // Available wings for dropdown selection
  const WINGS = ['Shipping', 'Ports', 'IWT', 'Administration', 'Vigilance', 'Coord-I', 'Coord-II', 'Finance', 'Technical', 'IT', 'Legal'];

  // Sub-tabs configuration for internal navigation
  const SUB_TABS = [
    { id: 'YP Input Form', label: 'Input Form', icon: FileEdit },
    { id: 'YP Reports', label: 'Reports', icon: FilePieChart }
  ];

  // Helper to normalize sub-tab
  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'YP Input Form';

  // Remove background scrolling lock as overlay is no longer used

  // Grouped Wing & Division list for Input Form view
  const inputGridData = useMemo(() => {
    const grouped = {};
    posts.forEach(post => {
      const key = `${post.wing}||${post.division}`;
      if (!grouped[key]) {
        grouped[key] = { wing: post.wing, division: post.division, inPosition: 0 };
      }
      if (post.status === 'Filled') {
        grouped[key].inPosition += 1;
      }
    });

    return Object.values(grouped).map((item, idx) => ({
      sNo: idx + 1,
      wing: item.wing,
      division: item.division,
      inPosition: item.inPosition > 0 ? item.inPosition : '--'
    }));
  }, [posts]);

  // Filtered Input Grid Data
  const filteredInputGridData = useMemo(() => {
    return inputGridData.filter(item => {
      const matchSearch = !searchTerm ||
        item.wing.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.division.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [inputGridData, searchTerm]);

  // Abstract report data for Reports view
  const reportGridData = useMemo(() => {
    const grouped = {};
    // Ensure all unique wings in WINGS or current posts are listed
    const allWings = Array.from(new Set([...WINGS, ...posts.map(p => p.wing)]));

    allWings.forEach(wing => {
      grouped[wing] = { wing, total: 0, filled: 0, vacant: 0 };
    });

    posts.forEach(post => {
      if (grouped[post.wing]) {
        grouped[post.wing].total += 1;
        if (post.status === 'Filled') {
          grouped[post.wing].filled += 1;
        } else {
          grouped[post.wing].vacant += 1;
        }
      }
    });

    return Object.values(grouped)
      .filter(item => item.total > 0 || item.wing === 'Vigilance') // matching vigilance having 0 in screenshot
      .map((item, idx) => ({
        sNo: idx + 1,
        wing: item.wing,
        total: item.total,
        filled: item.filled,
        vacant: item.vacant
      }));
  }, [posts]);

  // Filtered Report Grid Data
  const filteredReportGridData = useMemo(() => {
    return reportGridData.filter(item => {
      return !wingFilter || item.wing === wingFilter;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [reportGridData, wingFilter]);

  // Input Column Definitions
  const inputColDefs = useMemo(() => [
    { field: 'sNo', headerName: 'S.No', width: 90, cellClass: 'font-mono text-slate-600 text-center', headerClass: 'text-center' },
    { field: 'wing', headerName: 'Wing', flex: 1.5, minWidth: 150, cellClass: 'font-bold text-slate-800' },
    { field: 'division', headerName: 'Division', flex: 1.5, minWidth: 150, cellClass: 'text-slate-700' },
    {
      field: 'inPosition',
      headerName: 'In Position',
      flex: 1,
      minWidth: 100,
      cellClass: 'text-center font-bold text-[#0f417a]',
      headerClass: 'text-center'
    }
  ], []);

  // Report Column Definitions
  const reportColDefs = useMemo(() => [
    { field: 'sNo', headerName: 'S No', width: 90, cellClass: 'font-mono text-slate-600 text-center', headerClass: 'text-center' },
    {
      field: 'wing',
      headerName: 'Wing',
      flex: 1.5,
      minWidth: 150,
      cellClass: 'font-extrabold text-blue-700 hover:underline cursor-pointer'
    },
    { field: 'total', headerName: 'Total No of Post', flex: 1, minWidth: 130, cellClass: 'text-center font-bold text-slate-800', headerClass: 'text-center' },
    {
      field: 'filled',
      headerName: 'No of Vacancy Filled Up',
      flex: 1,
      minWidth: 160,
      cellClass: 'text-center text-emerald-600 font-bold',
      headerClass: 'text-center'
    },
    {
      field: 'vacant',
      headerName: 'No of Vacancy In Process',
      flex: 1,
      minWidth: 160,
      cellClass: 'text-center text-amber-600 font-bold',
      headerClass: 'text-center'
    }
  ], []);

  // Form submit handler
  const handleAddPostSubmit = (e) => {
    e.preventDefault();
    if (!formWing || !formDivision || !formAppointmentDate) {
      alert('Please fill out all required fields.');
      return;
    }

    const newPost = {
      id: posts.length + 1,
      wing: formWing,
      division: formDivision,
      status: 'Filled',
      vacancyDate: '',
      advertisedDate: '',
      appointmentDate: formAppointmentDate,
      candidateDetails: formCandidateDetails || 'Resume Uploaded'
    };

    setPosts([newPost, ...posts]);
    setIsAdding(false);

    // Clear form
    setFormWing('');
    setFormDivision('');
    setFormAppointmentDate('');
    setFormCandidateDetails('');

    if (triggerNotification) {
      triggerNotification(`New Young Professional post successfully registered for ${formWing} (${formDivision}).`);
    }
  };

  const handleExport = (type) => {
    if (triggerNotification) {
      triggerNotification(`Exporting Reports to ${type}...`);
    }
  };

  return (
    <div className="space-y-6 pt-5 pb-4 px-1 md:px-2 animate-fade-in text-slate-800">

      {/* Breadcrumbs Row */}
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2 pb-1">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        {currentTab === 'YP Input Form' ? (
          <>
            <span className="text-slate-600">Young Professionals</span>
            <span className="text-slate-400">/</span>
            <span className="text-blue-800 font-bold">Input Form</span>
          </>
        ) : (
          <>
            <span className="text-slate-600">Young Professionals</span>
            <span className="text-slate-400">/</span>
            <span className="text-blue-800 font-bold">Reports</span>
          </>
        )}
      </div>

      {/* Header Container Row: Title & Navigation in a single visible container block */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display uppercase tracking-wide">
            Young Professionals
          </h2>
        </div>

        <InternalNavigation
          tabs={SUB_TABS}
          currentTab={currentTab}
          onTabChange={setActiveSubTab}
        />
      </div>

      {/* Conditional rendering for Input Form Tab */}
      {currentTab === 'YP Input Form' && (
        <div className="space-y-6">
          {isAdding ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
              {/* Header Title Bar */}
              <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-display">
                    Add Young Professionals
                  </h3>
                  <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Register</span>
                </button>
              </div>

              {/* Form Content */}
              <form onSubmit={handleAddPostSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Wing*</label>
                    <select
                      value={formWing}
                      onChange={(e) => setFormWing(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">--Select Wing--</option>
                      {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Division*</label>
                    <input
                      type="text"
                      placeholder="e.g. Shipping-I, PPP, PD-I"
                      value={formDivision}
                      onChange={(e) => setFormDivision(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-800 placeholder-slate-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Date of Appointment*</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={formAppointmentDate}
                        onChange={(e) => setFormAppointmentDate(e.target.value)}
                        required
                        className="w-full text-xs pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700"
                      />
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Candidate Details (Resume/CV)*</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      required
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setFormCandidateDetails(file.name);
                        }
                      }}
                      className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    />
                    <p className="text-[10px] font-bold text-rose-600 mt-1">
                      * Accepted formats: PDF, DOC, DOCX (Max size: 5MB)
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
                  >
                    Discard
                  </button>
                  <button
                    type="submit"
                    className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
                  >
                    Save Post
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-base font-extrabold text-slate-800 font-display">Young Professionals List</h3>
                  <p className="text-xs text-slate-500 font-medium">Overview of in-position YPs across various wings and divisions.</p>
                </div>
                {(!userPermissions || userPermissions.add !== false) && (
                  <button
                    onClick={() => setIsAdding(true)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm hover:shadow transition cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Post</span>
                  </button>
                )}
              </div>

              {/* Table search filter bar */}
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div className="relative w-full sm:max-w-xs">
                  <input
                    type="text"
                    placeholder="Search Wing or Division..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-700"
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Showing {filteredInputGridData.length} entries
                </div>
              </div>

              {/* ag-Grid */}
              <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <AgGridReact
                  theme="legacy"
                  rowData={filteredInputGridData}
                  columnDefs={inputColDefs}
                  domLayout="autoHeight"
                  rowHeight={45}
                  headerHeight={45}
                  autoSizeStrategy={{
                    type: 'fitGridWidth',
                    defaultMinWidth: 90
                  }}
                  pagination={true}
                  paginationPageSize={10}
                  paginationPageSizeSelector={[10, 20, 50]}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reports Tab */}
      {currentTab === 'YP Reports' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">

          {/* Report Metadata Block */}
          <div className="text-center space-y-1.5 py-3 border-b border-slate-100">
            <h3 className="text-base md:text-lg font-black text-slate-800 font-display">
              Report No.: 2.2A - Abstract ( Wing Wise ) - Young Professionals
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs font-semibold text-slate-500">
              <span>As On date: <strong className="text-slate-700">30-6-2026</strong></span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span>(Report for the Month - <strong className="text-slate-700">June 2026</strong>)</span>
            </div>
          </div>

          {/* Filtering & Export Options (Exports on the left, filters on the right) */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-end">
            {/* Export Buttons (Left aligned matching ProjectTable pattern) */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => handleExport('Excel')}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100/50 transition cursor-pointer"
              >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span>Export to Excel</span>
              </button>
              <button
                onClick={() => handleExport('PDF')}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold hover:bg-rose-100/50 transition cursor-pointer"
              >
                <Download className="h-4 w-4 text-rose-600" />
                <span>Export to PDF</span>
              </button>
            </div>

            {/* Wing Selection (Right aligned) */}
            <div className="w-full sm:max-w-xs">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Wing</label>
              <select
                value={wingFilter}
                onChange={(e) => setWingFilter(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700"
              >
                <option value="">--Show All--</option>
                {WINGS.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* AG Grid Report Table */}
          <div className="space-y-3">
            <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <AgGridReact
                theme="legacy"
                rowData={filteredReportGridData}
                columnDefs={reportColDefs}
                domLayout="autoHeight"
                rowHeight={45}
                headerHeight={45}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 95
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Total Rows: {filteredReportGridData.length}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
