import { useState, useEffect } from 'react';
import { Home, Menu, X, Lightbulb, Radio, Activity, Wifi, MapPin, IndianRupee, Construction } from 'lucide-react';
import RestrictedAccess from '../../components/RestrictedAccess';
import LightHouseMasterDataList from './pages/LightHouseMaster/DataList';
import LightHouseMasterInputForm from './pages/LightHouseMaster/InputForm';
import LightHouseMasterReports from './pages/LightHouseMaster/Reports';
import VTMSIntegrationDataList from './pages/VTMSIntegration/DataList';
import VTMSIntegrationInputForm from './pages/VTMSIntegration/InputForm';
import VTMSIntegrationReports from './pages/VTMSIntegration/Reports';
import { useKPIDGLLPermissions } from './hooks/useKPIDGLLPermissions';
import { getCurrentUserId } from '../../utils/authSession';
import {
  fetchStates, fetchDistricts,
  fetchLightHouseMaster,
  fetchVtmsIntegration, deleteVtmsIntegration,
} from './api';

// The 6 real DGLL KPI sections. Hydrographic Surveys / Vessel Accidents were
// deprecated in the old system (confirmed via commented-out old menu entries
// and no matching backend routes), so they're intentionally excluded here.
const SECTIONS = [
  { id: 'lightHouseMaster', code: 'K-3.1', label: 'DGLL - Light House Master', icon: Lightbulb, ready: true },
  { id: 'vtmsIntegration', code: 'K-3.2', label: 'DGLL - VTMS Integration', icon: Radio, ready: true },
  { id: 'naisUptime', code: 'K-3.3', label: 'DGLL - NAIS Uptime', icon: Activity, ready: false },
  { id: 'naisIntegration', code: 'K-3.4', label: 'DGLL - NAIS Integration', icon: Wifi, ready: false },
  { id: 'touristDestinations', code: 'K-3.5', label: 'DGLL - Lighthouse as Tourist Destinations', icon: MapPin, ready: false },
  { id: 'financialPerformance', code: 'K-3.6', label: 'DGLL - Financial Performance', icon: IndianRupee, ready: false },
];

export default function KPIDGLLView({ activeTab, triggerNotification }) {
  const permissions = useKPIDGLLPermissions();
  const { canAdd, canEdit, canView, canRemove } = permissions;

  const isReportsView = activeTab === 'DGLL Reports';

  const [activeSection, setActiveSection] = useState('lightHouseMaster');
  const [menuOpen, setMenuOpen] = useState(false);

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const currentSection = SECTIONS.find((s) => s.id === activeSection);

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
    }
  };

  useEffect(() => {
    setEditData(null);
    setShowForm(false);
    fetchData();
  }, [activeSection]);

  const handleEdit = (row) => {
    setEditData(row);
    setShowForm(true);
  };

  const handleAddClick = () => {
    setEditData(null);
    setShowForm(true);
  };

  const handleSuccess = () => {
    setEditData(null);
    setShowForm(false);
    fetchData();
  };

  const handleDelete = (row) => {
    if (activeSection === 'vtmsIntegration') {
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
    }
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - DGLL" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 dark:text-slate-300">KPI</span>
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 dark:text-slate-300">DGLL</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-800 dark:text-blue-400 font-bold">{isReportsView ? 'Reports' : 'Input Form'}</span>
      </div>

      <div className="flex flex-col gap-3 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            KPI - DGLL {isReportsView ? 'Reports' : 'Input Form'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Directorate General of Lighthouses & Lightships -- track KPI data across all sections.
          </p>
        </div>

        {/* Hamburger menu trigger -- opens a slide-in section drawer; 6 sections is too many for a tab row */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-900 border-2 border-[#0f417a]/30 dark:border-blue-500/40 rounded-xl shadow-sm hover:shadow-md transition cursor-pointer self-start flex-shrink-0"
        >
          <Menu className="h-4 w-4 text-[#0f417a] dark:text-blue-400 flex-shrink-0" />
          <div className="text-left">
            <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{currentSection.code}</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{currentSection.label}</span>
          </div>
        </button>
      </div>

      {menuOpen && (
        <>
          {/* Slide-in drawer overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setMenuOpen(false)}
          />

          {/* Slide-in drawer panel */}
          <div className="fixed top-0 left-0 h-full w-full max-w-sm bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-[#0f417a] to-[#1a5ba3]">
              <div>
                <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest block">KPI - DGLL</span>
                <span className="text-sm font-black text-white uppercase tracking-wide">Menu</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    onClick={() => { setActiveSection(s.id); setMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition cursor-pointer ${
                      activeSection === s.id ? 'bg-[#0f417a]/10 dark:bg-blue-500/10 border border-[#0f417a]/20 dark:border-blue-500/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{s.code}</span>
                      <span className={`text-xs font-bold truncate block ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{s.label}</span>
                    </div>
                    {!s.ready && (
                      <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full flex-shrink-0">Soon</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        {!currentSection.ready ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Construction className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{currentSection.label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This section is coming soon.</p>
          </div>
        ) : activeSection === 'lightHouseMaster' ? (
          isReportsView ? (
            <LightHouseMasterReports />
          ) : showForm ? (
            <LightHouseMasterInputForm
              editData={editData}
              states={states}
              districts={districts}
              onBack={() => { setEditData(null); setShowForm(false); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <LightHouseMasterDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onAddClick={handleAddClick}
              canEdit={canEdit}
              canAdd={canAdd}
            />
          )
        ) : activeSection === 'vtmsIntegration' ? (
          isReportsView ? (
            <VTMSIntegrationReports />
          ) : showForm ? (
            <VTMSIntegrationInputForm
              editData={editData}
              onBack={() => { setEditData(null); setShowForm(false); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <VTMSIntegrationDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAddClick={handleAddClick}
              canEdit={canEdit}
              canAdd={canAdd}
              canRemove={canRemove}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
