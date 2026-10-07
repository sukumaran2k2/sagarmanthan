import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';

export default function TrainingDataForm({ triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  const [formData, setFormData] = useState({
    trainingType: '',
    trainingTitle: '',
    fromDate: '',
    toDate: '',
    trainingSource: '',
    expenditure: '',
  });

  const [participants, setParticipants] = useState([
    { id: 1, staffId: '', name: '', designation: '', department: '' }
  ]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleParticipantChange = (id, field, value) => {
    setParticipants(prev => prev.map(p => {
      if (p.id === id) {
        const updated = { ...p, [field]: value };
        // Simulate auto-fill
        if (field === 'staffId' && value !== '') {
          updated.name = 'John Doe';
          updated.designation = 'Manager';
          updated.department = 'Operations';
        } else if (field === 'staffId' && value === '') {
          updated.name = '';
          updated.designation = '';
          updated.department = '';
        }
        return updated;
      }
      return p;
    }));
  };

  const addParticipant = () => {
    const newId = participants.length > 0 ? Math.max(...participants.map(p => p.id)) + 1 : 1;
    setParticipants(prev => [...prev, { id: newId, staffId: '', name: '', designation: '', department: '' }]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (triggerNotification) {
      triggerNotification(editData ? 'Training Data updated successfully' : 'Training Data submitted successfully', 'success');
    }
    // API call would go here
  };

  return (
    <div className="animate-fade-in text-slate-800 dark:text-slate-100">
      <h2 className="text-xl font-bold mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        {editData ? 'Update Training Data' : 'Add Training Data'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Top Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Training Type<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select 
              name="trainingType"
              value={formData.trainingType}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Show All --</option>
              <option value="Internal">Internal</option>
              <option value="External">External</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Training Title<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select 
              name="trainingTitle"
              value={formData.trainingTitle}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Select Training Title --</option>
              <option value="Safety Protocol">Safety Protocol</option>
              <option value="Leadership Workshop">Leadership Workshop</option>
            </select>
          </div>

          {/* Empty div for layout if needed, or Training Source */}
          <div className="md:col-start-1 lg:col-start-3">
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Training Source<span className="text-red-500 ml-0.5">*</span>
            </label>
            <select 
              name="trainingSource"
              value={formData.trainingSource}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">--Select Training Source--</option>
              <option value="In-house">In-house</option>
              <option value="External Agency">External Agency</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              From Date<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input 
              type="date"
              name="fromDate"
              value={formData.fromDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              To Date<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input 
              type="date"
              name="toDate"
              value={formData.toDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-start-1">
            <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
              Expenditure (In Lakh)<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input 
              type="number"
              step="0.01"
              min="0"
              name="expenditure"
              value={formData.expenditure}
              onChange={handleChange}
              placeholder="Enter Expenditure amount"
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Participant Details Section */}
        <div>
          <h3 className="text-base font-bold mb-2 pb-1 border-b-2 border-orange-500 text-slate-800 dark:text-slate-200 inline-block w-full">
            Participant Details
          </h3>
          
          <div className="mt-4 overflow-x-auto">
            <div className="min-w-[800px] border border-slate-200 dark:border-slate-700 rounded">
              {/* Header */}
              <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_50px] bg-[#20366b] text-white font-bold text-xs text-center divide-x divide-white/20">
                <div className="py-2.5 px-2">S. No</div>
                <div className="py-2.5 px-2">Staff ID</div>
                <div className="py-2.5 px-2">Name</div>
                <div className="py-2.5 px-2">Designation</div>
                <div className="py-2.5 px-2">Department</div>
                <div className="py-2.5 px-2"></div>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700 text-sm bg-white dark:bg-slate-900">
                {participants.map((p, index) => (
                  <div key={p.id} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_50px] divide-x divide-slate-200 dark:divide-slate-700">
                    <div className="py-2 px-2 flex items-center justify-center font-bold text-xs text-slate-600 bg-slate-50 dark:bg-slate-800/50">
                      {index + 1}
                    </div>
                    <div className="p-1.5">
                      <select 
                        value={p.staffId}
                        onChange={(e) => handleParticipantChange(p.id, 'staffId', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Select Staff ID</option>
                        <option value="EMP001">EMP001</option>
                        <option value="EMP002">EMP002</option>
                      </select>
                    </div>
                    <div className="p-1.5">
                      <input 
                        type="text" 
                        readOnly 
                        placeholder="name"
                        value={p.name}
                        className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded cursor-not-allowed text-slate-500"
                      />
                    </div>
                    <div className="p-1.5">
                      <input 
                        type="text" 
                        readOnly 
                        placeholder="Designation"
                        value={p.designation}
                        className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded cursor-not-allowed text-slate-500"
                      />
                    </div>
                    <div className="p-1.5">
                      <input 
                        type="text" 
                        readOnly 
                        placeholder="Department"
                        value={p.department}
                        className="w-full px-2 py-1.5 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded cursor-not-allowed text-slate-500"
                      />
                    </div>
                    <div className="p-1.5 flex items-center justify-center">
                      {index === participants.length - 1 && (
                        <button 
                          type="button" 
                          onClick={addParticipant}
                          className="p-1 rounded-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-6">
          <button 
            type="submit"
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded shadow transition cursor-pointer"
          >
            {editData ? 'Update' : 'Submit'}
          </button>
          <button 
            type="button"
            onClick={() => navigate('/hr/hr-management/training-details')}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded shadow transition cursor-pointer"
          >
            Exit
          </button>
        </div>

      </form>
    </div>
  );
}
