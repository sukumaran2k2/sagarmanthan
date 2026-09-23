import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PlusCircle, Layers, FileText, CheckCircle2 } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import { useCabinetNotesPermissions } from './hooks/useCabinetNotesPermissions';
import resolveCabinetNotesListView from './views';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { fetchCabinetMinistry, fetchWings, deleteCabinetMinistry } from './api';

const INIT_TAB_KEY = 'cabinetNotesOtherInitTab';

function resolveSubTabId(label, canAdd) {
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
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'add' | 'report'
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [wingsList, setWingsList] = useState([]);
  const [toast, setToast] = useState(null);

  const notify = useCallback(
    (message, type = 'success') => {
      if (typeof triggerNotification === 'function') {
        triggerNotification(message);
        return;
      }
      setToast({ message, type });
      setTimeout(() => setToast(null), 3000);
    },
    [triggerNotification]
  );

  const getActiveUserId = () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.userId || payload.user_id || payload.id || 1;
      }
    } catch (e) {
      console.error("Error decoding token:", e);
    }
    return 1;
  };

  useEffect(() => {
    fetchWings()
      .then(res => setWingsList(Array.isArray(res.data) ? res.data : []))
      .catch(err => console.error("Error loading wings:", err));
  }, []);

  const fetchData = useCallback(() => {
    setLoading(true);
    const userId = getActiveUserId();
    fetchCabinetMinistry(userId)
      .then(res => {
        setRowData(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => console.error("Error loading Cabinet Notes Other Ministry data:", err))
      .finally(() => setLoading(false));
  }, []);

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
  }, [permissions.canAdd]);

  useEffect(() => {
    const next = resolveSubTabId(activeSubTabProp, permissions.canAdd);
    if (next) setActiveSubTab(next);
  }, [activeSubTabProp, permissions.canAdd]);

  // Enforce read-only tab restriction
  useEffect(() => {
    if (activeSubTab === 'add' && !permissions.canAdd) {
      setActiveSubTab('list');
    }
  }, [activeSubTab, permissions.canAdd]);

  const tabs = useMemo(() => {
    const items = [];
    if (permissions.canAdd) {
      items.push({ id: 'add', label: 'Input Form', icon: PlusCircle });
    }
    items.push(
      { id: 'list', label: 'Data List', icon: Layers },
      { id: 'report', label: 'Reports', icon: FileText }
    );
    return items;
  }, [permissions.canAdd]);

  const ListView = useMemo(
    () => resolveCabinetNotesListView(permissions.uiViewCode),
    [permissions.uiViewCode]
  );

  const handleEdit = (note) => {
    if (!permissions.canEdit) {
      notify("You do not have permission to edit records.", "error");
      return;
    }
    setEditData(note);
    setActiveSubTab('list');
  };

  const handleDelete = async (note) => {
    if (!permissions.canRemove) {
      notify("You do not have permission to delete records.", "error");
      return;
    }
    const noteId = note.cabinet_notes_ministry_id;
    if (!noteId) return;

    if (window.confirm("Deleting the record will also delete the stored data. Are you sure you want to delete?")) {
      try {
        const userId = getActiveUserId();
        await deleteCabinetMinistry(noteId, userId);
        notify("Cabinet Notes Ministry record deleted successfully.");
        fetchData();
      } catch (err) {
        console.error("Delete error:", err);
        notify("Error deleting record. Please try again.", "error");
      }
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
      {toast && (
        <div className="fixed top-6 right-6 z-55 flex items-center space-x-2.5 bg-slate-900 border border-slate-800 text-white px-4.5 py-3 rounded-xl shadow-2xl animate-fade-in">
          <div className={`p-1 rounded-lg ${toast.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}>
            <CheckCircle2 className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold font-display leading-tight">Notification</p>
            <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{toast.message}</p>
          </div>
        </div>
      )}

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
        {activeSubTab === 'list' && (
          editData ? (
            <InputForm
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={notify}
              editData={editData}
              wingsList={wingsList}
              readOnly={!permissions.canEdit}
            />
          ) : (
            <ListView
              rowData={rowData}
              loading={loading}
              canEdit={permissions.canEdit}
              canDelete={permissions.canRemove}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={fetchData}
              triggerNotification={notify}
            />
          )
        )}

        {activeSubTab === 'add' && permissions.canAdd && (
          <InputForm
            onBack={handleBack}
            onSuccess={handleSuccess}
            triggerNotification={notify}
            editData={null}
            wingsList={wingsList}
            readOnly={false}
          />
        )}

        {activeSubTab === 'report' && (
          <Reports
            triggerNotification={notify}
          />
        )}
      </div>
    </div>
  );
}
