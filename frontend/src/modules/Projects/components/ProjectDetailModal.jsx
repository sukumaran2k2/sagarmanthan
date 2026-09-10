import React from 'react';
import { 
  X, Calendar, DollarSign, Building2, Briefcase, FileText, 
  CheckCircle2, AlertTriangle, Layers, Users, TrendingUp, 
  Download, Eye, MapPin, Landmark, Coins, ShieldCheck, 
  Clock, ArrowRight, ExternalLink, Edit 
} from 'lucide-react';
import { API_BASE, downloadProjectDocumentFile } from '../api';

export default function ProjectDetailModal({ project, onClose, onEdit }) {
  if (!project) return null;

  const raw = project.raw || {};
  const projectId = project.projectId || raw.project_id || '-';
  const subProjectId = project.subProjectId || raw.sub_project_id || '-';
  const projectName = project.projectName || raw.project_name || 'Project Details';
  const subProjectName = project.subProjectName || raw.sub_project_name || '';
  const organisation = project.organisationName || raw.organisation_name || raw.agency || '-';
  const stage = project.stage || raw.project_stage || raw.stage_name || 'Project Initiated';
  const category = project.category || raw.project_category || raw.project_category_names || '-';
  const cost = Number(project.cost || raw.project_cost || raw.estimated_cost || raw.sanctioned_cost || 0);
  const physicalProgress = Number(project.physicalProgress || raw.physical_progress || 0);
  const financialProgress = Number(project.financialProgress || raw.financial_progress || 0);
  const stateName = project.stateName || raw.state_names || raw.state || '-';
  const districtName = raw.district_names || raw.district || '-';

  const getStageBadgeClass = (s) => {
    const norm = String(s || '').toLowerCase();
    if (norm.includes('completed')) return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    if (norm.includes('implementation')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
    if (norm.includes('tendering')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
    if (norm.includes('dropped')) return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? String(dateStr).slice(0, 10) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(dateStr).slice(0, 10);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-7xl w-full max-h-[92vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-scale-up" onClick={(e) => e.stopPropagation()}>
        
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f417a] via-[#1a5596] to-[#0284c7] text-white flex items-center justify-between shadow-md select-none">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/15 shadow-inner shrink-0">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded text-blue-100 border border-white/10">
                  {projectId}
                  {subProjectId && subProjectId !== '-' && subProjectId !== '-1' && (
                    <span className="font-black text-white" style={{ fontWeight: 900 }}>{` / Sub Project ${subProjectId}`}</span>
                  )}
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStageBadgeClass(stage)}`}>
                  {stage}
                </span>
                <span className="text-[10px] font-semibold bg-white/10 text-cyan-200 px-2 py-0.5 rounded">
                  {category}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-1 leading-tight truncate">
                {projectName}
              </h2>
              {subProjectName && subProjectName !== '-' && (
                <p className="text-xs text-blue-100 font-medium truncate mt-0.5">
                  Sub-project: {subProjectName}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(project);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-white text-[#0f417a] font-bold text-xs rounded-xl shadow hover:bg-blue-50 transition cursor-pointer"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Edit Project</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200 bg-slate-50/50 dark:bg-slate-900/50">

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Estimated Cost</span>
                <Coins className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 block">
                ₹ {cost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr.
              </span>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Physical Progress</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, physicalProgress)}%` }}
                  />
                </div>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {physicalProgress.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Financial Progress</span>
                <DollarSign className="h-4 w-4 text-indigo-600" />
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, financialProgress)}%` }}
                  />
                </div>
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
                  {financialProgress.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">Implementing Agency</span>
                <Building2 className="h-4 w-4 text-amber-600" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                {organisation}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Project Brief & Scope
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {raw.project_brief || project.projectBrief || 'No detailed brief available for this project.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
                <Briefcase className="h-3.5 w-3.5" /> Implementation & Classification
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Implementation Mode</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.mode_of_implememtation || raw.implementationMode || 'Direct'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Implementation Type</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.implememtation_type || raw.implementationType || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Scheme Name</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.scheme_name || raw.scheme || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Initiative</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.initiative_names || raw.initiative || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Secondary Implementing Agency</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.sec_imp_agency || raw.secondaryImplementingAgency || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Project Type Approval</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.project_type || '-'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
                <MapPin className="h-3.5 w-3.5" /> Location & Land Acquisition
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">State / Region</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{stateName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">District</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{districtName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Land Acquisition Needed</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {raw.on_land_acquisition === 1 || raw.on_land_acquisition === true ? 'Yes' : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Land Area Required</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.land_area_req ? `${raw.land_area_req} Acres` : '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Acquisition Status</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {raw.on_acquisition_completed === 1 ? 'Completed' : (raw.percent_land_acq ? `${raw.percent_land_acq}% Acquired` : '-')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">MP Constituency</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.mp_constituency_names || raw.mpConstituency || '-'}</span>
                </div>
              </div>
            </div>

          </div>

          <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <Calendar className="h-3.5 w-3.5" /> Project Timelines & Key Dates
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">Project Initiated Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(raw.project_intiated_date || raw.projectInitiatedDate)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">Target Completion Date</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">{formatDate(raw.target_completion_date || raw.targetCompletionDate)}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 font-bold block">Revised Target Date</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">{formatDate(raw.latest_revised_target_completion_date || raw.revisedTargetCompletionDate)}</span>
              </div>
            </div>
          </div>

          {(raw.project_output_name || raw.project_outcome_name || raw.capacity_addition) && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-xs space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-2">
                <TrendingUp className="h-3.5 w-3.5" /> Output, Outcome & Capacity Deliverables
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Project Output</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.project_output_name || '-'}: {raw.project_output_units || ''}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Project Outcome</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.project_outcome_name || '-'}: {raw.project_outcome_units || ''}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Capacity Addition</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{raw.capacity_addition ? `${raw.capacity_addition} MTPA / Units` : '-'}</span>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Project ID: <strong className="text-slate-700 dark:text-slate-300">{projectId}</strong></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
