import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, File, Calendar, CheckCircle } from 'lucide-react';
import { addCandidateDetail, updateCandidateDetail, uploadCandidateDocument, addConsultantID, API_BASE } from '../api';

export default function CandidateModal({
  isOpen,
  onClose,
  candidateIndex = 0,
  candidateData = null,
  consultantAppointmentId = null,
  onSaveSuccess,
  triggerNotification
}) {
  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [salary, setSalary] = useState('');
  const [category, setCategory] = useState('Direct Contract');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [skillSet, setSkillSet] = useState('');
  const [fileName, setFileName] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (candidateData) {
      setName(candidateData.name || '');
      setQualification(candidateData.qualification || '');
      setWorkExperience(
        candidateData.work_experience !== undefined && candidateData.work_experience !== null
          ? String(candidateData.work_experience)
          : candidateData.workExperience || ''
      );
      setSalary(
        candidateData.salary !== undefined && candidateData.salary !== null
          ? String(candidateData.salary)
          : ''
      );
      setCategory(candidateData.category || 'Direct Contract');
      setAppointmentDate(
        candidateData.date_of_appointment
          ? new Date(candidateData.date_of_appointment).toISOString().split('T')[0]
          : candidateData.appointmentDate || ''
      );
      setSkillSet(candidateData.skill_set || candidateData.skillSet || '');
      setFileName(candidateData.documentName || candidateData.appointment_order_document || '');
      setFile(null);
    } else {
      setName('');
      setQualification('');
      setWorkExperience('');
      setSalary('');
      setCategory('Direct Contract');
      setAppointmentDate('');
      setSkillSet('');
      setFileName('');
      setFile(null);
    }
    setErrors({});
  }, [candidateData, isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
      if (triggerNotification) triggerNotification('Invalid file format. Only PDF files are allowed.', 'error');
      e.target.value = '';
      return;
    }

    if (selected.size > 20 * 1024 * 1024) {
      if (triggerNotification) triggerNotification('File size exceeds 20 MB. Please choose a smaller file.', 'warning');
      e.target.value = '';
      return;
    }

    setFileName(selected.name);
    setFile(selected);
  };

  const handleSave = async (e) => {
    if (e) {
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    }

    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!qualification.trim()) newErrors.qualification = 'Educational Qualification is required';
    if (!String(workExperience).trim()) newErrors.workExperience = 'Work experience is required';
    if (!String(salary).trim()) newErrors.salary = 'Salary is required';
    if (!category) newErrors.category = 'Deployment category is required';
    if (!appointmentDate) newErrors.appointmentDate = 'Date of appointment is required';
    if (!skillSet.trim()) newErrors.skillSet = 'Skill set is required';
    if (!fileName && !file) newErrors.file = 'Appointment order document is required';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (triggerNotification) triggerNotification('Please fill in all mandatory fields highlighted in red.', 'warning');
      return;
    }

    setSaving(true);
    try {
      let candidateId = candidateData?.candidate_id;

      // Create or update candidate
      const candidatePayload = {
        name,
        qualification,
        workExperience: Number(workExperience) || 0,
        salary: Number(salary) || 0,
        category,
        appointmentDate,
        skillSet
      };

      if (candidateId) {
        await updateCandidateDetail({
          candidate_id: candidateId,
          ...candidatePayload
        });
      } else {
        const res = await addCandidateDetail(candidatePayload);
        candidateId = res.data?.candidate_id;
      }

      // Upload file if new file selected
      if (file && candidateId) {
        const formData = new FormData();
        formData.append('candidateID', candidateId);
        formData.append('file', file);
        await uploadCandidateDocument(formData);
      }

      // Link with consultant appointment if ID exists
      if (consultantAppointmentId && candidateId) {
        try {
          await addConsultantID({
            candidateID: candidateId,
            consultantAppointmentID: consultantAppointmentId
          });
        } catch (linkErr) {
          console.warn('Consultant link note:', linkErr);
        }
      }

      if (triggerNotification) {
        triggerNotification(`Candidate ${candidateIndex + 1} details saved successfully!`, 'success');
      }

      onSaveSuccess({
        candidate_id: candidateId,
        name,
        qualification,
        workExperience,
        work_experience: workExperience,
        salary,
        category,
        appointmentDate,
        date_of_appointment: appointmentDate,
        skillSet,
        skill_set: skillSet,
        documentName: fileName || file?.name,
        appointment_order_document: fileName || file?.name,
        file
      }, candidateIndex);

      onClose();
    } catch (err) {
      console.error('Error saving candidate details:', err);
      if (triggerNotification) {
        triggerNotification(err.response?.data?.message || 'Failed to save candidate details.', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-up">
        {/* Modal Header */}
        <div className="bg-[#0f417a] text-white px-6 py-4 flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider">
            View Candidate {candidateIndex + 1} Details
          </h3>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter candidate name"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  errors.name ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-medium`}
              />
              {errors.name && <p className="text-[10px] text-red-500 font-bold">{errors.name}</p>}
            </div>

            {/* Educational Qualification */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Educational Qualification <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={qualification}
                onChange={(e) => setQualification(e.target.value)}
                placeholder="e.g. B.Tech / MBA / Post Graduate"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  errors.qualification ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-medium`}
              />
              {errors.qualification && <p className="text-[10px] text-red-500 font-bold">{errors.qualification}</p>}
            </div>

            {/* Work Experience */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Work Experience <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={workExperience}
                onChange={(e) => setWorkExperience(e.target.value)}
                placeholder="e.g. 5 Years"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  errors.workExperience ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-medium`}
              />
              {errors.workExperience && <p className="text-[10px] text-red-500 font-bold">{errors.workExperience}</p>}
            </div>

            {/* Salary (LPA) */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Salary(LPA) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="e.g. 12"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  errors.salary ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-medium`}
              />
              {errors.salary && <p className="text-[10px] text-red-500 font-bold">{errors.salary}</p>}
            </div>
          </div>

          {/* Deployment Category Radio Buttons */}
          <div className="space-y-2 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Deployment Category <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="candidateCategory"
                  value="Direct Contract"
                  checked={category === 'Direct Contract'}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-4 w-4 text-[#0f417a] focus:ring-blue-500"
                />
                Direct Contract
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                <input
                  type="radio"
                  name="candidateCategory"
                  value="Outsourced Via Service Provider"
                  checked={category === 'Outsourced Via Service Provider'}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-4 w-4 text-[#0f417a] focus:ring-blue-500"
                />
                Outsourced Via Service Provider
              </label>
            </div>
          </div>

          {/* Date of Appointment & Skill Set */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Date of Appointment <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={appointmentDate}
                  onChange={(e) => setAppointmentDate(e.target.value)}
                  className={`w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border ${
                    errors.appointmentDate ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                  } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-medium`}
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
              {errors.appointmentDate && <p className="text-[10px] text-red-500 font-bold">{errors.appointmentDate}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                Skill Set <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={skillSet}
                onChange={(e) => setSkillSet(e.target.value)}
                placeholder="e.g. Maritime Policy, Finance, Legal"
                className={`w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-950 border ${
                  errors.skillSet ? 'border-red-500' : 'border-slate-250 dark:border-slate-800'
                } rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 font-medium`}
              />
              {errors.skillSet && <p className="text-[10px] text-red-500 font-bold">{errors.skillSet}</p>}
            </div>
          </div>

          {/* Upload Appointment Order */}
          <div className="space-y-1.5 pt-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
              Upload Appointment Order <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] font-bold text-red-500 italic">
              NOTE: Only PDF files can be uploaded. File Size: Max. 20 MB.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed ${
                errors.file ? 'border-red-400 bg-red-50/10' : 'border-slate-300 dark:border-slate-700 hover:border-blue-500'
              } rounded-xl p-4 text-center cursor-pointer transition bg-slate-50/60 dark:bg-slate-950`}
            >
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf"
                onChange={handleFileChange}
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

              {fileName && (
                <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-bold">
                  <File className="h-3.5 w-3.5" />
                  <span>Selected: {fileName}</span>
                </div>
              )}
            </div>
            {errors.file && <p className="text-[10px] text-red-500 font-bold">{errors.file}</p>}
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow-sm transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
