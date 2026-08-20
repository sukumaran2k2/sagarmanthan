import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Users, Plus, Calendar, FileText, Download, Trash2, 
  Building2, Search, X, Upload, CheckCircle2, Eye, RefreshCw, Layers, ArrowLeft 
} from 'lucide-react';
import Table from '../../../components/Table';
import Loader from '../../../components/Loader';
import ExportDropdown from '../../../components/ExportDropdown';
import CopyButton from '../../../components/CopyButton';
import { 
  API_BASE,
  fetchMIVMeetingsData, 
  fetchOrganisations, 
  fetchMeetingLogsByOrg, 
  createMeeting as apiCreateMeeting, 
  deleteMeeting as apiDeleteMeeting 
} from '../api';

export default function MIVMeetings({ triggerNotification }) {
  const [meetingSummary, setMeetingSummary] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('');
  const [pageSize, setPageSize] = useState(10);

  // History / Logs Modal State
  const [selectedOrgForLogs, setSelectedOrgForLogs] = useState(null);
  const [orgLogs, setOrgLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Add Meeting Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [meetingDate, setMeetingDate] = useState('');
  const [orgId, setOrgId] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchMeetingSummary = () => {
    setLoading(true);
    fetchMIVMeetingsData()
      .then(res => {
        setMeetingSummary(res.data || []);
      })
      .catch(err => {
        console.error("Error fetching MIV meetings summary:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMeetingSummary();

    fetchOrganisations()
      .then(res => setOrganisations(res.data || []))
      .catch(err => console.error("Error loading organisations:", err));
  }, []);

  const handleOpenLogs = (org) => {
    setSelectedOrgForLogs(org);
    setLogsLoading(true);
    const orgID = org.organisation_id;

    fetchMeetingLogsByOrg(orgID)
      .then(res => {
        setOrgLogs(res.data || []);
      })
      .catch(err => {
        console.error("Error loading organisation meeting logs:", err);
        setOrgLogs([]);
      })
      .finally(() => setLogsLoading(false));
  };

  const handleAddMeeting = async (e) => {
    e.preventDefault();
    if (!meetingDate) {
      triggerNotification?.("Please specify the date of the meeting.");
      return;
    }
    if (!orgId) {
      triggerNotification?.("Please select an organisation.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('date_of_upload', meetingDate);
      formData.append('organisationID', orgId);
      if (file) {
        formData.append('file', file);
      }

      await apiCreateMeeting(formData);

      triggerNotification?.("MVIC Meeting uploaded successfully!");
      setShowAddModal(false);
      setMeetingDate('');
      setFile(null);
      fetchMeetingSummary();
      if (selectedOrgForLogs) {
        handleOpenLogs(selectedOrgForLogs);
      }
    } catch (err) {
      console.error("Error uploading meeting:", err);
      triggerNotification?.("Failed to add meeting record. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!window.confirm("Are you sure you want to delete this meeting record?")) return;
    try {
      await apiDeleteMeeting(meetingId);
      triggerNotification?.("Meeting record deleted successfully.");
      if (selectedOrgForLogs) {
        handleOpenLogs(selectedOrgForLogs);
      }
      fetchMeetingSummary();
    } catch (err) {
      console.error("Error deleting meeting:", err);
      triggerNotification?.("Failed to delete meeting.");
    }
  };

  const formatDate = (val) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return val;
    }
  };

  const orgOptions = useMemo(() => {
    if (organisations && organisations.length > 0) {
      return organisations.map(o => ({
        id: o.organisation_id,
        name: o.organisation_name || o.organisation_label || o.oranisation_name
      }));
    }
    const list = [];
    const seen = new Set();
    meetingSummary.forEach(m => {
      if (m.organisation_id && !seen.has(m.organisation_id)) {
        seen.add(m.organisation_id);
        list.push({
          id: m.organisation_id,
          name: m.organisation_name || `Organisation ${m.organisation_id}`
        });
      }
    });
    return list;
  }, [organisations, meetingSummary]);

  const filteredData = useMemo(() => {
    return meetingSummary.filter(m => {
      if (selectedOrgFilter && String(m.organisation_id) !== String(selectedOrgFilter)) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const name = (m.organisation_name || '').toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });
  }, [meetingSummary, selectedOrgFilter, searchTerm]);

  // Total summary figures
  const totalMeetings = useMemo(() => {
    return meetingSummary.reduce((acc, m) => acc + (parseInt(m.meeting_document_count) || 0), 0);
  }, [meetingSummary]);

  // Export data for all organisations summary
  const exportData = useMemo(() => {
    const headers = ['S.No', 'Organisation Name', 'Total MVIC Meetings Conducted'];
    const rows = filteredData.map((m, i) => [
      i + 1,
      m.organisation_name || `Organisation ${m.organisation_id}`,
      m.meeting_document_count || 0,
    ]);
    return { headers, rows };
  }, [filteredData]);

  // Export data for single organisation history
  const historyExportData = useMemo(() => {
    const headers = ['S.No', 'Organisation Name', 'Date of Meeting', 'MoM Document'];
    const orgName = selectedOrgForLogs?.organisation_name || '-';
    const rows = orgLogs.map((log, i) => [
      i + 1,
      orgName,
      formatDate(log.date_of_meeting),
      log.file_name || 'No document',
    ]);
    return { headers, rows };
  }, [orgLogs, selectedOrgForLogs]);

  const columnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: 'node.rowIndex + 1',
      width: 80,
      pinned: 'left',
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center font-bold',
      headerClass: 'text-center'
    },
    {
      headerName: 'Organisation Name',
      field: 'organisation_name',
      flex: 2,
      minWidth: 260,
      cellClass: 'font-bold text-slate-800 dark:text-slate-200',
    },
    {
      headerName: 'Total MVIC Meetings Conducted',
      field: 'meeting_document_count',
      flex: 1.2,
      minWidth: 200,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params) => (
        <span className="font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-xs shadow-sm">
          {params.value || 0}
        </span>
      ),
    },
    {
      headerName: 'History & Logs',
      field: 'actions',
      width: 140,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params) => (
        <button
          onClick={() => handleOpenLogs(params.data)}
          title="View Meeting History"
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer text-xs font-semibold shadow-sm"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>History</span>
        </button>
      ),
      sortable: false,
      filter: false,
    },
  ], []);

  // AG Grid Column definitions for in-place History Table
  const historyColumnDefs = useMemo(() => [
    {
      headerName: 'S.No',
      valueGetter: 'node.rowIndex + 1',
      width: 80,
      pinned: 'left',
      cellClass: 'font-mono text-slate-600 dark:text-slate-400 text-center font-bold',
      headerClass: 'text-center'
    },
    {
      headerName: 'Date of Meeting',
      field: 'date_of_meeting',
      flex: 1.5,
      minWidth: 180,
      cellRenderer: (params) => (
        <span className="font-bold text-[#0f417a] dark:text-blue-400 font-mono text-xs">
          {formatDate(params.value)}
        </span>
      ),
    },
    {
      headerName: 'Minutes of Meeting (MoM) Document',
      field: 'file_name',
      flex: 3,
      minWidth: 320,
      cellRenderer: (params) => {
        const file_name = params.value;
        const id = params.data?.meeting_document_id || params.data?.id;
        if (!file_name) {
          return <span className="text-slate-400 italic text-xs">No document attached</span>;
        }
        return (
          <div className="flex items-center h-full py-1">
            <a
              href={`${API_BASE}/meeting/download/${id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl text-xs font-bold transition border border-blue-200 dark:border-blue-800 shadow-sm"
            >
              <Download className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="truncate max-w-[280px]">{file_name}</span>
            </a>
          </div>
        );
      },
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 110,
      cellClass: 'text-center',
      headerClass: 'text-center',
      cellRenderer: (params) => {
        const id = params.data?.meeting_document_id || params.data?.id;
        return (
          <div className="flex items-center justify-center h-full">
            <button
              onClick={() => handleDeleteMeeting(id)}
              title="Delete Record"
              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
      sortable: false,
      filter: false,
    },
  ], []);

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-xl text-blue-600 dark:text-blue-400">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Total Meetings Conducted</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalMeetings}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Participating Organisations</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{meetingSummary.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-xl text-purple-600 dark:text-purple-400">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Average per Port</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {meetingSummary.length > 0 ? (totalMeetings / meetingSummary.length).toFixed(1) : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table Card Container (Switches In-Place between Summary and Org History) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">
        
        {/* ==================================================== */}
        {/* VIEW 1: ORGANISATION MEETING HISTORY (IN-PLACE)     */}
        {/* ==================================================== */}
        {selectedOrgForLogs ? (
          <div className="space-y-5 animate-fade-in">
            {/* Header with Back Button + Breadcrumbs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrgForLogs(null)}
                  className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer shadow-sm flex items-center space-x-1.5"
                  title="Back to All Organisations"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs font-bold hidden sm:inline">Back</span>
                </button>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
                      {selectedOrgForLogs.organisation_name}
                    </h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-mono">
                      {orgLogs.length} Records
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Official documented Minutes of Meeting (MoM) records and audit logs.
                  </p>
                </div>
              </div>

              {/* In-Place History Actions */}
              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <CopyButton
                  data={historyExportData.rows}
                  headers={historyExportData.headers}
                  onSuccess={() => triggerNotification?.("Meeting history copied to clipboard!")}
                  color="#0f417a"
                  className="!rounded-xl !py-2 !px-3.5 shadow-sm"
                />

                <ExportDropdown
                  headers={historyExportData.headers}
                  rows={historyExportData.rows}
                  fileName={`MVIC_Meeting_History_${(selectedOrgForLogs.organisation_name || 'Org').replace(/\s+/g, '_')}`}
                  title={`MVIC Meeting History - ${selectedOrgForLogs.organisation_name}`}
                  triggerNotification={triggerNotification}
                  color="#0f417a"
                />

                <button
                  onClick={() => {
                    setOrgId(selectedOrgForLogs.organisation_id || '');
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-[#0f417a] hover:from-blue-700 hover:to-[#0a2e56] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Meeting</span>
                </button>

                <button
                  onClick={() => handleOpenLogs(selectedOrgForLogs)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm"
                  title="Refresh Logs"
                >
                  <RefreshCw className={`h-4 w-4 ${logsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Logs Data Table / List */}
            {logsLoading ? (
              <div className="py-16 text-center">
                <Loader message={`Loading meeting history for ${selectedOrgForLogs.organisation_name}...`} fullPage={false} />
              </div>
            ) : orgLogs.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-400 font-medium space-y-3 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                <Users className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600" />
                <p>No meeting records found for this organisation yet.</p>
                <button
                  onClick={() => {
                    setOrgId(selectedOrgForLogs.organisation_id || '');
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-xl font-bold text-xs hover:bg-blue-100 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Upload First MoM Document</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <Table
                  rowData={orgLogs}
                  columnDefs={historyColumnDefs}
                  loading={logsLoading}
                  pageSize={10}
                />
              </div>
            )}
          </div>
        ) : (
          /* ==================================================== */
          /* VIEW 2: ALL ORGANISATIONS SUMMARY TABLE             */
          /* ==================================================== */
          <>
            {/* Toolbar Row with Search + Filter + Actions */}
            <div className="flex flex-col lg:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
              
              <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0 w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search organisation..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0f417a]/30 focus:outline-none placeholder-slate-400 text-slate-800 dark:text-slate-200 shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Organisation dropdown filter */}
                <div className="relative min-w-[200px]">
                  <select
                    value={selectedOrgFilter}
                    onChange={(e) => setSelectedOrgFilter(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#0f417a]/30 focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer shadow-sm"
                  >
                    <option value="">All Organisations ({orgOptions.length})</option>
                    {orgOptions.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>

                {(selectedOrgFilter || searchTerm) && (
                  <button
                    onClick={() => {
                      setSelectedOrgFilter('');
                      setSearchTerm('');
                    }}
                    className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-bold transition cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center space-x-2 self-end lg:self-auto">
                <CopyButton
                  data={exportData.rows}
                  headers={exportData.headers}
                  onSuccess={() => triggerNotification?.("Meetings data copied to clipboard!")}
                  color="#0f417a"
                  className="!rounded-xl !py-2 !px-3.5 shadow-sm"
                />

                <ExportDropdown
                  headers={exportData.headers}
                  rows={exportData.rows}
                  fileName="MVIC_Meetings_Report"
                  title="Maritime India Vision 2030 - MVIC Meetings"
                  triggerNotification={triggerNotification}
                  color="#0f417a"
                />

                <button
                  onClick={() => {
                    setOrgId(selectedOrgFilter || '');
                    setShowAddModal(true);
                  }}
                  className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-[#0f417a] hover:from-blue-700 hover:to-[#0a2e56] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add MVIC Meeting</span>
                </button>
              </div>

            </div>

            {/* Data Table */}
            <Table
              rowData={filteredData}
              columnDefs={columnDefs}
              loading={loading}
              pageSize={pageSize}
            />

            {/* Table Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="font-semibold">
                Showing <strong className="text-slate-800 dark:text-slate-200">{filteredData.length}</strong> of{' '}
                <strong className="text-slate-800 dark:text-slate-200">{meetingSummary.length}</strong> organisations
              </span>

              <div className="flex items-center space-x-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Add Meeting Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-scale-up overflow-hidden">
            
            <div className="px-6 py-4 bg-gradient-to-r from-[#0f417a] to-[#1e5fa0] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Users className="h-5 w-5" />
                <h3 className="text-sm font-bold text-white">Add MVIC Meeting</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddMeeting} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Date of Meeting <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Organisation <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">-- Select Organisation --</option>
                  {orgOptions.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Minutes of Meeting Document Uploader (.pdf only, max 20MB)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
                {file && (
                  <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                    Selected: {file.name}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer shadow-sm"
                >
                  Exit
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center space-x-2 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                >
                  {submitting ? <span>Uploading...</span> : <span>Submit</span>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
