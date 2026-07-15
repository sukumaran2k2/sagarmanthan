import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, X, Upload } from 'lucide-react';
import axios from 'axios';

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

const COMMON_SKILLS = [
  'SQL', 'Python', 'Java', 'React', 'Javascript', 'HTML', 'CSS',
  'Project Management', 'Data Analysis', 'Excel', 'Word', 'PowerPoint',
  'Financial Modeling', 'Content Writing', 'Research', 'Public Policy',
  'Logistics', 'Administration', 'Operations', 'Communications', 'Strategic Planning'
];

export default function InputForm({ 
  editData = null, 
  wings = [], 
  divisions = [], 
  onBack, 
  onSuccess, 
  triggerNotification 
}) {
  const isEdit = !!editData;
  const fileInputRef = useRef(null);

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
    if (editData) {
      setWing(editData.wing_id || '');
      setDivision(editData.division_id || '');
      setName(editData.name || '');
      setQualification(editData.qualification || '');
      setRole(editData.role || '');
      setAppointmentDate(editData.appointment_date || '');
      setSalary(editData.salary || '');
      setExperience(editData.total_experience || '');
      
      if (editData.skills) {
        setSkillsList(editData.skills.split(',').map(s => s.trim()).filter(Boolean));
      } else {
        setSkillsList([]);
      }
      setDocumentName(editData.appointment_document || '');
    }
  }, [editData]);

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

    if (!wing) {
      alert("Please select a Wing.");
      return;
    }
    if (!division) {
      alert("Please select a Division.");
      return;
    }
    if (!name.trim()) {
      alert("Name is required.");
      return;
    }
    if (Object.keys(errors).length > 0) {
      alert("Please correct validation errors: " + Object.values(errors).join(" "));
      return;
    }
    if (!isEdit && (!fileInputRef.current || !fileInputRef.current.files[0])) {
      alert("Appointment order document is required.");
      return;
    }

    setSubmitting(true);

    const token = localStorage.getItem('accessToken');
    let activeUserId = 1;
    if (token) {
      const decoded = decodeToken(token);
      if (decoded && decoded.userId) {
        activeUserId = decoded.userId;
      }
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
        await axios.put(`http://localhost:3000/young-professional/${editData.yp_id}`, payload);
        ypId = editData.yp_id;
      } else {
        const response = await axios.post("http://localhost:3000/young-professional", payload);
        ypId = response.data.insertedYPId;
      }

      if (fileInputRef.current && fileInputRef.current.files[0]) {
        const formData = new FormData();
        formData.append("file", fileInputRef.current.files[0]);
        await axios.post(`http://localhost:3000/upload-yp-document/${ypId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (triggerNotification) {
        triggerNotification(isEdit ? "Young Professional updated successfully." : "New Young Professional registered successfully.");
      }

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to save Young Professional details.");
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled =
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
    submitting;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            {isEdit ? "Update Young Professional" : "Add Young Professional"}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Wing*</label>
            <select
              value={wing}
              onChange={(e) => { setWing(e.target.value); if (touched.wing) handleBlur('wing'); }}
              onBlur={() => handleBlur('wing')}
              required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border ${isFieldInvalid('wing', wing) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-755 dark:text-slate-300 cursor-pointer`}
            >
              <option value="" className="dark:bg-slate-955 dark:text-slate-300">--Select Wing--</option>
              {wings.map(w => <option key={w.wing_id} value={w.wing_id} className="dark:bg-slate-955 dark:text-slate-300">{w.wing_name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Division*</label>
            <select
              value={division}
              onChange={(e) => { setDivision(e.target.value); if (touched.division) handleBlur('division'); }}
              onBlur={() => handleBlur('division')}
              required
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border ${isFieldInvalid('division', division) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-755 dark:text-slate-300 cursor-pointer`}
            >
              <option value="" className="dark:bg-slate-955 dark:text-slate-300">--Select Division--</option>
              {divisions.map(d => <option key={d.division_id} value={d.division_id} className="dark:bg-slate-955 dark:text-slate-300">{d.division_name}</option>)}
            </select>
          </div>
        </div>

        <h3 className="text-[13px] font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-2 mt-8 mb-5">Personal & Professional Info</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Name*</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => { setName(e.target.value); validateField('name', e.target.value); }} 
              onBlur={() => handleBlur('name')}
              required 
              placeholder="Enter full name"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border ${isFieldInvalid('name', name) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200`} 
            />
            {errors.name && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Educational Qualification*</label>
            <input 
              type="text" 
              value={qualification} 
              onChange={e => { setQualification(e.target.value); if (touched.qualification) handleBlur('qualification'); }} 
              onBlur={() => handleBlur('qualification')}
              required 
              placeholder="e.g. B.Tech, MBA"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border ${isFieldInvalid('qualification', qualification) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200`} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Role / Designation*</label>
            <input 
              type="text" 
              value={role} 
              onChange={e => { setRole(e.target.value); if (touched.role) handleBlur('role'); }} 
              onBlur={() => handleBlur('role')}
              required 
              placeholder="e.g. Young Professional (HR)"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border ${isFieldInvalid('role', role) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200`} 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Date of Appointment*</label>
            <input 
              type="date" 
              value={appointmentDate} 
              onChange={e => { setAppointmentDate(e.target.value); validateField('appointmentDate', e.target.value); }} 
              onBlur={() => handleBlur('appointmentDate')}
              required 
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border ${isFieldInvalid('appointmentDate', appointmentDate) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200`} 
            />
            {errors.appointmentDate && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.appointmentDate}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Salary (per month)*</label>
            <input 
              type="number" 
              step="0.01"
              value={salary} 
              onChange={e => { setSalary(e.target.value); validateField('salary', e.target.value); }} 
              onBlur={() => handleBlur('salary')}
              required 
              placeholder="e.g. 70000"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border ${isFieldInvalid('salary', salary) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200`} 
            />
            {errors.salary && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.salary}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-355 uppercase tracking-wider">Total Experience (Years of Exp - YOE)*</label>
            <input 
              type="number" 
              value={experience} 
              onChange={e => { setExperience(e.target.value); validateField('experience', e.target.value); }} 
              onBlur={() => handleBlur('experience')}
              required 
              placeholder="e.g. 2"
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-955 border ${isFieldInvalid('experience', experience) ? 'border-red-500 focus:border-red-550' : 'border-slate-250 dark:border-slate-800'} rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200`} 
            />
            {errors.experience && <p className="text-[10px] font-bold text-red-500 mt-1">{errors.experience}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Skills Keyword Pool (Type & press Enter or comma)*</label>
          {skillsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl mb-2">
              {skillsList.map(skill => (
                <span 
                  key={skill} 
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-750 dark:text-blue-300 border border-blue-200 dark:border-blue-900/30 rounded-lg text-[11px] font-black uppercase"
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
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-slate-900 font-semibold text-slate-700 dark:text-slate-200"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-50 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg mt-1.5 p-1 max-h-48 overflow-y-auto flex flex-col gap-0.5 select-none animate-fade-in">
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-3.5 py-2 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:text-blue-700 dark:hover:text-blue-300 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                  >
                    {COMMON_SKILLS.includes(s) ? s : `+ Add "${s}"`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Appointment document - Minimized towards the left */}
        <div className="space-y-1.5 max-w-sm">
          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider">Appointment Order Document*</label>
          <div className={`flex items-center justify-center border-2 border-dashed ${isFieldInvalid('documentName', documentName) ? 'border-red-500 bg-red-50/10' : 'border-slate-250 dark:border-slate-800'} rounded-xl p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer relative`}>
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
                    alert("Invalid file type. Only PDF files are allowed.");
                    e.target.value = '';
                    setDocumentName('');
                    if (touched.documentName) handleBlur('documentName');
                    return;
                  }
                  if (file.size > 10 * 1024 * 1024) {
                    alert("File size exceeds 10 MB. Please choose a smaller file.");
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
            <div className="text-center space-y-1">
              <Upload className="mx-auto h-6 w-6 text-slate-400" />
              <p className="text-[11px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wide">Upload PDF file</p>
              <p className="text-[9px] text-slate-400 font-semibold">(Only PDF under 10 MB is allowed)</p>
              {documentName && (
                <p className="text-[11px] font-black text-emerald-600">Selected: {documentName}</p>
              )}
            </div>
          </div>

          {isEdit && editData.appointment_document && (
            <div className="mt-2 text-xs">
              <a
                href={`http://localhost:3000/download-yp-document?fileName=${editData.appointment_document}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 font-bold text-[#0f417a] dark:text-blue-400 hover:underline"
              >
                <span>View current document:</span>
                <span className="text-slate-600 dark:text-slate-450 font-semibold truncate max-w-[200px]" title={editData.appointment_document}>
                  {editData.appointment_document}
                </span>
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onBack}
            className="px-4.5 py-2.5 border border-slate-250 dark:border-slate-800 text-slate-655 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-800 dark:hover:text-slate-200 transition cursor-pointer"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={isFormDisabled}
            className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isEdit ? (submitting ? 'Updating...' : 'Update Young Professional') : (submitting ? 'Saving...' : 'Save Young Professional')}
          </button>
        </div>
      </form>
    </div>
  );
}
