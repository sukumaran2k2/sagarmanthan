import { useCallback, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import UploadPage from './pages/UploadPage';
import FilesPage from './pages/FilesPage';
import DataListPage from './pages/DataListPage';
import ReportPage from './pages/ReportPage';
import { useNotifier } from '../../utils/notify';
import { getModuleCrud } from '../../utils/modulePermissions';
import { useEOfficeStore } from './store/useEOfficeStore';
import { CATEGORIES, CATEGORY_LIST } from './utils/eOfficeUtils';

const BASE = '/governance/e-office';
// Older links used ?kpi=<category>&subtab=upload|files|data|report
const LEGACY_SUBTABS = { upload: 'upload', files: 'files', data: 'data-list', report: 'report' };

// URL: /governance/e-office/<category>/<tab>
export default function EOfficeView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const crud = getModuleCrud('E_OFFICE');
  const canUpload = crud.create || crud.update;

  const setFilters = useEOfficeStore((state) => state.setFilters);
  const setReportPeriod = useEOfficeStore((state) => state.setReportPeriod);

  // Bumped after an upload or delete so the pages refetch
  const [reloadKey, setReloadKey] = useState(0);

  const tabs = useMemo(() => [
    ...(canUpload ? [{ id: 'upload', label: 'Upload File' }] : []),
    { id: 'files', label: 'View Files' },
    { id: 'data-list', label: 'Data List' },
    { id: 'report', label: 'Report' },
  ], [canUpload]);

  const [categoryId, tabId] = location.pathname.slice(BASE.length).split('/').filter(Boolean);
  const category = CATEGORIES[categoryId];
  const tab = tabs.find((t) => t.id === tabId)?.id;

  // After an upload: show that week's rows, and have the report open on it
  const handleUploaded = useCallback((period) => {
    setReloadKey((k) => k + 1);
    setFilters(category.id, { month: period.month, year: period.year, week: String(period.week) });
    setReportPeriod(category.id, period);
    navigate(`${BASE}/${category.id}/data-list`, { replace: true });
  }, [category, navigate, setFilters, setReportPeriod]);

  if (!category || !tab) {
    const params = new URLSearchParams(location.search);
    const fixedCategory = category?.id || CATEGORIES[params.get('kpi')]?.id || 'file-pendency';
    const legacyTab = LEGACY_SUBTABS[params.get('subtab')];
    const fixedTab = tabs.some((t) => t.id === legacyTab) ? legacyTab : tabs[0].id;
    return <Navigate to={`${BASE}/${fixedCategory}/${fixedTab}`} replace />;
  }

  const pageProps = { category, notify, reloadKey };

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">E-Office Management</h1>
          <p className="module-header-subtitle">Track file pendency, receipt pendency and file disposal across all wings.</p>
        </div>
        <InternalNavigation tabs={tabs} currentTab={tab} onTabChange={(id) => navigate(`${BASE}/${category.id}/${id}`)} />
      </div>

      <div className="module-subtabs-strip" role="tablist" aria-label="E-Office sheets">
        {CATEGORY_LIST.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === category.id}
            onClick={() => navigate(`${BASE}/${c.id}/${tab}`)}
            className={`module-subtab-btn ${c.id === category.id ? 'active' : ''}`}
          >
            {c.label.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === 'upload' && <UploadPage key={category.id} category={category} notify={notify} onUploaded={handleUploaded} />}
      {tab === 'files' && <FilesPage {...pageProps} canDelete={crud.delete} onDeleted={() => setReloadKey((k) => k + 1)} />}
      {tab === 'data-list' && <DataListPage {...pageProps} />}
      {tab === 'report' && <ReportPage category={category} notify={notify} />}
    </div>
  );
}
