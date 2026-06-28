import React, { useState } from 'react';
import { Pencil, KeyRound } from 'lucide-react';
import ChangePasswordModal from '../ChangePasswordModal';

export default function ProfileView() {
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    salutation: 'Mr',
    name: 'Sagarmanthan Admin',
    email: 'admin@sagarmanthan.gov.in',
    phone: '+91 9876543210',
    designation: 'Joint Secretary',
    organisation: 'Ministry of Ports, Shipping and Waterways',
    state: 'Delhi',
    district: 'New Delhi',
    wing: 'Ports Wing',
    division: 'Development'
  });

  // Backup state for discard functionality
  const [backupData, setBackupData] = useState(formData);

  const handleEditToggle = () => {
    if (!isEditing) {
      setBackupData(formData);
    }
    setIsEditing(!isEditing);
  };

  const handleDiscard = () => {
    setFormData(backupData);
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsEditing(false);
    // In a real app, you would make an API call here to save formData
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const InputField = ({ label, name, value, className = '' }) => (
    <div className={`flex items-center space-x-3 mb-3 ${className}`}>
      <label className="w-1/3 text-xs font-semibold text-slate-700 dark:text-slate-300">
        {label}
      </label>
      <input
        type="text"
        name={name}
        value={value}
        onChange={handleChange}
        disabled={!isEditing}
        className="flex-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70 transition-colors"
      />
    </div>
  );

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 mb-8 animate-fade-in flex flex-col">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 relative">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div className="w-32"></div> {/* Spacer for centering */}
          
          {/* Profile Image */}
          <div className="flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden mb-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold text-center">Profile Image</span>
            </div>
            {!isEditing && (
              <button 
                onClick={() => setIsPasswordModalOpen(true)}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold flex items-center gap-1 mt-1 transition-colors"
              >
                <KeyRound className="h-3 w-3" /> Change Password
              </button>
            )}
          </div>

          {/* Edit Profile Button */}
          <div className="w-32 flex justify-end">
            {!isEditing && (
              <button 
                onClick={handleEditToggle}
                className="flex items-center space-x-2 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <span>Edit Profile</span>
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Forms Section */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            
            {/* Personal Information */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display mb-3">Personal Information</h3>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex space-x-2 w-1/3">
                    <button type="button" className={`px-2 py-1 text-xs rounded border ${formData.salutation === 'Mr' ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600' : 'bg-transparent border-transparent'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`} disabled={!isEditing} onClick={() => setFormData({...formData, salutation: 'Mr'})}>Mr</button>
                    <button type="button" className={`px-2 py-1 text-xs rounded border ${formData.salutation === 'Mrs' ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600' : 'bg-transparent border-transparent'} ${!isEditing ? 'opacity-70 cursor-not-allowed' : ''}`} disabled={!isEditing} onClick={() => setFormData({...formData, salutation: 'Mrs'})}>Mrs</button>
                  </div>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70 transition-colors"
                    placeholder="Name"
                  />
                </div>

                <InputField label="Email" name="email" value={formData.email} />
                <InputField label="Phone number" name="phone" value={formData.phone} />
                <InputField label="Designation" name="designation" value={formData.designation} />
              </div>
            </div>

            {/* Organisation Information */}
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white font-display mb-3">Organisation Information</h3>
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4">
                <InputField label="Organisation" name="organisation" value={formData.organisation} />
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col mb-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">State</label>
                    <input type="text" name="state" value={formData.state} onChange={handleChange} disabled={!isEditing} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70 transition-colors" />
                  </div>
                  <div className="flex flex-col mb-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">District</label>
                    <input type="text" name="district" value={formData.district} onChange={handleChange} disabled={!isEditing} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70 transition-colors" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col mb-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Wing</label>
                    <input type="text" name="wing" value={formData.wing} onChange={handleChange} disabled={!isEditing} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70 transition-colors" />
                  </div>
                  <div className="flex flex-col mb-3">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Division</label>
                    <input type="text" name="division" value={formData.division} onChange={handleChange} disabled={!isEditing} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-70 transition-colors" />
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="mt-8 flex justify-end space-x-4">
              <button 
                type="button"
                onClick={handleDiscard}
                className="px-6 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Discard Changes
              </button>
              <button 
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Submit
              </button>
            </div>
          )}
        </form>

      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
    </div>
  );
}
