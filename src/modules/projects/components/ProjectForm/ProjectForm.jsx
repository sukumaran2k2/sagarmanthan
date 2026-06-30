import React, { useState } from 'react';
import ProjectFormFields from './ProjectFormFields';
import { validateProjectForm } from './ProjectFormValidation';

export default function ProjectForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  submitLabel = 'Save Project' 
}) {
  const [formData, setFormData] = useState(initialData || {
    projectName: '',
    projectBrief: '',
    cost: '',
    projectType: '',
    implementationType: '',
    category: '',
    initiatedDate: '',
    completionDate: '',
    agency: '',
    secondaryAgency: '',
    scheme: '',
    initiative: '',
    output: '',
    outcome: '',
    capacity: '',
    fundingSource: '',
    primaryFundingAgency: '',
    secondaryFundingAgency: '',
    state: '',
    district: '',
    taluka: '',
    village: '',
    mpConstituency: '',
    hasSubProject: 'No',
  });

  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateProjectForm(formData);
    if (Object.keys(newErrors).length === 0) {
      onSubmit(formData);
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <ProjectFormFields 
        formData={formData} 
        setFormData={setFormData} 
        errors={errors} 
      />

      {/* Footer Buttons */}
      <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition cursor-pointer"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
