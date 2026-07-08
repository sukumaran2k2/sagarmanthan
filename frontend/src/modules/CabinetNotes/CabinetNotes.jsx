import { useState } from 'react';
import CabinetNotesInput from './CabinetNotesInput';
import CabinetNotesReports from './CabinetNotesReports';
import { INITIAL_NOTES } from './constants';
import InternalNavigation from '../../components/InternalNavigation';

export default function CabinetNotes() {
  const [notes, setNotes] = useState(INITIAL_NOTES);
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'list' | 'report' | 'add'
  const [editingNote, setEditingNote] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'list', label: 'List View (Register)' },
    { id: 'report', label: 'Analytical Reports' },
    { id: 'add', label: 'Add Notes' }
  ];

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Cabinet Notes-MoPSW
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage and review Cabinet Notes, departmental summaries, and wing-wise status reports.</p>
        </div>

        <InternalNavigation 
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={(tabId) => {
            setActiveSubTab(tabId);
            setEditingNote(null);
          }}
        />
      </div>

      {/* Dynamic Tab Render Area */}
      <div className="space-y-8">
        
        {activeSubTab === 'dashboard' && (
          <div className="animate-fade-in">
            <CabinetNotesReports notes={notes} mode="dashboard" />
          </div>
        )}

        {(activeSubTab === 'list' || activeSubTab === 'add') && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
            <CabinetNotesInput 
              notes={notes} 
              setNotes={setNotes} 
              activeSubTab={activeSubTab}
              setActiveSubTab={setActiveSubTab}
              editingNote={editingNote}
              setEditingNote={setEditingNote}
            />
          </div>
        )}

        {activeSubTab === 'report' && (
          <div className="animate-fade-in">
            <CabinetNotesReports notes={notes} mode="report" />
          </div>
        )}

      </div>

    </div>
  );
}
