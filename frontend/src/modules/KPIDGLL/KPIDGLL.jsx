import { useState, useEffect } from 'react';
import { Lightbulb, Radio, Activity, Wifi, MapPin, IndianRupee, Construction } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import LightHouseMasterDataList from './pages/LightHouseMaster/DataList';
import LightHouseMasterInputForm from './pages/LightHouseMaster/InputForm';
import LightHouseMasterReports from './pages/LightHouseMaster/Reports';
import VTMSIntegrationDataList from './pages/VTMSIntegration/DataList';
import VTMSIntegrationInputForm from './pages/VTMSIntegration/InputForm';
import VTMSIntegrationReports from './pages/VTMSIntegration/Reports';
import NAISUptimeDataList from './pages/NAISUptime/DataList';
import NAISUptimeInputForm from './pages/NAISUptime/InputForm';
import NAISUptimeReports from './pages/NAISUptime/Reports';
import NAISIntegrationDataList from './pages/NAISIntegration/DataList';
import NAISIntegrationInputForm from './pages/NAISIntegration/InputForm';
import NAISIntegrationReports from './pages/NAISIntegration/Reports';
import TouristDestinationsDataList from './pages/TouristDestinations/DataList';
import TouristDestinationsInputForm from './pages/TouristDestinations/InputForm';
import TouristDestinationsReports from './pages/TouristDestinations/Reports';
import FinancialPerformanceDataList from './pages/FinancialPerformance/DataList';
import FinancialPerformanceInputForm from './pages/FinancialPerformance/InputForm';
import FinancialPerformanceReports from './pages/FinancialPerformance/Reports';
import { useKPIDGLLPermissions } from './hooks/useKPIDGLLPermissions';
import { getCurrentUserId } from '../../utils/authSession';
import {
  fetchStates, fetchDistricts,
  fetchLightHouseMaster, deleteLightHouseMaster,
  fetchVtmsIntegration, deleteVtmsIntegration,
  fetchNaisUptime, deleteNaisUptime,
  fetchNaisIntegration, deleteNaisIntegration,
  fetchTouristDestinations, fetchTargetDetails, deleteTouristDestination, deleteTargetDetail,
  fetchFinancialPerformance, deleteFinancialPerformance,
} from './api';

// The 6 real DGLL KPI sections. Hydrographic Surveys / Vessel Accidents were
// deprecated in the old system (confirmed via commented-out old menu entries
// and no matching backend routes), so they're intentionally excluded here.
const SECTIONS = [
  { id: 'lightHouseMaster', code: 'K-3.1', label: 'DGLL - Light House Master', icon: Lightbulb, ready: true },
  { id: 'vtmsIntegration', code: 'K-3.2', label: 'DGLL - VTMS Integration', icon: Radio, ready: true },
  { id: 'naisUptime', code: 'K-3.3', label: 'DGLL - NAIS Uptime', icon: Activity, ready: true },
  { id: 'naisIntegration', code: 'K-3.4', label: 'DGLL - NAIS Integration', icon: Wifi, ready: true },
  { id: 'touristDestinations', code: 'K-3.5', label: 'DGLL - Lighthouse as Tourist Destinations', icon: MapPin, ready: true },
  { id: 'financialPerformance', code: 'K-3.6', label: 'DGLL - Financial Performance', icon: IndianRupee, ready: true },
];

export default function KPIDGLLView({ activeTab, triggerNotification }) {
  const permissions = useKPIDGLLPermissions();
  const { canAdd, canEdit, canView, canRemove } = permissions;

  const [activeSection, setActiveSection] = useState('lightHouseMaster');
  const [activeSubTab, setActiveSubTab] = useState(activeTab === 'DGLL Reports' ? 'report' : 'list');

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState(null);

  // Tourist Destinations has two related entities and its own tab switcher
  // inside a single InputForm, but otherwise follows the same activeSubTab
  // pattern as every other section.
  const [touristDestRows, setTouristDestRows] = useState([]);
  const [targetDetailRows, setTargetDetailRows] = useState([]);
  const [touristFormTab, setTouristFormTab] = useState('destination');
  const [destinationEditData, setDestinationEditData] = useState(null);
  const [targetEditData, setTargetEditData] = useState(null);

  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  const tabs = [];
  if (canAdd) tabs.push({ id: 'add', label: 'Input Form' });
  if (canView) tabs.push({ id: 'list', label: 'Data List' });
  if (canView) tabs.push({ id: 'report', label: 'Reports' });

  useEffect(() => {
    fetchStates().then((res) => setStates(res.data || [])).catch((err) => console.error('Error loading states:', err));
    fetchDistricts().then((res) => setDistricts(res.data || [])).catch((err) => console.error('Error loading districts:', err));
  }, []);

  const fetchData = () => {
    if (activeSection === 'lightHouseMaster') {
      setLoading(true);
      fetchLightHouseMaster(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Light House Master data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'vtmsIntegration') {
      setLoading(true);
      fetchVtmsIntegration(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading VTMS Integration data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'naisUptime') {
      setLoading(true);
      fetchNaisUptime(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading NAIS Uptime data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'naisIntegration') {
      setLoading(true);
      fetchNaisIntegration(1) // backend takes userID but query is currently unfiltered by it
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading NAIS Integration data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'touristDestinations') {
      setLoading(true);
      Promise.all([
        fetchTouristDestinations(1), // backend takes userID but query is currently unfiltered by it
        fetchTargetDetails(1),
      ])
        .then(([destRes, targetRes]) => {
          setTouristDestRows(destRes.data || []);
          setTargetDetailRows(targetRes.data || []);
        })
        .catch((err) => console.error('Error loading Tourist Destinations data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'financialPerformance') {
      setLoading(true);
      fetchFinancialPerformance()
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Financial Performance data:', err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    setEditData(null);
    fetchData();
  }, [activeSection]);

  const handleEdit = (row) => {
    setEditData(row);
    setActiveSubTab('add');
  };

  const handleSuccess = () => {
    setEditData(null);
    fetchData();
  };

  const handleEditDestination = (row) => {
    setDestinationEditData(row);
    setTargetEditData(null);
    setActiveSubTab('add');
  };

  const handleEditTarget = (row) => {
    setTargetEditData(row);
    setDestinationEditData(null);
    setActiveSubTab('add');
  };

  const handleTouristFormBack = () => {
    setDestinationEditData(null);
    setTargetEditData(null);
  };

  const handleTouristFormSuccess = () => {
    setDestinationEditData(null);
    setTargetEditData(null);
    fetchData();
  };

  const handleDelete = (row) => {
    if (activeSection === 'lightHouseMaster') {
      if (!window.confirm(`Delete the Light House Master entry for ${row.light_house_name}? This cannot be undone.`)) return;
      deleteLightHouseMaster(row.lights_house_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Light House Master entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Light House Master entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'vtmsIntegration') {
      if (!window.confirm(`Delete the VTMS Integration entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteVtmsIntegration(row.vtms_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('VTMS Integration entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting VTMS Integration entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'naisUptime') {
      if (!window.confirm(`Delete the NAIS Uptime entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteNaisUptime(row.nais_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('NAIS Uptime entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting NAIS Uptime entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'naisIntegration') {
      if (!window.confirm(`Delete the NAIS Integration entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteNaisIntegration(row.nais_integration_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('NAIS Integration entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting NAIS Integration entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'financialPerformance') {
      if (!window.confirm(`Delete the Financial Performance entry for ${row.financialyear}? This cannot be undone.`)) return;
      deleteFinancialPerformance(row.financial_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Financial Performance entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Financial Performance entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    }
  };

  const handleDeleteDestination = (row) => {
    if (!window.confirm(`Delete the Tourist Destination entry for ${row.finacial_year}? This cannot be undone.`)) return;
    deleteTouristDestination(row.tourist_destination_id, getCurrentUserId())
      .then(() => {
        triggerNotification && triggerNotification('Tourist Destination entry deleted successfully', 'success');
        fetchData();
      })
      .catch((err) => {
        console.error('Error deleting Tourist Destination entry:', err);
        triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
      });
  };

  const handleDeleteTarget = (row) => {
    if (!window.confirm(`Delete the Target Details entry for ${row.year}? This cannot be undone.`)) return;
    deleteTargetDetail(row.tourist_destination_target_id, getCurrentUserId())
      .then(() => {
        triggerNotification && triggerNotification('Target Details entry deleted successfully', 'success');
        fetchData();
      })
      .catch((err) => {
        console.error('Error deleting Target Details entry:', err);
        triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
      });
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - DGLL" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col gap-5 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
              KPI - DGLL
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Directorate General of Lighthouses & Lightships -- track KPI data across all sections.
            </p>
          </div>

          <InternalNavigation
            tabs={tabs}
            currentTab={activeSubTab}
            onTabChange={(tabId) => {
              setEditData(null);
              setDestinationEditData(null);
              setTargetEditData(null);
              setTouristFormTab('destination');
              setActiveSubTab(tabId);
            }}
          />
        </div>

        <div className="border-b border-slate-200 dark:border-slate-700" />

        <div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Section</span>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer border flex-shrink-0 ${
                    activeSection === s.id ? 'bg-[#0f417a]/10 dark:bg-blue-500/10 border-[#0f417a]/30 dark:border-blue-500/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{s.code}</span>
                    <span className={`text-xs font-bold whitespace-nowrap ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{s.label}</span>
                  </div>
                  {!s.ready && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">Soon</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5">Scroll for more sections →</p>
        </div>
      </div>

      <div className={(activeSubTab === 'report' || activeSubTab === 'add') ? 'mt-2' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mt-2'}>
        {!currentSection.ready ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Construction className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{currentSection.label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This section is coming soon.</p>
          </div>
        ) : activeSection === 'lightHouseMaster' ? (
          activeSubTab === 'report' ? (
            <LightHouseMasterReports />
          ) : activeSubTab === 'add' ? (
            <LightHouseMasterInputForm
              editData={editData}
              states={states}
              districts={districts}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <LightHouseMasterDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'vtmsIntegration' ? (
          activeSubTab === 'report' ? (
            <VTMSIntegrationReports />
          ) : activeSubTab === 'add' ? (
            <VTMSIntegrationInputForm
              editData={editData}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <VTMSIntegrationDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'naisUptime' ? (
          activeSubTab === 'report' ? (
            <NAISUptimeReports />
          ) : activeSubTab === 'add' ? (
            <NAISUptimeInputForm
              editData={editData}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <NAISUptimeDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'naisIntegration' ? (
          activeSubTab === 'report' ? (
            <NAISIntegrationReports />
          ) : activeSubTab === 'add' ? (
            <NAISIntegrationInputForm
              editData={editData}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <NAISIntegrationDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'touristDestinations' ? (
          activeSubTab === 'report' ? (
            <TouristDestinationsReports />
          ) : activeSubTab === 'add' ? (
            <TouristDestinationsInputForm
              destinationEditData={destinationEditData}
              targetEditData={targetEditData}
              initialTab={touristFormTab}
              onBack={handleTouristFormBack}
              onSuccess={handleTouristFormSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <TouristDestinationsDataList
              destinationRows={touristDestRows}
              targetRows={targetDetailRows}
              loading={loading}
              onEditDestination={handleEditDestination}
              onEditTarget={handleEditTarget}
              onDeleteDestination={handleDeleteDestination}
              onDeleteTarget={handleDeleteTarget}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'financialPerformance' ? (
          activeSubTab === 'report' ? (
            <FinancialPerformanceReports />
          ) : activeSubTab === 'add' ? (
            <FinancialPerformanceInputForm
              editData={editData}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <FinancialPerformanceDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
