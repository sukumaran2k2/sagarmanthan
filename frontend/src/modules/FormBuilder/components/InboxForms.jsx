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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
      
      {/* Top Header, Search & Stats */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileSpreadsheet className="h-6 w-6 text-blue-600" />
            <span>Inbox Forms</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Forms assigned to you or created by others that require your response.
          </p>
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="relative flex-grow lg:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by form name or assigner..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 min-w-[90px] text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total</span>
              <span className="text-xl font-black text-slate-800">{filtered.length}</span>
            </div>
            <div className="bg-rose-50 rounded-xl p-3 border border-rose-100 min-w-[90px] text-center">
              <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider block">Pending</span>
              <span className="text-xl font-black text-rose-700">{pendingCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Forms List (Replaced Cards) */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Form Details</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned By</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Due Date</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
              <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filtered.map((form) => {
              const isSubmitted = form.status === 'Submitted';
              const isPending = form.status === 'Pending';
              
              return (
                <tr key={form.id} className="hover:bg-slate-50 transition group">
                  <td className="py-4 px-4 align-top">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                        {form.id}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 line-clamp-1 mb-0.5">{form.formName}</div>
                    <div className="text-xs text-slate-500 line-clamp-1">{form.formDescription}</div>
                  </td>
                  
                  <td className="py-4 px-4 align-top">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      <span className="truncate max-w-[200px]">{form.assignedBy}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 align-top">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-slate-700">
                      <CalendarDays className="h-4 w-4 text-slate-400" />
                      <span>{form.dueDate}</span>
                    </div>
                  </td>

                  <td className="py-4 px-4 align-top text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isSubmitted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
                      isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                      'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {form.status}
                    </span>
                  </td>

                  <td className="py-4 px-4 align-top text-right">
                    <button
                      onClick={() => setSelectedFormToFill(form)}
                      className={`inline-flex items-center space-x-1.5 px-4 py-2 font-bold text-xs rounded-xl transition cursor-pointer ${
                        isSubmitted 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                          : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                      }`}
                    >
                      {isSubmitted ? <Edit className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                      <span>{isSubmitted ? 'Edit Response' : 'Fill Form'}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
            
            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="py-8 text-center text-sm text-slate-500 font-medium">
                  No forms found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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

