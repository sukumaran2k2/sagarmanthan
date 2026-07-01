import { useState } from 'react';
import { Home } from 'lucide-react';
import CabinetNotesInput from './CabinetNotesInput';
import CabinetNotesReports from './CabinetNotesReports';
import { INITIAL_NOTES } from './constants';

export default function CabinetNotes({ userRole = 'Admin' }) {
  const [notes, setNotes] = useState(INITIAL_NOTES);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-slate-650 hover:underline cursor-pointer">Cabinet Notes-MoPSW</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-800 font-bold">Cabinet Notes Workspace</span>
      </div>

      {/* Main Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Cabinet Notes-MoPSW
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage and review Cabinet Notes, departmental summaries, and wing-wise status reports.</p>
        </div>
      </div>

      {/* Stacked Layout on a Single Page */}
      <div className="space-y-8">
        
        {/* 1. Detailed Notes Section / Input Form (Top Card) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <CabinetNotesInput notes={notes} setNotes={setNotes} userRole={userRole} />
        </div>

        {/* 2. Abstract Report Section (Bottom Card) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <CabinetNotesReports notes={notes} userRole={userRole} />
        </div>

      </div>

    </div>
  );
}
