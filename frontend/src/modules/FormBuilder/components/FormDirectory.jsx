import React, { useState, useEffect } from 'react';
import api from '../api';
import { useFormBuilderPermissions } from '../hooks/useFormBuilderPermissions';
import ConfirmOverlay from '../../../components/ConfirmOverlay';
import TablePagination from '../../../components/TablePagination';
import ExportDropdown from '../../../components/ExportDropdown';
import * as XLSX from 'xlsx';
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

// Turns a failed request into a message the user can act on.
const loadErrorMessage = (err, what) => (
  err.response?.status === 401
    ? 'Your session has expired. Please log out and log in again.'
    : err.response?.data?.message || `Could not load ${what} from the server.`
);

export default function FormDirectory({ triggerNotification, onViewSubmissions, onEditForm, mode = 'published' }) {
  const [forms, setForms] = useState(mode === 'drafts' ? MOCK_DRAFT_FORMS : MOCK_PUBLISHED_FORMS);
  
  useEffect(() => {
    setForms(mode === 'drafts' ? MOCK_DRAFT_FORMS : MOCK_PUBLISHED_FORMS);
  }, [mode]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormToFill, setSelectedFormToFill] = useState(null);
  const [formToDelete, setFormToDelete] = useState(null);
  const { canAuthor } = useFormBuilderPermissions();
  const [loadError, setLoadError] = useState(null);

  // Real forms are paged and searched on the server, 9 cards (a 3 x 3 grid) per page.
  const PAGE_SIZE = 9;
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState(null);
  const [activeCount, setActiveCount] = useState(0);
  const [usingMock, setUsingMock] = useState(true);

  // Mock forms show only when the request succeeds, the DB has no forms and nothing is
  // being searched. A failed request shows an error instead, so it can't pass for real data.
  const loadForms = (p = page, q = debouncedSearch) => {
    setLoadError(null);
    api.get('/get-created-form-data', { params: { page: p, limit: PAGE_SIZE, search: q } })
      .then(res => {
        const { data = [], pagination: pg } = res.data || {};
        if (pg && pg.total === 0 && !q) {
          setForms(mode === 'drafts' ? MOCK_DRAFT_FORMS : MOCK_PUBLISHED_FORMS);
          setUsingMock(true);
          setPagination(null);
          return;
        }
        // Past the last page (e.g. after deleting its last card): step back to the last one.
        if (data.length === 0 && p > 1 && pg?.totalPages) {
          setPage(Math.min(p - 1, pg.totalPages));
          return;
        }
        setForms(data);
        setUsingMock(false);
        setPagination(pg || null);
        setActiveCount(res.data?.counts?.active ?? 0);
      })
      .catch((err) => {
        console.error('Error loading forms:', err);
        setForms([]);
        setUsingMock(false);
        setPagination(null);
        setLoadError(loadErrorMessage(err, 'forms'));
      });
  };

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(searchQuery.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    loadForms(page, debouncedSearch);
  }, [page, debouncedSearch]);

  const handleCloneForm = async (form) => {
    // Real forms are cloned on the server, then the list is reloaded so the new
    // card comes back in the server's shape.
    if (/^\d+$/.test(String(form.id))) {
      try {
        const res = await api.post(`/clone-form/${form.id}`);
        triggerNotification && triggerNotification(res.data.message, 'success');
        loadForms();
      } catch (err) {
        console.error('Error cloning form:', err);
        triggerNotification && triggerNotification(err.response?.data?.message || `Could not clone "${form.formName}"`, 'error');
      }
      return;
    }
    const clonedForm = {
      ...form,
      id: `form_${Date.now()}`,
      formName: `${form.formName} (Copy)`,
      submissionsCount: 0
    };
    setForms([clonedForm, ...forms]);
    triggerNotification && triggerNotification(`Cloned "${form.formName}" successfully!`, 'success');
  };

  const confirmDelete = async () => {
    if (!formToDelete) return;
    const target = formToDelete;
    setFormToDelete(null);
    // Mock cards (non-numeric ids) only exist on screen.
    if (/^\d+$/.test(String(target.id))) {
      try {
        await api.delete(`/delete-form-builder-data/${target.id}`);
      } catch (err) {
        console.error('Error deleting form:', err);
        triggerNotification && triggerNotification(err.response?.data?.message || `Could not delete "${target.formName}"`, 'error');
        return;
      }
      // Reload the page so it stays full (or steps back if it was the page's last card).
      loadForms();
      triggerNotification && triggerNotification(`Form "${target.formName}" deleted successfully`, 'success');
      return;
    }
    setForms(prev => prev.filter(f => f.id !== target.id));
    triggerNotification && triggerNotification(`Form "${target.formName}" deleted successfully`, 'success');
  };

  // Real forms send isActive (the switch) separately from status (the badge), so a
  // form switched ON past its due date shows ON with an OVERDUE badge.
  const isSwitchOn = (form) => (typeof form.isActive === 'boolean' ? form.isActive : form.status === 'Active');

  const handleToggleStatus = async (form) => {
    // Mock cards (non-numeric ids) only change on screen.
    if (!/^\d+$/.test(String(form.id))) {
      const newStatus = form.status === 'Active' ? 'Inactive' : 'Active';
      setForms(prev => prev.map(f => (f.id === form.id ? { ...f, status: newStatus } : f)));
      triggerNotification && triggerNotification(`Status changed to ${newStatus}`, 'success');
      return;
    }
    try {
      const res = await api.post(`/toggle-form-status/${form.id}`, { active: !isSwitchOn(form) });
      setForms(prev => prev.map(f => (f.id === form.id ? { ...f, status: res.data.status, isActive: res.data.isActive } : f)));
      // Keep the TOTAL (active forms) count in step without reloading the page.
      if (res.data.isActive !== isSwitchOn(form)) setActiveCount(c => c + (res.data.isActive ? 1 : -1));
      triggerNotification && triggerNotification(res.data.message, res.data.status === 'Overdue' ? 'warning' : 'success');
    } catch (err) {
      console.error('Error changing form status:', err);
      triggerNotification && triggerNotification(err.response?.data?.message || 'Could not change the form status', 'error');
    }
  };

  // Overview of every form (not just this page; honours the search) as an Excel file.
  const EXPORT_HEADERS = ['S.No', 'Form Number', 'Form Name', 'Form Description', 'Created By', 'Created On', 'Organisations / Wings', 'Form Status'];
  const todayIST = () => new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);

  const fetchExportRows = async () => {
    const res = await api.get('/get-created-form-data', { params: { all: true, search: debouncedSearch } });
    return (res.data?.data || []).map((f, i) => [
      i + 1,
      f.id,
      f.formName,
      f.formDescription || '',
      f.createdBy || '',
      f.createdOn || '',
      f.assignedTo || '',
      f.isActive ? 'Active' : 'Not active',
    ]);
  };

  const runExport = async (build) => {
    try {
      const rows = await fetchExportRows();
      if (rows.length === 0) {
        triggerNotification && triggerNotification('There are no forms to export', 'warning');
        return;
      }
      build(rows);
    } catch (err) {
      console.error('Directory export failed', err);
      triggerNotification && triggerNotification('Could not export the forms', 'error');
    }
  };

  const handleExportExcel = () => runExport((rows) => {
    const ws = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rows]);
    ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 40 }, { wch: 50 }, { wch: 24 }, { wch: 18 }, { wch: 60 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Forms');
    XLSX.writeFile(wb, `Form_Directory_${todayIST()}.xlsx`);
    triggerNotification && triggerNotification(`Exported ${rows.length} forms to Excel`, 'success');
  });

  // Real forms arrive already filtered and paged; mock forms are filtered here.
  const filteredForms = usingMock
    ? forms.filter(f => 
      f.formName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.organisation.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : forms;

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
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Active</span>
            {/* Active forms only (switch on), across all pages; follows the search. */}
            <span className="text-xl font-black text-blue-800">{usingMock ? filteredForms.filter(f => f.status === 'Active').length : activeCount}</span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => loadForms()}
            className="px-3 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-100 font-bold cursor-pointer transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Export: right corner, just above the cards */}
      {!usingMock && (
        <div className="flex justify-end -mt-3 mb-0">
          {/* A TOTAL-wide (100px) slot on the right, so Export is centred under TOTAL's midpoint */}
          <div className="w-[100px] flex justify-center">
            <ExportDropdown onExportExcel={handleExportExcel} showPdf={false} excelLabel="Excel" />
          </div>
        </div>
      )}

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

                    {canAuthor && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCloneForm(form); }}
                      className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-xl transition cursor-pointer min-w-[max-content]"
                      title="Clone Form"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Clone</span>
                    </button>
                    )}

                    {form.canManage !== false && (<>
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
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(form); }}
                      className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 font-bold text-xs rounded-xl transition cursor-pointer min-w-[max-content] ${
                        isSwitchOn(form) 
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                      }`}
                      title={isSwitchOn(form) ? 'Click to make this form Inactive' : 'Click to make this form Active'}
                    >
                      <div className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                        isSwitchOn(form) ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}>
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-sm ${
                          isSwitchOn(form) ? 'translate-x-3.5' : 'translate-x-0.5'
                        }`} />
                      </div>
                      <span>{isSwitchOn(form) ? 'Active' : 'Inactive'}</span>
                    </button>
                    </>)}
                  </>
                )}

                {/* Organisation users can change only forms they created (canManage from the server). */}
                {form.canManage !== false && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFormToDelete(form); }}
                  className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition cursor-pointer"
                  title="Delete Form"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                )}
              </div>
            </div>
          );
        })}
        
        {filteredForms.length === 0 && !loadError && (
          <div className="col-span-full py-8 text-center text-sm text-slate-500 font-medium">
            No published forms found matching your search.
          </div>
        )}
      </div>

      {!usingMock && pagination?.totalPages > 1 && (
        <TablePagination
          currentPage={Math.max(0, page - 1)}
          totalPages={pagination.totalPages}
          totalRows={pagination.total}
          pageSize={PAGE_SIZE}
          onPageChange={(pageIndex) => setPage(pageIndex + 1)}
          color="#0f417a"
        />
      )}

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
