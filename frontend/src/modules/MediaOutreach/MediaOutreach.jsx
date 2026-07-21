import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const MEDIA_TABS = [
  { id: 'broadcast', label: 'Broadcast / TV Media' },
  { id: 'print_media', label: 'Print Media' },
  { id: 'online', label: 'Online' },
  { id: 'social_media', label: 'Social Media' },
  { id: 'add_details', label: 'Add Details' },
];

export default function MediaOutreachView({ triggerNotification }) {
  const [activeMediaType, setActiveMediaType] = useState('broadcast');
  const [prevMediaType, setPrevMediaType] = useState('broadcast');
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
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Header Row with Page Title and Integrated Pill Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Media Outreach
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Track, analyze and report across Broadcast, Print, Online and Social Media outreach metrics.
          </p>
        </div>

        {/* Platform buttons (Modern Pill-style tab switcher including Add Details) */}
        <div className="flex p-1 bg-slate-100/90 border border-slate-200/50 rounded-2xl gap-1 max-w-full overflow-x-auto sm:overflow-visible">
          {MEDIA_TABS.map(tab => {
            const isActive = activeMediaType === tab.id;
            const isAddDetails = tab.id === 'add_details';
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`whitespace-nowrap px-5 py-2.5 text-xs font-semibold tracking-wide rounded-xl transition-all duration-300 cursor-pointer ${
                  isActive
                    ? isAddDetails
                      ? 'bg-emerald-600 text-white font-bold shadow-sm'
                      : 'bg-white text-[#28408f] font-bold shadow-sm'
                    : isAddDetails
                      ? 'text-emerald-600 hover:bg-emerald-50/50 hover:text-emerald-700'
                      : 'text-slate-600 hover:text-[#28408f] hover:bg-white/40'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
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
        />
      )}
    </div>
  );
}
