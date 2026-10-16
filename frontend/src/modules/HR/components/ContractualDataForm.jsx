import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function ContractualDataForm({ triggerNotification }) {
  const navigate = useNavigate();
  const location = useLocation();
  const editData = location.state?.editData;
  
  const [formData, setFormData] = useState({
    financialYear: '',
    officerDirectEngagement: '',
    officerRetiredGovt: '',
    officerRetiredOwnOrg: '',
    officerThroughAgency: '',
    officerForMinistry: '',
    nonOfficerDirectEngagement: '',
    nonOfficerRetiredGovt: '',
    nonOfficerRetiredOwnOrg: '',
    nonOfficerThroughAgency: '',
    nonOfficerForMinistry: '',
  });

  useEffect(() => {
    if (editData) {
      setFormData({
        financialYear: editData['Financial Year'] || '',
        officerDirectEngagement: editData['Officer - Direct engagement'] ?? '',
        officerRetiredGovt: editData['Officer - Retired from Govt.'] ?? '',
        officerRetiredOwnOrg: editData['Officer - Retired from own organisation'] ?? '',
        officerThroughAgency: editData['Officer - Through agency'] ?? '',
        officerForMinistry: editData['Officer - For ministry'] ?? '',
        nonOfficerDirectEngagement: editData['Non-officer Direct engagement'] ?? '',
        nonOfficerRetiredGovt: editData['Non-officer retired from Govt.'] ?? '',
        nonOfficerRetiredOwnOrg: editData['Non-officer retired from own organisation'] ?? '',
        nonOfficerThroughAgency: editData['Non-officer through agency'] ?? '',
        nonOfficerForMinistry: editData['Non-officer for ministry'] ?? '',
      });
    }
  }, [editData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTotal = (prefix) => {
    const keys = [
      `${prefix}DirectEngagement`,
      `${prefix}RetiredGovt`,
      `${prefix}RetiredOwnOrg`,
      `${prefix}ThroughAgency`,
      `${prefix}ForMinistry`
    ];
    return keys.reduce((sum, key) => sum + (parseInt(formData[key]) || 0), 0);
  };

  const totalOfficer = calculateTotal('officer');
  const totalNonOfficer = calculateTotal('nonOfficer');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (triggerNotification) {
      triggerNotification(editData ? 'Contractual Data updated successfully' : 'Contractual Data submitted successfully', 'success');
    }
    // API call would go here
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from(new Array(5), (val, index) => `${currentYear - index}-${currentYear - index + 1}`);

  return (
    <div className="animate-fade-in text-slate-800 dark:text-slate-100">
      <h2 className="text-xl font-bold mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        {editData ? 'Update Contractual Data' : 'Add Contractual Data'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Top Section */}
        <div className="w-full md:w-1/3">
          <label className="block text-xs font-bold mb-1.5 text-slate-700 dark:text-slate-300">
            Financial Year<span className="text-red-500 ml-0.5">*</span>
          </label>
          <select 
            name="financialYear"
            value={formData.financialYear}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">--Select Financial Year--</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Table Section */}
        <div>
          <h3 className="text-sm font-bold mb-4 text-slate-800 dark:text-slate-200">Officers level & Non Officers Level</h3>
          
          <div className="border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
            <div className="grid grid-cols-[30%_1fr_1fr] bg-[#20366b] text-white font-bold text-xs text-center divide-x divide-white/20">
              <div className="py-2.5 px-4">Category</div>
              <div className="py-2.5 px-4">Officer Level</div>
              <div className="py-2.5 px-4">Non Officers Level</div>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              {/* Row 1 */}
              <div className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  Direct engagement<span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="p-2"><input type="number" min="0" required name="officerDirectEngagement" value={formData.officerDirectEngagement} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
                <div className="p-2"><input type="number" min="0" required name="nonOfficerDirectEngagement" value={formData.nonOfficerDirectEngagement} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  Retired from other Govt/PSU<span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="p-2"><input type="number" min="0" required name="officerRetiredGovt" value={formData.officerRetiredGovt} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
                <div className="p-2"><input type="number" min="0" required name="nonOfficerRetiredGovt" value={formData.nonOfficerRetiredGovt} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
              </div>

              {/* Row 3 */}
              <div className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  Retired From own Organisation<span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="p-2"><input type="number" min="0" required name="officerRetiredOwnOrg" value={formData.officerRetiredOwnOrg} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
                <div className="p-2"><input type="number" min="0" required name="nonOfficerRetiredOwnOrg" value={formData.nonOfficerRetiredOwnOrg} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
              </div>

              {/* Row 4 */}
              <div className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  Through Agency<span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="p-2"><input type="number" min="0" required name="officerThroughAgency" value={formData.officerThroughAgency} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
                <div className="p-2"><input type="number" min="0" required name="nonOfficerThroughAgency" value={formData.nonOfficerThroughAgency} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
              </div>

              {/* Row 5 */}
              <div className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  For Ministry<span className="text-red-500 ml-0.5">*</span>
                </div>
                <div className="p-2"><input type="number" min="0" required name="officerForMinistry" value={formData.officerForMinistry} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
                <div className="p-2"><input type="number" min="0" required name="nonOfficerForMinistry" value={formData.nonOfficerForMinistry} onChange={handleChange} className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-1.5 focus:outline-none focus:border-blue-500 bg-white dark:bg-slate-800" /></div>
              </div>

              {/* Totals Row */}
              <div className="grid grid-cols-[30%_1fr_1fr] divide-x divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900">
                <div className="py-3 px-4 font-bold text-xs text-center flex items-center justify-center bg-slate-50 dark:bg-slate-800/50">
                  Total (Officers Level)
                </div>
                <div className="p-2"><input type="number" readOnly value={totalOfficer} className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed font-bold" /></div>
                <div className="p-2"><input type="number" readOnly value={totalNonOfficer} className="w-full border border-slate-200 dark:border-slate-700 rounded px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 cursor-not-allowed font-bold" /></div>
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
            onClick={() => navigate('/hr/hr-management/contractual-employment')}
            className="px-6 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold rounded shadow transition cursor-pointer"
          >
            Exit
          </button>
        </div>

      </form>
    </div>
  );
}
