import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { ProjectForm } from '../ProjectForm';

export default function AddProjectDialog({ onAdd, onClose }) {
  const handleFormSubmit = (formData) => {
    const idStr = 'PR' + Math.floor(1000 + Math.random() * 9000);
    onAdd({
      id: Date.now(),
      projectId: idStr,
      subProjectId: '-',
      projectName: formData.projectName,
      subProjectName: '-',
      cost: parseFloat(formData.cost).toFixed(2),
      agency: formData.agency,
      stage: 'Project Initiated',
      category: formData.category,
      physicalProgress: '0',
      financialProgress: '0',
    });
    onClose();
  };

  return (
    <div className="bg-white border-b border-slate-200 p-6 sm:p-8 shadow-sm animate-fade-in w-full text-slate-800">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition cursor-pointer text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight font-display">Add Project</h2>
            <p className="text-xs text-slate-500 mt-0.5">Register new port development schemes and infrastructure programs</p>
          </div>
        </div>
      </div>

      <ProjectForm 
        onSubmit={handleFormSubmit}
        onCancel={onClose}
        submitLabel="Add Project"
      />
    </div>
  );
}
