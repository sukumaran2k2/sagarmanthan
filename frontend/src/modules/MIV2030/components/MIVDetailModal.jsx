import React from 'react';
import { X, Calendar, DollarSign, Building2, Briefcase, FileText, CheckCircle2, AlertTriangle, Layers, Users, TrendingUp, Download, Eye, Image } from 'lucide-react';
import { API_BASE } from '../api';

export default function MIVDetailModal({ initiative, onClose, onEdit }) {
  if (!initiative) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Under Implementation - On Time':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Under Implementation - Delayed':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Yet to be Started':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Dropped':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col animate-scale-up overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#0f417a] to-[#1e5fa0] text-white flex items-center justify-between shadow-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Layers className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded text-blue-100">
                  {initiative.initiative_id || initiative.initiativeID || 'MIV Initiative'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusBadge(initiative.status_current || initiative.status)}`}>
                  {initiative.status_current || initiative.status || 'Active'}
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-1 leading-tight line-clamp-1">
                {initiative.initiative_name || initiative.initiativeName || 'Initiative Details'}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 dark:text-slate-200">
          
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Organisation</span>
              <span className="text-xs font-black text-[#0f417a] dark:text-blue-300 line-clamp-1 mt-0.5">
                {initiative.organisation_name || initiative.organisation || '-'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Cost</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                ₹ {Number(initiative.total_cost || initiative.totalCost || 0).toLocaleString()} Cr.
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Physical Progress</span>
              <div className="flex items-center space-x-2 mt-0.5">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Number(initiative.physical_progress || initiative.physicalProgress || 0))}%` }}
                  />
                </div>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {initiative.physical_progress || initiative.physicalProgress || 0}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Category</span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 block capitalize">
                {initiative.category || '-'}
              </span>
            </div>
          </div>

          {/* Project Details Section */}
          <div className="bg-slate-50/60 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Sub-Activity / Project Detail
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              {initiative.project_detail || initiative.projectDetail || 'No detailed description provided.'}
            </p>
          </div>

          {/* Schedule & Milestones */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Timeline & Schedule
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">Start Date</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {formatDate(initiative.start_date || initiative.startDate)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">Target Completion Date</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {formatDate(initiative.completion_date || initiative.completionDate)}
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">Actual Completion Date</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {formatDate(initiative.actual_date || initiative.actualDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Reasons for Delay / Drop if any */}
          {(initiative.reasons_for_delay || initiative.reasonsForDelay || initiative.reasons_for_drop || initiative.reasonsForDrop) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(initiative.reasons_for_delay || initiative.reasonsForDelay) && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Reasons For Delay
                  </span>
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    {initiative.reasons_for_delay || initiative.reasonsForDelay}
                  </p>
                </div>
              )}
              {(initiative.reasons_for_drop || initiative.reasonsForDrop) && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Reasons For Drop
                  </span>
                  <p className="text-xs text-rose-800 dark:text-rose-300">
                    {initiative.reasons_for_drop || initiative.reasonsForDrop}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Economic Impact Grid */}
          <div className="space-y-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" /> Employment & Investment Impact
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">Direct Employment</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {initiative.direct_Emp_Gen || initiative.directEmpGen || '0'} persons
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">Indirect Employment</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {initiative.inDirect_Emp_Gen || initiative.inDirectEmpGen || '0'} persons
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">Direct Investment</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  ₹ {initiative.direct_Inv_Created || initiative.directInvCreated || '0'} Cr.
                </span>
              </div>
              <div className="p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800">
                <span className="text-[10px] text-slate-400 font-bold block">Indirect Investment</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  ₹ {initiative.inDirect_Inv_Created || initiative.inDirectInvCreated || '0'} Cr.
                </span>
              </div>
            </div>
          </div>

          {/* Feedback & Outcomes */}
          {(initiative.Feedback || initiative.Response || initiative.Outcomes_Remarks || initiative.OutcomesRemarks) && (
            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400">
                Remarks & Stakeholder Feedback
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {initiative.Feedback && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Feedback</span>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{initiative.Feedback}</p>
                  </div>
                )}
                {initiative.Response && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Response</span>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{initiative.Response}</p>
                  </div>
                )}
                {(initiative.Outcomes_Remarks || initiative.OutcomesRemarks) && (
                  <div className="col-span-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Outcomes / Remarks</span>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{initiative.Outcomes_Remarks || initiative.OutcomesRemarks}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supporting Documents & Images */}
          {(initiative.supportDocument || initiative.latestImage) && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Attachments
              </h3>
              <div className="flex flex-wrap gap-2">
                {initiative.supportDocument && (
                  <a
                    href={`${API_BASE}/miv-document/download/${initiative.supportDocument}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Download Supporting Document</span>
                  </a>
                )}
                {initiative.latestImage && (
                  <div className="text-xs text-slate-500 flex items-center space-x-1">
                    <Image className="h-3.5 w-3.5 text-slate-400" />
                    <span>Uploaded photos: {initiative.latestImage}</span>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Close
          </button>
          {onEdit && (
            <button
              onClick={() => {
                onClose();
                onEdit(initiative);
              }}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Edit Initiative
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
