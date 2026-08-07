import { useCallback, useEffect, useState } from 'react';
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

  const handleDelete = async (row) => {
    if (!permissions.canRemove) return;
    const ok = window.confirm('Delete this parliamentary issue?');
    if (!ok) return;
    try {
      await deleteParliamentaryIssue(row.id, getCurrentUserId());
      notify?.('Parliamentary issue deleted successfully.', 'success');
      loadList();
    } catch (err) {
      console.error(err);
      notify?.(err?.response?.data?.message || 'Failed to delete issue.', 'error');
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
  );
}
