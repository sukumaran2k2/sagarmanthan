import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import ConfirmModal from '../../components/ConfirmModal';
import InputForm from './pages/InputForm';
import { useMediaOutreachPermissions } from './hooks/useMediaOutreachPermissions';
import { resolveMediaOutreachListView } from './views';
import { fetchSocialMediaData, deleteSocialMedia } from './api';
import { MEDIA_TABS_ALL } from './utils/constants';
import { normaliseFinancialYear } from './utils/dataTransformers';
import { MEDIA_LIST_TABS, useMediaOutreachStore } from './store/useMediaOutreachStore';

export default function MediaOutreachView({ triggerNotification }) {
  const permissions = useMediaOutreachPermissions();
  const ListViewComponent = resolveMediaOutreachListView(permissions.uiViewCode);

  const mediaTabs = useMemo(() => {
    if (!permissions.canAdd) {
      return MEDIA_TABS_ALL.filter(tab => tab.id !== 'add_details');
    }
    return MEDIA_TABS_ALL;
  }, [permissions.canAdd]);

  // Open tab and organisations live in the store; the form and edited record are local
  const mediaTab = useMediaOutreachStore((state) => state.mediaTab);
  const setMediaTab = useMediaOutreachStore((state) => state.setMediaTab);
  const organisations = useMediaOutreachStore((state) => state.organisations);
  const loadOrganisations = useMediaOutreachStore((state) => state.loadOrganisations);

  // The nav flyout leaves the tab to open in sessionStorage; read it once, before the first paint.
  const [initTab] = useState(() => {
    try {
      const t = sessionStorage.getItem('mediaOutreachInitTab');
      if (t) { sessionStorage.removeItem('mediaOutreachInitTab'); return t; }
    } catch { /* storage unavailable */ }
    return null;
  });
  useLayoutEffect(() => {
    if (MEDIA_LIST_TABS.includes(initTab)) setMediaTab(initTab);
  }, [initTab, setMediaTab]);

  const [showForm, setShowForm] = useState(initTab === 'add_details' && permissions.canAdd);
  const activeMediaType = showForm ? 'add_details' : mediaTab;
  const [editData, setEditData] = useState(null);
  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrganisations(); }, [loadOrganisations]);

  const loadRecords = useCallback(() => {
    fetchSocialMediaData()
      .then(res => {
        const rows = Array.isArray(res.data) ? res.data : [];
        setRowData(rows.map(row => ({ ...row, financial_year: normaliseFinancialYear(row.financial_year) })));
      })
      .catch((err) => {
        console.error('Error fetching media outreach records:', err);
        triggerNotification?.('Could not load media outreach records. Please try again.', 'error');
      })
      .finally(() => setLoading(false));
  }, [triggerNotification]);

  // First load (loading starts true); later refreshes go through fetchData
  useEffect(() => { loadRecords(); }, [loadRecords]);

  const fetchData = useCallback(() => {
    setLoading(true);
    loadRecords();
  }, [loadRecords]);

  const getOrgName = useCallback((orgId) => {
    if (!orgId) return '-';
    const org = organisations.find(o => o.organisation_id === orgId || String(o.organisation_id) === String(orgId));
    return (org && org.organisation_name) ? org.organisation_name : '-';
  }, [organisations]);

  const handleTabChange = (tabId) => {
    if (tabId === 'add_details') {
      if (!permissions.canAdd) return;
      setEditData(null);
      setShowForm(true);
    } else {
      setMediaTab(tabId);
      setShowForm(false);
    }
  };

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    row: null,
    loading: false
  });

  const handleEdit = (row) => {
    if (!permissions.canEdit) return;
    setEditData(row);
    setShowForm(true);
  };

  const handleDelete = (row) => {
    if (!permissions.canRemove) return;
    setDeleteModal({
      open: true,
      row,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    const row = deleteModal.row;
    if (!row?.media_outreach_id) return;
    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await deleteSocialMedia(row.media_outreach_id);
      triggerNotification?.('Record deleted successfully.', 'success');
    } catch (err) {
      console.error('Delete error:', err);
      const status = err?.response?.status;
      if (status === 404) {
        triggerNotification?.('This record was already deleted.', 'info');
      } else {
        triggerNotification?.(status === 403 ? 'You do not have permission to delete this record.' : 'Could not delete the record. Please try again.', 'error');
        setDeleteModal(prev => ({ ...prev, loading: false }));
        return;
      }
    }
    setDeleteModal({ open: false, row: null, loading: false });
    fetchData();
  };

  const handleBack = () => {
    setShowForm(false);
    setEditData(null);
  };

  const handleSuccess = () => {
    fetchData();
    setShowForm(false);
    setEditData(null);
    triggerNotification?.(editData ? 'Record updated successfully!' : 'Record created successfully!', 'success');
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      
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
          activeMediaType={mediaTab}
          organisations={organisations}
          permissions={permissions}
        />
      ) : (
        <ListViewComponent
          rowData={rowData}
          loading={loading}
          activeMediaType={activeMediaType}
          onEdit={handleEdit}
          onDelete={handleDelete}
          organisations={organisations}
          getOrgName={getOrgName}
          triggerNotification={triggerNotification}
          permissions={permissions}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, row: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={deleteModal.loading}
        title="Delete Media Outreach Record"
        message="Deleting the record will also delete the stored data. Are you sure you want to delete?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
