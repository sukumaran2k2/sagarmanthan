import { useState } from 'react';
import ParliamentaryIssuesInput from './ParliamentaryIssuesInput';
import ParliamentaryIssuesReports from './ParliamentaryIssuesReports';
import { INITIAL_ISSUES } from './constants';
import InternalNavigation from '../../components/InternalNavigation';

export default function ParliamentaryIssues() {
  const [issues, setIssues] = useState(INITIAL_ISSUES);
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'list' | 'report' | 'add'
  const [editingIssue, setEditingIssue] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'list', label: 'List View (Register)' },
    { id: 'report', label: 'Analytical Reports' },
    { id: 'add', label: 'Add Issues' }
  ];

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Parliamentary Issues
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage and track Parliamentary Assurances.</p>
        </div>

        <InternalNavigation 
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={(tabId) => {
            setActiveSubTab(tabId);
            setEditingIssue(null);
          }}
        />
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
