import React, { useState, useMemo, useEffect, useRef } from 'react';
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

export default function YoungProfessionalsView({ activeSubTab, setActiveSubTab, triggerNotification, userPermissions }) {
  const [inputGridData, setInputGridData] = useState([]);
  const [reportGridData, setReportGridData] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [wingFilter, setWingFilter] = useState('');

  // Form Fields State
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [formAppointmentDate, setFormAppointmentDate] = useState('');
  const [formCandidateDetails, setFormCandidateDetails] = useState('');

  const fileInputRef = useRef(null);

  // Available wings for dropdown selection
  const WINGS = DB_WINGS.map(w => w.wing_name);
  const DIVISIONS = DB_DIVISIONS.map(d => d.division_name);

  // Sub-tabs configuration for internal navigation
  const SUB_TABS = [
    { id: 'YP Input Form', label: 'Input Form', icon: FileEdit },
    { id: 'YP Reports', label: 'Reports', icon: FilePieChart }
  ];

  // Helper to normalize sub-tab
  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'YP Input Form';

  const fetchData = () => {
    axios.get("http://localhost:3000/young-professional")
      .then(res => {
        const mapped = res.data.map((item, idx) => ({
          sNo: idx + 1,
          wing: item.wing_name || 'Unknown',
          division: item.division_name || 'Unknown',
          inPosition: item.inposition > 0 ? item.inposition : '--'
        }));
        setInputGridData(mapped);
      })
      .catch(err => console.error("Error loading YP data:", err));

    axios.get("http://localhost:3000/yp-report")
      .then(res => {
        const mapped = res.data.map((item, idx) => ({
          sNo: idx + 1,
          wing: item["Wing"] || 'Unknown',
          total: item["Total No of Post"] || 0,
          filled: item["No of Vacancy Filled Up"] || 0,
          vacant: item["No of Vacancy In Process"] || 0
        }));
        setReportGridData(mapped);
      })
      .catch(err => console.error("Error loading YP report:", err));
  };

  useEffect(() => {
    fetchData();
  }, [isAdding]);

  // Filtered Input Grid Data
  const filteredInputGridData = useMemo(() => {
    return inputGridData.filter(item => {
      const matchSearch = !searchTerm ||
        item.wing.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.division.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    }).map((item, idx) => ({ ...item, sNo: idx + 1 }));
  }, [inputGridData, searchTerm]);

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
  const handleAddPostSubmit = async (e) => {
    e.preventDefault();
    if (!formWing || !formDivision || !formAppointmentDate) {
      alert('Please fill out all required fields.');
      return;
    }

    const selectedWingObj = DB_WINGS.find(w => w.wing_name === formWing);
    const selectedDivisionObj = DB_DIVISIONS.find(d => d.division_name === formDivision);
    const wingId = selectedWingObj ? selectedWingObj.wing_id : null;
    const divisionId = selectedDivisionObj ? selectedDivisionObj.division_id : null;

    try {
      // 1. Create Young Professional post record
      const ypResponse = await axios.post("http://localhost:3000/young-professional", {
        wing: wingId,
        division: divisionId,
        postStatus: "Filled",
        vacancyAriseDate: null,
        dateOfVacancyAdvertise: null,
        dateOfAppointment: formAppointmentDate,
        postID: Math.floor(Math.random() * 1000).toString(),
        userID: 1
      });

      const youngProfessionalId = ypResponse.data.insertedYPId;

      // 2. Add YP Candidate details
      const candResponse = await axios.post("http://localhost:3000/candidate-detail", {
        name: "Candidate",
        qualification: "B.Tech",
        category: "General",
        salary: 50000,
        appointmentDate: formAppointmentDate,
        experience: "2 years",
        skill: "Software Development",
        youngProfessionalId: youngProfessionalId
      });

      const candidateId = candResponse.data.candidate_id;

      // 3. Upload candidate document if a file is selected
      if (fileInputRef.current && fileInputRef.current.files[0]) {
        const formData = new FormData();
        formData.append("file", fileInputRef.current.files[0]);
        await axios.post(`http://localhost:3000/upload-yp-document/${candidateId}`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setIsAdding(false);

      // Clear form
      setFormWing('');
      setFormDivision('');
      setFormAppointmentDate('');
      setFormCandidateDetails('');

      if (triggerNotification) {
        triggerNotification(`New Young Professional post successfully registered for ${formWing} (${formDivision}).`);
      }
    } catch (err) {
      console.error("Error creating Young Professional:", err);
      alert("Failed to save post. Please check backend connections.");
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
                    <select
                      value={formDivision}
                      onChange={(e) => setFormDivision(e.target.value)}
                      required
                      className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">--Select Division--</option>
                      {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
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
                      ref={fileInputRef}
                      accept=".pdf,.doc,.docx"
                      required
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setFormCandidateDetails(file.name);
                        }
                      }}
                      className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
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
