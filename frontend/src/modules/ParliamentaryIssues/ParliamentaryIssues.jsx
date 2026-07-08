import { useState } from 'react';
import ParliamentaryIssuesInput from './ParliamentaryIssuesInput';
import ParliamentaryIssuesReports from './ParliamentaryIssuesReports';
import { INITIAL_ISSUES } from './constants';

export default function ParliamentaryIssues() {
  const [issues, setIssues] = useState(INITIAL_ISSUES);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Main Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Parliamentary Issues
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage and track Parliamentary Assurances.</p>
        </div>
      </div>

      {/* Stacked Layout on a Single Page */}
      <div className="space-y-8">
        
        {/* 1. Detailed Issues Section / Input Form (Top Card) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <ParliamentaryIssuesInput issues={issues} setIssues={setIssues} />
        </div>

        {/* 2. Abstract Report Section (Bottom Card) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
          <ParliamentaryIssuesReports issues={issues} />
        </div>

      </div>

    </div>
  );
}
