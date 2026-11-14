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

// Turns a failed request into a message the user can act on.
const loadErrorMessage = (err, what) => (
  err.response?.status === 401
    ? 'Your session has expired. Please log out and log in again.'
    : err.response?.data?.message || `Could not load ${what} from the server.`
);

export default function FormDirectory({ triggerNotification, onViewSubmissions, onEditForm, mode = 'published' }) {
  // null until the server answers, so nothing (and no sample data) shows before that
  const [forms, setForms] = useState(null);

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

  // A failed request shows an error, never sample data that could pass for real forms.
  const loadForms = (p = page, q = debouncedSearch) => {
    setLoadError(null);
    api.get('/get-created-form-data', { params: { page: p, limit: PAGE_SIZE, search: q } })
      .then(res => {
        const { data = [], pagination: pg } = res.data || {};
        // Past the last page (e.g. after deleting its last card): step back to the last one.
        if (data.length === 0 && p > 1 && pg?.totalPages) {
          setPage(Math.min(p - 1, pg.totalPages));
          return;
        }
        setForms(data);
        setPagination(pg || null);
        setActiveCount(res.data?.counts?.active ?? 0);
      })
      .catch((err) => {
        console.error('Error loading forms:', err);
        setForms([]);
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

  // Cloned on the server, then the list is reloaded so the new card comes back in the server's shape.
  const handleCloneForm = async (form) => {
    try {
      const res = await api.post(`/clone-form/${form.id}`);
      triggerNotification && triggerNotification(res.data.message, 'success');
      loadForms();
    } catch (err) {
      console.error('Error cloning form:', err);
      triggerNotification && triggerNotification(err.response?.data?.message || `Could not clone "${form.formName}"`, 'error');
    }
  };

  const confirmDelete = async () => {
    if (!formToDelete) return;
    const target = formToDelete;
    setFormToDelete(null);
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
  };

  // Real forms send isActive (the switch) separately from status (the badge), so a
  // form switched ON past its due date shows ON with an OVERDUE badge.
  const isSwitchOn = (form) => (typeof form.isActive === 'boolean' ? form.isActive : form.status === 'Active');

  const handleToggleStatus = async (form) => {
    try {
      const res = await api.post(`/toggle-form-status/${form.id}`, { active: !isSwitchOn(form) });
      setForms(prev => prev.map(f => (f.id === form.id ? { ...f, status: res.data.status, isActive: res.data.isActive } : f)));
      // The Active box counts ACTIVE badges (switched on and not past due); keep it in step.
      const wasActive = form.status === 'Active', nowActive = res.data.status === 'Active';
      if (wasActive !== nowActive) setActiveCount(c => c + (nowActive ? 1 : -1));
      triggerNotification && triggerNotification(res.data.message, res.data.status === 'Overdue' ? 'warning' : 'success');
    } catch (err) {
      console.error('Error changing form status:', err);
      triggerNotification && triggerNotification(err.response?.data?.message || 'Could not change the form status', 'error');
    }
  };

  // Overview of every form (not just this page; honours the search) as an Excel file.
  const EXPORT_HEADERS = ['S.No', 'Form Number', 'Form Name', 'Form Description', 'Created By', 'Created On', 'Organisations / Wings', 'Due Date', 'Submissions', 'Form Status'];
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
      f.dueDate || 'No due date',
      f.submissionsCount ?? 0,
      f.status,
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
    ws['!cols'] = [{ wch: 8 }, { wch: 12 }, { wch: 40 }, { wch: 50 }, { wch: 24 }, { wch: 18 }, { wch: 60 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Forms');
    XLSX.writeFile(wb, `Form_Directory_${todayIST()}.xlsx`);
    triggerNotification && triggerNotification(`Exported ${rows.length} forms to Excel`, 'success');
  });

  // Forms arrive already searched and paged by the server.
  const filteredForms = forms || [];

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
            {/* Forms with the ACTIVE badge (switched on, not past due), across all pages; follows the search. */}
            <span className="text-xl font-black text-blue-800">{forms ? activeCount : '…'}</span>
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
      {forms && forms.length > 0 && (
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
                    <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate" title={form.assignedTo || ''}>{form.assignedTo || 'Not assigned'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{form.dueDate ? `Due: ${form.dueDate}` : 'No due date'}</span>
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
        
        {forms && forms.length === 0 && !loadError && (
          <div className="col-span-full py-8 text-center text-sm text-slate-500 font-medium">
            {debouncedSearch ? 'No forms match your search.' : 'No forms yet.'}
          </div>
        )}
        {!forms && !loadError && (
          <div className="col-span-full py-8 text-center text-sm text-slate-400 font-medium">Loading forms…</div>
        )}
      </div>

      {pagination?.totalPages > 1 && (
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
