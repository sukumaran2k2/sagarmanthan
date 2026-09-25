import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Building2, 
  CalendarDays, 
  CheckCircle, 
  Clock, 
  Eye, 
  Send, 
  Table, 
  Trash2,
  Sparkles
} from 'lucide-react';
import FormPreviewModal from './FormPreviewModal';

const MOCK_PUBLISHED_FORMS = [
  {
    id: 'form_101',
    formName: 'Monthly Capex Expenditure Telemetry',
    formDescription: 'Furnish monthly actual capital expenditure against target allocation for Q3 FY 2025-26.',
    organisation: 'All Major Ports',
    dueDate: '2026-10-31',
    status: 'Active',
    submissionsCount: 9,
    fields: [
      { id: 'f1', inputLabel: 'Month', inputType: 'dropdown', options: ['October 2026', 'November 2026'], required: true },
      { id: 'f2', inputLabel: 'Actual Spent (Rs Cr)', inputType: 'number', placeholder: '0.00', required: true },
      { id: 'f3', inputLabel: 'Variance Reason', inputType: 'textarea', placeholder: 'Explain variance if any...', required: false }
    ]
  },
  {
    id: 'form_102',
    formName: 'CSR Project Beneficiary Verification',
    formDescription: 'Quarterly review report of beneficiaries impacted under maritime CSR initiatives.',
    organisation: 'Jawaharlal Nehru Port Authority (JNPA)',
    dueDate: '2026-11-15',
    status: 'Active',
    submissionsCount: 4,
    fields: [
      { id: 'f1', inputLabel: 'CSR Project Name', inputType: 'text', placeholder: 'e.g. Skill Centre', required: true },
      { id: 'f2', inputLabel: 'Beneficiaries Reached', inputType: 'number', placeholder: 'Count', required: true },
      { id: 'f3', inputLabel: 'Completion Certificate', inputType: 'file', required: true }
    ]
  },
  {
    id: 'form_103',
    formName: 'GeM Procurement Compliance Upload',
    formDescription: 'Monthly verification of transactions processed outside GeM portal with justification.',
    organisation: 'Deendayal Port Authority (Kandla)',
    dueDate: '2026-09-30',
    status: 'Overdue',
    submissionsCount: 2,
    fields: [
      { id: 'f1', inputLabel: 'Procurement Order No', inputType: 'text', required: true },
      { id: 'f2', inputLabel: 'Order Amount (Rs)', inputType: 'number', required: true },
      { id: 'f3', inputLabel: 'Exemption Reason', inputType: 'textarea', required: true }
    ]
  }
];

export default function FormDirectory({ triggerNotification, onViewSubmissions }) {
  const [forms, setForms] = useState(MOCK_PUBLISHED_FORMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormToFill, setSelectedFormToFill] = useState(null);

  useEffect(() => {
    // Attempt fetching live forms from backend
    fetch('/get-created-form-data')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          // Merge or update with backend forms
        }
      })
      .catch(() => {
        // Fallback to rich mock data
      });
  }, []);

  const handleDeleteForm = (id, name) => {
    setForms(forms.filter(f => f.id !== id));
    triggerNotification && triggerNotification(`Form "${name}" deleted successfully`, 'success');
  };

  const filteredForms = forms.filter(f => 
    f.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.organisation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search forms by title or port authority..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-500">Total Published Forms:</span>
          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-extrabold text-xs rounded-full border border-blue-200">
            {filteredForms.length}
          </span>
        </div>
      </div>

      {/* Forms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredForms.map((form) => {
          const isOverdue = form.status === 'Overdue';
          return (
            <div 
              key={form.id}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isOverdue 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {form.status}
                  </span>

                  <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                    <Table className="h-3.5 w-3.5 text-blue-500" />
                    <span>{form.submissionsCount} Submissions</span>
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
                    <span className="truncate">{form.organisation}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    <span>Due: {form.dueDate}</span>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => setSelectedFormToFill(form)}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Fill Form</span>
                </button>

                <button
                  onClick={() => onViewSubmissions && onViewSubmissions(form)}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Table className="h-3.5 w-3.5" />
                  <span>Responses</span>
                </button>

                <button
                  onClick={() => handleDeleteForm(form.id, form.formName)}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
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
