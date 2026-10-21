import { useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useMajorPortsPermissions } from './hooks/useMajorPortsPermissions';
import { MAJOR_PORTS_SECTIONS } from './constants';

import FinancialParametersSection from './pages/FinancialParameters/FinancialParametersSection';
import TrafficSection from './pages/Traffic/TrafficSection';
import CruisePassengerTrafficInputForm from './pages/CruisePassengerTraffic/InputForm';
import CruisePassengerTrafficDataList from './pages/CruisePassengerTraffic/DataList';
import PortPerformanceSection from './pages/PortPerformance/PortPerformanceSection';
import RenewableEnergyInputForm from './pages/RenewableEnergy/InputForm';
import RenewableEnergyDataList from './pages/RenewableEnergy/DataList';

const HUB_PATH = '/kpi/major-ports/major-ports-input-form';

// Sections that are still placeholders keep a simple Input Form / Data List switch
const PLACEHOLDER_PAGES = {
  cruisePassengerTraffic: { add: CruisePassengerTrafficInputForm, list: CruisePassengerTrafficDataList },
  renewableEnergy: { add: RenewableEnergyInputForm, list: RenewableEnergyDataList },
};

function SectionHub({ onOpen }) {
  const location = useLocation();

  // Old links used ?section=<id>&tab=add|list
  const legacySection = new URLSearchParams(location.search).get('section');
  const legacyMatch = MAJOR_PORTS_SECTIONS.find((s) => s.id === legacySection);
  const rows = useMemo(
    () => MAJOR_PORTS_SECTIONS.map((s, index) => ({ sno: index + 1, desc: s.fullLabel, slug: s.slug })),
    []
  );

  if (legacyMatch) return <Navigate to={`${HUB_PATH}/${legacyMatch.slug}`} replace />;

  const columnDefs = [
    { headerName: 'S.No.', field: 'sno', width: 100, cellClass: 'text-slate-500 font-bold' },
    {
      headerName: 'Description',
      field: 'desc',
      flex: 1,
      cellRenderer: (params) => (
        <button
          type="button"
          onClick={() => onOpen(params.data.slug)}
          className="text-left font-extrabold underline text-[#1d428a] dark:text-blue-300 hover:text-blue-700 transition-colors cursor-pointer"
        >
          {params.value}
        </button>
      ),
    },
  ];

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">KPI - Major Ports</h1>
          <p className="module-header-subtitle">Select a KPI section to open its Input Form and Data List.</p>
        </div>
      </div>
      <div className="module-card space-y-4">
        <CommonTable rowData={rows} columnDefs={columnDefs} rowHeight={46} headerHeight={38} autoSize={true} />
      </div>
    </div>
  );
}

function PlaceholderSection({ canAdd, canView, onBack }) {
  const { sectionSlug } = useParams();
  const section = MAJOR_PORTS_SECTIONS.find((s) => s.slug === sectionSlug);
  const [tab, setTab] = useState(canView ? 'list' : 'add');
  const pages = section ? PLACEHOLDER_PAGES[section.id] : null;

  if (!pages) return <Navigate to={HUB_PATH} replace />;

  const tabs = [];
  if (canAdd) tabs.push({ id: 'add', label: 'Input Form' });
  if (canView) tabs.push({ id: 'list', label: 'Data List' });
  const Page = tab === 'add' ? pages.add : pages.list;

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition cursor-pointer flex-shrink-0"
            title="Back to KPI sections"
            aria-label="Back to KPI sections"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="module-header-title">{section.fullLabel}</h1>
            <p className="module-header-subtitle">KPI data entry and list views for Major Ports.</p>
          </div>
        </div>
        {tabs.length > 0 && <InternalNavigation tabs={tabs} currentTab={tab} onTabChange={setTab} />}
      </div>
      <div className="module-card space-y-4">
        <Page onSwitchTab={setTab} />
      </div>
    </div>
  );
}

export default function PortsInputFormView({ triggerNotification }) {
  const navigate = useNavigate();
  const { canAdd, canView, canEdit } = useMajorPortsPermissions();

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - Major Ports" />;
  }

  const openSection = (slug) => navigate(`${HUB_PATH}/${slug}`);
  const backToSections = () => navigate(HUB_PATH);

  return (
    <Routes>
      <Route index element={<SectionHub onOpen={openSection} />} />
      <Route
        path="traffic/*"
        element={<TrafficSection triggerNotification={triggerNotification} onBackToSections={backToSections} />}
      />
      <Route
        path="financial-parameters/*"
        element={<FinancialParametersSection triggerNotification={triggerNotification} onBackToSections={backToSections} />}
      />
      <Route
        path="port-performance/*"
        element={<PortPerformanceSection triggerNotification={triggerNotification} onBackToSections={backToSections} />}
      />
      <Route
        path=":sectionSlug"
        element={<PlaceholderSection canAdd={canAdd} canView={canView} onBack={backToSections} />}
      />
      <Route path="*" element={<Navigate to={HUB_PATH} replace />} />
    </Routes>
  );
}
