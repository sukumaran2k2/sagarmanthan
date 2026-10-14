import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import CommonTable from '../../components/CommonTable';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useMajorPortsPermissions } from './hooks/useMajorPortsPermissions';
import { MAJOR_PORTS_SECTIONS, MAJOR_PORTS_SECTION_IDS } from './constants';

import FinancialParametersInputForm from './pages/FinancialParameters/InputForm';
import FinancialParametersDataList from './pages/FinancialParameters/DataList';
import TrafficInputForm from './pages/Traffic/InputForm';
import TrafficDataList from './pages/Traffic/DataList';
import TrafficUpdateForm from './pages/Traffic/UpdateForm';
import CruisePassengerTrafficInputForm from './pages/CruisePassengerTraffic/InputForm';
import CruisePassengerTrafficDataList from './pages/CruisePassengerTraffic/DataList';
import PortPerformanceInputForm from './pages/PortPerformance/InputForm';
import PortPerformanceDataList from './pages/PortPerformance/DataList';
import RenewableEnergyInputForm from './pages/RenewableEnergy/InputForm';
import RenewableEnergyDataList from './pages/RenewableEnergy/DataList';

export default function PortsInputFormView({ triggerNotification }) {
  const permissions = useMajorPortsPermissions();
  const { canAdd, canView, canEdit } = permissions;

  const getInitialStateFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const urlSection = params.get('section');
    const urlTab = params.get('tab');
    return {
      section: MAJOR_PORTS_SECTION_IDS.includes(urlSection) ? urlSection : null,
      subTab: ['add', 'list'].includes(urlTab) ? urlTab : 'list',
    };
  };

  const [activeSection, setActiveSection] = useState(() => getInitialStateFromURL().section);
  const [activeSubTab, setActiveSubTab] = useState(() => getInitialStateFromURL().subTab);
  const [trafficEditRecord, setTrafficEditRecord] = useState(null);
  const [trafficRefreshKey, setTrafficRefreshKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (activeSection) {
      params.set('section', activeSection);
      params.set('tab', activeSubTab);
    } else {
      params.delete('section');
      params.delete('tab');
    }
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    const next = `${window.location.pathname}${newSearch}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current !== next) {
      window.history.pushState(null, '', next);
    }
  }, [activeSection, activeSubTab]);

  useEffect(() => {
    const handlePopState = () => {
      const { section, subTab } = getInitialStateFromURL();
      setActiveSection(section);
      setActiveSubTab(subTab);
      setTrafficEditRecord(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'add' && !canAdd && canView) setActiveSubTab('list');
    if (activeSubTab === 'list' && !canView && canAdd) setActiveSubTab('add');
  }, [activeSubTab, canAdd, canView]);

  useEffect(() => {
    setTrafficEditRecord(null);
  }, [activeSection, activeSubTab]);

  const currentSection = MAJOR_PORTS_SECTIONS.find((s) => s.id === activeSection);

  const formList = useMemo(
    () =>
      MAJOR_PORTS_SECTIONS.map((s, index) => ({
        sno: index + 1,
        desc: s.fullLabel,
        sectionId: s.id,
      })),
    []
  );

  const tabs = [];
  if (canAdd) tabs.push({ id: 'add', label: 'Input Form' });
  if (canView) tabs.push({ id: 'list', label: 'Data List' });

  const handleRowClick = (sectionId) => {
    setActiveSection(sectionId);
    setActiveSubTab(canView ? 'list' : 'add');
    setTrafficEditRecord(null);
  };

  const handleBackToList = () => {
    setActiveSection(null);
    setTrafficEditRecord(null);
  };

  const handleSwitchTab = (tabId) => {
    setTrafficEditRecord(null);
    setActiveSubTab(tabId);
  };

  const handleTrafficEdit = (record) => {
    if (!canEdit) return;
    setTrafficEditRecord(record);
  };

  const handleTrafficUpdateSuccess = () => {
    setTrafficEditRecord(null);
    setTrafficRefreshKey((k) => k + 1);
    setActiveSubTab('list');
  };

  const listColDefs = [
    { headerName: 'S.No.', field: 'sno', width: 100, cellClass: 'text-slate-500 font-bold' },
    {
      headerName: 'Description',
      field: 'desc',
      flex: 1,
      cellRenderer: (params) => (
        <button
          type="button"
          onClick={() => handleRowClick(params.data.sectionId)}
          className="text-left font-extrabold underline text-[#1d428a] hover:text-blue-700 transition-colors cursor-pointer"
        >
          {params.value}
        </button>
      ),
    },
  ];

  const renderSectionContent = () => {
    if (activeSection === 'financialParameters') {
      return activeSubTab === 'add' ? (
        <FinancialParametersInputForm onSwitchTab={handleSwitchTab} />
      ) : (
        <FinancialParametersDataList onSwitchTab={handleSwitchTab} />
      );
    }

    if (activeSection === 'traffic') {
      if (trafficEditRecord) {
        return (
          <TrafficUpdateForm
            record={trafficEditRecord}
            onBack={() => setTrafficEditRecord(null)}
            onSuccess={handleTrafficUpdateSuccess}
            triggerNotification={triggerNotification}
          />
        );
      }
      if (activeSubTab === 'add') {
        return (
          <TrafficInputForm
            onSwitchTab={handleSwitchTab}
            onSuccess={() => setTrafficRefreshKey((k) => k + 1)}
            triggerNotification={triggerNotification}
          />
        );
      }
      return (
        <TrafficDataList
          onEdit={handleTrafficEdit}
          onSwitchTab={handleSwitchTab}
          triggerNotification={triggerNotification}
          refreshKey={trafficRefreshKey}
        />
      );
    }

    if (activeSection === 'cruisePassengerTraffic') {
      return activeSubTab === 'add' ? (
        <CruisePassengerTrafficInputForm onSwitchTab={handleSwitchTab} />
      ) : (
        <CruisePassengerTrafficDataList onSwitchTab={handleSwitchTab} />
      );
    }
    if (activeSection === 'portPerformance') {
      return activeSubTab === 'add' ? (
        <PortPerformanceInputForm onSwitchTab={handleSwitchTab} />
      ) : (
        <PortPerformanceDataList onSwitchTab={handleSwitchTab} />
      );
    }
    if (activeSection === 'renewableEnergy') {
      return activeSubTab === 'add' ? (
        <RenewableEnergyInputForm onSwitchTab={handleSwitchTab} />
      ) : (
        <RenewableEnergyDataList onSwitchTab={handleSwitchTab} />
      );
    }
    return null;
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - Major Ports" />;
  }

  if (!activeSection) {
    return (
      <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 select-none">
          <div>
            <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-300 tracking-wide uppercase font-display">
              KPI - Major Ports
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Select a KPI section to open its Input Form and Data List.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
          <CommonTable
            rowData={formList}
            columnDefs={listColDefs}
            rowHeight={46}
            headerHeight={38}
            autoSize={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Capex-style page header: title left, tabs right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-2 select-none">
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackToList}
            className="mt-0.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition cursor-pointer flex-shrink-0"
            title="Back to Input Forms"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-300 tracking-wide uppercase font-display truncate">
              {currentSection?.fullLabel}
              {trafficEditRecord ? ' · Update' : ''}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              {activeSection === 'traffic'
                ? 'Capture commodity and Ro-Ro / Ro-Pax traffic actuals, manage fiscal targets, and update period records.'
                : 'KPI data entry and list views for Major Ports.'}
            </p>
          </div>
        </div>

        {!trafficEditRecord && tabs.length > 0 ? (
          <InternalNavigation
            tabs={tabs}
            currentTab={activeSubTab}
            onTabChange={handleSwitchTab}
          />
        ) : null}
      </div>

      {/* Capex-style content card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
        {renderSectionContent()}
      </div>
    </div>
  );
}
