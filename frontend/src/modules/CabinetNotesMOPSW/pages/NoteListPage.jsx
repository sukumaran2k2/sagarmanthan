import { useCallback, useEffect, useState } from 'react';
import { X, FileText, Download } from 'lucide-react';
import RestrictedAccess from '../../../components/RestrictedAccess';
import NoteListTable from '../components/NoteListTable';
import NoteForm from './NoteForm';
import {
  deleteCabinetNote,
  downloadNoteDocument,
  fetchCabinetNoteById,
  fetchCabinetNotes,
  fetchCabinetStages,
  fetchDivisions,
  fetchNoteDocuments,
  fetchWings,
} from '../api';
import { mapNoteListRow, mapNoteToForm } from '../utils/mapNote';
import { useCabinetNotesPermissions } from '../hooks/useCabinetNotesPermissions';
import { statusNamesFromStages } from '../utils/stageHelpers';
import { getCurrentUserId } from '../../../utils/authSession';

const DEFAULT_FILTERS = {
  wingId: 'All',
  divisionId: 'All',
  status: 'All',
  search: '',
};

export default function NoteListPage({ notify, onGoHome }) {
  const permissions = useCabinetNotesPermissions();
  const [rows, setRows] = useState([]);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [stages, setStages] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [mode, setMode] = useState('list');
  const [formData, setFormData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [docsTarget, setDocsTarget] = useState(null);
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  const loadList = useCallback(async () => {
    if (!permissions.canView) return;
    setLoading(true);
    try {
      const res = await fetchCabinetNotes();
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data.map(mapNoteListRow));
    } catch (err) {
      console.error(err);
      notify?.(err?.response?.data?.message || 'Failed to load cabinet notes.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [permissions.canView, notify]);

  useEffect(() => {
    Promise.all([fetchWings(), fetchDivisions(), fetchCabinetStages()])
      .then(([wingsRes, divisionsRes, stagesRes]) => {
        setWings(Array.isArray(wingsRes.data) ? wingsRes.data : []);
        setDivisions(Array.isArray(divisionsRes.data) ? divisionsRes.data : []);
        const stageRows = Array.isArray(stagesRes.data) ? stagesRes.data : [];
        setStages(stageRows);
        setStatusOptions(statusNamesFromStages(stageRows));
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleAdd = () => {
    if (!permissions.canAdd) return;
    setFormData(null);
    setMode('form');
  };

  const handleEdit = async (row) => {
    if (!permissions.canEdit && !permissions.canView) return;
    try {
      const res = await fetchCabinetNoteById(row.id);
      const record = Array.isArray(res.data) ? res.data[0] : res.data;
      setFormData(mapNoteToForm(record));
      setMode('form');
    } catch (err) {
      console.error(err);
      notify?.('Failed to load cabinet note for edit.', 'error');
    }
  };

  const handleDelete = (row) => {
    if (!permissions.canRemove) return;
    setDeleteTarget(row);
  };

  const closeDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !permissions.canRemove) return;
    setDeleting(true);
    try {
      await deleteCabinetNote(deleteTarget.id, getCurrentUserId());
      notify?.('Cabinet note deleted successfully.', 'success');
      setDeleteTarget(null);
      loadList();
    } catch (err) {
      console.error(err);
      notify?.(err?.response?.data?.message || 'Failed to delete cabinet note.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDocs = async (row) => {
    setDocsTarget(row);
    setLoadingDocs(true);
    try {
      const res = await fetchNoteDocuments(row.id);
      setDocs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error(err);
      setDocs([]);
      notify?.('Failed to load documents.', 'error');
    } finally {
      setLoadingDocs(false);
    }
  };

  if (!permissions.canView) {
    return (
      <RestrictedAccess moduleName="Cabinet Notes - MoPSW" onGoHome={onGoHome} />
    );
  }

  if (mode === 'form') {
    return (
      <NoteForm
        wings={wings}
        divisions={divisions}
        stages={stages}
        initialForm={formData}
        readOnly={!permissions.canEdit && !!formData}
        onBack={() => {
          setMode('list');
          setFormData(null);
        }}
        onSuccess={() => {
          setMode('list');
          setFormData(null);
          loadList();
        }}
        notify={notify}
      />
    );
  }

  return (
    <>
      <NoteListTable
        rows={rows}
        loading={loading}
        wings={wings}
        divisions={divisions}
        statusOptions={statusOptions}
        canEdit={permissions.canEdit}
        canDelete={permissions.canRemove}
        canCreate={permissions.canAdd}
        filters={filters}
        onFiltersChange={setFilters}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onDocs={handleDocs}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-700 text-white">
              <h3 className="text-sm font-black uppercase tracking-wider">
                Delete Cabinet Note
              </h3>
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="text-rose-200 hover:text-white transition disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to delete this cabinet note?
              </p>
              {deleteTarget.subject ? (
                <p className="text-sm font-semibold text-slate-900">{deleteTarget.subject}</p>
              ) : null}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleting}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {docsTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-[#0f417a] text-white">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Documents</h3>
                <p className="text-[10px] text-blue-200 font-semibold mt-0.5 truncate max-w-[320px]">
                  {docsTarget.subject}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDocsTarget(null);
                  setDocs([]);
                }}
                className="text-blue-200 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-3 max-h-80 overflow-y-auto">
              {loadingDocs ? (
                <p className="text-xs font-semibold text-slate-500">Loading files…</p>
              ) : docs.length === 0 ? (
                <div className="text-center py-6 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl">
                  No files uploaded yet.
                </div>
              ) : (
                <ul className="space-y-2">
                  {docs.map((doc) => (
                    <li
                      key={doc.cabinet_notes_mopsw_document || doc.id}
                      className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-[#0f417a] shrink-0" />
                        <p
                          className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
                          title={doc.cabinet_notes_mopsw_document}
                        >
                          {doc.cabinet_notes_mopsw_document}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          downloadNoteDocument(
                            docsTarget.id,
                            doc.cabinet_notes_mopsw_document
                          ).catch(() => notify?.('Download failed.', 'error'))
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#0f417a] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition cursor-pointer bg-transparent border border-blue-100 dark:border-blue-900 shrink-0"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
