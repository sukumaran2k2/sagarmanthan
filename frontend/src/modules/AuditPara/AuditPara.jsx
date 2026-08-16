import { useState, useEffect } from 'react';
import { Home } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useAuditParaPermissions } from './hooks/useAuditParaPermissions';
import { fetchAuditParas, fetchWings, fetchDivisions } from './api';

function parseAuditParaRow(r) {
  const steps = {
    1: r.received_at_ministry || 'No',
    2: r.comments_sought || 'No',
    3: r.comments_rec || 'No',
    4: r.under_clarification || 'No',
    5: r.comments_furnished || 'No',
    6: r.cag_accepted || 'No',
    7: r.disposed || 'No',
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

export default function AuditParaView({ activeSubTab: activeSubTabProp, setActiveSubTab: setActiveSubTabProp, triggerNotification }) {
  const permissions = useAuditParaPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  const [activeSubTab, setActiveSubTab] = useState(canAdd ? 'add' : (canView ? 'list' : 'add'));
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const tabs = [];
  if (canAdd) tabs.push({ id: 'add', label: 'Input Form' });
  if (canView) tabs.push({ id: 'list', label: 'Data List' });
  if (canView) tabs.push({ id: 'report', label: 'Reports' });

  useEffect(() => {
    fetchWings()
      .then((res) => setWings(res.data || []))
      .catch((err) => console.error('Error loading wings:', err));

    fetchDivisions()
      .then((res) => setDivisions(res.data || []))
      .catch((err) => console.error('Error loading divisions:', err));
  }, []);

  const fetchData = () => {
    setLoading(true);
    fetchAuditParas()
      .then((res) => setRowData((res.data || []).map(parseAuditParaRow)))
      .catch((err) => console.error('Error loading Audit Paras:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (para) => setEditData(para);

  const handleSuccess = () => {
    setEditData(null);
    fetchData();
    setActiveSubTab('list');
    if (setActiveSubTabProp) setActiveSubTabProp('Audit Paras');
  };

  const handleBack = () => {
    setEditData(null);
    setActiveSubTab('list');
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Audit Paras" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex items-center space-x-1 text-slate-400 text-xs font-semibold px-2">
        <Home className="h-3.5 w-3.5 text-slate-400" />
        <span className="text-slate-400">/</span>
        <span className="text-slate-600 dark:text-slate-300 hover:underline cursor-pointer">Governance</span>
        <span className="text-slate-400">/</span>
        <span className="text-blue-800 dark:text-blue-400 font-bold">Audit Paras</span>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Audit Paras
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            Manage Audit Para records, divisional comments, and track progress status wing-wise.
          </p>
        </div>
        <InternalNavigation
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={(tabId) => {
            if (tabId !== 'add') setEditData(null);
            setActiveSubTab(tabId);
          }}
        />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm">
        {activeSubTab === 'list' && (
          editData ? (
            <InputForm
              wings={wings}
              divisions={divisions}
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
            />
          ) : (
            <DataList
              rowData={rowData}
              loading={loading}
              wings={wings}
              divisions={divisions}
              onEdit={handleEdit}
              onAddClick={() => setActiveSubTab('add')}
              canEdit={canEdit}
              canAdd={canAdd}
              canRemove={canRemove}
            />
          )
        )}

        {activeSubTab === 'add' && (
          <InputForm
            wings={wings}
            divisions={divisions}
            onBack={canView ? handleBack : undefined}
            onSuccess={handleSuccess}
            triggerNotification={triggerNotification}
            editData={null}
          />
        )}

        {activeSubTab === 'report' && (
          <Reports rowData={rowData} wings={wings} divisions={divisions} />
        )}
      </div>
    </div>
  );
}
