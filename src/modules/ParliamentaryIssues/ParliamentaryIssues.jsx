import { useState } from 'react';
import ParliamentaryIssuesInput from './ParliamentaryIssuesInput';
import ParliamentaryIssuesReports from './ParliamentaryIssuesReports';
import { INITIAL_ISSUES } from './constants';

export default function ParliamentaryIssues() {
  const [issues, setIssues] = useState(INITIAL_ISSUES);
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'list' | 'report' | 'add'
  const [editingIssue, setEditingIssue] = useState(null);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Main Page Title & Tabs Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Parliamentary Issues
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage and track Parliamentary Assurances.</p>
        </div>

        {/* Tabs Selector Navigation on the same line */}
        <div className="flex space-x-1.5 bg-slate-50/50 p-1.5 rounded-xl border border-slate-200 w-fit">
          <button
            onClick={() => { setActiveSubTab('dashboard'); setEditingIssue(null); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'dashboard'
                ? 'bg-[#0f417a] text-white shadow'
                : 'text-slate-555 hover:text-slate-800'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => { setActiveSubTab('list'); setEditingIssue(null); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'list'
                ? 'bg-[#0f417a] text-white shadow'
                : 'text-slate-555 hover:text-slate-800'
            }`}
          >
            List View (Register)
          </button>
          <button
            onClick={() => { setActiveSubTab('report'); setEditingIssue(null); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'report'
                ? 'bg-[#0f417a] text-white shadow'
                : 'text-slate-555 hover:text-slate-800'
            }`}
          >
            Analytical Reports
          </button>
          <button
            onClick={() => { setActiveSubTab('add'); setEditingIssue(null); }}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeSubTab === 'add'
                ? 'bg-[#0f417a] text-white shadow'
                : 'text-slate-555 hover:text-slate-800'
            }`}
          >
            Add Issues
          </button>
        </div>
      </div>

      {/* Dynamic Tab Render Area */}
      <div className="space-y-8">
        
        {activeSubTab === 'dashboard' && (
          <div className="animate-fade-in">
            <ParliamentaryIssuesReports issues={issues} mode="dashboard" />
          </div>
        )}

        {(activeSubTab === 'list' || activeSubTab === 'add') && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
            <ParliamentaryIssuesInput 
              issues={issues} 
              setIssues={setIssues} 
              activeSubTab={activeSubTab}
              setActiveSubTab={setActiveSubTab}
              editingIssue={editingIssue}
              setEditingIssue={setEditingIssue}
            />
          </div>
        )}

        {activeSubTab === 'report' && (
          <div className="animate-fade-in">
            <ParliamentaryIssuesReports issues={issues} mode="report" />
          </div>
        )}

      </div>

    </div>
  );
}
