import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Upload, FileText, User, Calendar, Briefcase, Award, DollarSign, CheckCircle2, AlertCircle, Plus, Edit2, Loader2 } from 'lucide-react';
import { fetchCandidatesByConsultantAppointmentId, uploadCandidateDocument, API_BASE } from '../api';
import CandidateModal from './CandidateModal';

export default function CandidateDrilldownModal({
  isOpen,
  onClose,
  appointment = null,
  triggerNotification
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingForCandidateId, setUploadingForCandidateId] = useState(null);
  
  // Sub-modal for editing candidate details
  const [editingCandidateIndex, setEditingCandidateIndex] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fileInputRefs = useRef({});

  const loadCandidates = async () => {
    if (!appointment?.id) return;
    setLoading(true);
    try {
      const res = await fetchCandidatesByConsultantAppointmentId(appointment.id);
      setCandidates(res.data || []);
    } catch (err) {
      console.error('Error fetching candidates for drilldown:', err);
      if (triggerNotification) {
        triggerNotification('Failed to load candidate details.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && appointment?.id) {
      loadCandidates();
    }
  }, [isOpen, appointment?.id]);

  if (!isOpen || !appointment) return null;

  const totalRequiredResources = Number(appointment.numResources) || 1;

  const handleFileUpload = async (e, candidateId) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      if (triggerNotification) triggerNotification('Invalid file format. Only PDF files are allowed.', 'error');
      e.target.value = '';
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      if (triggerNotification) triggerNotification('File size exceeds 20 MB. Please choose a smaller file.', 'warning');
      e.target.value = '';
      return;
    }

    setUploadingForCandidateId(candidateId);
    try {
      const formData = new FormData();
      formData.append('candidateID', candidateId);
      formData.append('file', file);
      
      await uploadCandidateDocument(formData);
      
      if (triggerNotification) {
        triggerNotification('Appointment Order PDF uploaded successfully!', 'success');
      }
      
      await loadCandidates();
    } catch (err) {
      console.error('Error uploading candidate PDF:', err);
      if (triggerNotification) {
        triggerNotification('Failed to upload Appointment Order document.', 'error');
      }
    } finally {
      setUploadingForCandidateId(null);
      e.target.value = '';
    }
  };

  const handleDownload = (documentName) => {
    if (!documentName) {
      if (triggerNotification) triggerNotification('No document attached.', 'warning');
      return;
    }
    const downloadUrl = `${API_BASE}/ca-candidate-document-download/${encodeURIComponent(documentName)}`;
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = documentName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (triggerNotification) {
      triggerNotification(`Downloading ${documentName}...`, 'info');
    }
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '-';
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch {
      return String(dateVal);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] text-white px-6 py-4 flex items-center justify-between border-b border-[#0a2d55]/20">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                Candidate Details & Appointment Orders
              </h3>
              <span className="px-2.5 py-0.5 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-wider">
                {candidates.length} / {totalRequiredResources} Resources
              </span>
            </div>
            <p className="text-[11px] text-blue-100/90 font-medium mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><strong>Wing:</strong> {appointment.wing}</span>
              <span>•</span>
              <span><strong>Division:</strong> {appointment.division}</span>
              <span>•</span>
              <span><strong>Type:</strong> {appointment.appointmentType}</span>
              <span>•</span>
              <span><strong>Status:</strong> {appointment.status}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50 dark:bg-slate-950">
          
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-[#0f417a] dark:text-blue-400" />
              <p className="text-xs font-bold uppercase tracking-wider">Loading candidate records...</p>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Candidates Table */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        <th className="py-3.5 px-4 text-center w-12">#</th>
                        <th className="py-3.5 px-4 min-w-[160px]">Candidate Name</th>
                        <th className="py-3.5 px-4 min-w-[140px]">Qualification</th>
                        <th className="py-3.5 px-4 text-center min-w-[100px]">Experience</th>
                        <th className="py-3.5 px-4 text-center min-w-[110px]">Salary (LPA)</th>
                        <th className="py-3.5 px-4 min-w-[140px]">Category</th>
                        <th className="py-3.5 px-4 text-center min-w-[120px]">Appointment Date</th>
                        <th className="py-3.5 px-4 min-w-[130px]">Skill Set</th>
                        <th className="py-3.5 px-4 text-center min-w-[200px]">Appointment Order (PDF)</th>
                        <th className="py-3.5 px-4 text-center w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                      {candidates.map((cand, idx) => {
                        const hasDoc = !!cand.appointment_order_document;
                        const isUploading = uploadingForCandidateId === cand.candidate_id;

                        return (
                          <tr key={cand.candidate_id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                            {/* # */}
                            <td className="py-3 px-4 text-center font-bold text-slate-400 dark:text-slate-500">
                              {idx + 1}
                            </td>

                            {/* Candidate Name */}
                            <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-[#0f417a] dark:text-blue-400 flex items-center justify-center font-black text-xs shrink-0">
                                  {cand.name ? cand.name.charAt(0).toUpperCase() : 'C'}
                                </div>
                                <span className="truncate max-w-[180px]" title={cand.name || '-'}>
                                  {cand.name || '-'}
                                </span>
                              </div>
                            </td>

                            {/* Qualification */}
                            <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                              {cand.qualification || '-'}
                            </td>

                            {/* Work Experience */}
                            <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                              {cand.work_experience !== undefined && cand.work_experience !== null ? `${cand.work_experience} Yrs` : '-'}
                            </td>

                            {/* Salary */}
                            <td className="py-3 px-4 text-center font-bold text-slate-800 dark:text-slate-200">
                              {cand.salary ? `₹ ${cand.salary} L` : '-'}
                            </td>

                            {/* Category */}
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                cand.category === 'Direct Contract'
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                              }`}>
                                {cand.category || 'Direct Contract'}
                              </span>
                            </td>

                            {/* Appointment Date */}
                            <td className="py-3 px-4 text-center font-mono font-medium text-slate-600 dark:text-slate-400">
                              {formatDateDisplay(cand.date_of_appointment)}
                            </td>

                            {/* Skill Set */}
                            <td className="py-3 px-4">
                              <span className="text-slate-700 dark:text-slate-300 font-medium truncate block max-w-[140px]" title={cand.skill_set || '-'}>
                                {cand.skill_set || '-'}
                              </span>
                            </td>

                            {/* Document Upload / Download */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                
                                {/* Hidden file input for this candidate */}
                                <input
                                  type="file"
                                  ref={(el) => (fileInputRefs.current[cand.candidate_id] = el)}
                                  accept=".pdf"
                                  onChange={(e) => handleFileUpload(e, cand.candidate_id)}
                                  className="hidden"
                                />

                                {hasDoc ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleDownload(cand.appointment_order_document)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:text-emerald-300 font-bold text-[11px] rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-sm"
                                      title={`Download ${cand.appointment_order_document}`}
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>Download</span>
                                    </button>

                                    <button
                                      type="button"
                                      disabled={isUploading}
                                      onClick={() => fileInputRefs.current[cand.candidate_id]?.click()}
                                      className="inline-flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
                                      title="Replace Appointment Order PDF"
                                    >
                                      {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                      <span>Replace</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => fileInputRefs.current[cand.candidate_id]?.click()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-[11px] rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
                                  >
                                    {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                    <span>Upload PDF</span>
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Actions (Edit Candidate) */}
                            <td className="py-3 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCandidateIndex(idx);
                                  setIsEditModalOpen(true);
                                }}
                                className="p-1.5 text-[#0f417a] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-lg transition cursor-pointer"
                                title="Edit Candidate Details"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}

                      {candidates.length === 0 && (
                        <tr>
                          <td colSpan="10" className="py-10 text-center text-slate-500 dark:text-slate-400 font-medium">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                            No candidate details recorded yet for this appointment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Candidate Shortcut if less than total required */}
              {candidates.length < totalRequiredResources && (
                <div className="flex items-center justify-between p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>
                      {totalRequiredResources - candidates.length} more candidate profile(s) pending to be completed for this position.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCandidateIndex(candidates.length);
                      setIsEditModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Candidate {candidates.length + 1}</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 dark:bg-slate-900 px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Edit Candidate Sub-Modal */}
      {isEditModalOpen && editingCandidateIndex !== null && (
        <CandidateModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          candidateIndex={editingCandidateIndex}
          candidateData={candidates[editingCandidateIndex] || null}
          consultantAppointmentId={appointment.id}
          onSaveSuccess={() => {
            loadCandidates();
          }}
          triggerNotification={triggerNotification}
        />
      )}

    </div>
  );
}
