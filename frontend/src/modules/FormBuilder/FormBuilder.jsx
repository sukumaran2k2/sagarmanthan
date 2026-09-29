import React, { useState } from 'react';
import { 
  FileText, 
  PlusCircle, 
  Table, 
  Layers, 
  Sparkles, 
  CheckCircle2, 
  Send,
  Eye,
  Sliders,
  Database
} from 'lucide-react';
import FormBuilderStudio from './components/FormBuilderStudio';
import FormDirectory from './components/FormDirectory';
import InboxForms from './components/InboxForms';
import SubmissionsTable from './components/SubmissionsTable';
import InternalNavigation from '../../components/InternalNavigation';

export default function FormBuilder({ triggerNotification }) {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'directory' | 'inbox' | 'submissions'
  const [selectedFormForInbox, setSelectedFormForInbox] = useState(null);
  const [selectedFormForSubmission, setSelectedFormForSubmission] = useState(null);

  const tabs = [
    { id: 'studio', label: 'Form Studio' },
    { id: 'directory', label: 'Form Directory' },
    { id: 'inbox', label: 'Inbox Forms' }
  ];

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Form Builder & Data Collector
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Design custom dynamic forms, deploy data entry templates, and analyze submitted responses.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeTab === 'submissions' ? 'directory' : activeTab}
          onTabChange={(tabId) => setActiveTab(tabId)}
        />
      </div>

      {/* Main Tab Content */}
      {activeTab === 'studio' && (
        <FormBuilderStudio 
          triggerNotification={triggerNotification} 
          onFormPublished={() => setActiveTab('directory')}
        />
      )}

      {activeTab === 'directory' && (
        <FormDirectory 
          triggerNotification={triggerNotification}
          onViewSubmissions={(form) => {
            setSelectedFormForSubmission(form);
            setActiveTab('submissions');
          }}
        />
      )}

      {activeTab === 'inbox' && (
        <InboxForms 
          selectedForm={selectedFormForInbox}
          triggerNotification={triggerNotification}
          onBackToDirectory={() => setActiveTab('directory')}
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionsTable 
          selectedForm={selectedFormForSubmission}
          triggerNotification={triggerNotification}
          onBackToDirectory={() => setActiveTab('directory')}
        />
      )}
    </div>
  );
}
