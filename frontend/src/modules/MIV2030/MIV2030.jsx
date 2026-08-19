import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  LayoutDashboard, Users, Layers, FileEdit, FilePieChart, 
  PlusCircle, BarChart3, Building2 
} from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import Dashboard from './pages/Dashboard';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Meetings from './pages/Meetings';
import OrgReport from './pages/OrgReport';
import ThemeReport from './pages/ThemeReport';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

function authHeaders() {
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MIV2030View({
  activeSubTab: activeSubTabProp,
  setActiveSubTab: setActiveSubTabProp,
  triggerNotification
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'dashboard' | 'meetings' | 'list' | 'add' | 'org-report' | 'theme-report'
  const [currentSubReport, setCurrentSubReport] = useState('org-report');
  const [inputFormType, setInputFormType] = useState('initiative'); // 'initiative' | 'meeting'
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState(null);

  const tabs = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'add', 
      label: 'Input Form', 
      icon: PlusCircle,
      subMenu: [
        { id: 'initiative', label: 'Add Initiative' },
        { id: 'meeting', label: 'Add MVIC Meeting' },
      ]
    },
    { id: 'meetings', label: 'MIV Meetings', icon: Users },
    { id: 'list', label: 'MIV Initiatives', icon: Layers },
    { 
      id: 'reports', 
      label: 'Reports', 
      icon: FilePieChart,
      subMenu: [
        { id: 'org-report', label: 'Organisation Report' },
        { id: 'theme-report', label: 'Theme Report' },
      ]
    },
  ], []);

  // Map subtab strings from props / events
  const mapTabNameToId = (name) => {
    if (!name) return 'list';
    const lower = name.toLowerCase();
    if (lower.includes('meeting') && lower.includes('add')) {
      setInputFormType('meeting');
      return 'add';
    }
    if (lower.includes('input') || lower.includes('add') || lower.includes('edit')) return 'add';
    if (lower.includes('init') || lower.includes('data') || lower.includes('list')) return 'list';
    if (lower.includes('meet')) return 'meetings';
    if (lower.includes('theme')) return 'theme-report';
    if (lower.includes('org') || lower.includes('abstract') || lower.includes('report')) return 'org-report';
    if (lower.includes('dash')) return 'dashboard';
    return 'list';
  };

  useEffect(() => {
    if (activeSubTabProp && activeSubTabProp !== 'MIV 2030') {
      const tabId = mapTabNameToId(activeSubTabProp);
      if (tabId === 'org-report' || tabId === 'theme-report') {
        setCurrentSubReport(tabId);
        setActiveTab(tabId);
      } else {
        setActiveTab(tabId);
      }
    }
  }, [activeSubTabProp]);

  // Listen for custom sub-tab switch event from top navbar
  useEffect(() => {
    const handleSubTabEvent = (e) => {
      if (e.detail) {
        const tabId = mapTabNameToId(e.detail);
        if (tabId === 'org-report' || tabId === 'theme-report') {
          setCurrentSubReport(tabId);
          setActiveTab(tabId);
        } else {
          setActiveTab(tabId);
        }
      }
    };

    const storedTab = sessionStorage.getItem('miv2030InitTab');
    if (storedTab) {
      const tabId = mapTabNameToId(storedTab);
      if (tabId === 'org-report' || tabId === 'theme-report') {
        setCurrentSubReport(tabId);
        setActiveTab(tabId);
      } else {
        setActiveTab(tabId);
      }
      sessionStorage.removeItem('miv2030InitTab');
    }

    window.addEventListener('miv-2030-subtab', handleSubTabEvent);
    return () => window.removeEventListener('miv-2030-subtab', handleSubTabEvent);
  }, []);

  const fetchInitiatives = () => {
    setLoading(true);
    axios.get(`${API}/miv-data`, { headers: authHeaders() })
      .then((res) => {
        setRowData(res.data || []);
      })
      .catch((err) => {
        console.error("Error fetching MIV data:", err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInitiatives();
  }, []);

  const handleEditInitiative = (item) => {
    setEditData(item);
    setInputFormType('initiative');
    setActiveTab('add');
  };

  const handleAddNew = () => {
    setEditData(null);
    setInputFormType('initiative');
    setActiveTab('add');
  };

  const handleFormSuccess = () => {
    setEditData(null);
    fetchInitiatives();
    setActiveTab('list');
  };

  const handleFormCancel = () => {
    setEditData(null);
    setActiveTab('list');
  };

  const currentTabId = (activeTab === 'org-report' || activeTab === 'theme-report') ? 'reports' : activeTab;
  const currentActiveSubItem = currentTabId === 'add' ? inputFormType : currentSubReport;

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Row matching YP and CA module design */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Maritime India Vision 2030 (MIV 2030)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Strategic framework to unlock maritime economic potential with world-class port infrastructure and initiatives.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTabId}
          currentSubItem={currentActiveSubItem}
          onTabChange={(tabId) => {
            if (tabId !== 'add') {
              setEditData(null);
            }
            if (tabId === 'reports') {
              setActiveTab(currentSubReport || 'org-report');
            } else {
              setActiveTab(tabId);
            }
          }}
          onSubItemChange={(subId) => {
            if (subId === 'initiative' || subId === 'meeting') {
              setInputFormType(subId);
              setActiveTab('add');
            } else if (subId === 'org-report' || subId === 'theme-report') {
              setCurrentSubReport(subId);
              setActiveTab(subId);
            }
          }}
        />
      </div>

      {/* Main View Render */}
      <div>
        {activeTab === 'dashboard' && (
          <Dashboard onNavigateToTab={(tabId) => setActiveTab(tabId)} />
        )}

        {activeTab === 'meetings' && (
          <Meetings triggerNotification={triggerNotification} />
        )}

        {activeTab === 'list' && (
          <DataList
            rowData={rowData}
            loading={loading}
            onEdit={handleEditInitiative}
            onAddNew={handleAddNew}
            onRefresh={fetchInitiatives}
            triggerNotification={triggerNotification}
          />
        )}

        {activeTab === 'add' && (
          <InputForm
            editData={editData}
            initialFormType={inputFormType}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
            triggerNotification={triggerNotification}
          />
        )}

        {(activeTab === 'org-report' || activeTab === 'theme-report' || activeTab === 'reports') && (
          <div className="space-y-4 animate-fade-in">
            {/* Sub-Tabs: ORGANISATION REPORT vs THEME REPORT */}
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-1 select-none px-1">
              <button
                type="button"
                onClick={() => {
                  setCurrentSubReport('org-report');
                  setActiveTab('org-report');
                }}
                className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  (activeTab === 'org-report' || (!activeTab.includes('theme') && activeTab === 'reports'))
                    ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                }`}
              >
                <Building2 className="h-4 w-4" />
                <span>ORGANISATION REPORT (FORM 1A)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCurrentSubReport('theme-report');
                  setActiveTab('theme-report');
                }}
                className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                  activeTab === 'theme-report'
                    ? 'border-[#0f417a] text-[#0f417a] bg-blue-100/70 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-400 rounded-t-lg'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-350'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                <span>THEME REPORT (FORM 2A)</span>
              </button>
            </div>

            {/* Render Active Sub-Report */}
            {activeTab === 'theme-report' ? (
              <ThemeReport triggerNotification={triggerNotification} />
            ) : (
              <OrgReport triggerNotification={triggerNotification} />
            )}
          </div>
        )}
      </div>

    </div>
  );
}
