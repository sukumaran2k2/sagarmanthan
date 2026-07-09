import { useState, useEffect } from 'react';
import CabinetNotesInput from './CabinetNotesInput';
import CabinetNotesReports from './CabinetNotesReports';
import InternalNavigation from '../../components/InternalNavigation';
import axios from 'axios';

export default function CabinetNotes() {
  const [notes, setNotes] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('dashboard'); // 'dashboard' | 'list' | 'report' | 'add'
  const [editingNote, setEditingNote] = useState(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'list', label: 'List View (Register)' },
    { id: 'report', label: 'Analytical Reports' },
    { id: 'add', label: 'Add Notes' }
  ];

  const fetchData = () => {
    axios.get("http://localhost:3000/cabinet-mopsw")
      .then(res => {
        const mapped = res.data.map(r => {
          const steps = {
            1: r.pre_dcn_prepared || 'No',
            2: r.pre_dcn__approved || 'No',
            3: r.cirucalted_for_imc || 'No',
            4: r.imc_comments_rec || 'No',
            5: r.final_dcn_prepared || 'No',
            6: r.final_dcn_approved || 'No',
            7: r.dcmbeen_approved || 'No',
            8: r.advance_copy_sent_to_pmo || 'No',
            9: r.cabinet_approved || 'No',
            10: r.on_hold || 'No',
            11: r.completed || 'No'
          };
          const dates = {
            1: r.pre_dcn_prepared_date ? new Date(r.pre_dcn_prepared_date).toISOString().split('T')[0] : '',
            2: r.pre_dcn__approved_date ? new Date(r.pre_dcn__approved_date).toISOString().split('T')[0] : '',
            3: r.cirucalted_for_imc_date ? new Date(r.cirucalted_for_imc_date).toISOString().split('T')[0] : '',
            4: r.imc_comments_rec_date ? new Date(r.imc_comments_rec_date).toISOString().split('T')[0] : '',
            5: r.final_dcn_prepared_date ? new Date(r.final_dcn_prepared_date).toISOString().split('T')[0] : '',
            6: r.final_dcn_approved_date ? new Date(r.final_dcn_approved_date).toISOString().split('T')[0] : '',
            7: r.dcmbeen_approved_date ? new Date(r.dcmbeen_approved_date).toISOString().split('T')[0] : '',
            8: r.advance_copy_sent_to_pmo_date ? new Date(r.advance_copy_sent_to_pmo_date).toISOString().split('T')[0] : '',
            9: r.cabinet_approved_date ? new Date(r.cabinet_approved_date).toISOString().split('T')[0] : '',
            10: r.on_hold_date ? new Date(r.on_hold_date).toISOString().split('T')[0] : '',
            11: r.completed_date ? new Date(r.completed_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.cabinet_notes_mopsw_id,
            subject: r.subject || '',
            wing: r.wing_name || '',
            division: r.division_name || '',
            status: r.mopsw_stage_name || 'Preliminary DCN Prepared',
            statusSteps: steps,
            statusDates: dates,
            remarks: r.remarks || '',
            fileName: r.document_name || null
          };
        });
        setNotes(mapped);
      })
      .catch(err => console.error("Error fetching Cabinet Notes MoPSW:", err));
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

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
              refreshData={fetchData}
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
