import { useEffect, useMemo, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Anchor, FileEdit, FilePieChart, ClipboardList, Ship } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useKPIDGSPermissions } from './hooks/useKPIDGSPermissions';
import MMDShipyard from './pages/MMDShipyard';
import MMDMaster from './pages/MMDMaster';
import InputFormIndex from './pages/InputFormIndex';
import DataListIndex from './pages/DataListIndex';
import ReportsIndex from './pages/ReportsIndex';
import { INPUT_FORM_LEAVES } from './data/inputFormIndex';
import { REPORTS_LEAVES } from './data/reportsIndex';

// The leaves each section tab lists (Input Form and Data List list the same ones)
const LEAVES_BY_TAB = { 'input-forms': INPUT_FORM_LEAVES, 'data-list': INPUT_FORM_LEAVES, reports: REPORTS_LEAVES };
// "K-2.4.1" / "K-2.9.MTI" -> "K-2.4" / "K-2.9"
const sectionOf = (code) => String(code || '').split('.').slice(0, 2).join('.');
// Input Form and Data List list the same leaves, so they share what was last open
const familyOf = (tab) => (tab === 'reports' ? 'reports' : 'inputs');

// Top-level KPI - DGS page. Three top tabs (MMD Master / Input Form / Reports) map to
// /kpi/dgs/mmd-master, /kpi/dgs/input-forms, /kpi/dgs/reports, with the two index pages
// drilling into independent leaf routes.
export default function KPIDGSView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canView, canAdd } = useKPIDGSPermissions();

  const currentTab = useMemo(() => {
    const p = location.pathname;
    if (p.includes('/mmd-shipyard')) return 'mmd-shipyard';
    if (p.includes('/input-forms')) return 'input-forms';
    if (p.includes('/data-list')) return 'data-list';
    if (p.includes('/reports')) return 'reports';
    return 'mmd-master';
  }, [location.pathname]);

  const tabs = [
    { id: 'mmd-shipyard', label: 'MMD Shipyard', icon: Ship },
    { id: 'mmd-master', label: 'MMD Master', icon: Anchor },
    { id: 'input-forms', label: 'Input Form', icon: FileEdit },
    { id: 'data-list', label: 'Data List', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FilePieChart },
  ];

  // The leaf open now ({ tab, slug, section }); each tab's last leaf is remembered, so a tab
  // with no section (MMD Master) doesn't lose it and a tab reopens where it was
  const lastOpen = useRef({ current: null, byTab: {} });
  const open = useMemo(() => {
    const [, tab, slug] = location.pathname.replace(/\/$/, '').match(/\/kpi\/dgs\/([^/]+)\/?([^/]*)/) || [];
    const leaf = slug && LEAVES_BY_TAB[tab]?.find((l) => l.slug === slug);
    return leaf ? { tab, slug: leaf.slug, section: sectionOf(leaf.code) } : null;
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    lastOpen.current.current = open;
    lastOpen.current.byTab[familyOf(open.tab)] = open.slug;
  }, [open]);

  // Switching tabs keeps the open section. In the new tab: the leaf last open there if it is in
  // that section, else the same leaf (Input Form <-> Data List list the same ones), else the tab's
  // first leaf of the section (e.g. 2.4 input form -> 2.4.1 report)
  const handleTabChange = (id) => {
    const leaves = LEAVES_BY_TAB[id];
    const keep = open || lastOpen.current.current;
    const inSection = (l) => sectionOf(l.code) === keep.section;
    const leaf = leaves && keep && (
      leaves.find((l) => l.slug === lastOpen.current.byTab[familyOf(id)] && inSection(l))
      || leaves.find((l) => l.slug === keep.slug)
      || leaves.find(inSection));
    navigate(leaf ? `/kpi/dgs/${id}/${leaf.slug}` : `/kpi/dgs/${id}`);
  };

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
        <Route path="mmd-shipyard" element={<MMDShipyard triggerNotification={triggerNotification} />} />
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
