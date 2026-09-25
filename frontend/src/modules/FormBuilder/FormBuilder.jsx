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
import SubmissionsTable from './components/SubmissionsTable';

export default function FormBuilder({ triggerNotification }) {
  const [activeTab, setActiveTab] = useState('studio'); // 'studio' | 'directory' | 'submissions'
  const [selectedFormForSubmission, setSelectedFormForSubmission] = useState(null);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 md:p-6 font-sans">
      {/* Header Banner */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-semibold text-xs tracking-wider uppercase mb-1">
              <Sparkles className="h-4 w-4" />
              <span>Ministry Data Collection Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold font-display tracking-tight text-white">
              Form Builder & Data Collector
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl mt-1 leading-relaxed">
              Design custom dynamic forms, deploy data entry templates to Major Port Authorities, and analyze submitted responses in real-time.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md p-1.5 rounded-xl border border-white/10 self-start md:self-auto">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTab === 'studio'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              <span>Form Studio</span>
            </button>

            <button
              onClick={() => setActiveTab('directory')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTab === 'directory'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Form Directory</span>
            </button>

            <button
              onClick={() => setActiveTab('submissions')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg font-bold text-xs transition cursor-pointer ${
                activeTab === 'submissions'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Table className="h-4 w-4" />
              <span>Submissions</span>
            </button>
          </div>
        </div>
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
