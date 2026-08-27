import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Filter, Plus, Edit, Eye, Image as ImageIcon, 
  Download, RefreshCw, X, Calendar, Building2, Heart, 
  CheckCircle2, Clock, FileText, ChevronRight, Coins 
} from 'lucide-react';
import { 
  fetchCsrProjectsList, 
  downloadCsrDocument, 
  fetchCsrGalleryFiles, 
  fetchCsrExpenditureCost,
  fetchOrganisations 
} from '../api';
import { CSR_FOCUS_AREAS, CSR_STATUSES, FINANCIAL_YEARS, STATUS_COLORS } from '../utils/constants';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';

export default function DataList({
  onAddNew,
  onEdit,
  triggerNotification
}) {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [organisations, setOrganisations] = useState([]);

  // Multi-criteria filters
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedFY, setSelectedFY] = useState('');
  const [selectedFocus, setSelectedFocus] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  // Detail Modal State
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectExpenditures, setProjectExpenditures] = useState([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // Gallery Modal State
  const [galleryProject, setGalleryProject] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [loadingGallery, setLoadingGallery] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const [projRes, orgsRes] = await Promise.all([
        fetchCsrProjectsList(),
        fetchOrganisations()
      ]);
      setProjects(Array.isArray(projRes) ? projRes : []);
      setOrganisations(Array.isArray(orgsRes) ? orgsRes : []);
    } catch (err) {
      console.error("Error loading CSR projects", err);
      triggerNotification?.("Failed to load CSR projects list.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleViewProject = async (p) => {
    setSelectedProject(p);
    setLoadingModalData(true);
    try {
      const expRes = await fetchCsrExpenditureCost(p.csr_project_id);
      setProjectExpenditures(Array.isArray(expRes) ? expRes : []);
    } catch (err) {
      console.error("Error loading expenditures", err);
      setProjectExpenditures([]);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleViewGallery = async (p) => {
    setGalleryProject(p);
    setLoadingGallery(true);
    try {
      const filesRes = await fetchCsrGalleryFiles(p.csr_project_id);
      setGalleryFiles(Array.isArray(filesRes) ? filesRes : []);
    } catch (err) {
      console.error("Error loading gallery files", err);
      setGalleryFiles([]);
    } finally {
      setLoadingGallery(false);
    }
  };

  const handleDownloadDoc = async (fileName) => {
    try {
      const blob = await downloadCsrDocument(fileName);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      triggerNotification?.("Document downloaded successfully.", "success");
    } catch (err) {
      console.error("Error downloading doc", err);
      triggerNotification?.("Failed to download completion document.", "error");
    }
  };

  const getFocusAreaName = (focusId) => {
    const found = CSR_FOCUS_AREAS.find(f => f.id === Number(focusId));
    return found ? found.name : `Focus Area #${focusId}`;
  };

  // Client-side filtering
  const filteredProjects = useMemo(() => {
    return projects.filter(item => {
      if (selectedOrg && String(item.organisation_name) !== selectedOrg) return false;
      if (selectedFY && String(item.financial_year) !== selectedFY) return false;
      if (selectedFocus && String(item.csr_focus) !== selectedFocus) return false;
      if (selectedStatus && String(item.project_status) !== selectedStatus) return false;

      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const name = (item.project_name || '').toLowerCase();
        const org = (item.organisation_name || '').toLowerCase();
        const recFrom = (item.project_received_from || '').toLowerCase();
        const target = (item.target_beneficiaries || '').toLowerCase();
        if (!name.includes(query) && !org.includes(query) && !recFrom.includes(query) && !target.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [projects, selectedOrg, selectedFY, selectedFocus, selectedStatus, searchTerm]);

  // Paginated records
  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredProjects.length / pageSize) || 1;

  // Export Columns mapping
  const exportColumns = useMemo(() => [
    { key: 'sno', label: 'S.No', render: (_, __, i) => i + 1 },
    { key: 'organisation_name', label: 'Organisation' },
    { key: 'project_name', label: 'Project Name' },
    { key: 'financial_year', label: 'Financial Year' },
    { key: 'csr_focus', label: 'Focus Area', render: v => getFocusAreaName(v) },
    { key: 'project_value', label: 'Value (₹ Cr)', render: v => v != null ? Number(v).toFixed(2) : '-' },
    { key: 'project_status', label: 'Status' },
    { key: 'physical_progress', label: 'Physical %', render: v => v != null ? `${v}%` : '-' },
    { key: 'financial_progress', label: 'Financial %', render: v => v != null ? `${v}%` : '-' },
    { key: 'completed_on', label: 'Completed On', render: v => v ? String(v).split('T')[0] : '-' },
  ], []);

  const resetFilters = () => {
    setSelectedOrg('');
    setSelectedFY('');
    setSelectedFocus('');
    setSelectedStatus('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const hasActiveFilters = Boolean(selectedOrg || selectedFY || selectedFocus || selectedStatus || searchTerm);

  return (
    <div className="space-y-4 animate-fade-in">

      {/* Filter and Action Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        
        {/* Left: Multi-criteria Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          
          {/* Search Box */}
          <div className="relative min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Search project name / sender..."
              className="w-full text-xs pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a]"
            />
          </div>

          {/* Organisation Filter */}
          <select
            value={selectedOrg}
            onChange={e => { setSelectedOrg(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
          >
            <option value="">All Organisations</option>
            {organisations.map(o => (
              <option key={o.organisation_id} value={o.organisation_name}>{o.organisation_name}</option>
            ))}
          </select>

          {/* FY Filter */}
          <select
            value={selectedFY}
            onChange={e => { setSelectedFY(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
          >
            <option value="">All FYs</option>
            {FINANCIAL_YEARS.map(fy => (
              <option key={fy} value={fy}>{fy}</option>
            ))}
          </select>

          {/* Focus Area Filter */}
          <select
            value={selectedFocus}
            onChange={e => { setSelectedFocus(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer max-w-[180px]"
          >
            <option value="">All Focus Areas</option>
            {CSR_FOCUS_AREAS.map(fa => (
              <option key={fa.id} value={fa.id}>{fa.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
            className="text-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:border-[#0f417a] cursor-pointer"
          >
            <option value="">All Statuses</option>
            {CSR_STATUSES.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}

        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          <CopyButton 
            data={filteredProjects} 
            columns={exportColumns} 
            triggerNotification={triggerNotification} 
          />

          <ExportDropdown 
            data={filteredProjects} 
            columns={exportColumns} 
            fileName="CSR_Projects_List" 
            title="CSR Projects Summary & Progress"
            triggerNotification={triggerNotification} 
          />

          <button
            onClick={onAddNew}
            className="flex items-center space-x-1.5 bg-[#0f417a] hover:bg-blue-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Register CSR Project</span>
          </button>

          <button
            onClick={loadProjects}
            title="Refresh"
            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Projects Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <th className="py-3.5 px-4 w-12 text-center">#</th>
                <th className="py-3.5 px-4">Organisation</th>
                <th className="py-3.5 px-4">Project Name</th>
                <th className="py-3.5 px-4">Focus Area</th>
                <th className="py-3.5 px-4">Financial Year</th>
                <th className="py-3.5 px-4 text-right">Value (₹ Cr)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-center">Physical %</th>
                <th className="py-3.5 px-4 text-center">Financial %</th>
                <th className="py-3.5 px-4 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-semibold">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-[#0f417a] mb-2" />
                    Loading CSR projects...
                  </td>
                </tr>
              ) : paginatedProjects.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 font-semibold">
                    No CSR projects found matching criteria. Click "Register CSR Project" to add one.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p, idx) => {
                  const statusStyle = STATUS_COLORS[p.project_status] || {
                    bg: 'bg-slate-100',
                    text: 'text-slate-600',
                    border: 'border-slate-200'
                  };

                  return (
                    <tr key={p.csr_project_id || idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {(currentPage - 1) * pageSize + idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 max-w-[180px] truncate" title={p.organisation_name}>
                        {p.organisation_name || '-'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100 max-w-[280px]">
                        <p className="line-clamp-2" title={p.project_name}>{p.project_name}</p>
                        {p.project_received_from && (
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            From: {p.project_received_from}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium max-w-[160px] truncate" title={getFocusAreaName(p.csr_focus)}>
                        {getFocusAreaName(p.csr_focus)}
                      </td>
                      <td className="py-3 px-4 font-black text-slate-700 dark:text-slate-200">
                        {p.financial_year || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-800 dark:text-slate-100">
                        {p.project_value != null ? Number(p.project_value).toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                          {p.project_status || 'Yet to start'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p.physical_progress != null ? `${p.physical_progress}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {p.financial_progress != null ? `${p.financial_progress}%` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <button
                            onClick={() => handleViewProject(p)}
                            title="View Project Details"
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg text-slate-500 hover:text-[#0f417a] dark:hover:text-blue-400 transition cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => onEdit(p)}
                            title="Edit Project"
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-[#0f417a] dark:hover:text-blue-400 transition cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            onClick={() => handleViewGallery(p)}
                            title="View Media Gallery"
                            className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-950/50 rounded-lg text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition cursor-pointer"
                          >
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-slate-500 font-semibold">
            Showing {filteredProjects.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} to{' '}
            {Math.min(currentPage * pageSize, filteredProjects.length)} of {filteredProjects.length} entries
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500 font-semibold text-[11px]">Rows:</span>
              <select
                value={pageSize}
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="text-xs px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="px-2 font-bold text-slate-700 dark:text-slate-300">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-40 font-bold transition cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-l-4 border-l-[#0f417a]">
            
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4 flex items-center justify-between text-white z-10">
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  CSR Project Overview
                </h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              
              {/* Project Title & Status Banner */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {selectedProject.project_name}
                  </h4>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex-shrink-0 ${
                    STATUS_COLORS[selectedProject.project_status]?.bg || 'bg-slate-100'
                  } ${STATUS_COLORS[selectedProject.project_status]?.text || 'text-slate-600'} ${STATUS_COLORS[selectedProject.project_status]?.border || 'border-slate-200'}`}>
                    {selectedProject.project_status || 'Yet to start'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  <span>{selectedProject.organisation_name}</span>
                  <span>•</span>
                  <span>FY: {selectedProject.financial_year}</span>
                </p>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Project Value</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                    ₹{selectedProject.project_value != null ? Number(selectedProject.project_value).toFixed(2) : '-'} Cr
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Physical %</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {selectedProject.physical_progress != null ? `${selectedProject.physical_progress}%` : '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Financial %</span>
                  <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                    {selectedProject.financial_progress != null ? `${selectedProject.financial_progress}%` : '-'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Completed On</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {selectedProject.completed_on ? String(selectedProject.completed_on).split('T')[0] : 'In progress'}
                  </span>
                </div>
              </div>

              {/* Context Fields */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-500 uppercase text-[10px] block">Focus Area:</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {getFocusAreaName(selectedProject.csr_focus)}
                  </p>
                </div>

                {selectedProject.project_received_from && (
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">Received From:</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedProject.project_received_from}
                    </p>
                  </div>
                )}

                {selectedProject.impact_possible_outcome && (
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">Impact / Possible Outcome:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedProject.impact_possible_outcome}
                    </p>
                  </div>
                )}

                {selectedProject.target_beneficiaries && (
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">Target Beneficiaries:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedProject.target_beneficiaries}
                    </p>
                  </div>
                )}

                {selectedProject.remarks && (
                  <div>
                    <span className="font-bold text-slate-500 uppercase text-[10px] block">Remarks:</span>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {selectedProject.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Yearly Expenditures List */}
              {projectExpenditures.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">
                    Yearly Expenditure Details
                  </span>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase text-slate-500">
                        <tr>
                          <th className="py-2 px-3">Year</th>
                          <th className="py-2 px-3 text-right">Expenditure Cost (₹ Cr)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {projectExpenditures.map((exp, i) => (
                          <tr key={i}>
                            <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-300">{exp.year}</td>
                            <td className="py-2 px-3 text-right font-black text-slate-800 dark:text-slate-100">
                              ₹{exp.csr_expenditure_cost != null ? Number(exp.csr_expenditure_cost).toFixed(2) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Completion Document Download Button */}
              {selectedProject.project_completion_doc && (
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Completion Document</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[300px] block">
                      {selectedProject.project_completion_doc}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDownloadDoc(selectedProject.project_completion_doc)}
                    className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 bg-blue-50 text-[#0f417a] hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded-xl transition cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </button>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Media Gallery Modal */}
      {galleryProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border-l-4 border-l-purple-600">
            
            {/* Gallery Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <ImageIcon className="h-5 w-5" />
                <h3 className="text-sm font-black uppercase tracking-wider font-display">
                  Project Gallery: {galleryProject.project_name}
                </h3>
              </div>
              <button
                onClick={() => setGalleryProject(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Gallery Body */}
            <div className="p-6">
              {loadingGallery ? (
                <div className="py-12 text-center text-slate-400 font-semibold">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-purple-600 mb-2" />
                  Loading media gallery files...
                </div>
              ) : galleryFiles.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-semibold">
                  <ImageIcon className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  No photos or gallery media uploaded for this project.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {galleryFiles.map((doc, idx) => (
                    <div key={doc.document_id || idx} className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
                      <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-lg flex items-center justify-center overflow-hidden">
                        <img
                          src={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/download-csrfile/${doc.document_name}`}
                          alt={doc.document_name}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[140px]" title={doc.document_name}>
                          {doc.document_name}
                        </span>
                        <button
                          onClick={() => handleDownloadDoc(doc.document_name)}
                          title="Download photo"
                          className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-purple-600 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Gallery Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setGalleryProject(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
