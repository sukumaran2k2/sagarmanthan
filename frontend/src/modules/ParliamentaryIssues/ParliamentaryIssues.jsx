import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import Notification from '../../components/Notification';
import { useParliamentaryPermissions } from './hooks/useParliamentaryPermissions';
import { resolveParliamentaryListView } from './views';
import ParliamentaryIssuesReports from './pages/Reports';
import IssueForm from './pages/IssueForm';
import {
  fetchDivisions,
  fetchParliamentaryStages,
  fetchWings,
} from './api';
import { issueTypesFromStages } from './utils/stageHelpers';

export default function ParliamentaryIssues({
  onGoHome,
  triggerNotification,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useParliamentaryPermissions();

  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [stages, setStages] = useState([]);
  const [issueTypeOptions, setIssueTypeOptions] = useState([]);
  const [listKey, setListKey] = useState(0);
  const [toast, setToast] = useState(null);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof triggerNotification === 'function') {
        triggerNotification(message, type);
        return;
      }
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [triggerNotification]
  );

  useEffect(() => {
    Promise.all([fetchWings(), fetchDivisions(), fetchParliamentaryStages()])
      .then(([wingsRes, divisionsRes, stagesRes]) => {
        setWings(Array.isArray(wingsRes.data) ? wingsRes.data : []);
        setDivisions(Array.isArray(divisionsRes.data) ? divisionsRes.data : []);
        const stageRows = Array.isArray(stagesRes.data) ? stagesRes.data : [];
        setStages(stageRows);
        setIssueTypeOptions(issueTypesFromStages(stageRows));
      })
      .catch((err) => console.error(err));
  }, []);

  const tabs = useMemo(() => {
    const items = [];
    if (permissions.canAdd) {
      items.push({ id: 'input-form', label: 'Input Form' });
    }
    items.push(
      { id: 'data-list', label: 'Data List' },
      { id: 'reports', label: 'Report' }
    );
    return items;
  }, [permissions.canAdd]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form') || path.includes('/add')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    return 'data-list';
  }, [location.pathname]);

  const ListView = useMemo(
    () => resolveParliamentaryListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="Parliamentary Issues"
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100 relative">
      <Notification message={toast} onDismiss={() => setToast(null)} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-300 tracking-wide uppercase font-display">
            Parliamentary Issues
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage and track Parliamentary Assurances, Matters Raised, and PSC Reports.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId === 'input-form') navigate('/governance/parliamentary-issues/input-form');
            else if (tabId === 'reports') navigate('/governance/parliamentary-issues/reports');
            else navigate('/governance/parliamentary-issues/data-list');
          }}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="data-list" element={
            <ListView key={listKey} notify={notify} onGoHome={onGoHome} />
          } />

          {permissions.canAdd && (
            <Route path="input-form" element={
              <IssueForm
                wings={wings}
                divisions={divisions}
                stages={stages}
                issueTypeOptions={issueTypeOptions}
                initialForm={null}
                onBack={() => navigate('/governance/parliamentary-issues/data-list')}
                onSuccess={() => {
                  setListKey((k) => k + 1);
                  navigate('/governance/parliamentary-issues/data-list');
                }}
                notify={notify}
              />
            } />
          )}

          <Route path="reports" element={<ParliamentaryIssuesReports notify={notify} />} />

          <Route index element={<Navigate to="data-list" replace />} />
          <Route path="*" element={<Navigate to="data-list" replace />} />
        </Routes>
      </div>
    </div>
  );
}
