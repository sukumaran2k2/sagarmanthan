import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const navigate = useNavigate();

  // Initialize active tab from the URL path
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname;
    if (path.includes('/directory')) return 'directory';
    if (path.includes('/inbox')) return 'inbox';
    if (path.includes('/submissions')) return 'submissions';
    return 'studio';
  });

  // Keep state in sync if URL changes (e.g., from header)
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/directory')) setActiveTab('directory');
    else if (path.includes('/inbox')) setActiveTab('inbox');
    else if (path.includes('/submissions')) setActiveTab('submissions');
    else setActiveTab('studio');
  }, [location.pathname]);

  const [selectedFormForInbox, setSelectedFormForInbox] = useState(null);
  const [selectedFormForSubmission, setSelectedFormForSubmission] = useState(null);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/form-builder/${tabId}`);
  };

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
          onTabChange={handleTabChange}
        />
      </div>

      {/* Main Tab Content */}
      {activeTab === 'studio' && (
        <FormBuilderStudio 
          triggerNotification={triggerNotification} 
          onFormPublished={() => handleTabChange('directory')}
        />
      )}

      {activeTab === 'directory' && (
        <FormDirectory 
          triggerNotification={triggerNotification}
          onViewSubmissions={(form) => {
            setSelectedFormForSubmission(form);
            handleTabChange('submissions');
          }}
        />
      )}

      {activeTab === 'inbox' && (
        <InboxForms 
          selectedForm={selectedFormForInbox}
          triggerNotification={triggerNotification}
          onBackToDirectory={() => handleTabChange('directory')}
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionsTable 
          selectedForm={selectedFormForSubmission}
          triggerNotification={triggerNotification}
          onBackToDirectory={() => handleTabChange('directory')}
        />
      )}
    </div>
  );
}
