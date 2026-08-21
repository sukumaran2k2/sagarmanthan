import React, { useState, useEffect } from 'react';
import { 
  Save, ArrowLeft, Building2, Calendar, DollarSign, 
  FileText, CheckCircle2, AlertTriangle, Layers, Upload, 
  Users, Sparkles, X, ChevronRight, Check, TrendingUp
} from 'lucide-react';
import { 
  submitGmisMouData, updateGmisMouData, uploadGmisDocument, 
  fetchOrganisations, fetchMouCategoryNames, fetchGmisNavicVibhas 
} from '../api';

const EVENT_OPTIONS = [
  'GMIS 2025',
  'IMW 2025',
  'GMIS 2023',
  'GMIS 2021'
];

const NATURE_OF_SECOND_PARTY_OPTIONS = [
  'Private Enterprise / Corporate',
  'State Maritime Board / State Govt',
  'Public Sector Undertaking (PSU)',
  'Foreign Government / International Entity',
  'Academic / Research Institution',
  'Financial Institution / Bank',
  'Other'
];

const STATUS_OPTIONS = [
  'Under Implementation - On Time',
  'Under Implementation - Delayed',
  'Completed',
  'Yet to be Started',
  'Dropped'
];

export default function GMISInputForm({
  editData,
  onSuccess,
  onCancel,
  triggerNotification
}) {
  const [organisations, setOrganisations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [navicList, setNavicList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(editData?.document_uploader || '');

  // Form State
  const [formData, setFormData] = useState({
    mouID: editData?.id || null,
    eventName: editData?.event_name || 'GMIS 2025',
    organisationName: editData?.organisation_id || '',
    firstPartyName: editData?.name_of_first_party || '',
    stakeholderName: editData?.name_of_second_party || '',
    natureOfSecondParty: editData?.nature_of_second_party || 'Private Enterprise / Corporate',
    mouProjectName: editData?.name_of_mou || '',
    amount: editData?.amount || '',
    revisedAmount: editData?.revised_amount || '',
    mouCategory: editData?.mou_category_id || '',
    vibhasNavicID: editData?.navic_vibhas_id || 1,
    presentStatus: editData?.present_status || 'Under Implementation - On Time',
    mouBrief: editData?.mou_brief || '',
    nextSteps: editData?.next_steps || '',
    detailedRemarks: editData?.remark_or_detailed_status || '',
    reasonForDropping: editData?.reason_for_dropping || '',
    physicalProgressDate: editData?.physical_progress_date ? String(editData.physical_progress_date).substring(0, 10) : '',
    physicalPercentage: editData?.physical_progress_percentage || '',
    financialProgressDate: editData?.financial_progress_date ? String(editData.financial_progress_date).substring(0, 10) : '',
    financialPercentage: editData?.financial_progress_percentage || '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchOrganisations()
      .then(res => { if (Array.isArray(res.data)) setOrganisations(res.data); })
      .catch(err => console.warn('Failed to load organisations:', err));

    fetchMouCategoryNames()
      .then(res => { if (Array.isArray(res.data)) setCategories(res.data); })
      .catch(err => console.warn('Failed to load categories:', err));

    fetchGmisNavicVibhas()
      .then(res => { if (Array.isArray(res.data)) setNavicList(res.data); })
      .catch(err => console.warn('Failed to load NAVIC cells:', err));
  }, []);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);
    setUploadingFile(true);

    try {
      const res = await uploadGmisDocument(data);
      const filename = res.data?.uniqueFileName || res.data?.filename || file.name;
      setUploadedFileName(filename);
      if (triggerNotification) triggerNotification('MoU document uploaded successfully!');
    } catch (err) {
      console.error('File upload failed:', err);
      if (triggerNotification) triggerNotification('Failed to upload MoU document');
    } finally {
      setUploadingFile(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.eventName) newErrors.eventName = 'Please select a Summit / Event';
    if (!formData.organisationName) newErrors.organisationName = 'Organisation is required';
    if (!formData.mouProjectName || !formData.mouProjectName.trim()) newErrors.mouProjectName = 'Name of MoU / Project is required';
    if (!formData.stakeholderName || !formData.stakeholderName.trim()) newErrors.stakeholderName = '2nd Party Name is required';
    if (!formData.amount || isNaN(Number(formData.amount)) || Number(formData.amount) < 0) {
      newErrors.amount = 'Valid MoU amount in ₹ Cr is required';
    }
    if (!formData.mouCategory) newErrors.mouCategory = 'MoU Category is required';
    if (!formData.presentStatus) newErrors.presentStatus = 'Present Status is required';

    if (formData.presentStatus.toLowerCase().includes('dropped') && (!formData.reasonForDropping || !formData.reasonForDropping.trim())) {
      newErrors.reasonForDropping = 'Reason for dropping is required when status is Dropped';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      if (triggerNotification) triggerNotification('Please fill in all mandatory fields correctly');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        gmisDocumentFileName: uploadedFileName,
        amount: Number(formData.amount),
        revisedAmount: formData.revisedAmount ? Number(formData.revisedAmount) : null,
        physicalPercentage: formData.physicalPercentage ? Number(formData.physicalPercentage) : null,
        financialPercentage: formData.financialPercentage ? Number(formData.financialPercentage) : null,
      };

      if (editData?.id) {
        await updateGmisMouData(payload);
        if (triggerNotification) triggerNotification('MoU updated successfully!');
      } else {
        await submitGmisMouData(payload);
        if (triggerNotification) triggerNotification('New MoU created successfully!');
      }

      onSuccess?.();
    } catch (err) {
      console.error('Submission failed:', err);
      if (triggerNotification) triggerNotification('Failed to submit MoU record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm dark:bg-slate-950 dark:border-slate-800 p-6 space-y-6 animate-fade-in">
      
      {/* Form Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="text-base font-bold text-[#0f417a] dark:text-blue-400">
              {editData ? 'Edit GMIS / IMW MoU Record' : 'Register New GMIS / IMW MoU Deliverable'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter all agreement details, signatory parties, milestone percentages, and signed documents.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-[#0f417a] hover:bg-[#164e8d] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving...' : editData ? 'Update MoU' : 'Submit MoU'}</span>
          </button>
        </div>
      </div>

      {/* Form Fields Grid */}
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Summit & Event Identity */}
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span>1. Summit & Event Identification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Event Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Summit / Event Name <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={formData.eventName}
                onChange={(e) => handleChange('eventName', e.target.value)}
                className={`w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer ${
                  errors.eventName ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {EVENT_OPTIONS.map((ev, i) => (
                  <option key={i} value={ev}>{ev}</option>
                ))}
              </select>
              {errors.eventName && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.eventName}</p>}
            </div>

            {/* Organisation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Lead Organisation (1st Party) <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={formData.organisationName}
                onChange={(e) => handleChange('organisationName', e.target.value)}
                className={`w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer ${
                  errors.organisationName ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <option value="">Select Organisation</option>
                {organisations.map((org, i) => (
                  <option key={i} value={org.organisation_id || org.id}>
                    {org.organisation_name || org.organisation_label || org}
                  </option>
                ))}
              </select>
              {errors.organisationName && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.organisationName}</p>}
            </div>

            {/* MoU Category */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                MoU Category <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={formData.mouCategory}
                onChange={(e) => handleChange('mouCategory', e.target.value)}
                className={`w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer ${
                  errors.mouCategory ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <option value="">Select Category</option>
                {categories.map((c, i) => (
                  <option key={i} value={c.mou_category_id || c.id || c.mou_category_name}>
                    {c.mou_category_name || c}
                  </option>
                ))}
              </select>
              {errors.mouCategory && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.mouCategory}</p>}
            </div>

          </div>
        </div>

        {/* Section 2: Project Scope & Stakeholders */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>2. Project Name, Scope & Signatory Parties</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* MoU Project Name */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Name of MoU / Project Deliverable <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Development of Green Hydrogen Bunkering Facility at VOCPA"
                value={formData.mouProjectName}
                onChange={(e) => handleChange('mouProjectName', e.target.value)}
                className={`w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors.mouProjectName ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.mouProjectName && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.mouProjectName}</p>}
            </div>

            {/* 2nd Party Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                2nd Party (Partner / Vendor) <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., ACME Cleantech Solutions"
                value={formData.stakeholderName}
                onChange={(e) => handleChange('stakeholderName', e.target.value)}
                className={`w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors.stakeholderName ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.stakeholderName && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.stakeholderName}</p>}
            </div>

            {/* Nature of 2nd Party */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nature of 2nd Party <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={formData.natureOfSecondParty}
                onChange={(e) => handleChange('natureOfSecondParty', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {NATURE_OF_SECOND_PARTY_OPTIONS.map((opt, i) => (
                  <option key={i} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* MoU Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                MoU Value (₹ in Crores) <span className="text-rose-500 font-bold">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g., 250.00"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                className={`w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  errors.amount ? 'border-rose-500 bg-rose-50/50' : 'border-slate-200 dark:border-slate-700'
                }`}
              />
              {errors.amount && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.amount}</p>}
            </div>

            {/* Revised Amount if any */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Revised Amount (₹ in Crores)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Optional revised investment"
                value={formData.revisedAmount}
                onChange={(e) => handleChange('revisedAmount', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

          </div>

          {/* MoU Brief */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              MoU Summary Brief / Scope of Work
            </label>
            <textarea
              rows={3}
              placeholder="Outline the strategic objectives, commercial terms, and key outputs of this MoU..."
              value={formData.mouBrief}
              onChange={(e) => handleChange('mouBrief', e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

        </div>

        {/* Section 3: Status, Progress & Milestones */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>3. Present Status & Physical / Financial Milestones</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Present Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Present Status <span className="text-rose-500 font-bold">*</span>
              </label>
              <select
                value={formData.presentStatus}
                onChange={(e) => handleChange('presentStatus', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((st, i) => (
                  <option key={i} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Physical Progress % */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Physical Progress (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={formData.physicalPercentage}
                onChange={(e) => handleChange('physicalPercentage', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Physical Progress Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Physical Progress Milestone Date
              </label>
              <input
                type="date"
                value={formData.physicalProgressDate}
                onChange={(e) => handleChange('physicalProgressDate', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Financial Progress % */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Financial Progress (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="0 - 100"
                value={formData.financialPercentage}
                onChange={(e) => handleChange('financialPercentage', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Financial Progress Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Financial Progress Milestone Date
              </label>
              <input
                type="date"
                value={formData.financialProgressDate}
                onChange={(e) => handleChange('financialProgressDate', e.target.value)}
                className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

          </div>

          {/* Conditional Reason for Dropping */}
          {formData.presentStatus.toLowerCase().includes('dropped') && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-900 space-y-1">
              <label className="block text-xs font-bold text-rose-700 dark:text-rose-400">
                Reason for Dropping MoU <span className="text-rose-500 font-bold">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Explain why this MoU agreement was terminated or dropped..."
                value={formData.reasonForDropping}
                onChange={(e) => handleChange('reasonForDropping', e.target.value)}
                className={`w-full px-3 py-2 text-xs font-medium bg-white dark:bg-slate-900 border rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none ${
                  errors.reasonForDropping ? 'border-rose-500' : 'border-rose-200 dark:border-rose-800'
                }`}
              />
              {errors.reasonForDropping && <p className="text-[10px] text-rose-600 font-bold">{errors.reasonForDropping}</p>}
            </div>
          )}

          {/* Next Steps & Detailed Remarks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Key Next Action Steps
              </label>
              <textarea
                rows={2}
                placeholder="Upcoming regulatory clearances, land allotment, tendering milestones..."
                value={formData.nextSteps}
                onChange={(e) => handleChange('nextSteps', e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Remarks & Notes
              </label>
              <textarea
                rows={2}
                placeholder="Any special remarks from ministry or port authority..."
                value={formData.detailedRemarks}
                onChange={(e) => handleChange('detailedRemarks', e.target.value)}
                className="w-full px-3 py-2 text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

        </div>

        {/* Section 4: Document Attachment */}
        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-black uppercase tracking-wider text-[#0f417a] dark:text-blue-400 flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>4. Signed MoU PDF Attachment</span>
          </h3>

          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                {uploadedFileName ? `Attached: ${uploadedFileName}` : 'No signed document uploaded yet.'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Upload PDF format copy of the signed MoU agreement (Max 50MB).
              </span>
            </div>

            <label className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition cursor-pointer flex items-center space-x-1.5 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 shrink-0">
              <Upload className="h-4 w-4" />
              <span>{uploadingFile ? 'Uploading...' : uploadedFileName ? 'Replace PDF' : 'Upload MoU PDF'}</span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploadingFile}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Submit Bottom Row */}
        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer dark:bg-slate-800 dark:text-slate-300"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-[#0f417a] hover:bg-[#164e8d] text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{submitting ? 'Saving Record...' : editData ? 'Update MoU Record' : 'Register MoU'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
