import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileEdit,
  FilePieChart,
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Home,
  Calendar,
  ArrowLeft,
  Users,
  Eye,
  UserMinus,
  Trash2,
  X
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import PageBanner from '../../components/PageBanner';
import Table from '../../components/Table';
import axios from 'axios';

export default function YoungProfessionalsView({ activeSubTab, setActiveSubTab, triggerNotification, userPermissions }) {
  const [inputGridData, setInputGridData] = useState([]);
  const [reportGridData, setReportGridData] = useState([]);
  const [reportColDefs, setReportColDefs] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [wingFilter, setWingFilter] = useState('');

  // Form Fields State
  const [formWing, setFormWing] = useState('');
  const [formDivision, setFormDivision] = useState('');
  const [postStatus, setPostStatus] = useState('Vacant'); // Vacant or Filled
  const [vacancyAriseDate, setVacancyAriseDate] = useState('');
  const [vacancyAdvertisedDate, setVacancyAdvertisedDate] = useState('');
  const [formAppointmentDate, setFormAppointmentDate] = useState('');
  const [formCandidateDocument, setFormCandidateDocument] = useState('');

  // Candidate Detail Fields
  const [candName, setCandName] = useState('');
  const [candQualification, setCandQualification] = useState('');
  const [candExperience, setCandExperience] = useState('');
  const [candSkill, setCandSkill] = useState('');
  const [candCategory, setCandCategory] = useState('General');
  const [candSalary, setCandSalary] = useState('');

  const [showCandidateModal, setShowCandidateModal] = useState(false);

  const fileInputRef = useRef(null);

  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);

  // Sub-tabs configuration for internal navigation
  const SUB_TABS = [
    { id: 'YP Input Form', label: 'Input Form', icon: FileEdit },
    { id: 'YP Reports', label: 'Reports', icon: FilePieChart }
  ];

  // Helper to normalize sub-tab
  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'YP Input Form';

  const fetchData = () => {
    setLoading(true);
    axios.get("http://localhost:3000/young-professional")
      .then(res => {
        const mapped = res.data.map((item, idx) => ({
          sNo: idx + 1,
          id: item.young_professional_id,
          candidateId: item.candidate_id,
          wing: item.wing_name || 'Unknown',
          division: item.division_name || 'Unknown',
          inPosition: item.inposition > 0 ? item.inposition : '--',
          document: item.appointment_order_document
        }));
        setInputGridData(mapped);
      })
      .catch(err => console.error("Error loading YP data:", err))
      .finally(() => setLoading(false));

    setReportLoading(true);

    axios.get("http://localhost:3000/yp-report")
      .then(res => {
        const dataArray = res.data.rowData || [];
        const mapped = dataArray.map((item, idx) => ({
          sNo: idx + 1,
          wing: item["Wing"] || 'Unknown',
          total: item["Total No of Post"] || 0,
          filled: item["No of Vacancy Filled Up"] || 0,
          vacant: item["No of Vacancy In Process"] || 0
        }));
        setReportGridData(mapped);
      })
      .catch(err => console.error("Error loading YP report:", err))
      .finally(() => setReportLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [isAdding]);

  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_wings")
      .then(res => setWings(res.data || []))
      .catch(err => console.error(err));
    axios.get("http://localhost:3000/mmt-dropdown/mmt_division")
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error(err));
  }, []);



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
  // Removed duplicate reportColDefs

  // Form submit handler
  const handleAddPostSubmit = async (e) => {
    e.preventDefault();
    if (!formWing || !formDivision) {
      alert('Please fill out all required fields.');
      return;
    }

    if (postStatus === 'Filled' && !formAppointmentDate) {
      alert('Please enter Date of Appointment for a Filled post.');
      return;
    }

    if (postStatus === 'Vacant' && !vacancyAriseDate) {
      alert('Please enter Date of Arise in Vacancy.');
      return;
    }

    const wingId = formWing;
    const divisionId = formDivision;

    try {
      // 1. Create Young Professional post record
      const ypResponse = await axios.post("http://localhost:3000/young-professional", {
        wing: wingId,
        division: divisionId,
        postStatus: postStatus,
        vacancyAriseDate: postStatus === 'Vacant' ? vacancyAriseDate : null,
        dateOfVacancyAdvertise: postStatus === 'Vacant' ? vacancyAdvertisedDate : null,
        dateOfAppointment: postStatus === 'Filled' ? formAppointmentDate : null,
        postID: Math.floor(Math.random() * 1000).toString(),
        userID: 1
      });

      const youngProfessionalId = ypResponse.data.insertedYPId;

      if (postStatus === 'Filled' && candName) {
        // 2. Add YP Candidate details
        const candResponse = await axios.post("http://localhost:3000/candidate-detail", {
          name: candName,
          qualification: candQualification,
          category: candCategory,
          salary: candSalary,
          appointmentDate: formAppointmentDate,
          experience: candExperience,
          skill: candSkill,
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
      }

      setIsAdding(false);
      fetchData();

      // Clear form
      setFormWing('');
      setFormDivision('');
      setPostStatus('Vacant');
      setVacancyAriseDate('');
      setVacancyAdvertisedDate('');
      setFormAppointmentDate('');
      setFormCandidateDocument('');
      setCandName('');
      setCandQualification('');
      setCandExperience('');
      setCandSkill('');
      setCandCategory('General');
      setCandSalary('');

      if (triggerNotification) {
        triggerNotification(`New Young Professional post successfully registered.`);
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
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">

      {/* Header Row: Title & Navigation Tab Switcher on the same line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Young Professionals
          </h2>
        </div>

        {/* Modern Segmented Control Tab Switcher */}
        <InternalNavigation
          tabs={SUB_TABS}
          currentTab={currentTab}
          onTabChange={setActiveSubTab}
        />
      </div>

      <PageBanner 
        title={currentTab === 'YP Input Form' ? "YP Input Form" : "Young Professionals Reports"} 
        description={currentTab === 'YP Input Form' ? "Comprehensive repository of Young Professionals." : "Detailed reports of Young Professionals."}
        icon={Users}
      />

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
                      {wings.map(w => <option key={w.wing_id} value={w.wing_id}>{w.wing_name}</option>)}
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
                      {divisions.map(d => <option key={d.division_id} value={d.division_id}>{d.division_name}</option>)}
                    </select>
                  </div>
                </div>

                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mt-8 mb-5">Status</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Post Status</label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                        <input type="radio" name="postStatus" value="Vacant" checked={postStatus === 'Vacant'} onChange={() => setPostStatus('Vacant')} className="accent-blue-600 h-4 w-4" />
                        <span>Vacant</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                        <input type="radio" name="postStatus" value="Filled" checked={postStatus === 'Filled'} onChange={() => setPostStatus('Filled')} className="accent-blue-600 h-4 w-4" />
                        <span>Filled</span>
                      </label>
                    </div>
                  </div>

                  {postStatus === 'Vacant' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Date of Arise in Vacancy*</label>
                        <input type="date" value={vacancyAriseDate} onChange={e => setVacancyAriseDate(e.target.value)} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" required={postStatus === 'Vacant'} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Date of Vacancy Advertised</label>
                        <input type="date" value={vacancyAdvertisedDate} onChange={e => setVacancyAdvertisedDate(e.target.value)} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" />
                      </div>
                    </>
                  )}

                  {postStatus === 'Filled' && (
                    <>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Date of Appointment*</label>
                        <input type="date" value={formAppointmentDate} onChange={e => setFormAppointmentDate(e.target.value)} className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" required={postStatus === 'Filled'} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Candidate Details</label>
                        <button type="button" onClick={() => setShowCandidateModal(true)} className={`w-full inline-flex items-center justify-center space-x-2 px-4 py-2.5 ${candName ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition`}>
                          {candName ? <FileEdit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                          <span>{candName ? 'Edit Candidate Details' : 'Add Candidate Details'}</span>
                        </button>
                      </div>
                    </>
                  )}
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

              {/* ag-Grid wrapped in Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                <Table
                  rowData={filteredInputGridData}
                  columnDefs={inputColDefs}
                  loading={loading}
                  pagination={true}
                  paginationPageSize={10}
                  enableExport={true}
                  exportFileName="Young_Professionals_Register"
                  exportPdfTitle="Young Professionals Register"
                  defaultColDef={{
                    minWidth: 90,
                    flex: 1,
                    filter: true,
                    sortable: true,
                    resizable: true
                  }}
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
                {wings.map(w => <option key={w.wing_id} value={w.wing_name}>{w.wing_name}</option>)}
              </select>
            </div>
          </div>

          {/* AG Grid Report Table using Table wrapper */}
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <Table
                rowData={filteredReportGridData}
                columnDefs={reportColDefs}
                loading={reportLoading}
                pagination={true}
                paginationPageSize={10}
                enableExport={true}
                exportFileName="Young_Professionals_Report"
                exportPdfTitle="Young Professionals Report"
                defaultColDef={{
                  minWidth: 95,
                  flex: 1,
                  filter: true,
                  sortable: true,
                  resizable: true
                }}
              />
            </div>

            <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
              <span>Total Rows: {filteredReportGridData.length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Candidate Modal */}
      {showCandidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-[#0f417a] text-white">
              <h3 className="text-base font-black font-display uppercase tracking-wider">Candidate Details</h3>
              <button onClick={() => setShowCandidateModal(false)} className="text-blue-200 hover:text-white transition">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Name*</label>
                  <input type="text" value={candName} onChange={e => setCandName(e.target.value)} required className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" placeholder="Enter full name" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Educational Qualification*</label>
                  <input type="text" value={candQualification} onChange={e => setCandQualification(e.target.value)} required className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" placeholder="e.g. B.Tech, MBA" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Work Experience (Years)*</label>
                  <input type="number" step="0.1" value={candExperience} onChange={e => setCandExperience(e.target.value)} required className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" placeholder="e.g. 2.5" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Skill Set*</label>
                  <input type="text" value={candSkill} onChange={e => setCandSkill(e.target.value)} required className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" placeholder="e.g. Project Management" />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Category*</label>
                  <select value={candCategory} onChange={e => setCandCategory(e.target.value)} required className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700">
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC/ST">SC/ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Salary (LPA)*</label>
                  <input type="number" step="0.1" value={candSalary} onChange={e => setCandSalary(e.target.value)} required className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" placeholder="e.g. 6.5" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Appointment Order Document*</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf,.doc,.docx"
                    required={!formCandidateDocument}
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setFormCandidateDocument(file.name);
                      }
                    }}
                    className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-255 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700 cursor-pointer"
                  />
                  {formCandidateDocument && (
                    <p className="text-[10px] font-bold text-emerald-600 mt-1">Current file: {formCandidateDocument}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button onClick={() => setShowCandidateModal(false)} className="px-4 py-2 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-200 transition">Cancel</button>
              <button 
                onClick={() => {
                  if (!candName || !candQualification || !candExperience || !candSkill || !candSalary || (!fileInputRef.current?.files[0] && !formCandidateDocument)) {
                    alert("Please fill out all candidate details and upload a document before saving.");
                    return;
                  }
                  setShowCandidateModal(false);
                }} 
                className="px-4 py-2 bg-[#0f417a] hover:bg-[#1a5ba3] text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
