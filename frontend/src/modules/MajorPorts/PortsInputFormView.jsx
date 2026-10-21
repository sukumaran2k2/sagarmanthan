import { useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import CommonTable from '../../components/CommonTable';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useMajorPortsPermissions } from './hooks/useMajorPortsPermissions';
import { MAJOR_PORTS_SECTIONS } from './constants';

import FinancialParametersSection from './pages/FinancialParameters/FinancialParametersSection';
import TrafficSection from './pages/Traffic/TrafficSection';
import CruisePassengerSection from './pages/CruisePassengerTraffic/CruisePassengerSection';
import PortPerformanceSection from './pages/PortPerformance/PortPerformanceSection';
import RenewableEnergySection from './pages/RenewableEnergy/RenewableEnergySection';

const HUB_PATH = '/kpi/major-ports/major-ports-input-form';

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
        path="cruise-passenger-traffic/*"
        element={<CruisePassengerSection triggerNotification={triggerNotification} onBackToSections={backToSections} />}
      />
      <Route
        path="renewable-energy/*"
        element={<RenewableEnergySection triggerNotification={triggerNotification} onBackToSections={backToSections} />}
      />
      <Route path="*" element={<Navigate to={HUB_PATH} replace />} />
    </Routes>
  );
}
