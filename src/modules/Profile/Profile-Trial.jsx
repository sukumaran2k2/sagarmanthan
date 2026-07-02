import { useState } from 'react';
import { Pencil, User, Mail, Phone, Shield, Building2, Map, Milestone, Compass, Lock, X } from 'lucide-react';
import ForgotPassword from '../../components/ForgotPassword';

export default function ProfileTrialView({ triggerNotification }) {
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Initial state representing personal and organisational data
  const [profile, setProfile] = useState({
    title: 'Mr',
    fullName: 'Rajesh Asati',
    email: 'rajesh.asati@gov.in',
    phone: '9727772146',
    designation: 'Deputy Secretary',
    organisation: 'Ministry of Ports, Shipping and Waterways',
    state: 'Delhi',
    district: 'New Delhi',
    wing: 'Ports',
    division: 'PD-I'
  });

  // State to hold temporary edits before saving/discarding
  const [tempProfile, setTempProfile] = useState({ ...profile });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTempProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleTitleSelect = (title) => {
    if (!isEditingPersonal) return;
    setTempProfile((prev) => ({ ...prev, title }));
  };

  const handleDiscard = () => {
    setTempProfile({ ...profile });
    setIsEditingPersonal(false);
    if (triggerNotification) {
      triggerNotification('Changes discarded.');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setProfile({ ...tempProfile });
    setIsEditingPersonal(false);
    if (triggerNotification) {
      triggerNotification('Profile details updated successfully.');
    }
  };

  const inputClass = (editable) =>
    `w-full text-sm px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border rounded-xl focus:outline-none transition font-semibold text-slate-800 dark:text-slate-100 ${editable
      ? 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-500 dark:focus:border-blue-500 bg-white dark:bg-slate-800'
      : 'border-slate-205 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 cursor-not-allowed'
    }`;

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto w-full animate-fade-in text-slate-805 dark:text-slate-200">

      {/* Outer Card Container representing the wireframe body */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-sm space-y-6 relative">

        {/* Profile Image & Reset Password controls */}
        <div className="flex flex-col items-center space-y-5">
          <div className="relative">
            <div className="h-36 w-36 rounded-full border-2 border-slate-200 dark:border-slate-800 shadow-md bg-white dark:bg-slate-850 flex items-center justify-center p-3 overflow-hidden">
              <img
                src="/ntcpwc_logo.png"
                alt="Profile Logo"
                className="h-full w-full object-contain dark:brightness-110"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsForgotPasswordOpen(true)}
            className="flex items-center space-x-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-[#0f417a] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-105 dark:hover:bg-blue-950/60 border border-blue-200 dark:border-blue-900/50 rounded-full transition cursor-pointer"
          >
            <Lock className="h-4 w-4" />
            <span>Forgot / Change Password</span>
          </button>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-5 max-w-4xl mx-auto">

          {/* Personal Information Section */}
          <div className="border border-slate-205 dark:border-slate-800 rounded-2xl p-6 md:p-8 bg-slate-50/20 dark:bg-slate-900/20 space-y-4 relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-105 tracking-tight font-display">
                Personal Information
              </h3>

              {!isEditingPersonal ? (
                <button
                  type="button"
                  onClick={() => setIsEditingPersonal(true)}
                  className="flex items-center space-x-2 px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 border border-slate-300 dark:border-slate-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  <Pencil className="h-4 w-4 text-slate-500" />
                  <span>Edit personal info</span>
                </button>
              ) : (
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-955/20 px-3 py-1.5 rounded-full uppercase tracking-wider">
                  Editing Mode
                </span>
              )}
            </div>

            <div className="space-y-3">
              {/* Title segmented control (Mr / Mrs) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <span className="text-sm font-bold text-slate-650 dark:text-slate-400 w-32">Title:</span>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 relative w-36 h-10 select-none items-center">
                  {/* Sliding active indicator */}
                  <div
                    className="absolute top-1 bottom-1 bg-white dark:bg-slate-700 rounded-lg shadow-sm transition-all duration-300 ease-out"
                    style={{
                      width: 'calc(50% - 4px)',
                      left: tempProfile.title === 'Mr' ? '2px' : 'calc(50% + 2px)'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleTitleSelect('Mr')}
                    className={`relative z-10 w-1/2 text-center text-xs sm:text-sm font-bold transition-colors duration-300 h-full ${
                      isEditingPersonal ? 'cursor-pointer' : 'cursor-not-allowed'
                    } ${
                      tempProfile.title === 'Mr'
                        ? 'text-blue-900 dark:text-white font-black'
                        : 'text-slate-700 dark:text-slate-400'
                    }`}
                    disabled={!isEditingPersonal}
                  >
                    Mr
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTitleSelect('Mrs')}
                    className={`relative z-10 w-1/2 text-center text-xs sm:text-sm font-bold transition-colors duration-300 h-full ${
                      isEditingPersonal ? 'cursor-pointer' : 'cursor-not-allowed'
                    } ${
                      tempProfile.title === 'Mrs'
                        ? 'text-blue-900 dark:text-white font-black'
                        : 'text-slate-700 dark:text-slate-400'
                    }`}
                    disabled={!isEditingPersonal}
                  >
                    Mrs
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">Name</label>
                <div className="relative sm:col-span-3">
                  <input
                    type="text"
                    name="fullName"
                    value={tempProfile.fullName}
                    onChange={handleInputChange}
                    disabled={!isEditingPersonal}
                    className={inputClass(isEditingPersonal)}
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">Email</label>
                <div className="relative sm:col-span-3">
                  <input
                    type="email"
                    name="email"
                    value={tempProfile.email}
                    onChange={handleInputChange}
                    disabled={!isEditingPersonal}
                    className={inputClass(isEditingPersonal)}
                    required
                  />
                </div>
              </div>

              {/* Phone number */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">Phone number</label>
                <div className="relative sm:col-span-3">
                  <input
                    type="tel"
                    name="phone"
                    value={tempProfile.phone}
                    onChange={handleInputChange}
                    disabled={!isEditingPersonal}
                    className={inputClass(isEditingPersonal)}
                    required
                  />
                </div>
              </div>

              {/* Designation */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">Designation</label>
                <div className="relative sm:col-span-3">
                  <input
                    type="text"
                    name="designation"
                    value={tempProfile.designation}
                    onChange={handleInputChange}
                    disabled={!isEditingPersonal}
                    className={inputClass(isEditingPersonal)}
                    required
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Organisation Information Section */}
          <div className="border border-slate-205 dark:border-slate-800 rounded-2xl p-6 md:p-8 bg-slate-50/20 dark:bg-slate-900/20 space-y-4">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-105 tracking-tight font-display border-b border-slate-200 dark:border-slate-800 pb-3 mb-2">
              Organisation Information
            </h3>

            <div className="space-y-3">
              {/* Organisation */}
              <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">Organisation</label>
                <div className="relative sm:col-span-3">
                  <input
                    type="text"
                    name="organisation"
                    value={tempProfile.organisation}
                    disabled={true}
                    className={inputClass(false)}
                  />
                </div>
              </div>

              {/* State & District (Side by side) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                  <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">State</label>
                  <div className="relative sm:col-span-3">
                    <input
                      type="text"
                      name="state"
                      value={tempProfile.state}
                      disabled={true}
                      className={inputClass(false)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                  <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">District</label>
                  <div className="relative sm:col-span-3">
                    <input
                      type="text"
                      name="district"
                      value={tempProfile.district}
                      disabled={true}
                      className={inputClass(false)}
                    />
                  </div>
                </div>
              </div>

              {/* Wing & Division (Side by side) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                  <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">Wing</label>
                  <div className="relative sm:col-span-3">
                    <input
                      type="text"
                      name="wing"
                      value={tempProfile.wing}
                      disabled={true}
                      className={inputClass(false)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-3">
                  <label className="text-sm font-bold text-slate-650 dark:text-slate-400 sm:col-span-1">Division</label>
                  <div className="relative sm:col-span-3">
                    <input
                      type="text"
                      name="division"
                      value={tempProfile.division}
                      disabled={true}
                      className={inputClass(false)}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Bottom Control Buttons (Discard & Submit) - only shown when editing */}
          {isEditingPersonal && (
            <div className="flex items-center justify-center space-x-6 pt-6 animate-fade-in">
              <button
                type="button"
                onClick={handleDiscard}
                className="px-8 py-3 text-xs sm:text-sm font-bold rounded-xl border bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-305 dark:border-slate-700 shadow-sm transition cursor-pointer"
              >
                Discard Changes
              </button>

              <button
                type="submit"
                className="px-10 py-3 text-xs sm:text-sm font-bold text-white rounded-xl shadow bg-[#0f417a] dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 transition cursor-pointer"
              >
                Submit
              </button>
            </div>
          )}

        </form>
      </div>

      {/* Forgot Password Carousel Modal */}
      <ForgotPassword
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        triggerNotification={triggerNotification}
      />
    </div>
  );
}
