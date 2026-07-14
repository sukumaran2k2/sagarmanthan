import { useState, useEffect } from 'react';
import { Home, FileText, ClipboardList } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import AuditParaInput from './AuditParaInput';
import AuditParaReports from './AuditParaReports';
import axios from 'axios';

export default function AuditPara() {
  const [auditParas, setAuditParas] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('input'); // 'input' or 'reports'

  const navTabs = [
    { id: 'input', label: 'Input Form', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const fetchData = () => {
    axios.get("http://localhost:3000/audit-para")
      .then(res => {
        const mapped = res.data.map(r => {
          const steps = {
            1: r.received_at_ministry || 'No',
            2: r.comments_sought || 'No',
            3: r.comments_rec || 'No',
            4: r.under_clarification || 'No',
            5: r.comments_furnished || 'No',
            6: r.cag_accepted || 'No',
            7: r.disposed || 'No'
          };
          const dates = {
            1: r.date_of_receipt ? new Date(r.date_of_receipt).toISOString().split('T')[0] : '',
            2: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            3: r.comments_rec_date ? new Date(r.comments_rec_date).toISOString().split('T')[0] : '',
            4: '', // under clarification date isn't in backend but let's handle it safely
            5: r.comments_furnished_date ? new Date(r.comments_furnished_date).toISOString().split('T')[0] : '',
            6: r.cag_accepted_date ? new Date(r.cag_accepted_date).toISOString().split('T')[0] : '',
            7: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.audit_para_id,
            paraNumber: r.para_number || '',
            subject: r.subject || '',
            wing: r.wing_name || '',
            division: r.division_name || '',
            category: r.category || 'Transaction Audit',
            statusSteps: steps,
            statusDates: dates,
            remarks: r.remarks || '',
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : ''
          };
        });
        setAuditParas(mapped);
      })
      .catch(err => console.error("Error fetching Audit Paras:", err));
  };

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Breadcrumbs */}
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 hover:underline cursor-pointer">Governance</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 hover:underline cursor-pointer">Audit Paras</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-800 font-bold">
          {activeSubTab === 'input' ? 'Input Form' : 'Output Reports'}
        </span>
      </div>

      {/* Main Page Title and Internal Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Audit Paras - {activeSubTab === 'input' ? 'Input Form' : 'Reports'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage Audit Para records, divisional comments, and track progress status wing-wise.
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
          <AuditParaInput auditParas={auditParas} setAuditParas={setAuditParas} refreshData={fetchData} />
        ) : (
          <AuditParaReports auditParas={auditParas} />
        )}
      </div>

    </div>
  );
}
