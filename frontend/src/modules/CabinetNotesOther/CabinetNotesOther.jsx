import { useState, useEffect, useCallback, useMemo } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import ConfirmModal from '../../components/ConfirmModal';
import { useCabinetNotesPermissions } from './hooks/useCabinetNotesPermissions';
import resolveCabinetNotesListView from './views';
import Dashboard from './pages/Dashboard';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { fetchCabinetMinistry, deleteCabinetMinistry } from './api';
import { useCabinetNotesOtherStore } from './store/useCabinetNotesOtherStore';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../utils/notify';
import { CABINET_NOTES_OTHER_TOASTS as TOASTS } from './toastMessages';

const INIT_TAB_KEY = 'cabinetNotesOtherInitTab';

function resolveSubTabId(label, canAdd) {
  if (label === 'Dashboard') return 'dashboard';
  if (label === 'Input Form') return canAdd ? 'add' : 'list';
  if (label === 'Reports' || label === 'Report') return 'report';
  if (label === 'Cabinet Notes-Other Ministry' || label === 'Data List') return 'list';
  return null;
}

export default function CabinetNotesOther({
  activeSubTab: activeSubTabProp,
  onGoHome,
  triggerNotification
}) {
  const permissions = useCabinetNotesPermissions();
  // The open tab and the reference data live in the store, so they survive leaving the module
  const activeSubTab = useCabinetNotesOtherStore((state) => state.activeSubTab); // 'dashboard' | 'list' | 'add' | 'report'
  const setActiveSubTab = useCabinetNotesOtherStore((state) => state.setActiveSubTab);
  const wingsList = useCabinetNotesOtherStore((state) => state.wings);
  const loadMasters = useCabinetNotesOtherStore((state) => state.loadMasters);
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);

  // One standard toast style, wording and timing for the whole module (utils/notify.js):
  // green for success, red for failure, amber when the user has to act, navy for progress.
  const notify = useNotifier(triggerNotification);

  // Ministries, stages and wings for every tab, loaded once
  useEffect(() => { loadMasters(); }, [loadMasters]);

  const fetchData = useCallback(() => {
    setLoading(true);
    fetchCabinetMinistry()
      .then(res => {
        setRowData(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error("Error loading Cabinet Notes Other Ministry data:", err);
        notify(COMMON_TOASTS.loadFailed('Cabinet notes'));
      })
      .finally(() => setLoading(false));
  }, [notify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sub-tab synchronization
  useEffect(() => {
    const apply = (label) => {
      const next = resolveSubTabId(label, permissions.canAdd);
      if (next) setActiveSubTab(next);
    };

    const init = sessionStorage.getItem(INIT_TAB_KEY);
    if (init) {
      sessionStorage.removeItem(INIT_TAB_KEY);
      apply(init);
    }

    const onMenu = (e) => apply(e.detail);
    window.addEventListener('cabinet-notes-other-subtab', onMenu);
    return () => window.removeEventListener('cabinet-notes-other-subtab', onMenu);
  }, [permissions.canAdd, setActiveSubTab]);

  useEffect(() => {
    const next = resolveSubTabId(activeSubTabProp, permissions.canAdd);
    if (next) setActiveSubTab(next);
  }, [activeSubTabProp, permissions.canAdd, setActiveSubTab]);

  // Enforce read-only tab restriction
  useEffect(() => {
    if (activeSubTab === 'add' && !permissions.canAdd) {
      setActiveSubTab('list');
    }
  }, [activeSubTab, permissions.canAdd, setActiveSubTab]);

  const tabs = useMemo(() => {
    const items = [{ id: 'dashboard', label: 'Dashboard' }];
    if (permissions.canAdd) {
      items.push({ id: 'add', label: 'Input Form' });
    }
    items.push(
      { id: 'list', label: 'Data List' },
      { id: 'report', label: 'Reports' }
    );
    return items;
  }, [permissions.canAdd]);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    note: null,
    loading: false
  });

  const ListView = useMemo(
    () => resolveCabinetNotesListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  // Opens a note. Read in the user matrix is enough to look at one - the form itself is
  // read-only without update, so a read-only user can still see the stage and wing detail
  // that the grid does not show.
  const handleEdit = (note) => {
    if (!permissions.canView) {
      notify(TOASTS.editNotAllowed());
      return;
    }
    setEditData(note);
    setActiveSubTab('list');
  };

  const handleDelete = (note) => {
    if (!permissions.canRemove) {
      notify(TOASTS.deleteNotAllowed());
      return;
    }
    const noteId = note?.cabinet_notes_ministry_id;
    if (!noteId) return;

    setDeleteModal({
      open: true,
      note,
      loading: false
    });
  };

  const handleConfirmDelete = async () => {
    const note = deleteModal.note;
    const noteId = note?.cabinet_notes_ministry_id;
    if (!noteId) return;

    setDeleteModal(prev => ({ ...prev, loading: true }));
    try {
      await deleteCabinetMinistry(noteId);
      notify(TOASTS.deleted());
      setDeleteModal({ open: false, note: null, loading: false });
      fetchData();
    } catch (err) {
      console.error("Delete error:", err);
      notify(TOASTS.deleteFailed(getErrorMessage(err)));
      setDeleteModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleSuccess = () => {
    setEditData(null);
    fetchData();
    setActiveSubTab('list');
  };

  const handleBack = () => {
    setEditData(null);
    setActiveSubTab('list');
  };

  if (!permissions.canView) {
    return (
      <RestrictedAccess
        moduleName="Cabinet Notes - Other Ministry"
        onGoHome={onGoHome}
      />
    );
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-300 tracking-wide uppercase font-display">
            Cabinet Notes - Other Ministry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Manage, record, and track Cabinet Notes received from other ministries and departments.
            <span className="text-slate-400 dark:text-slate-500">
              {' '}
              · Scope: {permissions.dataScopeCode || '-'} · View: {permissions.uiViewCode}
              {permissions.isViewOnlyAdmin ? ' · View Only Admin' : ''}
            </span>
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={(tabId) => {
            setEditData(null);
            setActiveSubTab(tabId);
          }}
        />
      </div>

      {/* Dynamic Tab Render Area */}
      <div className="space-y-8">
        {activeSubTab === 'dashboard' && <Dashboard triggerNotification={triggerNotification} />}

        {activeSubTab === 'list' && (
          editData ? (
            <InputForm
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
              wingsList={wingsList}
              readOnly={!permissions.canEdit}
            />
          ) : (
            <ListView
              rowData={rowData}
              loading={loading}
              canEdit={permissions.canEdit}
              canView={permissions.canView}
              canDelete={permissions.canRemove}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={fetchData}
              triggerNotification={triggerNotification}
            />
          )
        )}

        {activeSubTab === 'add' && permissions.canAdd && (
          <InputForm
            onBack={handleBack}
            onSuccess={handleSuccess}
            triggerNotification={triggerNotification}
            editData={null}
            wingsList={wingsList}
            readOnly={false}
          />
        )}

        {activeSubTab === 'report' && (
          <Reports triggerNotification={triggerNotification} />
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, note: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={deleteModal.loading}
        title="Delete Cabinet Note"
        message="Deleting the record will also delete the stored data. Are you sure you want to delete?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
