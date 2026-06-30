import { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  ClipboardList, 
  UserX, 
  UserPlus, 
  BookOpen, 
  FilePieChart,
  Users,
  CheckCircle,
  FileText,
  ChevronDown,
  Search,
  FileSpreadsheet,
  FileCheck,
  Download,
  Filter,
  Home
} from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import InternalNavigation from '../../components/InternalNavigation';

ModuleRegistry.registerModules([AllCommunityModule]);

// Reusable SVG Doughnut Chart Component
function DoughnutChart({ data, size = 160 }) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
  
  // Calculate segments without reassigning external variables during map loop
  const segments = useMemo(() => {
    let acc = 0;
    const result = [];
    for (const item of data) {
      const percentage = total > 0 ? (item.value / total) * 100 : 0;
      const strokeDash = `${percentage} ${100 - percentage}`;
      const strokeOffset = 100 - acc;
      acc += percentage;
      result.push({
        ...item,
        percentage,
        strokeDash,
        strokeOffset
      });
    }
    return result;
  }, [data, total]);

  const radius = 15.9155; // Circumference = 2 * pi * r = 100

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 40 40" className="w-full h-full transform -rotate-90">
        {segments.map((seg, idx) => (
          <circle
            key={idx}
            cx="20"
            cy="20"
            r={radius}
            fill="transparent"
            stroke={seg.color}
            strokeWidth="5"
            strokeDasharray={seg.strokeDash}
            strokeDashoffset={seg.strokeOffset}
            className="transition-all duration-300 hover:stroke-[6px] cursor-pointer"
            title={`${seg.label}: ${seg.value}%`}
          />
        ))}
        <circle cx="20" cy="20" r="12" className="fill-white dark:fill-transparent" />
      </svg>
      {/* Center percentage / label (optional) */}
      <div className="absolute text-center">
        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Total</span>
        <span className="text-sm font-black text-slate-800">100%</span>
      </div>
    </div>
  );
}

// Mock Data for Employee Database
const initialEmployees = [
  { id: 1, code: 'EMP1001', name: 'Alok Vardhan', designation: 'Director (HR)', organization: 'JNPA', department: 'Human Resources', type: 'Regular', gender: 'Male', community: 'UR', disability: 'No', joiningDate: '2015-08-12' },
  { id: 2, code: 'EMP1002', name: 'Sunita Sharma', designation: 'Joint Director', organization: 'CoPA', department: 'Administration', type: 'Regular', gender: 'Female', community: 'OBC', disability: 'No', joiningDate: '2018-04-20' },
  { id: 3, code: 'EMP1003', name: 'Rajesh Gopinath', designation: 'Senior Consultant', organization: 'MoPSW', department: 'Projects & Strategy', type: 'Contractual', gender: 'Male', community: 'UR', disability: 'No', joiningDate: '2022-01-15' },
  { id: 4, code: 'EMP1004', name: 'Mohammed Sajid', designation: 'Deputy Secretary', organization: 'VOCPA', department: 'Vigilance', type: 'Regular', gender: 'Male', community: 'OBC', disability: 'No', joiningDate: '2012-11-01' },
  { id: 5, code: 'EMP1005', name: 'Priya Narayanan', designation: 'Executive Trainee', organization: 'SCI', department: 'Operations', type: 'Contractual', gender: 'Female', community: 'SC', disability: 'No', joiningDate: '2023-09-01' },
  { id: 6, code: 'EMP1006', name: 'Amit K. Patel', designation: 'Assistant Manager', organization: 'DePA', department: 'Finance', type: 'Regular', gender: 'Male', community: 'ST', disability: 'OH', joiningDate: '2019-06-18' },
  { id: 7, code: 'EMP1007', name: 'Kavita Das', designation: 'Senior Analyst', organization: 'MoPSW', department: 'IT Cell', type: 'Contractual', gender: 'Female', community: 'EWS', disability: 'No', joiningDate: '2021-03-10' },
  { id: 8, code: 'EMP1008', name: 'Vikram Singh', designation: 'Under Secretary', organization: 'MoPSW', department: 'Administration', type: 'Regular', gender: 'Male', community: 'UR', disability: 'VH', joiningDate: '2014-05-22' }
];

// Mock Data for Abolished Posts
const abolishedPosts = [
  { id: 1, postName: 'Assistant Director (Marine)', organization: 'JNPA', department: 'Marine Operations', abolishedDate: '2024-03-15', vacantSince: '2022-08-10', authorityRef: 'MoPSW/HR/2024-09' },
  { id: 2, postName: 'Section Officer (Logistics)', organization: 'CoPA', department: 'Administration', abolishedDate: '2024-11-20', vacantSince: '2023-01-14', authorityRef: 'CoPA/SEC-AB/03' },
  { id: 3, postName: 'Senior Draftsman', organization: 'VOCPA', department: 'Engineering', abolishedDate: '2025-01-10', vacantSince: '2021-05-09', authorityRef: 'VOC/EST/AB/22' },
  { id: 4, postName: 'Deputy Chief Mechanical Engineer', organization: 'DePA', department: 'Mechanical', abolishedDate: '2025-05-02', vacantSince: '2023-10-30', authorityRef: 'DPA/HR/2025/11' }
];

// Mock Data for Contractual Employment
const contractualStaff = [
  { id: 1, name: 'Rajesh Gopinath', designation: 'Senior Consultant', project: 'Maritime India Vision 2047 Support', remuneration: '₹1,25,000', startDate: '2022-01-15', endDate: '2027-01-14', status: 'Active' },
  { id: 2, name: 'Priya Narayanan', designation: 'Executive Trainee', project: 'SCI Cargo Telemetry Integration', remuneration: '₹45,000', startDate: '2023-09-01', endDate: '2024-08-31', status: 'Active' },
  { id: 3, name: 'Kavita Das', designation: 'Senior Analyst', project: 'Sagarmanthan Data Portal Operations', remuneration: '₹85,000', startDate: '2021-03-10', endDate: '2026-03-09', status: 'Active' },
  { id: 4, name: 'Sanjay Mishra', designation: 'Legal Consultant', project: 'National Arbitration Clearance Panel', remuneration: '₹1,10,000', startDate: '2024-02-01', endDate: '2025-01-31', status: 'Under Renewal' }
];

// Mock Data for Training Details
const trainingDetails = [
  { id: 1, name: 'Alok Vardhan', designation: 'Director (HR)', course: 'Strategic Leadership & Change Management', agency: 'IIM Ahmedabad', startDate: '2024-05-10', endDate: '2024-05-15', status: 'Completed' },
  { id: 2, name: 'Sunita Sharma', designation: 'Joint Director', course: 'Maritime Safety & Compliance Regulations', agency: 'IMU Chennai', startDate: '2024-08-22', endDate: '2024-08-25', status: 'Completed' },
  { id: 3, name: 'Amit K. Patel', designation: 'Assistant Manager', course: 'Digital Infrastructure Security & Cloud Governance', agency: 'IIT Bombay', startDate: '2025-02-12', endDate: '2025-02-15', status: 'Completed' },
  { id: 4, name: 'Vikram Singh', designation: 'Under Secretary', course: 'Public Procurement & GeM Portal Masterclass', agency: 'NIFM Faridabad', startDate: '2025-07-01', endDate: '2025-07-05', status: 'Scheduled' }
];

export default function HRDashboardView({ activeSubTab, setActiveSubTab }) {
  const [orgCategory, setOrgCategory] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Sub-tabs configuration
  const SUB_TABS = [
    { id: 'HR Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Employee Database', label: 'Employee Database', icon: ClipboardList },
    { id: 'List of Abolished Posts', label: 'List of Abolished Posts', icon: UserX },
    { id: 'Contractual Employment', label: 'Contractual Employment', icon: UserPlus },
    { id: 'Training Details', label: 'Training Details', icon: BookOpen },
    { id: 'HR Reports', label: 'Reports', icon: FilePieChart }
  ];

  // Doughnut Chart Datasets from Image
  const genderData = [
    { label: 'Male', value: 81.1, color: '#6845B2' },
    { label: 'Female', value: 12.4, color: '#C05DA3' },
    { label: 'Not Specified', value: 6.6, color: '#DE8E48' }
  ];

  const exServiceData = [
    { label: 'No Data', value: 0.1, color: '#4BA1E3' },
    { label: 'Ex-service', value: 2.1, color: '#3A63B4' },
    { label: 'Non Ex-service', value: 97.8, color: '#1E2F6C' }
  ];

  const disabilityData = [
    { label: 'HH', value: 0.3, color: '#E74C3C' },
    { label: 'Not Specified', value: 0.2, color: '#F1C40F' },
    { label: 'NA', value: 79.7, color: '#3498DB' },
    { label: 'NULL', value: 0.8, color: '#95A5A6' },
    { label: 'MD', value: 0.0, color: '#E67E22' },
    { label: 'OH', value: 0.9, color: '#2ECC71' },
    { label: 'Yes', value: 0.3, color: '#E74C3C' },
    { label: 'Not', value: 4.5, color: '#F39C12' },
    { label: 'PH', value: 0.1, color: '#1ABC9C' },
    { label: 'VH', value: 0.2, color: '#34495E' },
    { label: 'No', value: 13.3, color: '#D35400' }
  ];

  const communityData = [
    { label: 'SC', value: 15.4, color: '#1B5E20' },
    { label: 'ST', value: 6.0, color: '#A1887F' },
    { label: 'OTHER', value: 7.2, color: '#8BC34A' },
    { label: 'EWS', value: 0.2, color: '#E0E0E0' },
    { label: 'OBC', value: 31.2, color: '#0D47A1' },
    { label: 'UR', value: 40.1, color: '#4A148C' }
  ];

  // Employee Database Grid Columns
  const employeeColDefs = useMemo(() => [
    { field: 'code', headerName: 'Emp Code', width: 110, cellClass: 'font-mono font-bold text-slate-800' },
    { field: 'name', headerName: 'Employee Name', flex: 1.5, minWidth: 160, cellClass: 'font-extrabold text-slate-900' },
    { field: 'designation', headerName: 'Designation', flex: 1.5, minWidth: 150 },
    { field: 'organization', headerName: 'Org', width: 90, cellClass: 'text-center font-bold text-blue-700' },
    { field: 'department', headerName: 'Department', flex: 1.2 },
    { field: 'type', headerName: 'Employment Type', width: 130, cellClass: params => params.value === 'Regular' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold' },
    { field: 'gender', headerName: 'Gender', width: 90 },
    { field: 'community', headerName: 'Category', width: 100, cellClass: 'text-center font-semibold' },
    { field: 'disability', headerName: 'Disability', width: 100 },
    { field: 'joiningDate', headerName: 'Joining Date', width: 120 }
  ], []);

  // Abolished Posts Grid Columns
  const abolishedColDefs = useMemo(() => [
    { field: 'postName', headerName: 'Abolished Post Title', flex: 2, minWidth: 200, cellClass: 'font-extrabold text-rose-700' },
    { field: 'organization', headerName: 'Organisation', width: 130, cellClass: 'text-center font-bold' },
    { field: 'department', headerName: 'Department', flex: 1.2 },
    { field: 'abolishedDate', headerName: 'Abolished Date', width: 150 },
    { field: 'vacantSince', headerName: 'Vacant Since', width: 150 },
    { field: 'authorityRef', headerName: 'Authority Reference', flex: 1.5 }
  ], []);

  // Contractual Staff Grid Columns
  const contractualColDefs = useMemo(() => [
    { field: 'name', headerName: 'Staff Name', flex: 1.5, minWidth: 150, cellClass: 'font-extrabold text-slate-900' },
    { field: 'designation', headerName: 'Designation', flex: 1.5 },
    { field: 'project', headerName: 'Assigned Project / Scheme', flex: 2 },
    { field: 'remuneration', headerName: 'Monthly Renumeration', width: 180, cellClass: 'font-bold text-slate-800 text-right' },
    { field: 'startDate', headerName: 'Contract Start', width: 130 },
    { field: 'endDate', headerName: 'Contract End', width: 130 },
    { field: 'status', headerName: 'Status', width: 130, cellClass: params => params.value === 'Active' ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold' }
  ], []);

  // Training Details Grid Columns
  const trainingColDefs = useMemo(() => [
    { field: 'name', headerName: 'Employee Name', flex: 1.5, minWidth: 150, cellClass: 'font-extrabold text-slate-900' },
    { field: 'designation', headerName: 'Designation', flex: 1.2 },
    { field: 'course', headerName: 'Training Course Name', flex: 2, cellClass: 'font-semibold text-blue-800' },
    { field: 'agency', headerName: 'Training Agency', flex: 1.2 },
    { field: 'startDate', headerName: 'Start Date', width: 130 },
    { field: 'endDate', headerName: 'End Date', width: 130 },
    { field: 'status', headerName: 'Status', width: 120, cellClass: params => params.value === 'Completed' ? 'text-emerald-600 font-bold text-center' : 'text-blue-600 font-bold text-center animate-pulse' }
  ], []);

  // Filter lists based on search term
  const filteredEmployees = useMemo(() => {
    return initialEmployees.filter(emp => 
      !searchTerm || 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredAbolished = useMemo(() => {
    return abolishedPosts.filter(post =>
      !searchTerm ||
      post.postName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.department.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredContractual = useMemo(() => {
    return contractualStaff.filter(staff =>
      !searchTerm ||
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staff.project.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const filteredTraining = useMemo(() => {
    return trainingDetails.filter(t =>
      !searchTerm ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.course.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Determine current active sub-tab (fallback to 'HR Dashboard' if prop is invalid or empty)
  const currentTab = SUB_TABS.some(t => t.id === activeSubTab) ? activeSubTab : 'HR Dashboard';

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">

      {/* Breadcrumbs Row matching image layout */}
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 cursor-pointer hover:underline" onClick={() => setActiveSubTab('HR Dashboard')}>HR Management</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-800 font-bold">{SUB_TABS.find(t => t.id === currentTab)?.label}</span>
      </div>

      {/* Header Row: Title & Navigation Tab Switcher on the same line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            {currentTab === 'HR Dashboard' ? 'HR Dashboard' : SUB_TABS.find(t => t.id === currentTab)?.label || 'HR Management'}
          </h2>
        </div>

        {/* Modern Segmented Control Tab Switcher */}
        <InternalNavigation
          tabs={SUB_TABS} 
          currentTab={currentTab} 
          onTabChange={setActiveSubTab}
        />
      </div>

      {/* Main Container Section */}
      <div className="space-y-6">

        {currentTab === 'HR Dashboard' && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter Section and Red Badge */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-slate-800 font-display">Dashboard</span>
                <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                  As on 25-06-2026
                </span>
              </div>

              {/* Filters Dropdown Panel */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative min-w-[200px]">
                  <select
                    value={orgCategory}
                    onChange={(e) => setOrgCategory(e.target.value)}
                    className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="">--Organizations category--</option>
                    <option value="ports">Major Ports</option>
                    <option value="iwt">Inland Waterways</option>
                    <option value="shipping">Shipping</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>

                <div className="relative min-w-[200px]">
                  <select
                    value={organisation}
                    onChange={(e) => setOrganisation(e.target.value)}
                    className="w-full text-xs pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="">--Organization--</option>
                    <option value="jnpa">JNPA</option>
                    <option value="copa">CoPA</option>
                    <option value="vocpa">VOCPA</option>
                    <option value="depa">DePA</option>
                  </select>
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards exactly as displayed in the image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Sanctioned Strength */}
              <div className="bg-[#fff9e6] border border-[#f5e4bd] rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-amber-800">
                    <Users className="h-4.5 w-4.5" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">Sanctioned Strength</span>
                  </div>
                </div>
                <div className="bg-[#fbd38d] border border-[#f6ad55] text-amber-950 font-black text-xl px-6 py-3 rounded-lg shadow-inner min-w-[100px] text-center">
                  33814
                </div>
              </div>

              {/* Card 2: Total Filled Posts */}
              <div className="bg-[#e6f4ea] border border-[#bbf7d0] rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-emerald-800">
                    <CheckCircle className="h-4.5 w-4.5" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">Total Filled Posts</span>
                  </div>
                </div>
                <div className="bg-[#a7f3d0] border border-[#34d399] text-emerald-950 font-black text-xl px-6 py-3 rounded-lg shadow-inner min-w-[100px] text-center">
                  15667
                </div>
              </div>

              {/* Card 3: Live Vacant Posts */}
              <div className="bg-[#ebf8ff] border border-[#bee3f8] rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-800">
                    <FileText className="h-4.5 w-4.5" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">Live Vacant Posts</span>
                  </div>
                </div>
                <div className="bg-[#90cdf4] border border-[#63b3ed] text-blue-950 font-black text-xl px-6 py-3 rounded-lg shadow-inner min-w-[100px] text-center">
                  12826
                </div>
              </div>

              {/* Card 4: Abolished Vacant Posts */}
              <div className="bg-[#fff5f5] border border-[#fed7d7] rounded-xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-200">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5 text-rose-800">
                    <UserX className="h-4.5 w-4.5" />
                    <span className="text-[11px] font-extrabold uppercase tracking-wider">Abolished Vacant Posts</span>
                  </div>
                </div>
                <div className="bg-[#feb2b2] border border-[#fc8181] text-rose-950 font-black text-xl px-6 py-3 rounded-lg shadow-inner min-w-[100px] text-center">
                  5310
                </div>
              </div>

            </div>

            {/* Employee Analytics Panel */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-[#4a90e2] py-2 px-4 border-b border-blue-400">
                <h3 className="text-white text-xs font-extrabold tracking-widest text-center uppercase">
                  Employee Analytics
                </h3>
              </div>

              {/* Doughnut charts panel */}
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* 1. Gender Analytics */}
                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center space-y-4">
                  <div className="w-full flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-700">GENDER ANALYTICS</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">25-06-2026</span>
                  </div>
                  <DoughnutChart data={genderData} />
                  <div className="w-full pt-2 border-t border-slate-100 flex flex-col space-y-1.5 text-[10px] font-bold text-slate-600">
                    {genderData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-extrabold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Ex-Service Employees */}
                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center space-y-4">
                  <div className="w-full flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-700">EX-SERVICE EMPLOYEES</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">25-06-2026</span>
                  </div>
                  <DoughnutChart data={exServiceData} />
                  <div className="w-full pt-2 border-t border-slate-100 flex flex-col space-y-1.5 text-[10px] font-bold text-slate-600">
                    {exServiceData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-extrabold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Employee Disability */}
                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center space-y-4">
                  <div className="w-full flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-700">EMPLOYEE DISABILITY</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">25-06-2026</span>
                  </div>
                  <DoughnutChart data={disabilityData} />
                  <div className="w-full pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-2 gap-y-1 text-[9px] font-bold text-slate-600">
                    {disabilityData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center space-x-1 overflow-hidden">
                          <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.label}</span>
                        </div>
                        <span className="font-extrabold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Community-Based Analytics */}
                <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50 flex flex-col items-center space-y-4">
                  <div className="w-full flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="text-xs font-black text-slate-700">COMMUNITY ANALYTICS</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded">25-06-2026</span>
                  </div>
                  <DoughnutChart data={communityData} />
                  <div className="w-full pt-2 border-t border-slate-100 flex flex-col space-y-1.5 text-[10px] font-bold text-slate-600">
                    {communityData.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                          <span>{item.label}</span>
                        </div>
                        <span className="font-extrabold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {currentTab === 'Employee Database' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 font-display">Employee Information Repository</h3>
                <p className="text-xs text-slate-500 font-medium">Search and export details of regular and contractual employees.</p>
              </div>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Excel</span>
                </button>
                <button className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer">
                  <FileCheck className="h-3.5 w-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search employee by name, designation, department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-medium text-slate-700"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            </div>

            {/* ag-Grid */}
            <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <AgGridReact
                theme="legacy"
                rowData={filteredEmployees}
                columnDefs={employeeColDefs}
                domLayout="autoHeight"
                rowHeight={45}
                headerHeight={45}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 90
                }}
              />
            </div>
          </div>
        )}

        {currentTab === 'List of Abolished Posts' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 font-display">Abolished Vacant Posts Register</h3>
                <p className="text-xs text-slate-500 font-medium">Record of posts which have been abolished by the Ministry to optimize staff strength.</p>
              </div>
            </div>

            {/* ag-Grid */}
            <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <AgGridReact
                theme="legacy"
                rowData={filteredAbolished}
                columnDefs={abolishedColDefs}
                domLayout="autoHeight"
                rowHeight={45}
                headerHeight={45}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 100
                }}
              />
            </div>
          </div>
        )}

        {currentTab === 'Contractual Employment' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 font-display">Contractual Employment Dashboard</h3>
                <p className="text-xs text-slate-500 font-medium">Overview of contractual appointments, consultants, and young professionals active in projects.</p>
              </div>
            </div>

            {/* ag-Grid */}
            <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <AgGridReact
                theme="legacy"
                rowData={filteredContractual}
                columnDefs={contractualColDefs}
                domLayout="autoHeight"
                rowHeight={45}
                headerHeight={45}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 100
                }}
              />
            </div>
          </div>
        )}

        {currentTab === 'Training Details' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 font-display">Staff Training & Capacity Building</h3>
                <p className="text-xs text-slate-500 font-medium">Tracking system for employee development, certifications, and specialized maritime training courses.</p>
              </div>
            </div>

            {/* ag-Grid */}
            <div className="ag-theme-quartz rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <AgGridReact
                theme="legacy"
                rowData={filteredTraining}
                columnDefs={trainingColDefs}
                domLayout="autoHeight"
                rowHeight={45}
                headerHeight={45}
                autoSizeStrategy={{
                  type: 'fitGridWidth',
                  defaultMinWidth: 100
                }}
              />
            </div>
          </div>
        )}

        {currentTab === 'HR Reports' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="text-center space-y-2 border-b border-slate-100 pb-4">
              <h3 className="text-lg font-extrabold text-slate-900 font-display">Generate HR & Staff Reports</h3>
              <p className="text-xs text-slate-500">Configure parameters to compile and download comprehensive employee datasets.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="border border-slate-200 rounded-xl p-5 space-y-4 bg-slate-50/50">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Filter className="h-4 w-4 text-blue-600" />
                  <span>Report Filter Options</span>
                </h4>
                
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold">Report Type</label>
                    <select className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700">
                      <option>Sanctioned vs Vacant Posts Summary</option>
                      <option>Employee Demographic Breakdowns</option>
                      <option>Contractual Resource Allocations</option>
                      <option>Capacity Building Course Completion Logs</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-slate-500 font-bold">Organization Filter</label>
                    <select className="w-full p-2 bg-white border border-slate-200 rounded-lg font-semibold text-slate-700">
                      <option>All Organizations</option>
                      <option>JNPA</option>
                      <option>CoPA</option>
                      <option>VOCPA</option>
                      <option>DePA</option>
                      <option>MoPSW</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-5 flex flex-col justify-between bg-slate-50/50">
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Download className="h-4 w-4 text-emerald-600" />
                    <span>Download Options</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 font-medium">Export generated data directly to spreadsheets or print-ready PDF brochures.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4">
                  <button className="py-2.5 bg-emerald-650 hover:bg-emerald-705 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5">
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Download Excel</span>
                  </button>
                  <button className="py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5">
                    <FileCheck className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
