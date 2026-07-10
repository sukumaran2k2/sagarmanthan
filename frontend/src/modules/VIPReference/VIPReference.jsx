import { useState, useEffect } from 'react';
import { Home, FileText, ClipboardList } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import VIPReferenceInput from './VIPReferenceInput';
import VIPReferenceReports from './VIPReferenceReports';
import axios from 'axios';

export default function VIPReference() {
  const [vipReferences, setVipReferences] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('input'); // 'input' or 'reports'

  const navTabs = [
    { id: 'input', label: 'Input Form', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const fetchData = () => {
    axios.get("http://localhost:3000/vip-reference")
      .then(res => {
        const mapped = res.data.map(r => {
          const steps = {
            1: r.received_at_ministry || 'No',
            2: r.submitted_for_approval || 'No',
            3: r.comments_sought || 'No',
            4: r.comments_received || 'No',
            5: r.reply_furnished || 'No',
            6: r.disposed || 'No'
          };
          const dates = {
            1: r.received_at_ministry_date ? new Date(r.received_at_ministry_date).toISOString().split('T')[0] : '',
            2: r.submitted_for_approval_date ? new Date(r.submitted_for_approval_date).toISOString().split('T')[0] : '',
            3: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            4: r.comments_received_date ? new Date(r.comments_received_date).toISOString().split('T')[0] : '',
            5: r.reply_furnished_date ? new Date(r.reply_furnished_date).toISOString().split('T')[0] : '',
            6: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.vip_reference_id,
            subject: r.subject || '',
            eofficeFile: r.eoffice_file_number || '',
            wing: r.wing_name || '',
            division: r.division_name || '',
            refNumber: r.ref_letter_num || '',
            receivedFrom: r.received_from || '',
            remarks: r.remarks || '',
            deadline: r.deadline ? new Date(r.deadline).toISOString().split('T')[0] : '',
            statusSteps: steps,
            statusDates: dates,
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : ''
          };
        });
        setVipReferences(mapped);
      })
      .catch(err => console.error("Error fetching VIP references:", err));
  };

  useEffect(() => {
    if (activeSubTab === 'reports') {
      fetchData();
    }
  }, [activeSubTab]);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 hover:underline cursor-pointer">Governance</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 hover:underline cursor-pointer">VIP Reference</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-800 font-bold">
          {activeSubTab === 'input' ? 'Input Form' : 'Output Reports'}
        </span>
      </div>

      {/* Main Page Title and Internal Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            VIP Reference - {activeSubTab === 'input' ? 'Input Form' : 'Reports'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage VIP Reference letters, comments sought from organisations, and track processing workflow status.
          </p>
        </div>
        <div>
          <InternalNavigation
            tabs={navTabs}
            currentTab={activeSubTab}
            onTabChange={(tabId) => setActiveSubTab(tabId)}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {activeSubTab === 'input' ? (
          <VIPReferenceInput vipReferences={vipReferences} setVipReferences={setVipReferences} refreshData={fetchData} />
        ) : (
          <VIPReferenceReports vipReferences={vipReferences} />
        )}
      </div>

    </div>
  );
}
