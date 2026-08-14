import React, { useState, useEffect, useMemo } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { useYpPermissions } from './hooks/useYpPermissions';
import { fetchYoungProfessionals, fetchWings, fetchDivisions } from './api';

export default function YoungProfessionalsView({
  activeSubTab: activeSubTabProp,
  setActiveSubTab: setActiveSubTabProp,
  triggerNotification
}) {
  const permissions = useYpPermissions();
  const { canAdd, canEdit, canRemove, canView } = permissions;

  const [activeSubTab, setActiveSubTab] = useState(canAdd ? 'add' : (canView ? 'list' : 'add'));
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  // Dynamically render internal sub-tabs based on permissions
  const tabs = useMemo(() => {
    const list = [];
    if (canAdd) list.push({ id: 'add', label: 'Input Form' });
    if (canView) list.push({ id: 'list', label: 'Data List' });
    if (canView) list.push({ id: 'report', label: 'Report' });
    return list;
  }, [canAdd, canView]);

  useEffect(() => {
    if (activeSubTabProp === 'Input Form' || activeSubTabProp === 'YP Input Form') {
      if (canAdd) setActiveSubTab('add');
      else if (canView) setActiveSubTab('list');
    } else if (activeSubTabProp === 'Report' || activeSubTabProp === 'YP Report') {
      if (canView) setActiveSubTab('report');
      else if (canAdd) setActiveSubTab('add');
    } else if (activeSubTabProp === 'Data List' || activeSubTabProp === 'YP Data List' || activeSubTabProp === 'Young Professionals') {
      if (canView) setActiveSubTab('list');
      else if (canAdd) setActiveSubTab('add');
    }
  }, [activeSubTabProp, canAdd, canView]);

  useEffect(() => {
    fetchWings()
      .then(res => setWings(res.data || []))
      .catch(err => console.error("Error loading wings:", err));

    fetchDivisions()
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error("Error loading divisions:", err));
  }, []);

  const fetchData = () => {
    setLoading(true);
    fetchYoungProfessionals()
      .then(res => {
        setRowData(res.data || []);
      })
      .catch(err => console.error("Error loading YP data list:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (yp) => {
    setEditData(yp);
  };

  const handleSuccess = () => {
    setEditData(null);
    fetchData();
    setActiveSubTab('list');
    if (setActiveSubTabProp) {
      setActiveSubTabProp('YP Data List');
    }
  };

  const handleBack = () => {
    setEditData(null);
    setActiveSubTab('list');
    if (setActiveSubTabProp) {
      setActiveSubTabProp('YP Data List');
    }
  };

  // Render RestrictedAccess component if user has no permissions at all
  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="Young Professionals" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
            Young Professionals
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium font-sans">
            Manage, register and monitor Young Professionals recruited across various wings and divisions.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={activeSubTab}
          onTabChange={(tabId) => {
            if (tabId !== 'add') {
              setEditData(null);
            }
            setActiveSubTab(tabId);
            if (setActiveSubTabProp) {
              if (tabId === 'add') setActiveSubTabProp('YP Input Form');
              else if (tabId === 'report') setActiveSubTabProp('YP Report');
              else if (tabId === 'list') setActiveSubTabProp('YP Data List');
            }
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
              canEdit={canEdit}
              canAdd={canAdd}
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
            onBack={handleBack}
            onSuccess={handleSuccess}
            triggerNotification={triggerNotification}
            editData={null}
            canEdit={canEdit}
            canAdd={canAdd}
          />
        )}

        {activeSubTab === 'report' && (
          <Reports
            wings={wings}
            divisions={divisions}
            triggerNotification={triggerNotification}
          />
        )}
      </div>
    </div>
  );
}
