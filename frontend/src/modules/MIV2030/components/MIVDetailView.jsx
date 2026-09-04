import React from 'react';
import { 
  ArrowLeft, Calendar, DollarSign, Building2, Briefcase, 
  FileText, CheckCircle2, AlertTriangle, Layers, Users, 
  TrendingUp, Download, Eye, Image, Edit, Clock, Tag
} from 'lucide-react';
import { API_BASE } from '../api';

export default function MIVDetailView({ initiative, onBack, onEdit }) {
  if (!initiative) return null;

  const getStatusBadge = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('completed')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (s.includes('delayed')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
    if (s.includes('dropped')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
    if (s.includes('yet to')) {
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const statusLabel = initiative.status_current || initiative.status_on || initiative.status || 'Active';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm dark:bg-slate-950 dark:border-slate-800 overflow-hidden animate-fade-in space-y-6">
      
      {/* Top Banner Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-[#0f417a] via-[#164e8d] to-[#1e5fa0] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start md:items-center space-x-3.5">
          <button
            onClick={onBack}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            title="Back to Initiatives List"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md text-blue-100">
                {initiative.initiative_id || initiative.initiativeID || 'Initiative'}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(statusLabel)}`}>
                {statusLabel}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              {initiative.initiative_name || initiative.initiativeName || 'MIV Initiative Details'}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 self-end md:self-auto shrink-0">
          <button
            onClick={onBack}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition cursor-pointer flex items-center space-x-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to List</span>
          </button>

          {onEdit && (
            <button
              onClick={() => onEdit(initiative)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Initiative</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Body Details Grid */}
      <div className="p-6 pt-0 space-y-6 text-slate-800 dark:text-slate-200">
        
        {/* Top 4 Quick Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Organisation</span>
              <span className="text-xs font-black text-[#0f417a] dark:text-blue-300 truncate block mt-0.5">
                {initiative.organisation_name || initiative.organisation || '-'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Total Cost</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                ₹ {Number(initiative.total_cost || initiative.totalCost || 0).toLocaleString()} Cr.
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Physical Progress</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-purple-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Number(initiative.physical_progress || initiative.physicalProgress || 0))}%` }}
                  />
                </div>
                <span className="text-xs font-black text-purple-700 dark:text-purple-300">
                  {initiative.physical_progress || initiative.physicalProgress || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg">
              <Tag className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Category</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize truncate block mt-0.5">
                {initiative.category || 'General'}
              </span>
            </div>
          </div>
        </div>

        {/* Project Details Section */}
        <div className="bg-slate-50/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Sub-Activity / Detailed Project Scope</span>
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-6">
            {initiative.project_detail || initiative.projectDetail || 'No detailed description provided.'}
          </p>
        </div>

        {/* Timeline & Schedule Cards */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Timeline & Target Milestones</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Start Date</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formatDate(initiative.start_date || initiative.startDate)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                <Calendar className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Completion</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formatDate(initiative.completion_date || initiative.completionDate)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center space-x-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Actual Completion</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formatDate(initiative.actual_date || initiative.actualDate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reasons for Delay / Drop if any */}
        {(initiative.reasons_for_delay || initiative.reasonsForDelay || initiative.reasons_for_drop || initiative.reasonsForDrop) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(initiative.reasons_for_delay || initiative.reasonsForDelay) && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1.5">
                <span className="text-xs font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Reasons For Delay
                </span>
                <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  {initiative.reasons_for_delay || initiative.reasonsForDelay}
                </p>
              </div>
            )}
            {(initiative.reasons_for_drop || initiative.reasonsForDrop) && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1.5">
                <span className="text-xs font-bold uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Reasons For Drop
                </span>
                <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                  {initiative.reasons_for_drop || initiative.reasonsForDrop}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Economic Impact Grid */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Employment & Investment Generation</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Direct Employment</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1 block">
                {initiative.direct_Emp_Gen || initiative.directEmpGen || '0'} <span className="text-[11px] font-semibold text-slate-500">persons</span>
              </span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Indirect Employment</span>
              <span className="text-sm font-black text-slate-800 dark:text-slate-200 mt-1 block">
                {initiative.inDirect_Emp_Gen || initiative.inDirectEmpGen || '0'} <span className="text-[11px] font-semibold text-slate-500">persons</span>
              </span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Direct Investment</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                ₹ {initiative.direct_Inv_Created || initiative.directInvCreated || '0'} Cr.
              </span>
            </div>
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Indirect Investment</span>
              <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                ₹ {initiative.inDirect_Inv_Created || initiative.inDirectInvCreated || '0'} Cr.
              </span>
            </div>
          </div>
        </div>

        {/* Feedback & Remarks */}
        {(initiative.Feedback || initiative.Response || initiative.Outcomes_Remarks || initiative.OutcomesRemarks) && (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400">
              Remarks & Stakeholder Feedback
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {initiative.Feedback && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Feedback</span>
                  <p className="text-slate-700 dark:text-slate-200">{initiative.Feedback}</p>
                </div>
              )}
              {initiative.Response && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Response</span>
                  <p className="text-slate-700 dark:text-slate-200">{initiative.Response}</p>
                </div>
              )}
              {(initiative.Outcomes_Remarks || initiative.OutcomesRemarks) && (
                <div className="col-span-full p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Outcomes / Remarks</span>
                  <p className="text-slate-700 dark:text-slate-200">{initiative.Outcomes_Remarks || initiative.OutcomesRemarks}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Supporting Documents & Attachments */}
        {(initiative.supportDocument || initiative.latestImage) && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Project Files & Attachments</span>
            </h3>
            <div className="flex flex-wrap items-center gap-3">
              {initiative.supportDocument && (
                <a
                  href={`${API_BASE}/miv-document/download/${initiative.supportDocument}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition shadow-xs dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                >
                  <FileText className="h-4 w-4" />
                  <span>Download Supporting Document</span>
                </a>
              )}
              {initiative.latestImage && (
                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center space-x-1.5 p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <Image className="h-4 w-4 text-slate-400" />
                  <span>Photo attachments: {initiative.latestImage}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Footer Back Button */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onBack}
            className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 rounded-xl transition cursor-pointer flex items-center space-x-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Initiatives Table</span>
          </button>
          
          {onEdit && (
            <button
              onClick={() => onEdit(initiative)}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
            >
              <Edit className="h-4 w-4" />
              <span>Edit Initiative</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
