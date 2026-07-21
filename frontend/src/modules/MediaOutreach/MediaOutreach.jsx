import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import InternalNavigation from '../../components/InternalNavigation';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MEDIA_TABS = [
  { id: 'broadcast', label: 'Broadcast / TV Media' },
  { id: 'print_media', label: 'Print Media' },
  { id: 'online', label: 'Online' },
  { id: 'social_media', label: 'Social Media' },
  { id: 'add_details', label: 'Input Form' },
];

export default function MediaOutreachView({ triggerNotification }) {
  // Read initial tab from sessionStorage if navigated via nav flyout
  const initTab = (() => {
    try {
      const t = sessionStorage.getItem('mediaOutreachInitTab');
      if (t) { sessionStorage.removeItem('mediaOutreachInitTab'); return t; }
    } catch(e) {}
    return 'broadcast';
  })();

  const [activeMediaType, setActiveMediaType] = useState(initTab);
  const [prevMediaType, setPrevMediaType] = useState(initTab === 'add_details' ? 'broadcast' : initTab);
  const [editData, setEditData] = useState(null);
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [organisations, setOrganisations] = useState([]);

  // Load organisations dropdown
  useEffect(() => {
    axios.get(`${API}/mmt-dropdown/mmt_organisation`)
      .then(res => setOrganisations(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch all media outreach data
  const fetchData = useCallback(() => {
    setLoading(true);
    const userId = (() => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.userId;
        }
      } catch (e) {}
      return 1;
    })();

    axios.get(`${API}/monthly-socialmedia-parameter/${userId}/`)
      .then(res => setRowData(res.data || []))
      .catch((err) => {
        console.error('Error fetching social media data:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getOrgName = useCallback((orgId) => {
    const org = organisations.find(o => o.organisation_id === orgId);
    return org ? org.organisation_name : `Org ${orgId}`;
  }, [organisations]);

  const handleTabChange = (tabId) => {
    if (tabId !== 'add_details') {
      setPrevMediaType(tabId);
    } else {
      setEditData(null);
    }
    setActiveMediaType(tabId);
  };

  const handleEdit = (row) => {
    setEditData(row);
    setActiveMediaType('add_details');
  };

  const handleAddNew = () => {
    setEditData(null);
    setActiveMediaType('add_details');
  };

  const handleSuccess = () => {
    setEditData(null);
    setActiveMediaType(prevMediaType);
    fetchData();
    if (triggerNotification) triggerNotification('Media Outreach data saved successfully.');
  };

  const handleBack = () => {
    setEditData(null);
    setActiveMediaType(prevMediaType);
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Row with Page Title and Integrated Pill Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Media Outreach
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Track, analyze and report across Broadcast, Print, Online and Social Media outreach metrics.
          </p>
        </div>

        <InternalNavigation
          tabs={MEDIA_TABS}
          currentTab={activeMediaType}
          onTabChange={handleTabChange}
        />
      </div>

      {activeMediaType === 'add_details' ? (
        <InputForm
          onBack={handleBack}
          onSuccess={handleSuccess}
          triggerNotification={triggerNotification}
          editData={editData}
          activeMediaType={prevMediaType}
          organisations={organisations}
          getOrgName={getOrgName}
        />
      ) : (
        <DataList
          rowData={rowData}
          loading={loading}
          activeMediaType={activeMediaType}
          setActiveMediaType={handleTabChange}
          onEdit={handleEdit}
          onAddNew={handleAddNew}
          onRefresh={fetchData}
          organisations={organisations}
          getOrgName={getOrgName}
          triggerNotification={triggerNotification}
        />
      )}
    </div>
  );
}
