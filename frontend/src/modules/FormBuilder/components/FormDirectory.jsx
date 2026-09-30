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
  Sparkles,
  Copy,
  Edit,
  Activity,
  X
} from 'lucide-react';
import FormPreviewModal from './FormPreviewModal';
import FormBuilderStudio from './FormBuilderStudio';

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

export default function FormDirectory({ triggerNotification, onViewSubmissions, onEditForm }) {
  const [forms, setForms] = useState(MOCK_PUBLISHED_FORMS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormToFill, setSelectedFormToFill] = useState(null);
  const [formToDelete, setFormToDelete] = useState(null);
  const [formToEdit, setFormToEdit] = useState(null);

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

  const handleCloneForm = (form) => {
    const clonedForm = {
      ...form,
      id: `form_${Date.now()}`,
      formName: `${form.formName} (Copy)`,
      submissionsCount: 0
    };
    setForms([clonedForm, ...forms]);
    triggerNotification && triggerNotification(`Cloned "${form.formName}" successfully!`, 'success');
  };

  const confirmDelete = () => {
    if (!formToDelete) return;
    setForms(forms.filter(f => f.id !== formToDelete.id));
    triggerNotification && triggerNotification(`Form "${formToDelete.formName}" deleted successfully`, 'success');
    setFormToDelete(null);
  };

  const handleToggleStatus = (id) => {
    setForms(forms.map(f => {
      if (f.id === id) {
        const newStatus = f.status === 'Active' ? 'Inactive' : 'Active';
        triggerNotification && triggerNotification(`Status changed to ${newStatus}`, 'success');
        return { ...f, status: newStatus };
      }
      return f;
    }));
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
              onClick={() => onViewSubmissions && onViewSubmissions(form)}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isOverdue 
                      ? 'bg-red-50 text-red-700 border border-red-200' 
                      : form.status === 'Inactive'
                        ? 'bg-slate-100 text-slate-500 border border-slate-300'
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
                  onClick={(e) => { e.stopPropagation(); handleCloneForm(form); }}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Clone</span>
                </button>

                <button
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setFormToEdit(form);
                  }}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleStatus(form.id); }}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Status</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setFormToDelete(form); }}
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
      {/* Delete Confirmation Overlay */}
      {formToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Delete Form</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Are you sure you want to delete <strong>{formToDelete.formName}</strong>? This action cannot be undone and will remove all associated submissions.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setFormToDelete(null)}
                  className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition cursor-pointer shadow-md shadow-red-500/20"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Full-Screen Overlay */}
      {formToEdit && (
        <div className="fixed inset-0 z-[100] bg-slate-50/95 backdrop-blur overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Edit className="h-5 w-5 text-amber-700" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">Edit Form</h2>
                  <p className="text-xs text-slate-500">Modify properties and fields for {formToEdit.formName}</p>
                </div>
              </div>
              <button 
                onClick={() => setFormToEdit(null)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer font-bold text-xs flex items-center space-x-1.5"
              >
                <X className="h-4 w-4" />
                <span>Close Editor</span>
              </button>
            </div>

            <FormBuilderStudio 
              formToEdit={formToEdit} 
              triggerNotification={triggerNotification} 
              onFormPublished={() => setFormToEdit(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
