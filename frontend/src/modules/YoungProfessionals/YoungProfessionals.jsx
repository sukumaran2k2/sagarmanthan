import React, { useState, useEffect } from 'react';
import InternalNavigation from '../../components/InternalNavigation';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import { fetchWings, fetchDivisions, fetchYoungProfessionals } from './api';

export default function YoungProfessionalsView({ activeSubTab: activeSubTabProp, setActiveSubTab: setActiveSubTabProp, triggerNotification }) {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'report' | 'add'
  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const tabs = [
    { id: 'add', label: 'Input Form' },
    { id: 'list', label: 'Data List' },
    { id: 'report', label: 'Report' }
  ];

  useEffect(() => {
    if (activeSubTabProp === 'Input Form' || activeSubTabProp === 'YP Input Form') {
      setActiveSubTab('add');
    } else if (activeSubTabProp === 'Report' || activeSubTabProp === 'YP Report') {
      setActiveSubTab('report');
    } else if (activeSubTabProp === 'Data List' || activeSubTabProp === 'YP Data List' || activeSubTabProp === 'Young Professionals') {
      setActiveSubTab('list');
    }
  }, [activeSubTabProp]);

  useEffect(() => {
    fetchWings()
      .then(res => setWings(res.data || []))
      .catch(err => console.error("Error loading wings:", err));

    fetchDivisions()
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error("Error loading divisions:", err));
  }, []);

  const handleEdit = (yp) => {
    setEditData(yp);
  };

  const handleSuccess = () => {
    setEditData(null);
    setActiveSubTab('list');
  };

  const handleBack = () => {
    setEditData(null);
    setActiveSubTab('list');
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      {/* Header Row similar to Cabinet Notes Other Ministry */}
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
          }}
        />
      </div>

      {/* Dynamic Tab Render Area */}
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
            />
          ) : (
            <DataList
              onEdit={handleEdit}
              triggerNotification={triggerNotification}
              wings={wings}
              divisions={divisions}
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
