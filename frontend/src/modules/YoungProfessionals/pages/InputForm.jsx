import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, X, Upload } from 'lucide-react';
import axios from 'axios';

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
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkillsList(skillsList.filter(s => s !== skillToRemove));
  };

  const handleSkillLabelClick = (skill) => {
    setSkillInput(skill);
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
    if (Number(salary) < 0) {
      alert("Salary per month cannot be negative.");
      return;
    }
    if (Number(experience) < 0 || !Number.isInteger(Number(experience))) {
      alert("Total experience (YOE) must be a non-negative integer.");
      return;
    }

    setSubmitting(true);

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
      created_by: 1
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

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in">
      <div className="bg-gradient-to-r from-[#0f417a] to-[#1e5ea8] px-6 py-4.5 flex items-center justify-between text-white border-b border-blue-900/20">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider font-display">
            {isEdit ? "Update Young Professional" : "Add Young Professional"}
          </h3>
          <p className="text-[10px] text-blue-200 font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to List</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Wing*</label>
            <select
              value={wing}
              onChange={(e) => setWing(e.target.value)}
              required
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-755 cursor-pointer"
            >
              <option value="">--Select Wing--</option>
              {wings.map(w => <option key={w.wing_id} value={w.wing_id}>{w.wing_name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Division*</label>
            <select
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              required
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-755 cursor-pointer"
            >
              <option value="">--Select Division--</option>
              {divisions.map(d => <option key={d.division_id} value={d.division_id}>{d.division_name}</option>)}
            </select>
          </div>
        </div>

        <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wide border-b border-slate-200 pb-2 mt-8 mb-5">Personal & Professional Info</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Name*</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
              placeholder="Enter full name"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Educational Qualification*</label>
            <input 
              type="text" 
              value={qualification} 
              onChange={e => setQualification(e.target.value)} 
              required 
              placeholder="e.g. B.Tech, MBA"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Role / Designation*</label>
            <input 
              type="text" 
              value={role} 
              onChange={e => setRole(e.target.value)} 
              required 
              placeholder="e.g. Young Professional (HR)"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Date of Appointment*</label>
            <input 
              type="date" 
              value={appointmentDate} 
              onChange={e => setAppointmentDate(e.target.value)} 
              required 
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Salary (per month)*</label>
            <input 
              type="number" 
              step="0.01"
              value={salary} 
              onChange={e => setSalary(e.target.value)} 
              required 
              placeholder="e.g. 70000"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Total Experience (Years of Exp - YOE)*</label>
            <input 
              type="number" 
              value={experience} 
              onChange={e => setExperience(e.target.value)} 
              required 
              placeholder="e.g. 2"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700" 
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Skills Keyword Pool (Type & press Enter or comma)*</label>
          {skillsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl mb-2">
              {skillsList.map(skill => (
                <span 
                  key={skill} 
                  className="inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-750 border border-blue-200 rounded-lg text-[11px] font-black uppercase"
                >
                  <span
                    onClick={() => handleSkillLabelClick(skill)}
                    className="cursor-pointer hover:underline hover:text-blue-900"
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
          <input 
            type="text"
            value={skillInput}
            onChange={e => setSkillInput(e.target.value)}
            onKeyDown={handleAddSkill}
            placeholder="Add skills (e.g. React, SQL, Project Management)"
            className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-250 rounded-xl focus:outline-none focus:bg-white focus:border-blue-500 font-semibold text-slate-700"
          />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl mt-1.5 animate-fade-in select-none">
              <span className="text-[10px] font-bold text-slate-500 uppercase self-center mr-1">Suggestions:</span>
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSelectSuggestion(s)}
                  className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 hover:border-blue-200 rounded-lg text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                >
                  {COMMON_SKILLS.includes(s) ? s : `+ Add "${s}"`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Appointment document - Minimized towards the left */}
        <div className="space-y-1.5 max-w-sm">
          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">Appointment Order Document</label>
          <div className="flex items-center justify-center border-2 border-dashed border-slate-250 rounded-xl p-4 hover:bg-slate-50 transition cursor-pointer relative">
            <input 
              type="file" 
              ref={fileInputRef}
              accept=".pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  setDocumentName(file.name);
                }
              }}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="text-center space-y-1">
              <Upload className="mx-auto h-6 w-6 text-slate-400" />
              <p className="text-[11px] font-bold text-slate-655 uppercase tracking-wide">Upload file</p>
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
                className="inline-flex items-center space-x-1 font-bold text-[#0f417a] hover:underline"
              >
                <span>View current document:</span>
                <span className="text-slate-600 font-semibold truncate max-w-[200px]" title={editData.appointment_document}>
                  {editData.appointment_document}
                </span>
              </a>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={onBack}
            className="px-4.5 py-2.5 border border-slate-250 text-slate-655 rounded-xl text-xs font-bold hover:bg-slate-50 hover:text-slate-800 transition cursor-pointer"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5.5 py-2.5 bg-[#0f417a] hover:bg-[#1a5ba3] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/10 hover:shadow-lg transition-all cursor-pointer"
          >
            {submitting ? 'Saving...' : 'Save Young Professional'}
          </button>
        </div>
      </form>
    </div>
  );
}
