import React from 'react';
import { 
  ArrowLeft, Calendar, DollarSign, Building2, Briefcase, 
  FileText, CheckCircle2, AlertTriangle, Layers, Users, 
  TrendingUp, Download, Eye, Image, Edit, Clock, Tag, Globe, Sparkles
} from 'lucide-react';
import { API_BASE } from '../api';

export default function GMISDetailView({ mou, onBack, onEdit }) {
  if (!mou) return null;

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

  const statusLabel = mou.present_status || mou.status || 'Active';
  const eventLabel = mou.event_name || 'GMIS Summit';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm dark:bg-slate-950 dark:border-slate-800 overflow-hidden animate-fade-in space-y-6">
      
      {/* Top Banner Header */}
      <div className="px-6 py-5 bg-gradient-to-r from-[#0f417a] via-[#164e8d] to-[#1e5fa0] text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-start md:items-center space-x-3.5">
          <button
            onClick={onBack}
            className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer flex items-center justify-center shrink-0"
            title="Back to MoUs List"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-md text-blue-100 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                {eventLabel}
              </span>
              <span className="text-[11px] font-bold bg-blue-900/60 px-2 py-0.5 rounded text-blue-200">
                MoU #{mou.id}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${getStatusBadge(statusLabel)}`}>
                {statusLabel}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white leading-tight">
              {mou.name_of_mou || 'MoU Project Details'}
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
              onClick={() => onEdit(mou)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
            >
              <Edit className="h-4 w-4" />
              <span>Edit MoU</span>
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
                {mou.organisation_name || '-'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">MoU Value</span>
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                ₹ {Number(mou.amount || 0).toLocaleString()} Cr.
                {mou.revised_amount && (
                  <span className="text-[10px] text-slate-400 font-normal ml-1">
                    (Rev: ₹ {Number(mou.revised_amount).toLocaleString()} Cr)
                  </span>
                )}
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
                    style={{ width: `${Math.min(100, Number(mou.physical_progress_percentage || 0))}%` }}
                  />
                </div>
                <span className="text-xs font-black text-purple-700 dark:text-purple-300">
                  {mou.physical_progress_percentage || 0}%
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start space-x-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">Financial Progress</span>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.min(100, Number(mou.financial_progress_percentage || 0))}%` }}
                  />
                </div>
                <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                  {mou.financial_progress_percentage || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* MoU Scope & Brief Section */}
        <div className="bg-slate-50/70 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>MoU Scope & Summary Brief</span>
          </h3>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap pl-6">
            {mou.mou_brief || 'No detailed MoU brief provided.'}
          </p>
        </div>

        {/* Stakeholder & Partner Details */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Signatory Parties & Stakeholders</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">1st Party (Lead Org)</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {mou.name_of_first_party || mou.organisation_name || '-'}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">2nd Party (Partner / Vendor)</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block">
                {mou.name_of_second_party || '-'}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Nature of 2nd Party</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 block capitalize">
                {mou.nature_of_second_party || 'Private Enterprise'}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">MoU Category</span>
              <span className="text-xs font-bold text-[#0f417a] dark:text-blue-300 mt-1 block">
                {mou.mou_category_name || 'General'}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline & Progress Milestones */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Progress Milestones & Target Dates</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Physical Progress Milestone Date</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {formatDate(mou.physical_progress_date)}
                </span>
              </div>
              <span className="text-sm font-black text-purple-600 dark:text-purple-400">
                {mou.physical_progress_percentage || 0}%
              </span>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Financial Progress Milestone Date</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {formatDate(mou.financial_progress_date)}
                </span>
              </div>
              <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                {mou.financial_progress_percentage || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps & Detailed Remarks */}
        {(mou.next_steps || mou.remark_or_detailed_status) && (
          <div className="space-y-3 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400">
              Next Action Items & Detailed Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {mou.next_steps && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Key Next Steps</span>
                  <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{mou.next_steps}</p>
                </div>
              )}
              {mou.remark_or_detailed_status && (
                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Detailed Remarks</span>
                  <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{mou.remark_or_detailed_status}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reasons for Dropping if any */}
        {mou.reason_for_dropping && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl space-y-1.5">
            <span className="text-xs font-bold uppercase text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" /> Reasons For Drop
            </span>
            <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
              {mou.reason_for_dropping}
            </p>
          </div>
        )}

        {/* Attached Document */}
        {mou.document_uploader && (
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Signed MoU Document</span>
            </h3>
            <div className="flex items-center gap-3">
              <a
                href={`${API_BASE}/download-gmismou-pdf-document?filename=${mou.document_uploader}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition shadow-xs dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
              >
                <FileText className="h-4 w-4" />
                <span>Download Signed MoU ({mou.document_uploader})</span>
              </a>
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
            <span>Return to MoUs Table</span>
          </button>
          
          {onEdit && (
            <button
              onClick={() => onEdit(mou)}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
            >
              <Edit className="h-4 w-4" />
              <span>Edit MoU</span>
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
