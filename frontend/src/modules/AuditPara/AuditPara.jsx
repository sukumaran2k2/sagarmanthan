import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useAuditParaPermissions } from './hooks/useAuditParaPermissions';
import { useAuditParaStore } from './store/useAuditParaStore';
import { fetchAuditParas, deleteAuditPara } from './api';
import { getCurrentUserId } from '../../utils/authSession';
import { useNotifier, COMMON_TOASTS, getErrorMessage } from '../../utils/notify';
import { AUDIT_PARA_TOASTS } from './toastMessages';

const BASE = '/governance/audit-paras';

// Stage flags are BIT columns (true/false); everything downstream (reports, status text,
// edit form) expects 'Yes' / 'No'.
const yesNo = (v) => (v === true || v === 1 || /^(yes|true|1)$/i.test(String(v ?? '').trim()) ? 'Yes' : 'No');

function parseAuditParaRow(r) {
  const steps = {
    1: yesNo(r.received_at_ministry),
    2: yesNo(r.comments_sought),
    3: yesNo(r.comments_rec),
    4: yesNo(r.under_clarification),
    5: yesNo(r.comments_furnished),
    6: yesNo(r.cag_accepted),
    7: yesNo(r.disposed),
  };
  const dates = {
    1: r.date_of_receipt ? new Date(r.date_of_receipt).toISOString().split('T')[0] : '',
    2: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
    3: r.comments_rec_date ? new Date(r.comments_rec_date).toISOString().split('T')[0] : '',
    4: '',
    5: r.comments_furnished_date ? new Date(r.comments_furnished_date).toISOString().split('T')[0] : '',
    6: r.cag_accepted_date ? new Date(r.cag_accepted_date).toISOString().split('T')[0] : '',
    7: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : '',
  };
  return {
    id: r.audit_para_id,
    paraNumber: r.para_number || '',
    subject: r.subject || '',
    wing: r.wing_name || '',
    division: r.division_name || '',
    category: r.category || 'Audit Para',
    statusSteps: steps,
    statusDates: dates,
    remarks: r.remarks || '',
    lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : '',
  };
}

export default function AuditParaView({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const notify = useNotifier(triggerNotification);
  const permissions = useAuditParaPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  // Reference data from the store (one selector per field, so list filter changes don't re-render the shell)
  const wings = useAuditParaStore((state) => state.wings);
  const divisions = useAuditParaStore((state) => state.divisions);
  const loadWingsAndDivisions = useAuditParaStore((state) => state.loadWingsAndDivisions);

  // The record being edited travels with the route entry, so it is gone as soon as
  // the user opens the form any other way (tab, sidebar, new session)
  const editData = location.state?.item ?? null;

  // Fetched paras are shared by the Data List and the Report, so they live here (not in the store)
  const [rowData, setRowData] = useState([]);
  // The first load starts on mount, so loading starts true for users who can see the list
  const [loading, setLoading] = useState(canView);
  const latestRequestRef = useRef(0);

  const tabs = useMemo(() => {
    const list = [];
    if (canAdd) list.push({ id: 'input-form', label: 'Input Form' });
    if (canView) list.push({ id: 'list-view', label: 'Data List' });
    if (canView) list.push({ id: 'report', label: 'Reports' });
    return list;
  }, [canAdd, canView]);

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form')) return 'input-form';
    if (path.includes('/report')) return 'report';
    return 'list-view';
  }, [location.pathname]);

  useEffect(() => {
    loadWingsAndDivisions();
  }, [loadWingsAndDivisions]);

  // Only the latest request may update the list (an older response can arrive last)
  const loadParas = useCallback(() => {
    const requestId = ++latestRequestRef.current;
    const isStale = () => requestId !== latestRequestRef.current;
    return fetchAuditParas(getCurrentUserId())
      .then((res) => {
        if (!isStale()) setRowData((res.data || []).map(parseAuditParaRow));
      })
      .catch((err) => {
        if (isStale()) return;
        console.error('Error loading Audit Paras:', err);
        setRowData([]);
        notify(COMMON_TOASTS.loadFailed('Audit paras'));
      })
      .finally(() => {
        if (!isStale()) setLoading(false);
      });
  }, [notify]);

  // Reload after a save, delete or refresh
  const fetchData = useCallback(() => {
    setLoading(true);
    return loadParas();
  }, [loadParas]);

  useEffect(() => {
    if (canView) loadParas();
  }, [canView, loadParas]);

  const handleEdit = useCallback((para) => {
    navigate(`${BASE}/input-form`, { state: { item: para } });
  }, [navigate]);

  const handleDelete = useCallback((para) => {
    if (!window.confirm(`Delete Audit Para "${para.paraNumber}"? This cannot be undone.`)) return;
    deleteAuditPara(para.id, getCurrentUserId())
      .then(() => {
        notify(AUDIT_PARA_TOASTS.deleted(para.paraNumber));
        fetchData();
      })
      .catch((err) => {
        console.error('Error deleting Audit Para:', err);
        notify(AUDIT_PARA_TOASTS.deleteFailed(getErrorMessage(err)));
      });
  }, [notify, fetchData]);

  // Replace the form entry so browser Back can't reopen the pre-save snapshot
  const handleSuccess = useCallback(() => {
    fetchData();
    navigate(canView ? `${BASE}/list-view` : `${BASE}/input-form`, { replace: true });
  }, [fetchData, navigate, canView]);

  const handleBack = useCallback(() => {
    navigate(`${BASE}/list-view`);
  }, [navigate]);

  // Edit rights alone don't help: records are only reached from the Data List
  if (!canAdd && !canView) {
    return <RestrictedAccess moduleName="Audit Paras" />;
  }

  const defaultTab = canAdd ? 'input-form' : 'list-view';

  return (
    <div className="module-page-container space-y-6 animate-fade-in">
      <div className="module-header-container">
        <div>
          <h1 className="module-header-title">Audit Paras</h1>
          <p className="module-header-subtitle">
            Manage Audit Para records, divisional comments, and track progress status wing-wise.
          </p>
        </div>
        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => navigate(`${BASE}/${tabId}`)}
        />
      </div>

      <div className="space-y-8">
        <Routes>
          <Route path="list-view" element={canView ? (
            <DataList
              rowData={rowData}
              loading={loading}
              wings={wings}
              divisions={divisions}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
              triggerNotification={triggerNotification}
            />
          ) : <Navigate to={`${BASE}/input-form`} replace />} />

          {/* Editing needs edit rights; adding needs add rights */}
          <Route path="input-form" element={(editData ? canEdit : canAdd) ? (
            <InputForm
              key={editData?.id ?? 'new'}
              wings={wings}
              divisions={divisions}
              onBack={canView ? handleBack : undefined}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
            />
          ) : <Navigate to={`${BASE}/list-view`} replace />} />

          <Route path="report" element={canView ? (
            <div className="module-card">
              <Reports rowData={rowData} wings={wings} divisions={divisions} loading={loading} onRefresh={fetchData} />
            </div>
          ) : <Navigate to={`${BASE}/input-form`} replace />} />

          <Route index element={<Navigate to={defaultTab} replace />} />
          <Route path="*" element={<Navigate to={defaultTab} replace />} />
        </Routes>
      </div>
    </div>
  );
}
