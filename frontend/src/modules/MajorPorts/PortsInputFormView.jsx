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
import CruisePassengerTrafficInputForm from './pages/CruisePassengerTraffic/InputForm';
import CruisePassengerTrafficDataList from './pages/CruisePassengerTraffic/DataList';
import PortPerformanceInputForm from './pages/PortPerformance/InputForm';
import PortPerformanceDataList from './pages/PortPerformance/DataList';
import RenewableEnergyInputForm from './pages/RenewableEnergy/InputForm';
import RenewableEnergyDataList from './pages/RenewableEnergy/DataList';

export default function PortsInputFormView() {
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
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (activeSubTab === 'add' && !canAdd && canView) setActiveSubTab('list');
    if (activeSubTab === 'list' && !canView && canAdd) setActiveSubTab('add');
  }, [activeSubTab, canAdd, canView]);

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
  };

  const handleBackToList = () => {
    setActiveSection(null);
  };

  const handleSwitchTab = (tabId) => setActiveSubTab(tabId);

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
      return activeSubTab === 'add'
        ? <FinancialParametersInputForm onSwitchTab={handleSwitchTab} />
        : <FinancialParametersDataList onSwitchTab={handleSwitchTab} />;
    }
    if (activeSection === 'traffic') {
      return activeSubTab === 'add'
        ? <TrafficInputForm onSwitchTab={handleSwitchTab} />
        : <TrafficDataList onSwitchTab={handleSwitchTab} />;
    }
    if (activeSection === 'cruisePassengerTraffic') {
      return activeSubTab === 'add'
        ? <CruisePassengerTrafficInputForm onSwitchTab={handleSwitchTab} />
        : <CruisePassengerTrafficDataList onSwitchTab={handleSwitchTab} />;
    }
    if (activeSection === 'portPerformance') {
      return activeSubTab === 'add'
        ? <PortPerformanceInputForm onSwitchTab={handleSwitchTab} />
        : <PortPerformanceDataList onSwitchTab={handleSwitchTab} />;
    }
    if (activeSection === 'renewableEnergy') {
      return activeSubTab === 'add'
        ? <RenewableEnergyInputForm onSwitchTab={handleSwitchTab} />
        : <RenewableEnergyDataList onSwitchTab={handleSwitchTab} />;
    }
    return null;
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - Major Ports" />;
  }

  if (!activeSection) {
    return (
      <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="text-center border-b border-slate-100 pb-4">
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-wide font-display">
              KPI - Major Ports (Input Forms)
            </h1>
          </div>

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={handleBackToList}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 transition cursor-pointer flex-shrink-0"
              title="Back to Input Forms"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight font-display truncate">
                {currentSection?.fullLabel}
              </h1>
            </div>
          </div>

          {tabs.length > 0 && (
            <InternalNavigation
              tabs={tabs}
              currentTab={activeSubTab}
              onTabChange={setActiveSubTab}
            />
          )}
        </div>

        {renderSectionContent()}
      </div>
    </div>
  );
}
