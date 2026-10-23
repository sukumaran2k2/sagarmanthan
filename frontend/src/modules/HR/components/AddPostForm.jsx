import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Shared client: sends the login token and refreshes it (HR routes require login)
import { axiosInstance as axios } from '../../../api';
import { 
  Building2, 
  Briefcase, 
  Layers, 
  Users, 
  IndianRupee, 
  CheckCircle2, 
  RotateCcw, 
  ArrowLeft,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import { isOrganisationUser, getSessionOrganisationId, getSessionClaims } from '../../../utils/authSession';

export default function AddPostForm({ triggerNotification, onCancel }) {
  const navigate = useNavigate();
  const isMinistryView = useMemo(() => !isOrganisationUser(), []);
  const claims = useMemo(() => getSessionClaims() || {}, []);
  const userOrgId = useMemo(() => getSessionOrganisationId() || claims.organisationId || 1, [claims]);

  const [departments, setDepartments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPost, setSubmittedPost] = useState(null);

  const [formData, setFormData] = useState({
    organisationId: userOrgId,
    departmentId: '',
    classId: '',
    postName: '',
    sanctionedStrength: 1,
    payscaleRange: '',
  });

  // Notification helper
  const notify = (msg, type = 'success') => {
    if (triggerNotification) {
      triggerNotification(msg, type);
    } else {
      alert(msg);
    }
  };

  // Fetch Dropdowns
  useEffect(() => {
    const fetchDropdowns = async () => {
      setLoadingDropdowns(true);
      try {
        const [deptRes, classRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/get-organisation-structure-departments`),
          axios.get(`${API_BASE_URL}/get-organisation-structure-classes`),
        ]);

        const depts = Array.isArray(deptRes.data) ? deptRes.data : [];
        const clss = Array.isArray(classRes.data) ? classRes.data : [];

        setDepartments(depts);
        setClasses(clss);

        setFormData(prev => ({
          ...prev,
          departmentId: prev.departmentId || depts[0]?.department_id || '',
          classId: prev.classId || clss[0]?.class_id || 1
        }));

        if (isMinistryView) {
          try {
            const orgRes = await axios.get(`${API_BASE_URL}/master-table/mmt_organisation`);
            if (Array.isArray(orgRes.data)) {
              setOrganisations(orgRes.data);
              if (!formData.organisationId && orgRes.data.length > 0) {
                setFormData(prev => ({ ...prev, organisationId: orgRes.data[0].organisation_id }));
              }
            }
          } catch (_) {}
        }
      } catch (err) {
        console.error('Error fetching master dropdowns:', err);
      } finally {
        setLoadingDropdowns(false);
      }
    };

    fetchDropdowns();
  }, [isMinistryView]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleReset = () => {
    setFormData({
      organisationId: userOrgId,
      departmentId: departments[0]?.department_id || '',
      classId: classes[0]?.class_id || 1,
      postName: '',
      sanctionedStrength: 1,
      payscaleRange: '',
    });
    setSubmittedPost(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.postName.trim()) {
      notify('Please enter a valid Post Name', 'error');
      return;
    }

    if (!formData.departmentId) {
      notify('Please select a Department', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        organisationId: !isMinistryView ? userOrgId : (formData.organisationId || userOrgId),
        departmentId: formData.departmentId,
        classId: parseInt(formData.classId, 10),
        postName: formData.postName.trim(),
        sanctionedStrength: parseInt(formData.sanctionedStrength, 10) || 1,
        payscaleRange: formData.payscaleRange.trim(),
      };

      const res = await axios.post(`${API_BASE_URL}/add-organisation-structure-post`, payload);
      const newPostId = res.data?.postId;

      notify('Post added successfully to Organisation Structure', 'success');
      setSubmittedPost({
        ...payload,
        postId: newPostId,
        deptName: departments.find(d => String(d.department_id) === String(payload.departmentId))?.department_name || '',
        className: classes.find(c => String(c.class_id) === String(payload.classId))?.class_name || ''
      });

      // Clear post name and reset strength for next entry
      setFormData(prev => ({
        ...prev,
        postName: '',
        sanctionedStrength: 1,
        payscaleRange: ''
      }));
    } catch (err) {
      console.error('Error adding post:', err);
      notify(err.response?.data?.message || 'Failed to add post', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedDeptObj = useMemo(() => {
    return departments.find(d => String(d.department_id) === String(formData.departmentId));
  }, [departments, formData.departmentId]);

  const selectedClassObj = useMemo(() => {
    return classes.find(c => String(c.class_id) === String(formData.classId));
  }, [classes, formData.classId]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Top Banner / Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden border-l-4 border-l-[#0f417a]">
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-blue-200" />
              <h2 className="text-base font-black uppercase tracking-wider font-display">
                Add Post Input Form
              </h2>
            </div>
            <p className="text-xs text-blue-100 font-medium mt-0.5">
              Create a new sanctioned post and initialize vacant strength for the organisation
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
              else navigate('/hr/hr-management/organisation-structure');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition cursor-pointer self-start sm:self-auto"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Organisation Structure</span>
          </button>
        </div>

        {/* Success Alert if just submitted */}
        {submittedPost && (
          <div className="p-4 mx-6 mt-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Post "{submittedPost.postName}" created successfully!
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                  Sanctioned strength of {submittedPost.sanctionedStrength} was created in {submittedPost.deptName} (Class {submittedPost.className}).
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmittedPost(null)}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="p-6">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left 2 Cols: Form Fields */}
            <div className="lg:col-span-2 space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Organisation (Ministry view only) */}
                {isMinistryView && (
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                      Organisation <span className="text-rose-500">*</span>
                    </label>
                    <select
                      name="organisationId"
                      value={formData.organisationId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                    >
                      <option value="">-- Select Organisation --</option>
                      {organisations.map(org => (
                        <option key={org.organisation_id} value={org.organisation_id}>
                          {org.organisation_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Department <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="departmentId"
                    value={formData.departmentId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map(dept => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class / Group */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Class / Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    name="classId"
                    value={formData.classId}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  >
                    {classes.map(cls => (
                      <option key={cls.class_id} value={cls.class_id}>
                        Class {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Post Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Post Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="postName"
                    placeholder="e.g. Senior Personnel Officer, Executive Engineer"
                    value={formData.postName}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  />
                </div>

                {/* Sanctioned Strength */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Sanctioned Strength <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    name="sanctionedStrength"
                    placeholder="e.g. 5"
                    value={formData.sanctionedStrength}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  />
                </div>

                {/* Payscale Range */}
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
                    Payscale Range <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="payscaleRange"
                    placeholder="e.g. 50000-160000"
                    value={formData.payscaleRange}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>Save Post</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset</span>
                </button>
              </div>

            </div>

            {/* Right 1 Col: Live Preview Card */}
            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
                  <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Post Preview</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Post Name</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {formData.postName.trim() || '—'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Department</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {selectedDeptObj?.department_name || '—'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Class</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                        {selectedClassObj ? `Class ${selectedClassObj.class_name}` : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Sanctioned</span>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-lg text-xs font-black bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {formData.sanctionedStrength || 0}
                      </span>
                    </div>
                  </div>

                  {formData.payscaleRange && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Payscale</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        ₹ {formData.payscaleRange}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Saving this post will automatically initialize {formData.sanctionedStrength || 1} vacant post slots under this department for vacancy and recruitment tracking.
              </div>
            </div>

          </form>
        </div>
      </div>

    </div>
  );
}
