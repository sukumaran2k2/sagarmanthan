import { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';

import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useParliamentaryPermissions } from './hooks/useParliamentaryPermissions';
import { useParliamentaryStore } from './store/useParliamentaryStore';
import { PARLIAMENTARY_LIST_VIEWS, listViewKey } from './views';
import Dashboard from './pages/Dashboard';
import ParliamentaryIssuesReports from './pages/Reports';
import IssueForm from './pages/IssueForm';
import { issueTypesFromStages } from './utils/stageHelpers';
import { useNotifier } from '../../utils/notify';

const BASE = '/governance/parliamentary-issues';

export default function ParliamentaryIssues({
  onGoHome,
  triggerNotification,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useParliamentaryPermissions();
  const { canAdd, canEdit, canView } = permissions;

  // Reference data from the store (one selector per field, so list changes don't re-render the shell)
  const wings = useParliamentaryStore((state) => state.wings);
  const divisions = useParliamentaryStore((state) => state.divisions);
  const stages = useParliamentaryStore((state) => state.stages);
  const loadLookups = useParliamentaryStore((state) => state.loadLookups);
  const issueTypeOptions = useMemo(() => issueTypesFromStages(stages), [stages]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  // The issue being edited (or viewed) travels with the route entry, so it is gone as soon
  // as the form is opened any other way (tab, sidebar, new session)
  const editData = location.state?.item ?? null;
  // Opening an issue needs edit rights, or view rights for a read-only form; a new issue needs add rights
  const formAllowed = editData ? (canEdit || canView) : canAdd;

  const tabs = useMemo(() => {
    const items = [{ id: 'dashboard', label: 'Dashboard' }];
    if (canAdd) items.push({ id: 'input-form', label: 'Input Form' });
    items.push(
      { id: 'data-list', label: 'Data List' },
      { id: 'reports', label: 'Report' }
    );
    return items;
  }, [canAdd]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/dashboard')) return 'dashboard';
    if (path.includes('/input-form') || path.includes('/add')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    if (path.includes('/data-list') || path.includes('/list')) return 'data-list';
    return 'dashboard';
  }, [location.pathname]);

  const handleEdit = useCallback((form) => {
    navigate(`${BASE}/input-form`, { state: { item: form } });
  }, [navigate]);

  const handleBack = useCallback(() => navigate(`${BASE}/data-list`), [navigate]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    navigate(`${BASE}/data-list`, { replace: true });
  }, [navigate]);

  if (!canView) {
    return (
      <RestrictedAccess
        moduleName="Parliamentary Issues"
        onGoHome={onGoHome}
      />
    );
  }

  const ListView = PARLIAMENTARY_LIST_VIEWS[listViewKey(permissions.uiViewCode)];

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">Parliamentary Issues</h1>
          <p className="module-header-subtitle">
            Manage and track Parliamentary Assurances, Matters Raised, and PSC Reports.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => navigate(`${BASE}/${tabId}`)}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="data-list" element={
            <ListView notify={notify} onEdit={handleEdit} onGoHome={onGoHome} />
          } />

          <Route path="input-form" element={formAllowed ? (
            <IssueForm
              key={editData?.parliamentaryIssueID ?? 'new'}
              wings={wings}
              divisions={divisions}
              stages={stages}
              issueTypeOptions={issueTypeOptions}
              initialForm={editData}
              readOnly={!!editData && !canEdit}
              onBack={handleBack}
              onSuccess={handleSuccess}
              notify={notify}
            />
          ) : <Navigate to={`${BASE}/data-list`} replace />} />

          <Route path="reports" element={<ParliamentaryIssuesReports notify={notify} triggerNotification={triggerNotification} />} />

          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="*" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </div>
    </div>
  );
}
