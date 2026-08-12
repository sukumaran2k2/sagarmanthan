import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import RestrictedAccess from '../../../components/RestrictedAccess';
import IssueListTable from '../components/IssueListTable';
import IssueForm from './IssueForm';
import {
  deleteParliamentaryIssue,
  fetchDivisions,
  fetchParliamentaryIssueById,
  fetchParliamentaryIssues,
  fetchParliamentaryStages,
  fetchWings,
} from '../api';
import { mapIssueListRow, mapIssueToForm } from '../utils/mapIssue';
import { useParliamentaryPermissions } from '../hooks/useParliamentaryPermissions';
import {
  issueTypesFromStages,
  statusNamesFromStages,
} from '../utils/stageHelpers';
import { getCurrentUserId } from '../../../utils/authSession';

const DEFAULT_FILTERS = {
  wingId: 'All',
  divisionId: 'All',
  issueType: 'All',
  status: 'All',
  search: '',
};

export default function IssueListPage({
  notify,
  onGoHome,
}) {
  const permissions = useParliamentaryPermissions();
  const [rows, setRows] = useState([]);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [stages, setStages] = useState([]);
  const [issueTypeOptions, setIssueTypeOptions] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [mode, setMode] = useState('list');
  const [formData, setFormData] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadList = useCallback(async () => {
    if (!permissions.canView) return;
    setLoading(true);
    try {
      const res = await fetchParliamentaryIssues();
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data.map(mapIssueListRow));
    } catch (err) {
      console.error(err);
      notify?.(err?.response?.data?.message || 'Failed to load parliamentary issues.', 'error');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [permissions.canView, notify]);

  useEffect(() => {
    Promise.all([fetchWings(), fetchDivisions(), fetchParliamentaryStages()])
      .then(([wingsRes, divisionsRes, stagesRes]) => {
        setWings(Array.isArray(wingsRes.data) ? wingsRes.data : []);
        setDivisions(Array.isArray(divisionsRes.data) ? divisionsRes.data : []);
        const stageRows = Array.isArray(stagesRes.data) ? stagesRes.data : [];
        setStages(stageRows);
        setIssueTypeOptions(issueTypesFromStages(stageRows));
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
      const res = await fetchParliamentaryIssueById(row.id);
      const record = Array.isArray(res.data) ? res.data[0] : res.data;
      setFormData(mapIssueToForm(record));
      setMode('form');
    } catch (err) {
      console.error(err);
      notify?.('Failed to load issue for edit.', 'error');
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
      await deleteParliamentaryIssue(deleteTarget.id, getCurrentUserId());
      notify?.('Parliamentary issue deleted successfully.', 'success');
      setDeleteTarget(null);
      loadList();
    } catch (err) {
      console.error(err);
      notify?.(err?.response?.data?.message || 'Failed to delete issue.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="Parliamentary Issues"
        onGoHome={onGoHome}
      />
    );
  }

  if (mode === 'form') {
    return (
      <IssueForm
        wings={wings}
        divisions={divisions}
        stages={stages}
        issueTypeOptions={issueTypeOptions}
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
      <IssueListTable
        rows={rows}
        loading={loading}
        wings={wings}
        divisions={divisions}
        issueTypeOptions={issueTypeOptions}
        statusOptions={statusOptions}
        canEdit={permissions.canEdit}
        canDelete={permissions.canRemove}
        canCreate={permissions.canAdd}
        filters={filters}
        onFiltersChange={setFilters}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={handleAdd}
      />

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-700 text-white">
              <h3 className="text-sm font-black uppercase tracking-wider">
                Delete Parliamentary Issue
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
                Are you sure you want to delete this parliamentary issue?
              </p>
              {deleteTarget.subject ? (
                <p className="text-sm font-semibold text-slate-900">
                  {deleteTarget.subject}
                </p>
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
    </>
  );
}
