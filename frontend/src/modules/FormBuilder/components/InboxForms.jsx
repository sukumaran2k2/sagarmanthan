import React, { useState } from 'react';
import { 
  Table, 
  Search, 
  ArrowLeft, 
  CheckCircle2, 
  CalendarDays,
  FileSpreadsheet,
  Edit,
  Send,
  Building2,
  Clock
} from 'lucide-react';
import FormPreviewModal from './FormPreviewModal';

const MOCK_INBOX = [
  {
    id: 'INB_001',
    formName: 'Monthly Capex Expenditure Telemetry',
    formDescription: 'Please provide monthly capex expenditure details as requested.',
    assignedBy: 'Ministry of Ports, Shipping and Waterways',
    dueDate: '2026-10-31',
    status: 'Pending',
    fields: [
      { id: 'f1', inputLabel: 'Month', inputType: 'dropdown', options: ['October 2026', 'November 2026'], required: true },
      { id: 'f2', inputLabel: 'Actual Spent (Rs Cr)', inputType: 'number', placeholder: '0.00', required: true }
    ]
  },
  {
    id: 'INB_002',
    formName: 'CSR Project Beneficiary Verification',
    formDescription: 'Quarterly review report of beneficiaries.',
    assignedBy: 'Nodal Officer (CSR)',
    dueDate: '2026-11-15',
    status: 'Draft Saved',
    fields: [
      { id: 'f1', inputLabel: 'CSR Project Name', inputType: 'text', placeholder: 'e.g. Skill Centre', required: true },
      { id: 'f2', inputLabel: 'Beneficiaries Reached', inputType: 'number', placeholder: 'Count', required: true }
    ]
  },
  {
    id: 'INB_003',
    formName: 'GeM Procurement Compliance Upload',
    formDescription: 'Monthly verification of transactions processed outside GeM portal.',
    assignedBy: 'Finance Division',
    dueDate: '2026-09-30',
    status: 'Submitted',
    fields: [
      { id: 'f1', inputLabel: 'Procurement Order No', inputType: 'text', required: true },
      { id: 'f2', inputLabel: 'Order Amount (Rs)', inputType: 'number', required: true }
    ]
  }
];

export default function InboxForms({ triggerNotification, onBackToDirectory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormToFill, setSelectedFormToFill] = useState(null);

  const filtered = MOCK_INBOX.filter(s => 
    s.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.assignedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = MOCK_INBOX.filter(s => s.status !== 'Submitted').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <button
            onClick={onBackToDirectory}
            className="flex items-center space-x-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Form Directory</span>
          </button>

          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            <span>Inbox Forms</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Forms assigned to you or created by others that require your response.
          </p>
        </div>
      </div>

      {/* Stats Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Inbox Forms</span>
          <div className="text-2xl font-black text-slate-800 mt-1">{filtered.length}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Action</span>
          <div className="text-2xl font-black text-rose-600 mt-1">{pendingCount} Forms</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by form name or assigner..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>
      </div>

      {/* Inbox Data Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((form) => {
          const isSubmitted = form.status === 'Submitted';
          const isPending = form.status === 'Pending';
          
          return (
            <div 
              key={form.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isSubmitted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                    isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                    'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    {form.status}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                    {form.id}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1">
                  {form.formName}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                  {form.formDescription}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs font-semibold text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span className="truncate">{form.assignedBy}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    <span>Due: {form.dueDate}</span>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedFormToFill(form)}
                  className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 font-bold text-xs rounded-xl transition cursor-pointer ${
                    isSubmitted 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                  }`}
                >
                  {isSubmitted ? <Edit className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{isSubmitted ? 'Edit Response' : 'Fill Form'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fill Form Modal */}
      {selectedFormToFill && (
        <FormPreviewModal
          formName={selectedFormToFill.formName}
          formDescription={selectedFormToFill.formDescription}
          fields={selectedFormToFill.fields}
          onClose={() => setSelectedFormToFill(null)}
        />
      )}
    </div>
  );
}

