import { useState, useEffect } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useBillsPermissions } from './hooks/useBillsPermissions';
import { fetchBills, fetchWings, fetchDivisions } from './api';

export default function BillsPreConstitutionsView({ activeSubTab: activeSubTabProp, setActiveSubTab: setActiveSubTabProp, triggerNotification }) {
  const permissions = useBillsPermissions();
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
    if (activeSubTabProp === 'Input Form') {
      setActiveSubTab('add');
    } else if (activeSubTabProp === 'Reports' || activeSubTabProp === 'Report') {
      setActiveSubTab('report');
    } else if (activeSubTabProp === 'Data List') {
      setActiveSubTab('list');
    }
  }, [activeSubTabProp]);

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
    fetchBills()
      .then((res) => setRowData(res.data || []))
      .catch((err) => console.error('Error loading Bills data list:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (bill) => {
    setEditData(bill);
  };

  const handleSuccess = () => {
    setEditData(null);
    fetchData();
    setActiveSubTab('list');
    if (setActiveSubTabProp) setActiveSubTabProp('Bills/PreConstitutions Act');
  };

  const handleBack = () => {
    setEditData(null);
    setActiveSubTab('list');
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Bills/Pre-Constitutions Act" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Bills/Pre-Constitutions Act
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Manage, record, and track Legislative Bills and Pre-Constitutions Acts.
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

      <div className="space-y-8">
        {activeSubTab === 'list' && (
          editData ? (
            <InputForm
              wings={wings}
              divisions={divisions}
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
              readOnly={!canEdit}
            />
          ) : (
            <DataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={fetchData}
              triggerNotification={triggerNotification}
              wings={wings}
              divisions={divisions}
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
            readOnly={false}
          />
        )}

        {activeSubTab === 'report' && (
          <Reports
            triggerNotification={triggerNotification}
          />
        )}
      </div>
    </div>
  );
}
