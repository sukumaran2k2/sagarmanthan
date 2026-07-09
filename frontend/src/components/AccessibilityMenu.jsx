import React, { useState, useEffect, useRef } from 'react';
import { PersonStanding, Globe, Type, Sun, Moon, MousePointer, ChevronDown } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.jsx';

export default function AccessibilityMenu({ lang, setLang }) {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(16); // baseline default 16px
  const [cursorSize, setCursorSize] = useState('normal'); // 'normal', 'medium', 'large'

  const menuRef = useRef(null);

  // Sync font size
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  // Sync cursor size class on document element
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('cursor-normal', 'cursor-medium', 'cursor-large');
    root.classList.add(`cursor-${cursorSize}`);
  }, [cursorSize]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      {/* Accessibility Trigger Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${isOpen
          ? 'text-cyan-300 bg-white/15 shadow-inner border border-white/20'
          : 'text-slate-300 hover:text-white hover:bg-white/10 border border-transparent'
          }`}
        title="Accessibility Settings"
      >
        <PersonStanding className="h-4.5 w-4.5" />
        <ChevronDown className={`h-3 w-3 opacity-60 transition-transform duration-250 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Options Box */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-55 space-y-4 animate-fade-in text-slate-800 dark:text-slate-200">

          <div className="border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Accessibility Settings
            </span>
          </div>

          {/* 1. Language Option */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-slate-400" />
              Language
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setLang('EN')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${lang === 'EN'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                English
              </button>
              <button
                onClick={() => setLang('HI')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${lang === 'HI'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                Hindi
              </button>
            </div>
          </div>

          {/* 2. Text Size Control */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Type className="h-3 w-3 text-slate-400" />
              Text Size Control
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setFontSize(14)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${fontSize === 14
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize(16)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${fontSize === 16
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize(20)}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${fontSize === 20
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                A+
              </button>
            </div>
          </div>

          {/* 3. Cursor Size Control
          <div className="flex flex-col space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <MousePointer className="h-3 w-3 text-slate-400" />
              Cursor Size Control
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCursorSize('normal')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${cursorSize === 'normal'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                C-
              </button>
              <button
                onClick={() => setCursorSize('medium')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${cursorSize === 'medium'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                C
              </button>
              <button
                onClick={() => setCursorSize('large')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${cursorSize === 'large'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                  }`}
              >
                C+
              </button>
            </div>
          </div> */}

          {/* 4. Dark & Light Theme Switch */}
          <div className="flex flex-col space-y-1.5">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              {isDarkMode ? <Sun className="h-3 w-3 text-amber-500" /> : <Moon className="h-3 w-3 text-slate-400" />}
              Theme Mode
            </span>
            <button
              onClick={toggleDarkMode}
              className="w-full flex items-center justify-center space-x-2 py-2 text-xs font-bold border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-300" />
                  <span>Switch to Light Mode</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-slate-600" />
                  <span>Switch to Dark Mode</span>
                </>
              )}
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
