import React, { useState, useEffect } from 'react';
import { 
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
import Table from '../../../components/Table';
import FormPreviewModal from './FormPreviewModal';
import api from '../api';

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

// Turns a failed request into a message the user can act on.
const loadErrorMessage = (err, what) => (
  err.response?.status === 401
    ? 'Your session has expired. Please log out and log in again.'
    : err.response?.data?.message || `Could not load ${what} from the server.`
);

export default function InboxForms({ triggerNotification, onBackToDirectory }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormToFill, setSelectedFormToFill] = useState(null);
  const [inboxForms, setInboxForms] = useState(MOCK_INBOX);
  const [loadError, setLoadError] = useState(null);

  // Same rule as Form Directory: mock list only when the request succeeds with
  // nothing assigned; a failed request shows an error instead.
  const loadInbox = () => {
    setLoadError(null);
    api.get('/get-inbox-forms')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setInboxForms(res.data);
        } else {
          setInboxForms(MOCK_INBOX);
        }
      })
      .catch((err) => {
        console.error('Error loading inbox forms:', err);
        setInboxForms([]);
        setLoadError(loadErrorMessage(err, 'your inbox'));
      });
  };

  useEffect(() => {
    loadInbox();
  }, []);

  // Real (numeric-id) forms save through the API; mock forms stay preview-only.
  const isRealForm = (form) => /^\d+$/.test(String(form?.id));

  // Opens the fill form; for a saved draft or submitted response, loads the earlier
  // answers first so saving again doesn't overwrite them with blanks.
  const openForm = async (form) => {
    if (!isRealForm(form) || form.status === 'Pending') {
      setSelectedFormToFill(form);
      return;
    }
    try {
      const res = await api.get(`/get-my-form-response/${form.id}`);
      setSelectedFormToFill({ ...form, initialValues: res.data.values || {} });
    } catch (err) {
      console.error('Error loading saved response:', err);
      triggerNotification && triggerNotification(err.response?.data?.message || 'Could not load your saved answers', 'error');
    }
  };

  const submitResponse = async (form, action, values) => {
    // Newly chosen files go as multipart, keyed by field id; a saved file ({ fileName })
    // is left out so the server keeps it.
    const files = Object.entries(values).filter(([, v]) => v instanceof File);
    const plainValues = Object.fromEntries(
      Object.entries(values).filter(([, v]) => !(v instanceof File) && !(v && typeof v === 'object' && 'fileName' in v))
    );
    let body = { formId: form.id, action, values: plainValues };
    if (files.length) {
      body = new FormData();
      body.append('formId', String(form.id));
      body.append('action', action);
      body.append('values', JSON.stringify(plainValues));
      files.forEach(([fieldId, file]) => body.append(fieldId, file, file.name));
    }
    const res = await api.post('/submit-form-data', body);
    setInboxForms(prev => prev.map(f => (f.id === form.id ? { ...f, status: res.data.status } : f)));
    triggerNotification && triggerNotification(res.data.message, 'success');
    return res.data.message;
  };

  const filtered = inboxForms.filter(s => 
    (s.formName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.assignedBy || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = inboxForms.filter(s => s.status !== 'Submitted').length;

  const columnDefs = [
    {
      headerName: 'Form Details',
      flex: 2.5,
      autoHeight: true,
      cellRenderer: (params) => (
        <div className="py-1.5 leading-tight">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
              {params.data.id}
            </span>
          </div>
          <div className="text-[11px] font-bold text-slate-900 mb-0.5 whitespace-normal">{params.data.formName}</div>
          <div className="text-[10px] text-slate-500 whitespace-normal">{params.data.formDescription}</div>
        </div>
      )
    },
    {
      field: 'assignedBy',
      headerName: 'Assigned By',
      flex: 2,
      cellRenderer: (params) => (
        <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-700 h-full">
          <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate whitespace-normal">{params.value}</span>
        </div>
      )
    },
    {
      field: 'dueDate',
      headerName: 'Due Date',
      cellRenderer: (params) => (
        <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-700 h-full">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{params.value}</span>
        </div>
      )
    },
    {
      field: 'status',
      headerName: 'Status',
      cellRenderer: (params) => {
        const isSubmitted = params.value === 'Submitted';
        const isPending = params.value === 'Pending';
        return (
          <div className="flex items-center justify-center h-full">
            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
              isSubmitted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 
              isPending ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {params.value}
            </span>
          </div>
        );
      }
    },
    {
      headerName: 'Action',
      type: 'rightAligned',
      cellRenderer: (params) => {
        const isSubmitted = params.data.status === 'Submitted';
        return (
          <div className="flex items-center justify-end h-full">
            <button
              onClick={() => openForm(params.data)}
              className={`inline-flex items-center space-x-1 px-3 py-1.5 font-bold text-[11px] rounded-lg transition cursor-pointer ${
                isSubmitted 
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                  : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
              }`}
            >
              {isSubmitted ? <Edit className="w-3.5 h-3.5 shrink-0" /> : <Send className="w-3.5 h-3.5 shrink-0" />}
              <span className="whitespace-nowrap">{isSubmitted ? 'Edit Response' : 'Fill Form'}</span>
            </button>
          </div>
        );
      }
    }
  ];

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

      {loadError && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadInbox}
            className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 font-bold cursor-pointer transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Forms List (AG Grid Table) */}
      <div className="w-full">
        <Table 
          rowData={filtered} 
          columnDefs={columnDefs} 
          pagination={true}
          paginationPageSize={10}
          enableExport={false}
          domLayout="autoHeight"
          color="#0f417a"
          rowHeight={34}
        />
      </div>

      {/* Fill Form Modal */}
      {selectedFormToFill && (
        <FormPreviewModal
          formName={selectedFormToFill.formName}
          formDescription={selectedFormToFill.formDescription}
          fields={selectedFormToFill.fields}
          initialValues={selectedFormToFill.initialValues}
          onClose={() => setSelectedFormToFill(null)}
          onSubmitResponse={isRealForm(selectedFormToFill)
            ? (action, values) => submitResponse(selectedFormToFill, action, values)
            : undefined}
        />
      )}
    </div>
  );
}

