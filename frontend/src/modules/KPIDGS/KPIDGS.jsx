import { useMemo } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Anchor, FileEdit, FilePieChart, ClipboardList } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useKPIDGSPermissions } from './hooks/useKPIDGSPermissions';
import MMDMaster from './pages/MMDMaster';
import InputFormIndex from './pages/InputFormIndex';
import DataListIndex from './pages/DataListIndex';
import ReportsIndex from './pages/ReportsIndex';

// Top-level KPI - DGS page. Three top tabs (MMD Master / Input Form / Reports) map to
// /kpi/dgs/mmd-master, /kpi/dgs/input-forms, /kpi/dgs/reports, with the two index pages
// drilling into independent leaf routes.
export default function KPIDGSView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canView, canAdd } = useKPIDGSPermissions();

  const currentTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/input-forms')) return 'input-forms';
    if (p.includes('/data-list')) return 'data-list';
    if (p.includes('/reports')) return 'reports';
    return 'mmd-master';
  }, [location.pathname]);

  const tabs = [
    { id: 'mmd-master', label: 'MMD Master', icon: Anchor },
    { id: 'input-forms', label: 'Input Form', icon: FileEdit },
    { id: 'data-list', label: 'Data List', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FilePieChart },
  ];

  const handleTabChange = (id) => navigate(`/kpi/dgs/${id}`);

  if (!canView && !canAdd) {
    return <RestrictedAccess moduleName="KPI - DGS" />;
  }

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">KPI - DGS</h1>
          <p className="module-header-subtitle">
            Directorate General of Shipping — MMD master data, input forms and output reports.
          </p>
        </div>
        <InternalNavigation tabs={tabs} currentTab={currentTab} onTabChange={handleTabChange} />
      </div>

      <Routes>
        <Route index element={<Navigate to="mmd-master" replace />} />
        <Route path="mmd-master" element={<MMDMaster triggerNotification={triggerNotification} />} />
        {/* The index pages render a split-pane (list on left, selected leaf on right)
            and read the slug from the URL, so both /input-forms and /input-forms/:slug
            land on the same component. Wildcards keep the match for either shape. */}
        <Route path="input-forms/*" element={<InputFormIndex triggerNotification={triggerNotification} />} />
        <Route path="data-list/*" element={<DataListIndex triggerNotification={triggerNotification} />} />
        <Route path="reports/*" element={<ReportsIndex triggerNotification={triggerNotification} />} />
        <Route path="*" element={<Navigate to="mmd-master" replace />} />
      </Routes>
    </div>
  );
}
