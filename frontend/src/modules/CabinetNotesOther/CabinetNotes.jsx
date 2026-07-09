import { useState, useEffect } from 'react';
import CabinetNotesInput from './CabinetNotesInput';
import CabinetNotesReports from './CabinetNotesReports';
import axios from 'axios';
import InternalNavigation from '../../components/InternalNavigation';

export default function CabinetNotes() {
  const [notes, setNotes] = useState([]);
  const [ministries, setMinistries] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'list' | 'report' | 'add'
  const [editingNote, setEditingNote] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'list', label: 'List View (Register)' },
    { id: 'report', label: 'Analytical Reports' },
    { id: 'add', label: 'Add Notes' }
  ];

  const fetchMinistries = () => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_ministry")
      .then(res => {
        setMinistries(res.data);
      })
      .catch(err => console.error("Error fetching ministries:", err));
  };

  const fetchData = () => {
    axios.get("http://localhost:3000/cabinet-ministry/1")
      .then(res => {
        const mapped = res.data.map(r => {
          const steps = {
            1: r.received_ministry || 'No',
            2: r.sent_for_comments || 'No',
            3: r.comments_rec || 'No',
            4: r.file_submitted || 'No',
            5: r.reply_furnished || 'No'
          };
          const dates = {
            1: r.received_ministry_date ? new Date(r.received_ministry_date).toISOString().split('T')[0] : '',
            2: r.sent_for_comments_date ? new Date(r.sent_for_comments_date).toISOString().split('T')[0] : '',
            3: r.comments_rec_date ? new Date(r.comments_rec_date).toISOString().split('T')[0] : '',
            4: r.file_submitted_date ? new Date(r.file_submitted_date).toISOString().split('T')[0] : '',
            5: r.reply_furnished_date ? new Date(r.reply_furnished_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.cabinet_notes_ministry_id,
            subject: r.subject || '',
            ministryName: r.ministry_name || '',
            status: r.stage_name || 'Note Received from Ministry',
            statusSteps: steps,
            statusDates: dates,
            remarks: r.remarks || '',
            deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
            fileName: null
          };
        });
        setNotes(mapped);
      })
      .catch(err => console.error("Error fetching Other Ministry Cabinet Notes:", err));
  };

  useEffect(() => {
    fetchMinistries();
    fetchData();
  }, [activeSubTab]);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Cabinet Notes-Other Ministry
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Manage, register and monitor Cabinet Notes received from other ministries and departments.</p>
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
              refreshData={fetchData}
              ministries={ministries}
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
