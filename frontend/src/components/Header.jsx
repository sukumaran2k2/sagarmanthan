import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Globe, Type, Sun, Moon } from 'lucide-react';
import sagarmanthanLogo from '../assets/sagarmanthan_logo.png';
import { useTheme } from '../context/ThemeContext.jsx';
import axios from 'axios';

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

export default function Header({ onLogout, onProfileClick }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [lang, setLang] = useState('EN');
  const [fontSize, setFontSize] = useState(16); // Standard browser baseline default (16px)
  const [showFontSlider, setShowFontSlider] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  
  const [userName, setUserName] = useState('');
  const [userWing, setUserWing] = useState('');

  // Refs to control closing the elements programmatically
  const sliderRef = useRef(null);
  const langDetailsRef = useRef(null);
  const avatarDetailsRef = useRef(null);

  // Sync root document baseline text size whenever state updates
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const decoded = decodeToken(token);
    if (!decoded || !decoded.email) return;

    axios.get('http://localhost:3000/userlist')
      .then(res => {
        const users = res.data || [];
        const matched = users.find(u => u.email.toLowerCase() === decoded.email.toLowerCase());
        if (matched) {
          setUserName(matched.name || '');
          setUserWing(matched.wing_name || 'MoPSW');
        }
      })
      .catch(err => {
        console.error('Failed to load user details in header:', err);
      });
  }, []);

  // Handle opening one dropdown and forcing the others to close
  const handleDropdownOpen = (targetOpen) => {
    if (targetOpen === 'lang') {
      setShowFontSlider(false);
      setShowAvatarDropdown(false);
    } else if (targetOpen === 'font') {
      setShowAvatarDropdown(false);
      if (langDetailsRef.current) langDetailsRef.current.open = false;
    } else if (targetOpen === 'avatar') {
      setShowFontSlider(false);
      if (langDetailsRef.current) langDetailsRef.current.open = false;
    }
  };

  // Close everything if clicking completely outside of the actions bar area
  useEffect(() => {
    function handleClickOutside(event) {
      if (
          sliderRef.current && !sliderRef.current.contains(event.target) &&
          langDetailsRef.current && !langDetailsRef.current.contains(event.target) &&
          avatarDetailsRef.current && !avatarDetailsRef.current.contains(event.target)
      ) {
        setShowFontSlider(false);
        setShowAvatarDropdown(false);
        if (langDetailsRef.current) langDetailsRef.current.open = false;
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
      <header className="bg-gradient-to-r from-[#0a2540] via-[#0f417a] to-[#008ca3] text-white shadow-lg border-b border-[#008ca3]/30">
        {/* Top Banner / Ministry Details */}
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">

             {/* Left: Emblem and Government branding (GIGW Standard layout) */}
            <div className="flex items-center space-x-2 sm:space-x-4 scale-[0.8] sm:scale-90 lg:scale-100 origin-left flex-shrink">
              <div className="flex items-center space-x-3 lg:border-r lg:border-white/20 lg:pr-4">
                <img
                    src="/emblem.svg"
                    alt="Emblem of India"
                    className="h-9 w-auto object-contain brightness-0 invert"
                />
                <div className="hidden lg:block">
                  <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-tight">
                    {lang === 'HI' ? 'भारत सरकार' : 'Government of India'}
                  </p>
                  <p className="text-xs font-bold text-white tracking-tight leading-tight">
                    {lang === 'HI' ? 'पत्तन, पोत परिवहन और जलमार्ग मंत्रालय' : 'Ministry of Ports, Shipping and Waterways'}
                  </p>
                </div>
              </div>

              {/* SAGARMANTHAN Brand */}
              <div className="flex items-center space-x-2">
                <div>
                  <img src={sagarmanthanLogo} alt="Sagarmanthan Logo" className="h-10 w-auto object-contain" />
                </div>
                <div>
                  <span className="text-sm sm:text-lg font-black tracking-wider bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent font-display">
                    {lang === 'HI' ? 'सागरमंथन' : 'SAGARMANTHAN'}
                  </span>
                  <span className="block text-[8px] sm:text-[9px] text-cyan-300 font-mono tracking-widest uppercase -mt-1">
                    {lang === 'HI' ? 'समुद्री डेटा पोर्टल' : 'Maritime Data Portal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick actions, profile details */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              {/* Greeting */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[11px] text-slate-300">Welcome Back</span>
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block border-black"></span>
                  Good Evening, <strong className="text-white">{userName || 'User'}</strong> | <span className="text-slate-300 font-normal">{userWing || 'MoPSW'}</span>
                </span>
              </div>

              {/* App Version badge */}
              <span className="hidden sm:inline-block px-2.5 py-0.5 bg-white/10 text-cyan-300 border border-white/10 rounded-full text-[10px] font-mono font-semibold">
              Version 3.0
            </span>

              {/* Actions Bar */}
              <div className="flex items-center space-x-1 sm:space-x-2 border-l border-white/20 pl-2 sm:pl-4">

                {/* Language Selector */}
                <details
                    ref={langDetailsRef}
                    name="header-dropdown"
                    className="relative inline-block group"
                    onToggle={(e) => { if (e.target.open) handleDropdownOpen('lang'); }}
                >
                  {/* Dropdown Trigger Button */}
                  <summary className="list-none outline-none cursor-pointer p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center space-x-1" title="Change Language">
                    <Globe className="h-4 w-4" />
                    <span className="text-[10px] font-bold tracking-wider">{lang}</span>
                  </summary>

                  {/* Language Dropdown Menu */}
                  <div className="absolute right-0 mt-2 w-32 py-1 bg-[#0a2540] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col">
                    {/* English Option */}
                    <button
                        onClick={() => { setLang('EN'); langDetailsRef.current.open = false; }}
                        className="flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                    >
                      <span>English</span>
                      {lang === 'EN' && <span className="text-cyan-400 font-bold text-xs">✓</span>}
                    </button>

                    {/* Hindi Option */}
                    <button
                        onClick={() => { setLang('HI'); langDetailsRef.current.open = false; }}
                        className="flex items-center justify-between px-3 py-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                    >
                      <span>Hindi</span>
                      {lang === 'HI' && <span className="text-cyan-400 font-bold text-xs">✓</span>}
                    </button>
                  </div>
                </details>

                {/* Text Size Accessibility Tool Dropdown Container */}
                <div className="relative" ref={sliderRef}>
                  <button
                    onClick={() => {
                      const nextState = !showFontSlider;
                      setShowFontSlider(nextState);
                      if (nextState) handleDropdownOpen('font');
                    }}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      showFontSlider ? 'text-cyan-300 bg-white/15 shadow-inner' : 'text-slate-300 hover:text-white hover:bg-white/10'
                    }`}
                    title="Font Accessibility Settings"
                  >
                    <Type className="h-4 w-4" />
                  </button>

                  {showFontSlider && (
                    <div className="absolute left-1/2 -translate-x-1/2 md:left-auto md:right-0 mt-2 p-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex items-center space-x-2 whitespace-nowrap">
                      
                      {/* Decrease Font Size (A-) */}
                      <button
                        onClick={() => setFontSize(14)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
                          fontSize === 14
                            ? 'bg-blue-800 text-white border-blue-800 shadow-sm'
                            : 'bg-white text-blue-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        A-
                      </button>

                      {/* Default Font Size (A) */}
                      <button
                        onClick={() => setFontSize(16)}
                        className={`px-4 py-1.5 text-base font-semibold rounded-lg border transition-all ${
                          fontSize === 16
                            ? 'bg-blue-800 text-white border-blue-800 shadow-sm'
                            : 'bg-white text-blue-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        A
                      </button>

                      {/* Increase Font Size (A+) */}
                      <button
                        onClick={() => setFontSize(20)}
                        className={`px-3 py-1.5 text-lg font-bold rounded-lg border transition-all ${
                          fontSize === 20
                            ? 'bg-blue-800 text-white border-blue-800 shadow-sm'
                            : 'bg-white text-blue-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        A+
                      </button>

                    </div>
                  )}
                </div>

                {/* Theme Switcher Button */}
                <button
                  onClick={toggleDarkMode}
                  className="p-1.5 rounded-lg transition-all cursor-pointer text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center"
                  title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  {isDarkMode ? (
                    <Sun className="h-4 w-4 text-amber-400 fill-amber-350" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>

                {/* User Avatar & Dropdown */}
                <div className="relative" ref={avatarDetailsRef}>
                  <button 
                    onClick={() => {
                      const nextState = !showAvatarDropdown;
                      setShowAvatarDropdown(nextState);
                      if (nextState) handleDropdownOpen('avatar');
                    }}
                    className={`flex items-center space-x-2 p-1.5 border rounded-full transition-all duration-200 cursor-pointer ${
                      showAvatarDropdown 
                        ? 'text-cyan-300 bg-white/15 border-white/25 shadow-inner' 
                        : 'bg-white/10 border-white/10 text-slate-300 hover:text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="h-7 w-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold font-display shadow-md">
                      {userName
                        ? userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        : 'U'}
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 transition-colors" />
                  </button>
                  
                  {/* Click-to-open profile menu */}
                  {showAvatarDropdown && (
                    <div className="absolute right-0 w-48 mt-2 py-1 bg-[#0a2540] border border-white/10 rounded-xl shadow-2xl z-50 transition-all duration-200">
                      <a href="#profile" onClick={(e) => { e.preventDefault(); setShowAvatarDropdown(false); onProfileClick(); }} className="block px-4 py-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white">Profile Settings</a>
                      <a href="#manual" onClick={() => setShowAvatarDropdown(false)} className="block px-4 py-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white">User Manual</a>
                      <hr className="border-white/10 my-1" />
                      <a href="#logout" onClick={(e) => { e.preventDefault(); setShowAvatarDropdown(false); onLogout(); }} className="block px-4 py-2 text-xs text-red-400 hover:bg-white/10 font-medium">Sign Out</a>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      </header>
  );
}