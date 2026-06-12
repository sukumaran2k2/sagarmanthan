import React, { useState } from 'react';
import { X, Plus, Calendar, ShieldAlert } from 'lucide-react';

export default function AddProjectModal({ isOpen, onClose, onAdd }) {
  const [formData, setFormData] = useState({
    projectId: '',
    projectName: '',
    cost: '',
    agency: '',
    stage: 'Project Initiated',
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors = {};
    if (!formData.projectId.trim()) newErrors.projectId = 'Project ID is required';
    if (!formData.projectName.trim()) newErrors.projectName = 'Project name is required';
    if (!formData.cost || parseFloat(formData.cost) <= 0) newErrors.cost = 'Please enter a valid sanctioned cost';
    if (!formData.agency.trim()) newErrors.agency = 'Implementing agency is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onAdd({
        ...formData,
        id: Date.now(),
        subProjectId: '-',
        subProjectName: '-',
        physicalProgress: '0',
        financialProgress: '0',
      });
      setFormData({
        projectId: '',
        projectName: '',
        cost: '',
        agency: '',
        stage: 'Project Initiated',
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-1 bg-blue-600 rounded-lg">
              <Plus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight font-display">Add Government Project</h3>
              <p className="text-[10px] text-slate-400">Register new development under Sagarmanthan</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Project ID */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project ID</label>
              <input 
                type="text" 
                placeholder="e.g. PR1380"
                value={formData.projectId}
                onChange={(e) => setFormData({...formData, projectId: e.target.value})}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.projectId ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100'} rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500`}
              />
              {errors.projectId && <span className="text-[10px] text-red-500 font-semibold">{errors.projectId}</span>}
            </div>

            {/* Sanctioned Cost */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Sanctioned Cost (In Cr.)</label>
              <input 
                type="number" 
                step="0.01"
                placeholder="e.g. 15.75"
                value={formData.cost}
                onChange={(e) => setFormData({...formData, cost: e.target.value})}
                className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.cost ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100'} rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500`}
              />
              {errors.cost && <span className="text-[10px] text-red-500 font-semibold">{errors.cost}</span>}
            </div>
          </div>

          {/* Project Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Project Name</label>
            <textarea 
              rows="3"
              placeholder="Provide the complete description/name of the development work"
              value={formData.projectName}
              onChange={(e) => setFormData({...formData, projectName: e.target.value})}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.projectName ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100'} rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500`}
            />
            {errors.projectName && <span className="text-[10px] text-red-500 font-semibold">{errors.projectName}</span>}
          </div>

          {/* Primary Implementing Agency */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Primary Implementing Agency</label>
            <input 
              type="text" 
              placeholder="e.g. Shipping Corporation of India"
              value={formData.agency}
              onChange={(e) => setFormData({...formData, agency: e.target.value})}
              className={`w-full text-xs px-3.5 py-2.5 bg-slate-50 border ${errors.agency ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100'} rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500`}
            />
            {errors.agency && <span className="text-[10px] text-red-500 font-semibold">{errors.agency}</span>}
          </div>

          {/* Stage */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Current Stage</label>
            <select 
              value={formData.stage}
              onChange={(e) => setFormData({...formData, stage: e.target.value})}
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            >
              <option value="Project Initiated">Project Initiated</option>
              <option value="Under Implementation">Under Implementation</option>
              <option value="Under Tendering">Under Tendering</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-150 flex items-center justify-end space-x-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Submit Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
