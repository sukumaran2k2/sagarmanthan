import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  Upload,
  FileText,
  User,
  Calendar,
  Search,
  X,
  Plus,
  Edit2,
  Loader2,
  RefreshCw,
  File,
  CheckCircle,
  ChevronDown
} from 'lucide-react';
import Table from '../../../components/Table';
import CopyButton from '../../../components/CopyButton';
import ExportDropdown from '../../../components/ExportDropdown';
import {
  fetchCandidatesByConsultantAppointmentId,
  addCandidateDetail,
  updateCandidateDetail,
  uploadCandidateDocument,
  addConsultantID,
  API_BASE
} from '../api';

export default function CandidateDrilldownView({
  appointment,
  onBack,
  triggerNotification
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [gridApi, setGridApi] = useState(null);
  const [uploadingForCandidateId, setUploadingForCandidateId] = useState(null);

  // Column Visibility dropdown
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [visibleCols, setVisibleCols] = useState({
    sNo: true,
    name: true,
    qualification: true,
    work_experience: true,
    salary: true,
    category: true,
    date_of_appointment: true,
    skill_set: true,
    appointment_order_document: true
  });

  // In-place candidate edit mode (NO overlay / NO modal dialog)
  const [editMode, setEditMode] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);

  // In-place form states
  const [candName, setCandName] = useState('');
  const [candQualification, setCandQualification] = useState('');
  const [candWorkExperience, setCandWorkExperience] = useState('');
  const [candSalary, setCandSalary] = useState('');
  const [candCategory, setCandCategory] = useState('Direct Contract');
  const [candAppointmentDate, setCandAppointmentDate] = useState('');
  const [candSkillSet, setCandSkillSet] = useState('');
  const [candFileName, setCandFileName] = useState('');
  const [candFile, setCandFile] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const fileInputRefs = useRef({});
  const inPlaceFileInputRef = useRef(null);

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
    if (appointment?.id) {
      loadCandidates();
    }
  }, [appointment?.id]);

  const totalRequiredResources = Number(appointment.numResources) || 1;

  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      const search = searchTerm.toLowerCase();
      return (
        (c.name || '').toLowerCase().includes(search) ||
        (c.qualification || '').toLowerCase().includes(search) ||
        (c.skill_set || '').toLowerCase().includes(search) ||
        (c.category || '').toLowerCase().includes(search)
      );
    });
  }, [candidates, searchTerm]);

  // Open in-place form for creating or editing a candidate
  const handleOpenEditCandidate = (cand, index) => {
    setEditingIndex(index);
    if (cand) {
      setCandName(cand.name || '');
      setCandQualification(cand.qualification || '');
      setCandWorkExperience(
        cand.work_experience !== undefined && cand.work_experience !== null
          ? String(cand.work_experience)
          : ''
      );
      setCandSalary(
        cand.salary !== undefined && cand.salary !== null ? String(cand.salary) : ''
      );
      setCandCategory(cand.category || 'Direct Contract');
      setCandAppointmentDate(
        cand.date_of_appointment
          ? new Date(cand.date_of_appointment).toISOString().split('T')[0]
          : ''
      );
      setCandSkillSet(cand.skill_set || '');
      setCandFileName(cand.appointment_order_document || '');
      setCandFile(null);
    } else {
      setCandName('');
      setCandQualification('');
      setCandWorkExperience('');
      setCandSalary('');
      setCandCategory('Direct Contract');
      setCandAppointmentDate('');
      setCandSkillSet('');
      setCandFileName('');
      setCandFile(null);
    }
    setFormErrors({});
    setEditMode(true);
  };

  const handleCloseEditCandidate = () => {
    setEditMode(false);
    setEditingIndex(null);
    setFormErrors({});
  };

  const handleSaveCandidateInPlace = async (e) => {
    e.preventDefault();

    const errors = {};
    if (!candName.trim()) errors.name = 'Name is required';
    if (!candQualification.trim()) errors.qualification = 'Educational Qualification is required';
    if (!String(candWorkExperience).trim()) errors.workExperience = 'Work experience is required';
    if (!String(candSalary).trim()) errors.salary = 'Salary is required';
    if (!candCategory) errors.category = 'Deployment category is required';
    if (!candAppointmentDate) errors.appointmentDate = 'Date of appointment is required';
    if (!candSkillSet.trim()) errors.skillSet = 'Skill set is required';
    if (!candFileName && !candFile) errors.file = 'Appointment order document is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      if (triggerNotification) triggerNotification('Please fill in all mandatory fields highlighted in red.', 'warning');
      return;
    }

    setFormSaving(true);
    try {
      const existingCand = editingIndex !== null ? candidates[editingIndex] : null;
      let candidateId = existingCand?.candidate_id;

      const payload = {
        name: candName,
        qualification: candQualification,
        workExperience: Number(candWorkExperience) || 0,
        salary: Number(candSalary) || 0,
        category: candCategory,
        appointmentDate: candAppointmentDate,
        skillSet: candSkillSet
      };

      if (candidateId) {
        await updateCandidateDetail({
          candidate_id: candidateId,
          ...payload
        });
      } else {
        const res = await addCandidateDetail(payload);
        candidateId = res.data?.candidate_id;
      }

      // Upload file if new file selected
      if (candFile && candidateId) {
        const formData = new FormData();
        formData.append('candidateID', candidateId);
        formData.append('file', candFile);
        await uploadCandidateDocument(formData);
      }

      // Link candidate to this appointment
      if (appointment.id && candidateId) {
        try {
          await addConsultantID({
            candidateID: candidateId,
            consultantAppointmentID: appointment.id
          });
        } catch (linkErr) {
          console.warn('Link note:', linkErr);
        }
      }

      if (triggerNotification) {
        triggerNotification(
          existingCand ? 'Candidate details updated successfully!' : 'New candidate added successfully!',
          'success'
        );
      }

      await loadCandidates();
      setEditMode(false);
      setEditingIndex(null);
    } catch (err) {
      console.error('Error saving candidate in-place:', err);
      if (triggerNotification) {
        triggerNotification(err.response?.data?.message || 'Failed to save candidate details.', 'error');
      }
    } finally {
      setFormSaving(false);
    }
  };

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
      return d.toLocaleDateString('en-GB');
    } catch {
      return String(dateVal);
    }
  };

  const handleExport = (type) => {
    const exportHeaders = ['S.No', 'Candidate Name', 'Qualification', 'Experience (Years)', 'Salary (LPA)', 'Category', 'Appointment Date', 'Skill Set', 'Appointment Order File'];
    if (type === 'Copy') {
      let tsv = exportHeaders.join('\t') + '\n';
      filteredCandidates.forEach((c, idx) => {
        tsv += [
          idx + 1,
          c.name || '',
          c.qualification || '',
          c.work_experience || '',
          c.salary || '',
          c.category || '',
          c.date_of_appointment ? new Date(c.date_of_appointment).toLocaleDateString('en-GB') : '',
          c.skill_set || '',
          c.appointment_order_document || ''
        ].join('\t') + '\n';
      });
      navigator.clipboard.writeText(tsv)
        .then(() => { if (triggerNotification) triggerNotification('Candidate details copied to clipboard!', 'success'); })
        .catch(() => { if (triggerNotification) triggerNotification('Failed to copy table data.', 'error'); });
    } else if (type === 'Excel') {
      let csv = exportHeaders.map(h => `"${h}"`).join(',') + '\n';
      filteredCandidates.forEach((c, idx) => {
        csv += [
          idx + 1,
          `"${(c.name || '').replace(/"/g, '""')}"`,
          `"${(c.qualification || '').replace(/"/g, '""')}"`,
          c.work_experience || '',
          c.salary || '',
          `"${(c.category || '').replace(/"/g, '""')}"`,
          c.date_of_appointment ? new Date(c.date_of_appointment).toLocaleDateString('en-GB') : '',
          `"${(c.skill_set || '').replace(/"/g, '""')}"`,
          `"${(c.appointment_order_document || '').replace(/"/g, '""')}"`
        ].join(',') + '\n';
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Candidate_Details_${appointment.wing || 'Consultant'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      if (triggerNotification) triggerNotification('Candidate data exported to Excel (CSV) successfully!', 'success');
    } else if (type === 'PDF') {
      const printWindow = window.open('', '_blank');
      const title = `Candidate Details — ${appointment.wing} / ${appointment.division}`;
      let headersHtml = exportHeaders.map(h => `<th style="border: 1px solid #cbd5e1; padding: 8px; text-align: left; background-color: #0f417a; color: #ffffff; font-size: 10px; font-weight: bold; text-transform: uppercase;">${h}</th>`).join('');
      let rowsHtml = filteredCandidates.map((c, idx) => `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; text-align: center;">${idx + 1}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; font-weight: bold;">${c.name || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px;">${c.qualification || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; text-align: center;">${c.work_experience || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; text-align: center;">${c.salary ? '₹ ' + c.salary + ' L' : '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px;">${c.category || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px; text-align: center;">${c.date_of_appointment ? new Date(c.date_of_appointment).toLocaleDateString('en-GB') : '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px;">${c.skill_set || '-'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 8px; font-size: 11px;">${c.appointment_order_document || 'Pending'}</td>
        </tr>
      `).join('');
      printWindow.document.write(`
        <html>
          <head>
            <title>${title}</title>
            <style>body { font-family: system-ui, sans-serif; padding: 20px; color: #1e293b; } table { width: 100%; border-collapse: collapse; margin-top: 15px; }</style>
          </head>
          <body>
            <h2 style="color: #0f417a; margin-bottom: 4px;">${title}</h2>
            <p style="font-size: 11px; color: #64748b; margin-top: 0;">Status: ${appointment.status} | Total Resources: ${appointment.numResources}</p>
            <table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
            <script>window.onload = function() { window.print(); window.close(); };</script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // Ag Grid Column Definitions
  const columnDefs = useMemo(() => {
    return [
      {
        field: 'sNo',
        headerName: 'S.No',
        valueGetter: (params) => (params.node ? params.node.rowIndex + 1 : ''),
        minWidth: 80,
        maxWidth: 90,
        cellClass: 'text-center font-mono font-bold text-slate-800 dark:text-slate-100',
        headerClass: 'text-center',
        hide: !visibleCols.sNo
      },
      {
        field: 'name',
        headerName: 'Candidate Name',
        flex: 1.3,
        minWidth: 180,
        cellRenderer: (params) => {
          const val = params.value;
          return (
            <div className="flex items-center gap-2.5 w-full h-full py-1">
              <div className="h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-950 text-[#0f417a] dark:text-blue-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                {val ? val.charAt(0).toUpperCase() : 'C'}
              </div>
              <span className="font-bold text-slate-800 dark:text-slate-100 truncate" title={val || '-'}>
                {val || '-'}
              </span>
            </div>
          );
        },
        hide: !visibleCols.name
      },
      {
        field: 'qualification',
        headerName: 'Qualification',
        flex: 1,
        minWidth: 140,
        cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
        hide: !visibleCols.qualification
      },
      {
        field: 'work_experience',
        headerName: 'Experience',
        flex: 0.8,
        minWidth: 110,
        headerClass: 'text-center',
        cellClass: 'text-center font-semibold text-slate-700 dark:text-slate-300',
        valueFormatter: (params) =>
          params.value !== null && params.value !== undefined ? `${params.value} Yrs` : '-',
        hide: !visibleCols.work_experience
      },
      {
        field: 'salary',
        headerName: 'Salary (LPA)',
        flex: 0.9,
        minWidth: 115,
        headerClass: 'text-center',
        cellClass: 'text-center font-bold text-slate-800 dark:text-slate-200',
        valueFormatter: (params) => (params.value ? `₹ ${params.value} L` : '-'),
        hide: !visibleCols.salary
      },
      {
        field: 'category',
        headerName: 'Deployment Category',
        flex: 1.2,
        minWidth: 160,
        cellRenderer: (params) => {
          const cat = params.value || 'Direct Contract';
          return (
            <div className="flex items-center w-full h-full py-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  cat === 'Direct Contract'
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                }`}
              >
                {cat}
              </span>
            </div>
          );
        },
        hide: !visibleCols.category
      },
      {
        field: 'date_of_appointment',
        headerName: 'Appointment Date',
        flex: 1,
        minWidth: 130,
        headerClass: 'text-center',
        cellClass: 'text-center font-mono text-slate-600 dark:text-slate-400',
        valueFormatter: (params) => formatDateDisplay(params.value),
        hide: !visibleCols.date_of_appointment
      },
      {
        field: 'skill_set',
        headerName: 'Skill Set',
        flex: 1,
        minWidth: 130,
        cellClass: 'text-slate-700 dark:text-slate-300 font-medium',
        hide: !visibleCols.skill_set
      },
      {
        field: 'appointment_order_document',
        headerName: 'Appointment Order (PDF)',
        flex: 1.6,
        minWidth: 230,
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const row = params.data;
          if (!row) return null;
          const hasDoc = !!row.appointment_order_document;
          const isUploading = uploadingForCandidateId === row.candidate_id;

          return (
            <div className="flex items-center justify-center gap-2 w-full h-full py-1">
              <input
                type="file"
                ref={(el) => (fileInputRefs.current[row.candidate_id] = el)}
                accept=".pdf"
                onChange={(e) => handleFileUpload(e, row.candidate_id)}
                className="hidden"
              />

              {hasDoc ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDownload(row.appointment_order_document)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50 dark:text-emerald-300 font-bold text-xs rounded-lg border border-emerald-200 dark:border-emerald-800 transition cursor-pointer shadow-xs"
                    title={`Download ${row.appointment_order_document}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRefs.current[row.candidate_id]?.click()}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-bold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer disabled:opacity-50"
                    title="Replace Appointment Order PDF"
                  >
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    <span>Replace</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRefs.current[row.candidate_id]?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>Upload PDF</span>
                </button>
              )}
            </div>
          );
        },
        hide: !visibleCols.appointment_order_document
      },
      {
        headerName: 'Action',
        minWidth: 90,
        maxWidth: 100,
        headerClass: 'text-center',
        cellRenderer: (params) => {
          const row = params.data;
          const idx = params.node ? params.node.rowIndex : 0;
          return (
            <div className="flex items-center justify-center w-full h-full py-1">
              <button
                type="button"
                onClick={() => handleOpenEditCandidate(row, idx)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-[#0f417a] dark:text-blue-400 transition cursor-pointer"
                title="Edit Candidate Details"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </div>
          );
        }
      }
    ];
  }, [visibleCols, uploadingForCandidateId]);

  // ==========================================
  // RENDER 1: IN-PLACE CANDIDATE EDIT FORM (NO MODAL / NO OVERLAY)
  // ==========================================
  if (editMode) {
    const isNew = editingIndex === null || editingIndex >= candidates.length;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCloseEditCandidate}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Back to Candidate List"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider font-display">
                {isNew ? `Add Candidate ${editingIndex !== null ? editingIndex + 1 : ''} Details` : `Update Candidate ${editingIndex + 1} Details`}
              </h3>
              <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">
                {appointment.wing} • {appointment.division} ({appointment.appointmentType})
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveCandidateInPlace} className="p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={candName}
                onChange={(e) => setCandName(e.target.value)}
                placeholder="Enter candidate name"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  formErrors.name ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100`}
              />
              {formErrors.name && <p className="text-[10px] text-red-500 font-bold">{formErrors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Educational Qualification <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={candQualification}
                onChange={(e) => setCandQualification(e.target.value)}
                placeholder="e.g. B.Tech / MBA / Post Graduate"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  formErrors.qualification ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100`}
              />
              {formErrors.qualification && <p className="text-[10px] text-red-500 font-bold">{formErrors.qualification}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Work Experience (Years) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={candWorkExperience}
                onChange={(e) => setCandWorkExperience(e.target.value)}
                placeholder="e.g. 5"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  formErrors.workExperience ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100`}
              />
              {formErrors.workExperience && <p className="text-[10px] text-red-500 font-bold">{formErrors.workExperience}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Salary (LPA) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={candSalary}
                onChange={(e) => setCandSalary(e.target.value)}
                placeholder="e.g. 12"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  formErrors.salary ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100`}
              />
              {formErrors.salary && <p className="text-[10px] text-red-500 font-bold">{formErrors.salary}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Deployment Category <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="candCategoryInPlace"
                    value="Direct Contract"
                    checked={candCategory === 'Direct Contract'}
                    onChange={(e) => setCandCategory(e.target.value)}
                    className="h-4 w-4 text-[#0f417a] focus:ring-blue-500"
                  />
                  Direct Contract
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                  <input
                    type="radio"
                    name="candCategoryInPlace"
                    value="Outsourced Via Service Provider"
                    checked={candCategory === 'Outsourced Via Service Provider'}
                    onChange={(e) => setCandCategory(e.target.value)}
                    className="h-4 w-4 text-[#0f417a] focus:ring-blue-500"
                  />
                  Outsourced Via Service Provider
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Date of Appointment <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={candAppointmentDate}
                  onChange={(e) => setCandAppointmentDate(e.target.value)}
                  className={`w-full text-xs pl-8 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border ${
                    formErrors.appointmentDate ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                  } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100`}
                />
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
              {formErrors.appointmentDate && <p className="text-[10px] text-red-500 font-bold">{formErrors.appointmentDate}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Skill Set <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={candSkillSet}
                onChange={(e) => setCandSkillSet(e.target.value)}
                placeholder="e.g. Policy, Legal, Finance"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  formErrors.skillSet ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-800 dark:text-slate-100`}
              />
              {formErrors.skillSet && <p className="text-[10px] text-red-500 font-bold">{formErrors.skillSet}</p>}
            </div>
          </div>

          {/* Upload Appointment Order PDF */}
          <div className="space-y-2 pt-2 max-w-xl">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Upload Appointment Order <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] font-bold text-red-500 italic">
              NOTE: Only PDF files can be uploaded. File Size: Max. 20 MB.
            </p>

            <div
              onClick={() => inPlaceFileInputRef.current?.click()}
              className={`border-2 border-dashed ${
                formErrors.file ? 'border-red-400 bg-red-50/10' : 'border-slate-300 dark:border-slate-700 hover:border-blue-500'
              } rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/60 dark:bg-slate-950`}
            >
              <input
                type="file"
                ref={inPlaceFileInputRef}
                accept=".pdf"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                      if (triggerNotification) triggerNotification('Invalid file type. Only PDF files are allowed.', 'error');
                      e.target.value = '';
                      return;
                    }
                    if (file.size > 20 * 1024 * 1024) {
                      if (triggerNotification) triggerNotification('File size exceeds 20 MB.', 'warning');
                      e.target.value = '';
                      return;
                    }
                    setCandFileName(file.name);
                    setCandFile(file);
                  }
                }}
                className="hidden"
              />
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  className="px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-sm pointer-events-none"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload
                </button>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Drag & Drop Files
                </span>
              </div>

              {candFileName && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                  <File className="h-3.5 w-3.5" />
                  <span>Selected: {candFileName}</span>
                </div>
              )}
            </div>
            {formErrors.file && <p className="text-[10px] text-red-500 font-bold">{formErrors.file}</p>}
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-3">
            <button
              type="submit"
              disabled={formSaving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {formSaving ? 'Saving...' : isNew ? 'Submit Candidate' : 'Update Candidate'}
            </button>
            <button
              type="button"
              onClick={handleCloseEditCandidate}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // RENDER 2: AG GRID CANDIDATES TABLE VIEW (MATCHING DATALIST UI THEME)
  // ==========================================
  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Top Breadcrumb & Back Action */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 select-none px-1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl border border-slate-250 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer shadow-sm group"
            title="Back to Consultant Appointments"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 font-display">
              Candidate Details & Appointment Orders
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
              {appointment.wing} • {appointment.division} • {appointment.appointmentType} •{' '}
              <span className="text-blue-600 dark:text-blue-400">{appointment.status}</span>
            </p>
          </div>
        </div>

        {candidates.length < totalRequiredResources && (
          <button
            type="button"
            onClick={() => handleOpenEditCandidate(null, candidates.length)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Candidate ({candidates.length + 1}/{totalRequiredResources})</span>
          </button>
        )}
      </div>

      {/* Main Table Container Matching DataList UI */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 dark:bg-slate-950 dark:border-slate-800">
        {/* Filter and Export Toolbar matching DataList */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="relative min-w-[220px] max-w-sm flex-1">
              <input
                type="text"
                placeholder="Search candidate name, qualification, skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-8 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
              />
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={loadCandidates}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
              title="Refresh table"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Total Candidates:{' '}
              <span className="text-[#0f417a] dark:text-blue-400 font-extrabold">
                {filteredCandidates.length}
              </span>
            </div>

            {/* Visibility Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer flex items-center space-x-1.5 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <span>Visibility</span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-xl shadow-lg p-2 z-50 animate-fade-in flex flex-col space-y-0.5 dark:bg-slate-900 dark:border-slate-800">
                  {Object.keys(visibleCols).map((col) => (
                    <label
                      key={col}
                      className="flex items-center space-x-2 px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={visibleCols[col]}
                        onChange={() =>
                          setVisibleCols((prev) => ({ ...prev, [col]: !prev[col] }))
                        }
                        className="h-3.5 w-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span>
                        {col === 'sNo'
                          ? 'S.No'
                          : col === 'work_experience'
                          ? 'Experience'
                          : col === 'date_of_appointment'
                          ? 'Appointment Date'
                          : col === 'appointment_order_document'
                          ? 'PDF Document'
                          : col === 'skill_set'
                          ? 'Skill Set'
                          : col}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <CopyButton
              onCopy={() => handleExport('Copy')}
              color="#0f417a"
              hoverBg="#f1f5f9"
            />
            <ExportDropdown
              onExportExcel={() => handleExport('Excel')}
              onExportPdf={() => handleExport('PDF')}
              color="#0f417a"
              hoverColor="#1e5ea8"
            />
          </div>
        </div>

        {/* Ag Grid Table */}
        <div className="ag-theme-quartz w-full relative border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:border-slate-800">
          <Table
            rowData={filteredCandidates}
            columnDefs={columnDefs}
            loading={loading}
            pagination={true}
            paginationPageSize={10}
            paginationPageSizeSelector={[10, 20, 50]}
            enableExport={false}
            color="#0f417a"
            onGridReady={(params) => setGridApi(params.api)}
            defaultColDef={{
              minWidth: 90,
              filter: true,
              sortable: true,
              resizable: true
            }}
          />
          <style dangerouslySetInnerHTML={{
            __html: `
            .ag-theme-quartz.rounded-xl,
            .ag-theme-quartz.rounded-2xl {
              border-radius: 16px !important;
            }
            .ag-theme-quartz .ag-root-wrapper {
              border-radius: 16px !important;
            }
            .ag-theme-quartz .ag-header {
              background: linear-gradient(to right, #0f417a, #1a5ba3) !important;
              border-bottom: 1px solid rgba(10, 45, 85, 0.2) !important;
            }
            .ag-theme-quartz .ag-header-cell-text {
              color: #ffffff !important;
              font-weight: 900 !important;
              text-transform: uppercase !important;
              letter-spacing: 0.05em !important;
              font-size: 11px !important;
            }
            .ag-theme-quartz .ag-header-icon {
              color: #ffffff !important;
            }
            .ag-theme-quartz .ag-paging-panel {
              color: #1e293b !important;
              font-weight: 700 !important;
              opacity: 1 !important;
            }
            .dark .ag-theme-quartz .ag-paging-panel {
              color: #f1f5f9 !important;
            }
            .ag-theme-quartz .ag-paging-button {
              color: #0f417a !important;
              opacity: 1 !important;
            }
            .dark .ag-theme-quartz .ag-paging-button {
              color: #3b82f6 !important;
            }
            .ag-theme-quartz .ag-paging-panel .ag-icon {
              color: #0f417a !important;
              opacity: 1 !important;
            }
            .dark .ag-theme-quartz .ag-paging-panel .ag-icon {
              color: #3b82f6 !important;
            }
            .ag-theme-quartz .ag-paging-row-summary-panel select {
              color: #1e293b !important;
              background-color: #fff !important;
              opacity: 1 !important;
              border: 1px solid #cbd5e1 !important;
              border-radius: 4px !important;
            }
            .dark .ag-theme-quartz .ag-paging-row-summary-panel select {
              color: #f1f5f9 !important;
              background-color: #1f2937 !important;
              border: 1px solid #4b5563 !important;
            }
            .ag-theme-quartz select option {
              color: #1e293b !important;
              background-color: #ffffff !important;
            }
            .dark .ag-theme-quartz select option {
              color: #f1f5f9 !important;
              background-color: #1f2937 !important;
            }
          `}} />
        </div>
      </div>
    </div>
  );
}
