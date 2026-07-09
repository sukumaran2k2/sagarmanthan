import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Filter, ChevronUp, ChevronDown, FileSpreadsheet, Copy, FileText, ChevronLeft, ChevronRight, Home, Plus, X, Edit } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';

ModuleRegistry.registerModules([AllCommunityModule]);

const monthsList = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MediaOutreach({ triggerNotification, userPermissions }) {
  const gridRef = useRef();
  const [mediaData, setMediaData] = useState([]);
  const [mmtOrganisations, setMmtOrganisations] = useState([]);
  const [selectedFY, setSelectedFY] = useState('All');
  const [selectedOrg, setSelectedOrg] = useState('All');
  const [selectedMonth, setSelectedMonth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);


  // Modal / Add state
  const [isAdding, setIsAdding] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('tv'); // 'tv', 'print', 'online', 'social'
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedRowToUpdate, setSelectedRowToUpdate] = useState(null);

  // Form input fields
  const [formFY, setFormFY] = useState('2026-2027');
  const [formMonth, setFormMonth] = useState('June');
  const [formOrg, setFormOrg] = useState('');

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

  // Update states
  const [updateFY, setUpdateFY] = useState('');
  const [updateMonth, setUpdateMonth] = useState('');
  const [updateNational, setUpdateNational] = useState('');
  const [updateRegional, setUpdateRegional] = useState('');
  const [updateOverall, setUpdateOverall] = useState('');

  const ORGANISATIONS = useMemo(() => {
    return mmtOrganisations.map(o => o.organisation_name);
  }, [mmtOrganisations]);

  const fetchData = async () => {
    try {
      const orgsRes = await axios.get("http://localhost:3000/mmt-dropdown/mmt_organisation");
      const orgs = orgsRes.data;
      setMmtOrganisations(orgs);
      if (orgs.length > 0 && !formOrg) {
        setFormOrg(orgs[0].organisation_name);
      }

      const res = await axios.get("http://localhost:3000/monthly-socialmedia-parameter/1");
      const mapped = res.data.map(r => {
        const orgObj = orgs.find(o => o.organisation_id === r.organisation_id) || {};
        return {
          id: r.media_outreach_id,
          organisation: orgObj.organisation_name || r.organisation_name || `Organisation ${r.organisation_id}`,
          organisation_id: r.organisation_id,
          fy: r.financial_year || '',
          month: r.month || '',
          national: (r.broadcast_national || 0) + (r.print_media_national || 0),
          regional: (r.broadcast_regional || 0) + (r.print_media_regional || 0),
          overall: (r.broadcast_overall || 0) + (r.print_media_overall || 0) + (r.online_overall || 0),
          tv: {
            national: r.broadcast_national || 0,
            regional: r.broadcast_regional || 0,
            overall: r.broadcast_overall || 0
          },
          print: {
            national: r.print_media_national || 0,
            regional: r.print_media_regional || 0,
            overall: r.print_media_overall || 0
          },
          online: {
            english: r.online_english || 0,
            vernacular: r.online_vernacular || 0,
            overall: r.online_overall || 0
          },
          social: {
            twitter: { posts: r.twitter_posts || 0, impression: r.twitter_impression || 0, engagement: r.twitter_engagement || 0 },
            instagram: { posts: r.instagram_posts || 0, impression: r.instagram_impression || 0, engagement: r.instagram_engagement || 0 },
            facebook: { posts: r.facebook_posts || 0, impression: r.facebook_impression || 0, engagement: r.facebook_engagement || 0 },
            linkedIn: { posts: r.linkedIn_posts || 0, impression: r.linkedIn_impression || 0, engagement: r.linkedIn_engagement || 0 },
            youtube: { posts: r.youTube_posts || 0, impression: r.youTube_impression || 0, engagement: r.youTube_engagement || 0 }
          }
        };
      });
      setMediaData(mapped);
    } catch (err) {
      console.error("Error fetching media outreach data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isAdding, isUpdating]);

  // Overall calculations for Add form
  useEffect(() => {
    const nat = parseInt(tvNational) || 0;
    const reg = parseInt(tvRegional) || 0;
    setTvOverall((nat + reg).toString());
  }, [tvNational, tvRegional]);

  useEffect(() => {
    const nat = parseInt(printNational) || 0;
    const reg = parseInt(printRegional) || 0;
    setPrintOverall((nat + reg).toString());
  }, [printNational, printRegional]);

  useEffect(() => {
    const eng = parseInt(onlineEnglish) || 0;
    const vern = parseInt(onlineVernacular) || 0;
    setOnlineOverall((eng + vern).toString());
  }, [onlineEnglish, onlineVernacular]);

  // Overall calculations for Update form
  useEffect(() => {
    const nat = parseInt(updateNational) || 0;
    const reg = parseInt(updateRegional) || 0;
    setUpdateOverall((nat + reg).toString());
  }, [updateNational, updateRegional]);

  const handleOpenUpdate = (row) => {
    setSelectedRowToUpdate(row);
    setUpdateFY(row.fy);
    setUpdateMonth(row.month);
    setUpdateNational(row.national.toString());
    setUpdateRegional(row.regional.toString());
    setUpdateOverall(row.overall.toString());
    setIsUpdating(true);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!updateFY || !updateNational || !updateRegional || !updateOverall) {
      alert('Please fill out all mandatory fields.');
      return;
    }
    
    try {
      await axios.put("http://localhost:3000/media-outreach-data-edit", {
        type: 'broadcast',
        updateBroadcastNational: parseInt(updateNational) || 0,
        updateBroadcastRegional: parseInt(updateRegional) || 0,
        updateBroadcastOverall: parseInt(updateOverall) || 0,
        mediaOutreachIdOrg: selectedRowToUpdate.id,
        userID: 1
      });
      
      await axios.put("http://localhost:3000/media-outreach-data-edit", {
        type: 'print',
        updateprintMediaNational: parseInt(updateNational) || 0,
        updateprintMediaRegional: parseInt(updateRegional) || 0,
        updateprintMediaOverall: parseInt(updateOverall) || 0,
        mediaOutreachIdOrg: selectedRowToUpdate.id,
        userID: 1
      });
      
      setIsUpdating(false);
      fetchData();
      if (triggerNotification) {
        triggerNotification(`Successfully updated Media Outreach record for ${selectedRowToUpdate.organisation}.`);
      }
    } catch (err) {
      console.error("Error updating media outreach:", err);
      alert("Failed to update media outreach.");
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formFY || !formMonth || !formOrg) {
      alert('Please select Financial Year, Month and Organisation.');
      return;
    }

    const orgObj = mmtOrganisations.find(o => o.organisation_name === formOrg) || { organisation_id: 1 };
    
    const payload = {
      financialYear: formFY,
      month: formMonth,
      organisation: orgObj.organisation_id,
      BroadcastChecked: tvNational || tvRegional ? 'Yes' : 'No',
      BroadcastNational: parseInt(tvNational) || 0,
      BroadcastRegional: parseInt(tvRegional) || 0,
      BroadcastOverall: parseInt(tvOverall) || 0,
      PrintMediaChecked: printNational || printRegional ? 'Yes' : 'No',
      PrintMediaNational: parseInt(printNational) || 0,
      PrintMediaRegional: parseInt(printRegional) || 0,
      PrintMediaOverall: parseInt(printOverall) || 0,
      OnlineChecked: onlineEnglish || onlineVernacular ? 'Yes' : 'No',
      OnlineEnglish: parseInt(onlineEnglish) || 0,
      OnlineVernacular: parseInt(onlineVernacular) || 0,
      OnlineOverall: parseInt(onlineOverall) || 0,
      SocialMediaChecked: 'Yes',
      TwitterPosts: parseInt(socialTwitterPosts) || 0,
      TwitterImpression: parseInt(socialTwitterImp) || 0,
      TwitterEngagement: parseInt(socialTwitterEng) || 0,
      InstagramPosts: parseInt(socialInstaPosts) || 0,
      InstagramImpression: parseInt(socialInstaImp) || 0,
      InstagramEngagement: parseInt(socialInstaEng) || 0,
      FacebookPosts: parseInt(socialFBPosts) || 0,
      FacebookImpression: parseInt(socialFBImp) || 0,
      FacebookEngagement: parseInt(socialFBEng) || 0,
      LinkedInPosts: parseInt(socialLinkedInPosts) || 0,
      LinkedInImpression: parseInt(socialLinkedInImp) || 0,
      LinkedInEngagement: parseInt(socialLinkedInEng) || 0,
      youTubePosts: parseInt(socialYTPosts) || 0,
      youTubeImpression: parseInt(socialYTImp) || 0,
      youTubeEngagement: parseInt(socialYTEng) || 0
    };

    try {
      await axios.post("http://localhost:3000/create-social-media", payload);
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
      
      fetchData();
      if (triggerNotification) {
        triggerNotification(`New Media Outreach record successfully added for ${formOrg}.`);
      }
    } catch (err) {
      if (err.response && err.response.status === 302) {
        alert("Record already exists for this organization, month and financial year.");
      } else {
        console.error("Error creating social media record:", err);
        alert("Failed to create record.");
      }
    }
  };

  const colDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'S.No',
        field: 'sno',
        valueGetter: (params) => params.node.rowIndex + 1 + (currentPage - 1) * entriesLimit,
        width: 70,
        pinned: 'left',
        cellClass: 'text-center font-bold text-slate-505 border-r border-slate-200 flex items-center justify-center'
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
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => handleOpenUpdate(params.data)}
              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded shadow-sm hover:shadow transition cursor-pointer"
              title="Update Media Outreach"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>
        )
      }
    ];
    if (userPermissions && userPermissions.update === false) {
      return cols.filter(c => c.headerName !== 'Update');
    }
    return cols;
  }, [userPermissions, currentPage, entriesLimit]);

  const handleOpenAdd = () => {
    setIsAdding(true);
    setActiveFormTab('tv');
  };

  // Filter logic
  const filteredData = useMemo(() => {
    let result = [...mediaData];
    if (selectedFY !== 'All') {
      result = result.filter(r => r.fy === selectedFY);
    }
    if (selectedOrg !== 'All') {
      result = result.filter(r => r.organisation.toLowerCase() === selectedOrg.toLowerCase());
    }
    if (selectedMonth !== 'All') {
      result = result.filter(r => r.month === selectedMonth);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(r =>
        r.organisation.toLowerCase().includes(q) ||
        r.fy.toLowerCase().includes(q) ||
        r.month.toLowerCase().includes(q)
      );
    }
    return result;
  }, [mediaData, selectedFY, selectedOrg, selectedMonth, searchQuery]);

  const totalEntries = filteredData.length;
  const totalPages = Math.ceil(totalEntries / entriesLimit) || 1;


  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * entriesLimit;
    return filteredData.slice(start, start + entriesLimit);
  }, [filteredData, currentPage, entriesLimit]);

  const handlePageChange = (page) => {
    if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
      gridRef.current.api.paginationGoToPage(page - 1);
      setCurrentPage(page);
    }
  };

  const onPaginationChanged = () => {
    if (gridRef.current && gridRef.current.api) {
      const gridPage = gridRef.current.api.paginationGetCurrentPage() + 1;
      if (gridPage !== currentPage) {
        setCurrentPage(gridPage);
      }
    }
  };

  const handleGridWheel = (e) => {
    if (gridRef.current && gridRef.current.api) {
      const scrollAmount = e.deltaY;
      const gridContainer = gridRef.current.api.getGridBodyViewportElement?.() || gridRef.current.api.getGridBodyElement?.();
      if (gridContainer) {
        gridContainer.scrollLeft += scrollAmount;
      }
    }
  };

  if (isAdding) {
    return (
      <div className="p-6 space-y-6 animate-fade-in pb-12">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a]">
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

          <form onSubmit={handleAddSubmit} className="p-6 space-y-6">
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

            <div className="flex border-b border-slate-100 font-semibold">
              {['tv', 'print', 'online', 'social'].map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveFormTab(t)}
                  className={`px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-all ${activeFormTab === t
                    ? 'border-blue-600 text-blue-700'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  {t === 'tv' && 'Broadcast Tv Media'}
                  {t === 'print' && 'Print Media'}
                  {t === 'online' && 'Online'}
                  {t === 'social' && 'Social Media'}
                </button>
              ))}
            </div>

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
                        {['Twitter', 'Instagram', 'Facebook', 'LinkedIn', 'Youtube'].map(ch => {
                          const getVal = (field) => {
                            if (ch === 'Twitter') return field === 'posts' ? socialTwitterPosts : field === 'imp' ? socialTwitterImp : socialTwitterEng;
                            if (ch === 'Instagram') return field === 'posts' ? socialInstaPosts : field === 'imp' ? socialInstaImp : socialInstaEng;
                            if (ch === 'Facebook') return field === 'posts' ? socialFBPosts : field === 'imp' ? socialFBImp : socialFBEng;
                            if (ch === 'LinkedIn') return field === 'posts' ? socialLinkedInPosts : field === 'imp' ? socialLinkedInImp : socialLinkedInEng;
                            return field === 'posts' ? socialYTPosts : field === 'imp' ? socialYTImp : socialYTEng;
                          };
                          const setVal = (field, val) => {
                            if (ch === 'Twitter') {
                              if (field === 'posts') setSocialTwitterPosts(val);
                              else if (field === 'imp') setSocialTwitterImp(val);
                              else setSocialTwitterEng(val);
                            } else if (ch === 'Instagram') {
                              if (field === 'posts') setSocialInstaPosts(val);
                              else if (field === 'imp') setSocialInstaImp(val);
                              else setSocialInstaEng(val);
                            } else if (ch === 'Facebook') {
                              if (field === 'posts') setSocialFBPosts(val);
                              else if (field === 'imp') setSocialFBImp(val);
                              else setSocialFBEng(val);
                            } else if (ch === 'LinkedIn') {
                              if (field === 'posts') setSocialLinkedInPosts(val);
                              else if (field === 'imp') setSocialLinkedInImp(val);
                              else setSocialLinkedInEng(val);
                            } else {
                              if (field === 'posts') setSocialYTPosts(val);
                              else if (field === 'imp') setSocialYTImp(val);
                              else setSocialYTEng(val);
                            }
                          };
                          return (
                            <tr key={ch}>
                              <td className="px-4 py-2 font-bold">{ch}</td>
                              <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={getVal('posts')} onChange={e => setVal('posts', e.target.value)} /></td>
                              <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={getVal('imp')} onChange={e => setVal('imp', e.target.value)} /></td>
                              <td className="px-4 py-2"><input type="number" className="border border-slate-250 px-2 py-1 rounded w-32 focus:outline-none" value={getVal('eng')} onChange={e => setVal('eng', e.target.value)} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 font-semibold">
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
            <Home className="h-3.5 w-3.5 text-slate-400" />
            <span>/</span>
            <span>Governance</span>
            <span>/</span>
            <span className="text-blue-800">Media Outreach</span>
          </div>
        </div>

        {(!userPermissions || userPermissions.add !== false) && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-1.5 px-4.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm hover:shadow transition duration-150 self-start md:self-auto cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add outreach Record</span>
          </button>
        )}
      </div>

      {/* Filters Area */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
            <Filter className="h-4 w-4 text-blue-800" />
            <span>Search Filters</span>
          </div>
          <button
            onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
            className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        {isFiltersExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Financial Year</label>
              <select
                value={selectedFY}
                onChange={(e) => { setSelectedFY(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
              >
                <option value="All">All FYs</option>
                <option value="2026-2027">2026-2027</option>
                <option value="2025-2026">2025-2026</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Organisation</label>
              <select
                value={selectedOrg}
                onChange={(e) => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
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
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
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
        <div className="flex items-center space-x-1.5 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
          <button className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <Copy className="h-3.5 w-3.5" /> Copy
          </button>
          <button className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </button>
          <button className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer">
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-xs text-slate-550 whitespace-nowrap">Show</span>
            <select
              value={entriesLimit}
              onChange={(e) => { setEntriesLimit(parseInt(e.target.value)); }}
              className="px-2 py-1 border border-slate-350 rounded bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 font-bold"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span className="text-xs text-slate-555 whitespace-nowrap font-semibold">entries</span>
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
              className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700"
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
              className="p-1.5 rounded-lg border border-slate-200 text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
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
              className="p-1.5 rounded-lg border border-slate-200 text-slate-655 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Update Media Outreach Modal */}
      {isUpdating && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 px-4 py-10">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-scale-up text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 px-7 pt-7 pb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-800 font-display">Update Media Outreach</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{selectedRowToUpdate?.organisation}</p>
              </div>
              <button
                onClick={() => setIsUpdating(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer flex-shrink-0"
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
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
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
                    className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold text-slate-700"
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

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 font-semibold">
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
