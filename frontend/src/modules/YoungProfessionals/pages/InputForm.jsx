import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Upload, X, ArrowLeft, Plus, FileText } from 'lucide-react';
import { API_BASE, createYoungProfessional, updateYoungProfessional, uploadYPDocument } from '../api';
import { useYpStore } from '../store/useYpStore';
import { getCurrentUserId } from '../../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage, toastError } from '../../../utils/notify';
import { YP_TOASTS } from '../toastMessages';

const COMMON_SKILLS = [
  'SQL', 'Python', 'Java', 'React', 'Javascript', 'HTML', 'CSS',
  'Project Management', 'Data Analysis', 'Excel', 'Word', 'PowerPoint',
  'Financial Modeling', 'Content Writing', 'Research', 'Public Policy',
  'Logistics', 'Administration', 'Operations', 'Communications', 'Strategic Planning'
];

export default function InputForm({
  editData = null,
  wings: propsWings = [],
  divisions: propsDivisions = [],
  onBack,
  onSuccess,
  triggerNotification,
  canEdit = false,
  canAdd = false
}) {
  const isEdit = !!editData;
  const notify = useNotifier(triggerNotification);
  const fileInputRef = useRef(null);

  // Zustand YP Store for reference metadata
  const storeWings = useYpStore(state => state.wings);
  const storeDivisions = useYpStore(state => state.divisions);
  const loadWingsAndDivisions = useYpStore(state => state.loadWingsAndDivisions);

  const wings = propsWings && propsWings.length > 0 ? propsWings : storeWings;
  const divisions = propsDivisions && propsDivisions.length > 0 ? propsDivisions : storeDivisions;

  useEffect(() => {
    if (wings.length === 0 || divisions.length === 0) {
      loadWingsAndDivisions();
    }
  }, [wings.length, divisions.length, loadWingsAndDivisions]);

  // Form states
  const [wing, setWing] = useState('');
  const [division, setDivision] = useState('');
  const [name, setName] = useState('');
  const [qualification, setQualification] = useState('');
  const [role, setRole] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [salary, setSalary] = useState('');
  const [experience, setExperience] = useState('');
  
  // Skills keyword pool states
  const [skillInput, setSkillInput] = useState('');
  const [skillsList, setSkillsList] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef(null);

  const [errors, setErrors] = useState({});

  const [initialValues, setInitialValues] = useState({
    wing: '',
    division: '',
    name: '',
    qualification: '',
    role: '',
    appointmentDate: '',
    salary: '',
    experience: '',
    skillsList: [],
    documentName: ''
  });

  const validateField = (field, value) => {
    let err = '';
    if (field === 'name') {
      if (value.trim() && !/^[a-zA-Z\s.]+$/.test(value)) {
        err = 'Name must only contain alphabetic characters, spaces, or dots.';
      }
    } else if (field === 'salary') {
      if (value !== '' && (isNaN(value) || Number(value) <= 0)) {
        err = 'Salary must be a positive number greater than 0.';
      }
    } else if (field === 'experience') {
      if (value !== '' && (isNaN(value) || Number(value) < 0)) {
        err = 'Experience cannot be negative.';
      }
    } else if (field === 'appointmentDate') {
      if (value) {
        const selected = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (selected > today) {
          err = 'Appointment date cannot be in the future.';
        }
      }
    }
    setErrors(prev => {
      const updated = { ...prev };
      if (err) {
        updated[field] = err;
      } else {
        delete updated[field];
      }
      return updated;
    });
  };

  const [touched, setTouched] = useState({});

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldInvalid = (field, val) => {
    if (errors[field]) return true;
    if (touched[field]) {
      if (field === 'skills') {
        return skillsList.length === 0;
      }
      if (field === 'documentName' && !isEdit) {
        return !documentName;
      }
      return !val || (typeof val === 'string' && !val.trim());
    }
    return false;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const [documentName, setDocumentName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  // Suggestions logic for skills
  const suggestions = useMemo(() => {
    if (!skillInput.trim()) return [];
    const query = skillInput.toLowerCase();
    
    // Filter matching skills from COMMON_SKILLS that are not already in skillsList
    const matched = COMMON_SKILLS.filter(
      skill => skill.toLowerCase().includes(query) && !skillsList.includes(skill)
    );
    
    // If exact typed value is not in matched list and not in skillsList, add it as a new/custom suggestion
    const exactMatchExists = matched.some(s => s.toLowerCase() === query) || skillsList.some(s => s.toLowerCase() === query);
    if (!exactMatchExists && skillInput.trim()) {
      matched.push(skillInput.trim());
    }
    
    return matched;
  }, [skillInput, skillsList]);

  const handleSelectSuggestion = (skill) => {
    if (skill && !skillsList.includes(skill)) {
      setSkillsList([...skillsList, skill]);
    }
    setSkillInput('');
    setShowSuggestions(false);
  };


  useEffect(() => {
    let initWing = '';
    let initDivision = '';
    let initName = '';
    let initQualification = '';
    let initRole = '';
    let initAppointmentDate = '';
    let initSalary = '';
    let initExperience = '';
    let initSkillsList = [];
    let initDocumentName = '';

    if (editData) {
      initWing = editData.wing_id || '';
      initDivision = editData.division_id || '';
      initName = editData.name || '';
      initQualification = editData.qualification || '';
      initRole = editData.role || '';
      initAppointmentDate = editData.appointment_date ? editData.appointment_date.split('T')[0] : '';
      initSalary = editData.salary !== undefined && editData.salary !== null ? String(editData.salary) : '';
      initExperience = editData.total_experience !== undefined && editData.total_experience !== null ? String(editData.total_experience) : '';
      
      if (editData.skills) {
        initSkillsList = Array.isArray(editData.skills) 
          ? editData.skills 
          : editData.skills.split(',').map(s => s.trim()).filter(Boolean);
      }
      initDocumentName = editData.appointment_document || '';

      setWing(initWing);
      setDivision(initDivision);
      setName(initName);
      setQualification(initQualification);
      setRole(initRole);
      setAppointmentDate(initAppointmentDate);
      setSalary(initSalary);
      setExperience(initExperience);
      setSkillsList(initSkillsList);
      setDocumentName(initDocumentName);
    } else {
      setWing('');
      setDivision('');
      setName('');
      setQualification('');
      setRole('');
      setAppointmentDate('');
      setSalary('');
      setExperience('');
      setSkillsList([]);
      setDocumentName('');
    }

    setInitialValues({
      wing: initWing,
      division: initDivision,
      name: initName,
      qualification: initQualification,
      role: initRole,
      appointmentDate: initAppointmentDate,
      salary: initSalary,
      experience: initExperience,
      skillsList: initSkillsList,
      documentName: initDocumentName
    });

    setTouched({});
  }, [editData]);

  // Dynamically filter divisions based on the selected wing
  const filteredDivisions = useMemo(() => {
    if (!wing) return [];
    return divisions.filter(d => String(d.wing_id) === String(wing));
  }, [wing, divisions]);

  // The wing onChange handler resets division for normal user interactions.
  // This effect handles the editData case: when a different record is opened for edit,
  // the stored division_id may not belong to the stored wing_id in the new filteredDivisions list.
  useEffect(() => {
    if (!wing) {
      if (division) setDivision('');
      return;
    }
    if (division) {
      const exists = filteredDivisions.some(d => String(d.division_id) === String(division));
      if (!exists) {
        setDivision('');
      }
    }
  }, [wing, filteredDivisions, division]);


  const isDirty = useMemo(() => {
    if (wing !== initialValues.wing) return true;
    if (division !== initialValues.division) return true;
    if (name !== initialValues.name) return true;
    if (qualification !== initialValues.qualification) return true;
    if (role !== initialValues.role) return true;
    if (appointmentDate !== initialValues.appointmentDate) return true;
    if (salary !== initialValues.salary) return true;
    if (experience !== initialValues.experience) return true;
    if (documentName !== initialValues.documentName) return true;
    
    // Order-independent skills comparison: reordering alone does not mark the form dirty
    const sortedCurrent = [...skillsList].sort();
    const sortedInitial = [...initialValues.skillsList].sort();
    if (sortedCurrent.length !== sortedInitial.length) return true;
    if (sortedCurrent.some((s, i) => s !== sortedInitial[i])) return true;

    return false;
  }, [wing, division, name, qualification, role, appointmentDate, salary, experience, documentName, skillsList, initialValues]);

  const handleAddSkill = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = skillInput.trim().replace(/,/g, '');
      if (val && !skillsList.includes(val)) {
        setSkillsList([...skillsList, val]);
      }
      setSkillInput('');
      setShowSuggestions(false);
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkillsList(skillsList.filter(s => s !== skillToRemove));
  };

  const handleSkillLabelClick = (skill) => {
    setSkillInput(skill);
    setShowSuggestions(true);
    handleRemoveSkill(skill);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEdit && !canEdit) {
      notify(toastError('Permission Denied', 'You do not have permission to edit records.'));
      return;
    }
    if (!isEdit && !canAdd) {
      notify(toastError('Permission Denied', 'You do not have permission to add records.'));
      return;
    }

    if (!wing) {
      notify(COMMON_TOASTS.requiredSelect('Wing'));
      return;
    }
    if (!division) {
      notify(COMMON_TOASTS.requiredSelect('Division'));
      return;
    }
    if (!name.trim()) {
      notify(COMMON_TOASTS.requiredInput('Name'));
      return;
    }
    if (Object.keys(errors).length > 0) {
      notify(COMMON_TOASTS.fixValidationErrors(Object.values(errors).join(' ')));
      return;
    }
    if (!isEdit && (!fileInputRef.current || !fileInputRef.current.files[0])) {
      notify(YP_TOASTS.documentRequired());
      return;
    }

    setSubmitting(true);

    const activeUserId = getCurrentUserId();
    if (!activeUserId) {
      notify(toastError('Session Expired', 'Please log in again to continue.'));
      setSubmitting(false);
      return;
    }

    const payload = {
      wing_id: parseInt(wing),
      division_id: parseInt(division),
      name: name.trim(),
      qualification: qualification.trim(),
      role: role.trim(),
      appointment_date: appointmentDate,
      salary: parseFloat(salary),
      total_experience: parseInt(experience),
      skills: skillsList.join(', '),
      created_by: activeUserId,
      updated_by: activeUserId
    };

    try {
      let ypId = null;
      if (isEdit) {
        await updateYoungProfessional(editData.yp_id, payload);
        ypId = editData.yp_id;
      } else {
        const response = await createYoungProfessional(payload);
        ypId = response.data?.insertedYPId;
      }

      // The record is saved at this point; report an upload failure separately
      // so the user isn't told the whole save failed
      if (fileInputRef.current && fileInputRef.current.files[0]) {
        const formData = new FormData();
        formData.append("file", fileInputRef.current.files[0]);
        try {
          await uploadYPDocument(ypId, formData);
        } catch (uploadErr) {
          console.error(uploadErr);
          notify(YP_TOASTS.documentUploadFailed(payload.name, getErrorMessage(uploadErr)));
          onSuccess();
          return;
        }
      }

      notify(isEdit ? YP_TOASTS.updated(payload.name) : YP_TOASTS.created(payload.name));
      onSuccess();
    } catch (err) {
      console.error(err);
      notify(YP_TOASTS.saveFailed(isEdit, getErrorMessage(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled =
    (!isEdit && !canAdd) ||
    (isEdit && !canEdit) ||
    !wing ||
    !division ||
    !name.trim() ||
    !qualification.trim() ||
    !role.trim() ||
    !appointmentDate ||
    salary === '' ||
    experience === '' ||
    skillsList.length === 0 ||
    (!isEdit && !documentName) ||
    Object.keys(errors).length > 0 ||
    submitting ||
    (isEdit && !isDirty);

  return (
    <div className="module-form-card animate-fade-in">
      <div className="module-form-banner">
        <div>
          <h3 className="module-form-banner-title">
            {isEdit ? "Update Young Professional" : "Add Young Professional"}
          </h3>
          <p className="module-form-banner-subtext">Ministry of Ports, Shipping and Waterways</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="module-form-label">Wing <span className="text-rose-500">*</span></label>
            <select
              value={wing}
              onChange={(e) => { 
                const newWing = e.target.value;
                setWing(newWing); 
                setDivision('');
                if (touched.wing) handleBlur('wing'); 
              }}
              onBlur={() => handleBlur('wing')}
              required
              className={`module-form-select cursor-pointer ${isFieldInvalid('wing', wing) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`}
            >
              <option value="">--Select Wing--</option>
              {wings.map(w => <option key={w.wing_id} value={w.wing_id}>{w.wing_name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Division <span className="text-rose-500">*</span></label>
            <select
              value={division}
              onChange={(e) => { setDivision(e.target.value); if (touched.division) handleBlur('division'); }}
              onBlur={() => handleBlur('division')}
              disabled={!wing}
              required
              className={`module-form-select cursor-pointer ${isFieldInvalid('division', division) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''} ${!wing ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <option value="">
                {!wing ? '--Select Wing First--' : '--Select Division--'}
              </option>
              {filteredDivisions.map(d => <option key={d.division_id} value={d.division_id}>{d.division_name}</option>)}
            </select>
          </div>
        </div>

        <h3 className="module-form-section-title">Personal & Professional Info</h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="module-form-label">Name <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={name} 
              onChange={e => { setName(e.target.value); validateField('name', e.target.value); }} 
              onBlur={() => handleBlur('name')}
              required 
              placeholder="Enter full name"
              className={`module-form-input ${isFieldInvalid('name', name) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} 
            />
            {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Educational Qualification <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={qualification} 
              onChange={e => { setQualification(e.target.value); if (touched.qualification) handleBlur('qualification'); }} 
              onBlur={() => handleBlur('qualification')}
              required 
              placeholder="e.g. B.Tech, MBA"
              className={`module-form-input ${isFieldInvalid('qualification', qualification) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Role / Designation <span className="text-rose-500">*</span></label>
            <input 
              type="text" 
              value={role} 
              onChange={e => { setRole(e.target.value); if (touched.role) handleBlur('role'); }} 
              onBlur={() => handleBlur('role')}
              required 
              placeholder="e.g. Young Professional (HR)"
              className={`module-form-input ${isFieldInvalid('role', role) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Date of Appointment <span className="text-rose-500">*</span></label>
            <input 
              type="date" 
              value={appointmentDate} 
              max={todayStr}
              onChange={e => { setAppointmentDate(e.target.value); validateField('appointmentDate', e.target.value); }} 
              onBlur={() => handleBlur('appointmentDate')}
              required 
              className={`module-form-input ${isFieldInvalid('appointmentDate', appointmentDate) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''} dark:[color-scheme:dark]`} 
            />
            {errors.appointmentDate && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.appointmentDate}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Salary (per month) <span className="text-rose-500">*</span></label>
            <input 
              type="number" 
              step="0.01"
              value={salary} 
              onChange={e => { setSalary(e.target.value); validateField('salary', e.target.value); }} 
              onBlur={() => handleBlur('salary')}
              required 
              placeholder="e.g. 70000"
              className={`module-form-input ${isFieldInvalid('salary', salary) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} 
            />
            {errors.salary && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.salary}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="module-form-label">Total Experience (Years of Exp - YOE) <span className="text-rose-500">*</span></label>
            <input 
              type="number" 
              value={experience} 
              onChange={e => { setExperience(e.target.value); validateField('experience', e.target.value); }} 
              onBlur={() => handleBlur('experience')}
              required 
              placeholder="e.g. 2"
              className={`module-form-input ${isFieldInvalid('experience', experience) ? '!border-rose-500 !ring-1 !ring-rose-500' : ''}`} 
            />
            {errors.experience && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.experience}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="module-form-label">Skills Keyword Pool (Type & press Enter or comma) <span className="text-rose-500">*</span></label>
          {skillsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl mb-2">
              {skillsList.map(skill => (
                <span 
                  key={skill} 
                  className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs font-bold uppercase"
                >
                  <span
                    onClick={() => handleSkillLabelClick(skill)}
                    className="cursor-pointer hover:underline hover:text-blue-900 dark:hover:text-blue-100"
                    title="Click to edit skill"
                  >
                    {skill}
                  </span>
                  <button 
                    type="button" 
                    onClick={() => handleRemoveSkill(skill)}
                    className="hover:text-red-500 font-black cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="relative" ref={suggestionsRef}>
            <input 
              type="text"
              value={skillInput}
              onChange={e => {
                setSkillInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={handleAddSkill}
              placeholder="Add skills (e.g. React, SQL, Project Management)"
              className="module-form-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg mt-1.5 p-1 max-h-48 overflow-y-auto flex flex-col gap-0.5 select-none animate-fade-in">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                  >
                    {COMMON_SKILLS.includes(s) ? s : `+ Add "${s}"`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Appointment document - Auto grow with text wrapping */}
        <div className="space-y-1.5 w-full max-w-md">
          <label className="module-form-label">
            Appointment Order Document <span className="text-rose-500">*</span>
          </label>
          <div className={`flex flex-col items-center justify-center border-2 border-dashed ${isFieldInvalid('documentName', documentName) ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-slate-300 dark:border-slate-700 hover:border-[#0f417a] dark:hover:border-blue-500'} rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer relative min-h-[110px] w-full`}>
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".pdf"
              required={!isEdit}
              onBlur={() => handleBlur('documentName')}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
                    notify(COMMON_TOASTS.invalidFileType('PDF'));
                    e.target.value = '';
                    setDocumentName('');
                    if (touched.documentName) handleBlur('documentName');
                    return;
                  }
                  if (file.size > 10 * 1024 * 1024) {
                    notify(COMMON_TOASTS.fileTooLarge(10));
                    e.target.value = '';
                    setDocumentName('');
                    if (touched.documentName) handleBlur('documentName');
                    return;
                  }
                  setDocumentName(file.name);
                  if (touched.documentName) handleBlur('documentName');
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="text-center space-y-1 w-full max-w-full px-2">
              <Upload className="mx-auto h-6 w-6 text-slate-400 shrink-0" />
              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Upload PDF file</p>
              <p className="text-[9px] text-slate-400 font-semibold">(Only PDF under 10 MB is allowed)</p>
              {documentName && (
                <p className="text-[11px] font-black text-emerald-600 break-all whitespace-normal leading-relaxed pt-1 max-w-full">
                  Selected: {documentName}
                </p>
              )}
            </div>
          </div>

          {isEdit && editData.appointment_document && (
            <div className="mt-2 text-xs max-w-full">
              <a
                href={`${API_BASE}/download-yp-document?fileName=${encodeURIComponent(editData.appointment_document)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-wrap items-center gap-1 font-bold text-[#0f417a] dark:text-blue-400 hover:underline max-w-full"
              >
                <span className="shrink-0">View current document:</span>
                <span className="text-slate-600 dark:text-slate-400 font-semibold break-all" title={editData.appointment_document}>
                  {editData.appointment_document}
                </span>
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs text-rose-500 font-bold italic">
            * Asterisks marked with red are mandatory fields
          </span>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={isFormDisabled}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isFormDisabled
                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border border-slate-200 dark:border-slate-700'
                  : 'bg-[#0f417a] hover:bg-[#1a5ba3] text-white shadow-md shadow-blue-900/10 hover:shadow-lg dark:bg-blue-600 dark:hover:bg-blue-700'
              }`}
            >
              {isEdit ? (submitting ? 'Updating...' : 'Update Young Professional') : (submitting ? 'Saving...' : 'Save Young Professional')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
