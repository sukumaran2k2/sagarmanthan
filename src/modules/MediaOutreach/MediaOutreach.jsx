import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, ChevronUp, ChevronDown, FileSpreadsheet, Copy, FileText, ChevronLeft, ChevronRight, Home, Plus, X } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const ORGANISATIONS = [
  'Andaman, Lakshadweep Harbour Works',
  'Shipping Corporation of India',
  'Jawaharlal Nehru Port Authority',
  'Deendayal Port Authority',
  'Ministry of Ports,Shipping and Waterways',
  'New Mangalore Port Authority',
  'Visakhapatnam Port Authority',
  'Mormugao Port Authority',
  'SMPA - Haldia Dock Complex'
];

const INITIAL_MEDIA_DATA = [
  { id: 1, organisation: 'Andaman, Lakshadweep Harbour Works', fy: '2026-2027', month: 'June', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } },
  { id: 2, organisation: 'Shipping Corporation of India', fy: '2026-2027', month: 'May', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } },
  { id: 3, organisation: 'Jawaharlal Nehru Port Authority', fy: '2026-2027', month: 'May', national: 7, regional: 11, overall: 18, tv: { national: 2, regional: 3, overall: 5 }, print: { national: 3, regional: 5, overall: 8 }, online: { english: 2, vernacular: 3, overall: 5 }, social: { twitter: { posts: 10, impression: 500, engagement: 50 }, instagram: { posts: 5, impression: 300, engagement: 30 }, facebook: { posts: 8, impression: 400, engagement: 40 }, linkedIn: { posts: 12, impression: 600, engagement: 60 }, youtube: { posts: 4, impression: 800, engagement: 80 } } },
  { id: 4, organisation: 'Deendayal Port Authority', fy: '2026-2027', month: 'May', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } },
  { id: 5, organisation: 'Ministry of Ports,Shipping and Waterways', fy: '2026-2027', month: 'May', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } },
  { id: 6, organisation: 'New Mangalore Port Authority', fy: '2026-2027', month: 'May', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } },
  { id: 7, organisation: 'Visakhapatnam Port Authority', fy: '2026-2027', month: 'May', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } },
  { id: 8, organisation: 'Mormugao Port Authority', fy: '2026-2027', month: 'May', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } },
  { id: 9, organisation: 'SMPA - Haldia Dock Complex', fy: '2026-2027', month: 'May', national: 10, regional: 10, overall: 20, tv: { national: 3, regional: 3, overall: 6 }, print: { national: 3, regional: 4, overall: 7 }, online: { english: 4, vernacular: 3, overall: 7 }, social: { twitter: { posts: 5, impression: 200, engagement: 20 }, instagram: { posts: 6, impression: 150, engagement: 15 }, facebook: { posts: 4, impression: 180, engagement: 18 }, linkedIn: { posts: 7, impression: 210, engagement: 21 }, youtube: { posts: 2, impression: 300, engagement: 30 } } },
  { id: 10, organisation: 'Andaman, Lakshadweep Harbour Works', fy: '2026-2027', month: 'May', national: 0, regional: 0, overall: 0, tv: { national: 0, regional: 0, overall: 0 }, print: { national: 0, regional: 0, overall: 0 }, online: { english: 0, vernacular: 0, overall: 0 }, social: { twitter: { posts: 0, impression: 0, engagement: 0 }, instagram: { posts: 0, impression: 0, engagement: 0 }, facebook: { posts: 0, impression: 0, engagement: 0 }, linkedIn: { posts: 0, impression: 0, engagement: 0 }, youtube: { posts: 0, impression: 0, engagement: 0 } } }
];

// Generate extra entries to match the "524 entries" mentioned in UI
for (let i = 11; i <= 524; i++) {
  const org = ORGANISATIONS[i % ORGANISATIONS.length];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const m = months[i % months.length];
  const nat = i % 7;
  const reg = i % 11;
  INITIAL_MEDIA_DATA.push({
    id: i,
    organisation: org,
    fy: '2026-2027',
    month: m,
    national: nat,
    regional: reg,
    overall: nat + reg,
    tv: { national: Math.floor(nat / 3), regional: Math.floor(reg / 3), overall: Math.floor((nat + reg) / 3) },
    print: { national: Math.floor(nat / 3), regional: Math.floor(reg / 3), overall: Math.floor((nat + reg) / 3) },
    online: { english: Math.floor(nat / 3), vernacular: Math.floor(reg / 3), overall: Math.floor((nat + reg) / 3) },
    social: {
      twitter: { posts: nat, impression: nat * 10, engagement: nat },
      instagram: { posts: nat, impression: nat * 12, engagement: nat },
      facebook: { posts: nat, impression: nat * 8, engagement: nat },
      linkedIn: { posts: nat, impression: nat * 15, engagement: nat },
      youtube: { posts: nat, impression: nat * 20, engagement: nat }
    }
  });
}

export default function MediaOutreach({ triggerNotification }) {
  const gridRef = useRef();
  const [mediaData, setMediaData] = useState(INITIAL_MEDIA_DATA);
  const [selectedFY, setSelectedFY] = useState('All');
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Add state
  const [isAdding, setIsAdding] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('tv'); // 'tv', 'print', 'online', 'social'
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedRowToUpdate, setSelectedRowToUpdate] = useState(null);

  // Form input fields
  const [formFY, setFormFY] = useState('2026-2027');
  const [formMonth, setFormMonth] = useState('June');
  const [formOrg, setFormOrg] = useState(ORGANISATIONS[0]);

  // Sub tab forms data state
  const [tvNational, setTvNational] = useState('');
  const [tvRegional, setTvRegional] = useState('');
  const [tvOverall, setTvOverall] = useState('');

  const [printNational, setPrintNational] = useState('');
  const [printRegional, setPrintRegional] = useState('');
  const [printOverall, setPrintOverall] = useState('');

  const [onlineEnglish, setOnlineEnglish] = useState('');
  const [onlineVernacular, setOnlineVernacular] = useState('');
  const [onlineOverall, setOnlineOverall] = useState('');

  const [socialTwitterPosts, setSocialTwitterPosts] = useState('');
  const [socialTwitterImp, setSocialTwitterImp] = useState('');
  const [socialTwitterEng, setSocialTwitterEng] = useState('');

  const [socialInstaPosts, setSocialInstaPosts] = useState('');
  const [socialInstaImp, setSocialInstaImp] = useState('');
  const [socialInstaEng, setSocialInstaEng] = useState('');

  const [socialFBPosts, setSocialFBPosts] = useState('');
  const [socialFBImp, setSocialFBImp] = useState('');
  const [socialFBEng, setSocialFBEng] = useState('');

  const [socialLinkedInPosts, setSocialLinkedInPosts] = useState('');
  const [socialLinkedInImp, setSocialLinkedInImp] = useState('');
  const [socialLinkedInEng, setSocialLinkedInEng] = useState('');

  const [socialYTPosts, setSocialYTPosts] = useState('');
  const [socialYTImp, setSocialYTImp] = useState('');
  const [socialYTEng, setSocialYTEng] = useState('');

  // Update popup state
  const [updateFY, setUpdateFY] = useState('2026-2027');
  const [updateMonth, setUpdateMonth] = useState('June');
  const [updateNational, setUpdateNational] = useState('');
  const [updateRegional, setUpdateRegional] = useState('');
  const [updateOverall, setUpdateOverall] = useState('');

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // Handle calculation of Overalls dynamically
  useEffect(() => {
    const nat = parseInt(tvNational) || 0;
    const reg = parseInt(tvRegional) || 0;
    setTvOverall(nat + reg || '');
  }, [tvNational, tvRegional]);

  useEffect(() => {
    const nat = parseInt(printNational) || 0;
    const reg = parseInt(printRegional) || 0;
    setPrintOverall(nat + reg || '');
  }, [printNational, printRegional]);

  useEffect(() => {
    const eng = parseInt(onlineEnglish) || 0;
    const vern = parseInt(onlineVernacular) || 0;
    setOnlineOverall(eng + vern || '');
  }, [onlineEnglish, onlineVernacular]);

  useEffect(() => {
    const nat = parseInt(updateNational) || 0;
    const reg = parseInt(updateRegional) || 0;
    setUpdateOverall(nat + reg || '');
  }, [updateNational, updateRegional]);

  const filteredData = useMemo(() => {
    return mediaData.filter(row => {
      if (selectedFY !== 'All' && row.fy !== selectedFY) return false;
      if (selectedOrg !== 'All' && row.organisation !== selectedOrg) return false;
      if (selectedMonth !== 'All' && row.month !== selectedMonth) return false;
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        return (
          row.organisation.toLowerCase().includes(query) ||
          row.fy.toLowerCase().includes(query) ||
          row.month.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [mediaData, selectedFY, selectedOrg, selectedMonth, searchQuery]);

  const totalEntries = filteredData.length;

  // Sync entriesLimit with AG Grid Pagination Page Size
  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      gridRef.current.api.setGridOption('paginationPageSize', entriesLimit);
    }
  }, [entriesLimit]);

  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const page = gridRef.current.api.paginationGetCurrentPage() + 1;
      const total = gridRef.current.api.paginationGetTotalPages();
      setCurrentPage(page);
      setTotalPages(total || 1);
    }
  };

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
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

  const handleOpenUpdate = (row) => {
    setSelectedRowToUpdate(row);
    setUpdateFY(row.fy);
    setUpdateMonth(row.month);
    setUpdateNational(row.national.toString());
    setUpdateRegional(row.regional.toString());
    setUpdateOverall(row.overall.toString());
    setIsUpdating(true);
  };

  const handleUpdateSubmit = (e) => {
    e.preventDefault();
    if (!updateFY || !updateNational || !updateRegional || !updateOverall) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    setMediaData(prev =>
      prev.map(row =>
        row.id === selectedRowToUpdate.id
          ? {
            ...row,
            fy: updateFY,
            month: updateMonth,
            national: parseInt(updateNational) || 0,
            regional: parseInt(updateRegional) || 0,
            overall: parseInt(updateOverall) || 0
          }
          : row
      )
    );
    setIsUpdating(false);
    if (triggerNotification) {
      triggerNotification(`Successfully updated Media Outreach record for ${selectedRowToUpdate.organisation}.`);
    }
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!formFY || !formMonth || !formOrg) {
      alert('Please select Financial Year, Month and Organisation.');
      return;
    }

    const nat = (parseInt(tvNational) || 0) + (parseInt(printNational) || 0) + (parseInt(onlineEnglish) || 0);
    const reg = (parseInt(tvRegional) || 0) + (parseInt(printRegional) || 0) + (parseInt(onlineVernacular) || 0);

    const newRecord = {
      id: mediaData.length + 1,
      organisation: formOrg,
      fy: formFY,
      month: formMonth,
      national: nat,
      regional: reg,
      overall: nat + reg,
      tv: {
        national: parseInt(tvNational) || 0,
        regional: parseInt(tvRegional) || 0,
        overall: parseInt(tvOverall) || 0
      },
      print: {
        national: parseInt(printNational) || 0,
        regional: parseInt(printRegional) || 0,
        overall: parseInt(printOverall) || 0
      },
      online: {
        english: parseInt(onlineEnglish) || 0,
        vernacular: parseInt(onlineVernacular) || 0,
        overall: parseInt(onlineOverall) || 0
      },
      social: {
        twitter: { posts: parseInt(socialTwitterPosts) || 0, impression: parseInt(socialTwitterImp) || 0, engagement: parseInt(socialTwitterEng) || 0 },
        instagram: { posts: parseInt(socialInstaPosts) || 0, impression: parseInt(socialInstaImp) || 0, engagement: parseInt(socialInstaEng) || 0 },
        facebook: { posts: parseInt(socialFBPosts) || 0, impression: parseInt(socialFBImp) || 0, engagement: parseInt(socialFBEng) || 0 },
        linkedIn: { posts: parseInt(socialLinkedInPosts) || 0, impression: parseInt(socialLinkedInImp) || 0, engagement: parseInt(socialLinkedInEng) || 0 },
        youtube: { posts: parseInt(socialYTPosts) || 0, impression: parseInt(socialYTImp) || 0, engagement: parseInt(socialYTEng) || 0 }
      }
    };

    setMediaData([newRecord, ...mediaData]);
    setIsAdding(false);

    // Reset inputs
    setTvNational(''); setTvRegional(''); setTvOverall('');
    setPrintNational(''); setPrintRegional(''); setPrintOverall('');
    setOnlineEnglish(''); setOnlineVernacular(''); setOnlineOverall('');
    setSocialTwitterPosts(''); setSocialTwitterImp(''); setSocialTwitterEng('');
    setSocialInstaPosts(''); setSocialInstaImp(''); setSocialInstaEng('');
    setSocialFBPosts(''); setSocialFBImp(''); setSocialFBEng('');
    setSocialLinkedInPosts(''); setSocialLinkedInImp(''); setSocialLinkedInEng('');
    setSocialYTPosts(''); setSocialYTImp(''); setSocialYTEng('');

    if (triggerNotification) {
      triggerNotification(`New Media Outreach record successfully added for ${formOrg}.`);
    }
  };

  const colDefs = useMemo(() => [
    {
      headerName: 'S No',
      field: 'sno',
      valueGetter: (params) => params.node.rowIndex + 1,
      width: 70,
      pinned: 'left',
      cellClass: 'text-center font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center'
    },
    {
      headerName: 'Organisation',
      field: 'organisation',
      minWidth: 280,
      flex: 2,
      pinned: 'left',
      cellClass: 'font-semibold text-slate-700 flex items-center pl-4 border-r border-slate-200 hover:text-blue-705'
    },
    {
      headerName: 'Financial Year',
      field: 'fy',
      minWidth: 140,
      flex: 1,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'Month',
      field: 'month',
      minWidth: 120,
      flex: 1,
      cellClass: 'text-center flex items-center justify-center border-r border-slate-100 font-medium'
    },
    {
      headerName: 'National',
      field: 'national',
      minWidth: 120,
      flex: 1,
      cellClass: 'text-center font-bold text-slate-800 border-r border-slate-100 flex items-center justify-center'
    },
    {
      headerName: 'Regional',
      field: 'regional',
      minWidth: 120,
      flex: 1,
      cellClass: 'text-center font-bold text-slate-800 border-r border-slate-100 flex items-center justify-center'
    },
    {
      headerName: 'Overall',
      field: 'overall',
      minWidth: 120,
      flex: 1,
      cellClass: 'text-center font-black text-blue-700 border-r border-slate-100 flex items-center justify-center'
    },
    {
      headerName: 'Update',
      field: 'update',
      width: 100,
      cellClass: 'text-center flex items-center justify-center',
      cellRenderer: (params) => (
        <button
          onClick={() => handleOpenUpdate(params.data)}
          className="text-xs font-bold text-blue-650 hover:text-blue-800 hover:underline cursor-pointer"
        >
          Update
        </button>
      )
    }
  ], []);

  if (isAdding) {
    return (
      <div className="p-6 space-y-6 animate-fade-in pb-12">
        {/* Form Page Header Card wrapper */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a]">
          {/* Header Title Bar */}
          <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                Add Media Outreach
              </h3>
              <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
            </div>
            <button
              onClick={() => setIsAdding(false)}
              className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
            >
              <span>Back to Database</span>
            </button>
          </div>

          {/* Form Content */}
          <form onSubmit={handleAddSubmit} className="p-6 space-y-6">
            {/* Top Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Financial Year*</label>
                <select
                  value={formFY}
                  onChange={(e) => setFormFY(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                >
                  <option value="2026-2027">2026-2027</option>
                  <option value="2025-2026">2025-2026</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Month*</label>
                <select
                  value={formMonth}
                  onChange={(e) => setFormMonth(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                >
                  {monthsList.map((m, idx) => (
                    <option key={idx} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Organisation*</label>
                <select
                  value={formOrg}
                  onChange={(e) => setFormOrg(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                >
                  {ORGANISATIONS.map((org, idx) => (
                    <option key={idx} value={org}>{org}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[10px] text-amber-600 font-semibold bg-amber-50 border border-amber-100 p-2.5 rounded-lg">
              Note : Please note that the Financial Year and Month can be changed only in the Broadcast Tv Media Tab.
            </div>

            {/* Sub tab navigation */}
            <div className="flex border-b border-slate-100">
              <button
                type="button"
                onClick={() => setActiveFormTab('tv')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeFormTab === 'tv'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                Broadcast Tv Media
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('print')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeFormTab === 'print'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                Print Media
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('online')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeFormTab === 'online'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                Online
              </button>
              <button
                type="button"
                onClick={() => setActiveFormTab('social')}
                className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeFormTab === 'social'
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                Social Media
              </button>
            </div>

            {/* Sub tab contents */}
            <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-150 min-h-[160px] flex flex-col justify-center">
              {activeFormTab === 'tv' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">Broadcast Tv Media</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-550">National</label>
                      <input
                        type="number"
                        placeholder="No of National Broadcast / Tv Media"
                        value={tvNational}
                        onChange={(e) => setTvNational(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-550">Regional</label>
                      <input
                        type="number"
                        placeholder="No of Regional Broadcast / Tv Media"
                        value={tvRegional}
                        onChange={(e) => setTvRegional(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-555">Overall</label>
                      <input
                        type="number"
                        readOnly
                        placeholder="Overall Broadcast / Tv Media"
                        value={tvOverall}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-slate-250 rounded-xl text-slate-500 cursor-not-allowed font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'print' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">Print Media</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-550">National</label>
                      <input
                        type="number"
                        placeholder="No of National Print Media"
                        value={printNational}
                        onChange={(e) => setPrintNational(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-550">Regional</label>
                      <input
                        type="number"
                        placeholder="No of Regional Print Media"
                        value={printRegional}
                        onChange={(e) => setPrintRegional(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-555">Overall</label>
                      <input
                        type="number"
                        readOnly
                        placeholder="Overall Print Media"
                        value={printOverall}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-slate-250 rounded-xl text-slate-500 cursor-not-allowed font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'online' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">Online</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-550">English</label>
                      <input
                        type="number"
                        placeholder="No of English Online Media"
                        value={onlineEnglish}
                        onChange={(e) => setOnlineEnglish(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-550">Vernacular</label>
                      <input
                        type="number"
                        placeholder="No of Vernacular Online Media"
                        value={onlineVernacular}
                        onChange={(e) => setOnlineVernacular(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-slate-555">Overall</label>
                      <input
                        type="number"
                        readOnly
                        placeholder="Overall Online Media"
                        value={onlineOverall}
                        className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-slate-250 rounded-xl text-slate-500 cursor-not-allowed font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeFormTab === 'social' && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-1.5">Social Media</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                      <thead>
                        <tr className="bg-slate-100 text-slate-850">
                          <th className="px-4 py-2 text-left">Channel</th>
                          <th className="px-4 py-2 text-left">Number of Posts</th>
                          <th className="px-4 py-2 text-left">Impression</th>
                          <th className="px-4 py-2 text-left">Engagement</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="px-4 py-2 font-bold">Twitter</td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialTwitterPosts} onChange={e => setSocialTwitterPosts(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialTwitterImp} onChange={e => setSocialTwitterImp(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialTwitterEng} onChange={e => setSocialTwitterEng(e.target.value)} /></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-bold">Instagram</td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialInstaPosts} onChange={e => setSocialInstaPosts(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialInstaImp} onChange={e => setSocialInstaImp(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialInstaEng} onChange={e => setSocialInstaEng(e.target.value)} /></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-bold">Facebook</td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialFBPosts} onChange={e => setSocialFBPosts(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialFBImp} onChange={e => setSocialFBImp(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialFBEng} onChange={e => setSocialFBEng(e.target.value)} /></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-bold">LinkedIn</td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialLinkedInPosts} onChange={e => setSocialLinkedInPosts(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialLinkedInImp} onChange={e => setSocialLinkedInImp(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialLinkedInEng} onChange={e => setSocialLinkedInEng(e.target.value)} /></td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2 font-bold">Youtube</td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialYTPosts} onChange={e => setSocialYTPosts(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialYTImp} onChange={e => setSocialYTImp(e.target.value)} /></td>
                          <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={socialYTEng} onChange={e => setSocialYTEng(e.target.value)} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Form Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-55 transition cursor-pointer"
              >
                Cancel
              </button>
              {activeFormTab !== 'social' ? (
                <button
                  type="button"
                  onClick={() => {
                    const tabs = ['tv', 'print', 'online', 'social'];
                    const nextIndex = tabs.indexOf(activeFormTab) + 1;
                    setActiveFormTab(tabs[nextIndex]);
                  }}
                  className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Save outreach Record
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in pb-12">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-display">Media Outreach</h2>
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            <span>Home</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-650">Media Outreach - (Input Form)</span>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add Media Outreach</span>
        </button>
      </div>

      {/* Filters Container Banner (Similar layout as Project Categories) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <button
          onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
          className={`w-full flex items-center justify-between text-left transition cursor-pointer ${isFiltersExpanded ? 'pb-3 border-b border-slate-100 mb-4' : ''
            }`}
        >
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 font-display">Media Outreach Filter Options</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-400">
            <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
            {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </button>

        {isFiltersExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial Year</label>
              <select
                value={selectedFY}
                onChange={(e) => { setSelectedFY(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                <option value="All">All Years</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organisation</label>
              <select
                value={selectedOrg}
                onChange={(e) => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                <option value="All">All Organisations</option>
                {ORGANISATIONS.map((org, idx) => (
                  <option key={idx} value={org}>{org}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                <option value="All">All Months</option>
                {monthsList.map((m, idx) => (
                  <option key={idx} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Grid Controls (Show Entries & Search) */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Copy, Excel, PDF export options */}
        <div className="flex items-center space-x-1.5 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
          <button onClick={() => { }} className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button onClick={() => { }} className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button onClick={() => { }} className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        </div>

        {/* Entries select & Search Input */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-505 whitespace-nowrap">Show</span>
            <select
              value={entriesLimit}
              onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); }}
              className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-slate-505 whitespace-nowrap font-medium">entries</span>
          </div>

          <div className="relative w-full sm:w-60">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold"
            />
          </div>
        </div>
      </div>

      {/* Main Responsive Table */}
      <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
        <AgGridReact
          ref={gridRef}
          theme="legacy"
          rowData={filteredData}
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
            type: 'fitGridWidth'
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
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>



      {/* Update Media Outreach Modal */}
      {isUpdating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 px-4 py-10">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 px-7 pt-7 pb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 font-display">Update Media Outreach</h3>
                <p className="text-xs text-slate-555 font-medium mt-0.5">{selectedRowToUpdate?.organisation}</p>
              </div>
              <button
                onClick={() => setIsUpdating(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="px-7 pt-5 pb-7 space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Financial Year*</label>
                  <select
                    value={updateFY}
                    onChange={(e) => setUpdateFY(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    <option value="2026-2027">2026-2027</option>
                    <option value="2025-2026">2025-2026</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Month</label>
                  <select
                    value={updateMonth}
                    onChange={(e) => setUpdateMonth(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                  >
                    {monthsList.map((m, idx) => (
                      <option key={idx} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-550">National*</label>
                  <input
                    type="number"
                    required
                    placeholder="National publications"
                    value={updateNational}
                    onChange={(e) => setUpdateNational(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-550">Regional*</label>
                  <input
                    type="number"
                    required
                    placeholder="Regional publications"
                    value={updateRegional}
                    onChange={(e) => setUpdateRegional(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 bg-white border border-slate-250 rounded-xl focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-555">Overall*</label>
                  <input
                    type="number"
                    readOnly
                    placeholder="Overall publications"
                    value={updateOverall}
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-100 border border-slate-250 rounded-xl text-slate-500 cursor-not-allowed font-bold"
                  />
                </div>

                <div className="text-[10px] text-slate-400 font-medium">
                  Fields marked with * are mandatory
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUpdating(false)}
                  className="px-4.5 py-2 border border-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4.5 py-2 bg-[#0f417a] hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-sm transition cursor-pointer"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
