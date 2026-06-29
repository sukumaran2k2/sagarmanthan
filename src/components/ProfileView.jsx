import { useState } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Building2, 
  Key, 
  Save, 
  Camera, 
  Laptop, 
  Lock,
  Globe
} from 'lucide-react';

export default function ProfileView({ triggerNotification }) {
  // Profile form state
  const [profile, setProfile] = useState({
    fullName: 'TestMopsw User',
    email: 'testmopsw@gmail.com',
    phone: '+91 98765 43210',
    location: 'Shastri Bhawan, New Delhi',
    employeeId: 'EMP-2026-894',
    designation: 'Senior Director (IT)',
    department: 'Inland Waterways wing',
    langPreference: 'English',
    twoFactor: true
  });

  // Password reset state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (triggerNotification) {
      triggerNotification('Profile details updated successfully.');
    } else {
      alert('Profile details updated successfully.');
    }
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match.');
      return;
    }
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    if (triggerNotification) {
      triggerNotification('Security credentials updated successfully.');
    } else {
      alert('Security credentials updated successfully.');
    }
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Page Heading */}
      <div className="text-left space-y-1">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-display">
          Profile & Security Settings
        </h1>
        <p className="text-xs text-slate-500 font-bold tracking-wide">
          Manage your personal information, department details, and authentication settings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Account Metadata Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            
            {/* Avatar block */}
            <div className="relative group cursor-pointer mt-4">
              <div className="h-24 w-24 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black font-display shadow-lg group-hover:opacity-90 transition-all">
                TM
              </div>
              <div className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full border-2 border-white text-white shadow hover:scale-105 transition-all">
                <Camera className="h-3.5 w-3.5" />
              </div>
            </div>

            <div className="mt-5 space-y-1.5">
              <h2 className="text-base font-bold text-slate-900 font-display">{profile.fullName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-150 inline-block">
                {profile.designation}
              </span>
              <p className="text-xs text-slate-400 font-semibold">{profile.department}</p>
            </div>

            <div className="w-full border-t border-slate-100 my-6 pt-5 space-y-3.5 text-left text-xs">
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Account Status</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Active
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Employee ID</span>
                <span className="text-slate-800 font-bold font-mono">{profile.employeeId}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-semibold">
                <span>Last Sign In</span>
                <span className="text-slate-800 font-medium">Today at 18:22 PM</span>
              </div>
            </div>
          </div>

          {/* Active Devices & Sessions Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Laptop className="h-4 w-4 text-blue-600" />
              <span>Active Sessions</span>
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50/50 border border-slate-100 rounded-xl">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                  <Laptop className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Windows PC (Current)</p>
                  <p className="text-[10px] text-slate-400 font-medium">New Delhi, India • Chrome</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Profile details form & Password reset */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* General Information Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
              <User className="h-4 w-4 text-blue-600" />
              <span>General & Departmental Details</span>
            </h3>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="fullName"
                      value={profile.fullName}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email ID</label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="phone"
                      value={profile.phone}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Office Location */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Office Location</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="location"
                      value={profile.location}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Designation</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="designation"
                      value={profile.designation}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Department / Wing */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department / Division</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="department"
                      value={profile.department}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Language Preference */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Default Language</label>
                  <div className="relative">
                    <select
                      name="langPreference"
                      value={profile.langPreference}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    >
                      <option value="English">English</option>
                      <option value="Hindi">Hindi (हिन्दी)</option>
                    </select>
                    <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* GIGW v3 Two-Factor Switch */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">2FA Status</label>
                  <div className="flex items-center h-10">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.twoFactor}
                        onChange={(e) => setProfile(prev => ({ ...prev, twoFactor: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="ml-3 text-xs font-semibold text-slate-600">
                        {profile.twoFactor ? 'Two-Factor Authentication Enabled' : 'Disabled (Not Recommended)'}
                      </span>
                    </label>
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-650 hover:bg-blue-705 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save General Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Security / Password Management Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
              <Key className="h-4 w-4 text-blue-600" />
              <span>Change Security Password</span>
            </h3>

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Current Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="currentPassword"
                      required
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="newPassword"
                      required
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      placeholder="••••••••"
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
                    />
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

              </div>

              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-705 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
                >
                  <Key className="h-3.5 w-3.5" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}
