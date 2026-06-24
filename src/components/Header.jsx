import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Globe, Type, Anchor } from 'lucide-react';

export default function Header({ onLogout }) {
  const [lang, setLang] = useState('EN');
  const [fontSize, setFontSize] = useState(16); // Standard browser baseline default (16px)
  const [showFontSlider, setShowFontSlider] = useState(false);
  const sliderRef = useRef(null);

  // Sync root document baseline text size whenever state updates
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // Close the font slider dropdown if clicking outside of its area
  useEffect(() => {
    function handleClickOutside(event) {
      if (sliderRef.current && !sliderRef.current.contains(event.target)) {
        setShowFontSlider(false);
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

            {/* Left: Emblem and Government branding */}
            <div className="flex items-center space-x-4 scale-90 origin-left">
              <div className="flex items-center space-x-3 lg:border-r lg:border-white/20 lg:pr-4">
                <img
                    src="/emblem.svg"
                    alt="Emblem of India"
                    className="h-9 w-auto object-contain brightness-0 invert"
                />
                <div className="hidden lg:block">
                  <p className="text-[10px] uppercase tracking-wider text-slate-300 font-semibold leading-tight">Government of India</p>
                  <p className="text-xs font-bold text-white tracking-tight leading-tight">Ministry of Ports, Shipping and Waterways</p>
                </div>
              </div>

              {/* SAGARMANTHAN Brand */}
              <div className="flex items-center space-x-2">
                <div>
                  <img src="src/assets/sagarmanthan_logo.png" />
                </div>
                <div>
                <span className="text-sm sm:text-lg font-black tracking-wider bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent font-display">
                  SAGARMANTHAN
                </span>
                  <span className="block text-[8px] sm:text-[9px] text-cyan-300 font-mono tracking-widest uppercase -mt-1">Maritime Data Portal</span>
                </div>
              </div>
            </div>

            {/* Right: Quick actions, profile details */}
            <div className="flex items-center space-x-3 sm:space-x-5">
              {/* Greeting */}
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-[11px] text-slate-300">Welcome Back</span>
                <span className="text-xs font-medium text-white flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                Good Evening, <strong className="text-white">TestMopsw</strong> | <span className="text-slate-300 font-normal">MoPSW</span>
              </span>
              </div>

              {/* App Version badge */}
              <span className="hidden sm:inline-block px-2.5 py-0.5 bg-white/10 text-cyan-300 border border-white/10 rounded-full text-[10px] font-mono font-semibold">
              Version 3.0
            </span>

              {/* Actions Bar */}
              <div className="flex items-center space-x-1 sm:space-x-2 border-l border-white/20 pl-2 sm:pl-4">
                {/* Language Selector */}
                <button
                    onClick={() => setLang(lang === 'EN' ? 'HI' : 'EN')}
                    className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex items-center space-x-1"
                    title="Change Language"
                >
                  <Globe className="h-4 w-4" />
                  <span className="text-[10px] font-bold tracking-wider">{lang}</span>
                </button>

                {/* Text Size Accessibility Tool Dropdown Container */}
                <div className="relative" ref={sliderRef}>
                  <button
                      onClick={() => setShowFontSlider(!showFontSlider)}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          showFontSlider ? 'text-cyan-300 bg-white/15 shadow-inner' : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                      title="Font Accessibility Settings"
                  >
                    <Type className="h-4 w-4" />
                  </button>

                  {showFontSlider && (
                      <div className="absolute right-0 mt-3.5 w-64 p-4 bg-[#0a2540] border border-white/10 rounded-2xl shadow-2xl z-50 transition-all duration-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Font Size Adjustment</span>
                          <span className="text-xs font-mono font-bold text-cyan-300">{fontSize}px</span>
                        </div>

                        <div className="flex items-center space-x-3 mt-1.5">
                          <span className="text-xs text-slate-400 select-none">A</span>
                          <input
                              type="range"
                              min="13"
                              max="22"
                              value={fontSize}
                              onChange={(e) => setFontSize(Number(e.target.value))}
                              className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                          <span className="text-lg text-slate-200 select-none font-semibold">A</span>
                        </div>

                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5">
                          <button
                              onClick={() => setFontSize(16)}
                              className="text-[10px] text-cyan-400/80 hover:text-cyan-300 font-semibold tracking-wider uppercase transition-colors"
                          >
                            Reset Default
                          </button>
                        </div>
                      </div>
                  )}
                </div>

                {/* User Avatar & Dropdown */}
                <div className="relative group">
                  <button className="flex items-center space-x-2 p-1.5 bg-white/10 border border-white/10 hover:bg-white/20 rounded-full transition-all duration-200 cursor-pointer">
                    <div className="h-7 w-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold font-display shadow-md">
                      TM
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-slate-300 group-hover:text-white transition-colors" />
                  </button>

                  {/* Micro-hover profile menu */}
                  <div className="absolute right-0 w-48 mt-2 py-1 bg-[#0a2540] border border-white/10 rounded-xl shadow-2xl invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 z-50">
                    <a href="#profile" className="block px-4 py-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white">Profile Settings</a>
                    <a href="#manual" className="block px-4 py-2 text-xs text-slate-200 hover:bg-white/10 hover:text-white">User Manual</a>
                    <hr className="border-white/10 my-1" />
                    <a href="#logout" onClick={(e) => { e.preventDefault(); onLogout(); }} className="block px-4 py-2 text-xs text-red-400 hover:bg-white/10 font-medium">Sign Out</a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </header>
  );
}