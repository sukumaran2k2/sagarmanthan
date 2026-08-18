import React, { useState, useEffect, useCallback, useMemo } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import InputForm from './pages/InputForm';
import { useMediaOutreachPermissions } from './hooks/useMediaOutreachPermissions';
import { resolveMediaOutreachListView } from './views';
import { fetchOrganisations, fetchSocialMediaData, deleteSocialMedia } from './api';
import { getCurrentUserId } from '../../utils/authSession';
import { MEDIA_TABS_ALL } from './utils/constants';

export default function MediaOutreachView({ triggerNotification }) {
  const permissions = useMediaOutreachPermissions();
  const ListViewComponent = resolveMediaOutreachListView(permissions.uiViewCode);

  // Filter available tabs based on permissions
  const mediaTabs = useMemo(() => {
    if (!permissions.canAdd) {
      return MEDIA_TABS_ALL.filter(tab => tab.id !== 'add_details');
    }
    return MEDIA_TABS_ALL;
  }, [permissions.canAdd]);

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

  // Load organisations dropdown using API helper
  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(res.data || []))
      .catch(() => {});
  }, []);

  // Fetch all media outreach data using API helper
  const fetchData = useCallback(() => {
    setLoading(true);
    const userId = getCurrentUserId() || 1;

    fetchSocialMediaData(userId)
      .then(res => setRowData(res.data || []))
      .catch((err) => {
        console.error('Error fetching social media data:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getOrgName = useCallback((orgId) => {
    if (!orgId) return '-';
    const org = organisations.find(o => o.organisation_id === orgId || String(o.organisation_id) === String(orgId));
    return (org && org.organisation_name) ? org.organisation_name : '-';
  }, [organisations]);

  const handleTabChange = (tabId) => {
    if (tabId === 'add_details') {
      if (!permissions.canAdd) return;
      setEditData(null);
      setActiveMediaType('add_details');
    } else {
      setPrevMediaType(tabId);
      setActiveMediaType(tabId);
    }
  };

  const handleEdit = (row) => {
    if (!permissions.canEdit) return;
    setEditData(row);
    setActiveMediaType('add_details');
  };

  const handleDelete = (row) => {
    if (!permissions.canRemove) return;
    if (window.confirm("Are you sure you want to delete this record?")) {
      deleteSocialMedia(row.media_outreach_id)
        .then(() => {
          fetchData();
          if (triggerNotification) triggerNotification("Record deleted successfully.");
        })
        .catch(err => {
          console.error("Delete error:", err);
          if (triggerNotification) triggerNotification("Failed to delete record.", "error");
        });
    }
  };

  const handleAddNew = () => {
    if (!permissions.canAdd) return;
    setEditData(null);
    setActiveMediaType('add_details');
  };

  const handleBack = () => {
    setActiveMediaType(prevMediaType);
    setEditData(null);
  };

  const handleSuccess = () => {
    fetchData();
    setActiveMediaType(prevMediaType);
    setEditData(null);
    if (triggerNotification) triggerNotification(editData ? 'Record updated successfully!' : 'Record created successfully!');
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
          tabs={mediaTabs}
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
          permissions={permissions}
        />
      ) : (
        <ListViewComponent
          rowData={rowData}
          loading={loading}
          activeMediaType={activeMediaType}
          setActiveMediaType={handleTabChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddNew={handleAddNew}
          onRefresh={fetchData}
          organisations={organisations}
          getOrgName={getOrgName}
          triggerNotification={triggerNotification}
          permissions={permissions}
        />
      )}
    </div>
  );
}
