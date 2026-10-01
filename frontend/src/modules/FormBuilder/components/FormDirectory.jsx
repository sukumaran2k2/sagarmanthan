import React, { useState, useEffect } from 'react';
import ConfirmOverlay from '../../../components/ConfirmOverlay';
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

const MOCK_DRAFT_FORMS = [
  {
    id: 'draft_1',
    formName: 'Annual HR Performance Review',
    formDescription: 'Draft for the upcoming annual HR performance review for all major ports.',
    organisation: 'All Major Ports',
    dueDate: '2026-12-31',
    status: 'Draft',
    submissionsCount: 0,
    fields: [
      { id: 'f1', inputLabel: 'Employee ID', inputType: 'text', required: true },
      { id: 'f2', inputLabel: 'Self Rating (1-10)', inputType: 'number', required: true }
    ]
  },
  {
    id: 'draft_2',
    formName: 'Safety Audit Checklist',
    formDescription: 'Safety inspection checklist draft for operational port terminals.',
    organisation: 'Mumbai Port Authority (MbPA)',
    dueDate: '2026-11-30',
    status: 'Draft',
    submissionsCount: 0,
    fields: [
      { id: 'f1', inputLabel: 'Terminal Zone', inputType: 'text', required: true }
    ]
  }
];

export default function FormDirectory({ triggerNotification, onViewSubmissions, onEditForm, mode = 'published' }) {
  const [forms, setForms] = useState(mode === 'drafts' ? MOCK_DRAFT_FORMS : MOCK_PUBLISHED_FORMS);
  
  useEffect(() => {
    setForms(mode === 'drafts' ? MOCK_DRAFT_FORMS : MOCK_PUBLISHED_FORMS);
  }, [mode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormToFill, setSelectedFormToFill] = useState(null);
  const [formToDelete, setFormToDelete] = useState(null);

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
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6">
      
      {/* Header & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <FileText className="h-6 w-6 text-blue-600" />
            <span>{mode === 'drafts' ? 'Saved Drafts' : 'Form Directory'}</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'drafts' 
              ? 'Pick up where you left off. Continue designing your saved form drafts.' 
              : 'Manage your published forms, track submissions, and create new templates.'}
          </p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search forms by title or org..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
            />
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 min-w-[100px] text-center hidden md:block">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total</span>
            <span className="text-xl font-black text-blue-800">{filteredForms.length}</span>
          </div>
        </div>
      </div>

      {/* Forms Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-2">
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
                    mode === 'drafts' 
                      ? 'bg-slate-100 text-slate-600 border border-slate-300'
                      : isOverdue 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : form.status === 'Inactive'
                          ? 'bg-slate-100 text-slate-500 border border-slate-300'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {form.status}
                  </span>

                  {mode !== 'drafts' && (
                    <span className="text-[11px] font-bold text-slate-400 flex items-center space-x-1">
                      <Table className="h-3.5 w-3.5 text-blue-500" />
                      <span>{form.submissionsCount} Submissions</span>
                    </span>
                  )}
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
              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100 flex-wrap">
                {mode === 'drafts' ? (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (onEditForm) onEditForm(form); 
                    }}
                    className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer min-w-[max-content]"
                    title="Continue Editing"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    <span>Continue Editing</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (onViewSubmissions) {
                          onViewSubmissions(form);
                        }
                      }}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl transition cursor-pointer min-w-[max-content]"
                      title="View Submissions"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Submissions</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleCloneForm(form); }}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer min-w-[max-content]"
                      title="Clone Form"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Clone</span>
                    </button>

                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        if (onEditForm) {
                          onEditForm(form);
                        }
                      }}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition cursor-pointer min-w-[max-content]"
                      title="Edit Form"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(form.id); }}
                      className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 font-bold text-xs rounded-xl transition cursor-pointer min-w-[max-content] ${
                        form.status === 'Active' 
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                      }`}
                      title="Toggle Status"
                    >
                      <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        form.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}>
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm ${
                          form.status === 'Active' ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`} />
                      </div>
                      <span>{form.status === 'Active' ? 'ON' : 'OFF'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={(e) => { e.stopPropagation(); setFormToDelete(form); }}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                  title="Delete Form"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
        
        {filteredForms.length === 0 && (
          <div className="col-span-full py-8 text-center text-sm text-slate-500 font-medium">
            No published forms found matching your search.
          </div>
        )}
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
      <ConfirmOverlay
        isOpen={!!formToDelete}
        title="Delete Form"
        description={
          <>
            Are you sure you want to delete <strong>{formToDelete?.formName}</strong>? This action cannot be undone and will remove all associated submissions.
          </>
        }
        confirmText="Confirm Delete"
        icon={Trash2}
        onCancel={() => setFormToDelete(null)}
        onConfirm={confirmDelete}
      />

    </div>
  );
}
