import { useState } from 'react';
import { Home, FileText, ClipboardList } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import AuditParaInput from './AuditParaInput';
import AuditParaReports from './AuditParaReports';
import { INITIAL_AUDIT_PARAS } from './constants';

export default function AuditPara() {
  const [auditParas, setAuditParas] = useState(INITIAL_AUDIT_PARAS);
  const [activeSubTab, setActiveSubTab] = useState('input'); // 'input' or 'reports'

  const navTabs = [
    { id: 'input', label: 'Input Form', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

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
          <AuditParaInput auditParas={auditParas} setAuditParas={setAuditParas} />
        ) : (
          <AuditParaReports auditParas={auditParas} />
        )}
      </div>

    </div>
  );
}
