import { useState, useEffect } from 'react';
import axios from 'axios';
import forge from 'node-forge';
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
  Globe,
  Milestone,
  Map,
  Compass,
  ChevronDown
} from 'lucide-react';

const PUBLIC_KEY_PEM = (import.meta.env.VITE_RSA_PUBLIC_KEY || "").replace(/\\n/g, "\n");

function encryptPassword(password) {
  const publicKey = forge.pki.publicKeyFromPem(PUBLIC_KEY_PEM);
  const bytes = forge.util.encodeUtf8(password);
  const encrypted = publicKey.encrypt(bytes, 'RSA-OAEP', {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });
  return forge.util.encode64(encrypted);
}

function decodeToken(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].slice(0, 2).toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return 'First session';
  try {
    const d = new Date(dateStr);
    // Cancel the timezone offset shift to show raw database local time values
    const userOffset = d.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(d.getTime() + userOffset);
    return adjustedDate.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateStr;
  }
}

export default function ProfileView({ triggerNotification }) {
  // Edit mode for Personal Details
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);
  const [rawUser, setRawUser] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);

  // Form state combining both the old layout features and new required fields (initialized empty to avoid flickers)
  const [profile, setProfile] = useState({
    title: '',
    fullName: '',
    email: '',
    phone: '',
    location: '',
    employeeId: '',
    designation: '',
    department: '',
    state: '',
    district: '',
    wing: '',
    division: '',
    langPreference: 'English',
    twoFactor: true,
    lastLogin: null
  });

  // Password reset state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    console.log("DEBUG_PROFILE: Loaded token:", token);
    if (!token) return;
    const decoded = decodeToken(token);
    console.log("DEBUG_PROFILE: Decoded payload:", decoded);
    if (!decoded || !decoded.email) return;

    axios.get('http://localhost:3000/userlist')
      .then(res => {
        const users = res.data || [];
        console.log("DEBUG_PROFILE: Loaded userlist:", users);
        const matched = users.find(u => u.email.toLowerCase() === decoded.email.toLowerCase());
        console.log("DEBUG_PROFILE: Matched user object:", matched);
        if (matched) {
          setRawUser(matched);
          setProfile({
            title: matched.title || 'Mr',
            fullName: matched.name || '',
            email: matched.email || '',
            phone: matched.phone || '',
            location: matched.district_name ? `${matched.district_name}, ${matched.state_name || ''}` : 'New Delhi, India',
            employeeId: `EMP-2026-${matched.user_id}`,
            designation: matched.designation || 'Officer',
            department: matched.division_name || matched.organisation_name || 'N/A',
            state: matched.state_name || 'N/A',
            district: matched.district_name || 'N/A',
            wing: matched.wing_name || 'Ports',
            division: matched.division_name || 'N/A',
            langPreference: 'English',
            twoFactor: true,
            lastLogin: matched.last_login
          });
        }
        setLoadingDetails(false);
      })
      .catch(err => {
        console.error('Failed to load profile details:', err);
        setLoadingDetails(false);
      });
  }, []);

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
    if (!rawUser) return;

    axios.put('http://localhost:3000/edit-user-profile', {
      userID: rawUser.user_id,
      title: profile.title,
      name: profile.fullName,
      designation: profile.designation,
      email: profile.email,
      phone: profile.phone,
      organisationId: rawUser.organisation_id || 1,
      wing: rawUser.wing_id || 1,
      division: rawUser.division_id || 1,
      state: rawUser.state_id || 1,
      district: rawUser.district_id || 1,
      loginUser: rawUser.name
    })
    .then(() => {
      setIsEditingPersonal(false);
      if (triggerNotification) {
        triggerNotification('Personal details updated successfully in the database.');
      } else {
        alert('Personal details updated successfully in the database.');
      }
    })
    .catch(err => {
      console.error(err);
      alert('Failed to update profile details.');
    });
  };

  const handleUpdatePassword = (e) => {
    e.preventDefault();
    if (!rawUser) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match.');
      return;
    }

    let encryptedOld, encryptedNew;
    try {
      encryptedOld = encryptPassword(passwordForm.currentPassword);
      encryptedNew = encryptPassword(passwordForm.newPassword);
    } catch (encryptionErr) {
      console.error(encryptionErr);
      alert('Encryption failed.');
      return;
    }

    axios.put('http://localhost:3000/edit-password', {
      userID: rawUser.user_id,
      email: rawUser.email,
      loginUser: rawUser.name,
      oldPassword: encryptedOld,
      newPassword: encryptedNew
    })
    .then(() => {
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      if (triggerNotification) {
        triggerNotification('Security credentials updated successfully.');
      } else {
        alert('Security credentials updated successfully.');
      }
    })
    .catch(err => {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to update password.';
      alert(errMsg);
    });
  };

  if (loadingDetails) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-slate-500 font-semibold animate-pulse">
        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Loading profile credentials from secure database...</span>
      </div>
    );
  }

  // Helper classes for editable vs disabled inputs
  const inputClass = isEditingPersonal
    ? "w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
    : "w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none transition font-semibold text-slate-500 cursor-not-allowed";

  const selectClass = isEditingPersonal
    ? "w-full text-xs pl-8.5 pr-9 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl appearance-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition font-semibold text-slate-800"
    : "w-full text-xs pl-8.5 pr-9 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl appearance-none focus:outline-none transition font-semibold text-slate-500 cursor-not-allowed";

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Page Heading */}
      <div className="text-left space-y-1">
        <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight font-display">
          My Profile
        </h1>
        <p className="text-xs text-slate-500 font-bold tracking-wide">
          Manage your personal details, organisation alignments, and login parameters.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Account Metadata Card */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
            
            {/* Avatar block */}
            <div className="relative group mt-4">
              <div className="h-24 w-24 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-700 flex items-center justify-center text-white text-3xl font-black font-display shadow-lg transition-all">
                {getInitials(profile.fullName)}
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
                <span className="text-slate-800 font-medium">{formatDate(profile.lastLogin)}</span>
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

        {/* Right Column: Profile details form */}
        <div className="lg:col-span-2 space-y-6">
          
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Form Panel: Personal Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span>Personal Details</span>
                  </span>
                  {!isEditingPersonal && (
                    <button
                      type="button"
                      onClick={() => setIsEditingPersonal(true)}
                      className="px-3.5 py-1 text-xs font-bold text-[#0f417a] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </h3>

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="title"
                      disabled={!isEditingPersonal}
                      value={profile.title}
                      onChange={handleProfileChange}
                      className={selectClass}
                    >
                      <option value="Mr">Mr</option>
                      <option value="Mrs">Mrs</option>
                      <option value="Ms">Ms</option>
                      <option value="Dr">Dr</option>
                    </select>
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-455">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="fullName"
                      required
                      disabled={!isEditingPersonal}
                      value={profile.fullName}
                      onChange={handleProfileChange}
                      className={inputClass}
                    />
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Email ID <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      name="email"
                      required
                      disabled={!isEditingPersonal}
                      value={profile.email}
                      onChange={handleProfileChange}
                      className={inputClass}
                    />
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Contact Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="phone"
                      required
                      disabled={!isEditingPersonal}
                      value={profile.phone}
                      onChange={handleProfileChange}
                      className={inputClass}
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
                      disabled={!isEditingPersonal}
                      value={profile.location}
                      onChange={handleProfileChange}
                      className={inputClass}
                    />
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Designation */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="designation"
                      required
                      disabled={!isEditingPersonal}
                      value={profile.designation}
                      onChange={handleProfileChange}
                      className={inputClass}
                    />
                    <Shield className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Inline Save button inside Personal Details panel */}
                {isEditingPersonal && (
                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save</span>
                    </button>
                  </div>
                )}

              </div>

              {/* Right Form Panel: Organization Details */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-4 mb-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>Organization Details</span>
                </h3>

                {/* Department / Division */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Department / Division</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="department"
                      disabled
                      value={profile.department}
                      onChange={handleProfileChange}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none transition font-semibold text-slate-500 cursor-not-allowed"
                    />
                    <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* State */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    State <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="state"
                      disabled
                      value={profile.state}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none transition font-semibold text-slate-500 cursor-not-allowed"
                    />
                    <Map className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* District */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    District <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="district"
                      disabled
                      value={profile.district}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none transition font-semibold text-slate-500 cursor-not-allowed"
                    />
                    <Milestone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Wing */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Wing <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="wing"
                      disabled
                      value={profile.wing}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none transition font-semibold text-slate-500 cursor-not-allowed"
                    />
                    <Compass className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Division */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Division <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="division"
                      disabled
                      value={profile.division}
                      className="w-full text-xs pl-8.5 pr-3.5 py-2.5 bg-slate-100/80 border border-slate-200 rounded-xl focus:outline-none transition font-semibold text-slate-500 cursor-not-allowed"
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
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-455">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* GIGW v3 Two-Factor Switch */}
                <div className="space-y-1.5 md:col-span-2">
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

            </div>
          </form>

        </div>

      </div>

      {/* Security / Password Management Panel (Full Width) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-2 border-b border-slate-100 pb-4 mb-5">
          <Key className="h-4 w-4 text-blue-600" />
          <span>Change Security Password</span>
        </h3>

        <form onSubmit={handleUpdatePassword} className="space-y-5">
          {/* Password Complexity Requirements Indicator */}
          <div className="text-[11px] text-slate-600 bg-slate-50/80 border-l-4 border-red-500 px-4 py-2.5 rounded-r-xl dark:bg-red-950/10 dark:text-red-400 font-semibold flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse"></span>
            <span>Password must contain at least 8 characters including a mix of letters (uppercase & lowercase), numbers, and special characters.</span>
          </div>

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
              className="px-5 py-2.5 bg-[#0f417a] hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
            >
              <Key className="h-3.5 w-3.5" />
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
