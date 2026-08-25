import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import InputForm from './pages/InputForm';
import { useMediaOutreachPermissions } from './hooks/useMediaOutreachPermissions';
import { resolveMediaOutreachListView } from './views';
import { fetchOrganisations, fetchSocialMediaData, deleteSocialMedia } from './api';
import { getCurrentUserId } from '../../utils/authSession';
import { MEDIA_TABS_ALL } from './utils/constants';

export default function MediaOutreachView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const permissions = useMediaOutreachPermissions();
  const ListViewComponent = resolveMediaOutreachListView(permissions.uiViewCode);

  const mediaTabs = useMemo(() => {
    if (!permissions.canAdd) {
      return MEDIA_TABS_ALL.filter(tab => tab.id !== 'add_details');
    }
    return MEDIA_TABS_ALL;
  }, [permissions.canAdd]);

  const currentMediaType = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/add_details') || path.includes('/input-form')) return 'add_details';
    if (path.includes('/print')) return 'print';
    if (path.includes('/online')) return 'online';
    if (path.includes('/social')) return 'social';
    return 'broadcast';
  }, [location.pathname]);

  const [editData, setEditData] = useState(null);
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [organisations, setOrganisations] = useState([]);

  useEffect(() => {
    fetchOrganisations()
      .then(res => setOrganisations(res.data || []))
      .catch(() => {});
  }, []);

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
    const found = organisations.find(o => String(o.organisation_id) === String(orgId));
    return found ? (found.organisation_name || found.organisation_label || '-') : '-';
  }, [organisations]);

  const handleEdit = (row) => {
    if (!permissions.canEdit) return;
    setEditData(row);
    navigate('/governance/media-outreach/add_details', { state: { item: row } });
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
    navigate('/governance/media-outreach/add_details');
  };

  const handleBack = () => {
    setEditData(null);
    navigate('/governance/media-outreach/broadcast');
  };

  const handleSuccess = () => {
    fetchData();
    setEditData(null);
    navigate('/governance/media-outreach/broadcast');
    if (triggerNotification) triggerNotification(editData ? 'Record updated successfully!' : 'Record created successfully!');
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
      {/* Header Row */}
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
          currentTab={currentMediaType}
          onTabChange={(tabId) => {
            if (tabId !== 'add_details') setEditData(null);
            navigate(`/governance/media-outreach/${tabId}`);
          }}
        />
      </div>

      <Routes>
        <Route path="add_details" element={
          <InputForm
            onBack={handleBack}
            onSuccess={handleSuccess}
            triggerNotification={triggerNotification}
            editData={editData}
            activeMediaType="broadcast"
            organisations={organisations}
            getOrgName={getOrgName}
            permissions={permissions}
          />
        } />

        <Route path=":mediaType" element={
          <ListViewComponent
            rowData={rowData}
            loading={loading}
            activeMediaType={currentMediaType}
            setActiveMediaType={(tabId) => navigate(`/governance/media-outreach/${tabId}`)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddNew={handleAddNew}
            onRefresh={fetchData}
            organisations={organisations}
            getOrgName={getOrgName}
            triggerNotification={triggerNotification}
            permissions={permissions}
          />
        } />

        <Route index element={<Navigate to="broadcast" replace />} />
        <Route path="*" element={<Navigate to="broadcast" replace />} />
      </Routes>
    </div>
  );
}
