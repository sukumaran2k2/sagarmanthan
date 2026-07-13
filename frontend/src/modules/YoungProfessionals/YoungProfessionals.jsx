import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InternalNavigation from '../../components/InternalNavigation';
import ListView from './pages/ListView';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';

export default function YoungProfessionalsView({ triggerNotification }) {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'report' | 'add'
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);

  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const tabs = [
    { id: 'list', label: 'List View' },
    { id: 'report', label: 'Reports' },
    { id: 'add', label: 'Input Form' }
  ];

  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_wings")
      .then(res => setWings(res.data || []))
      .catch(err => console.error("Error loading wings:", err));

    axios.get("http://localhost:3000/mmt-dropdown/mmt_division")
      .then(res => setDivisions(res.data || []))
      .catch(err => console.error("Error loading divisions:", err));
  }, []);

  const fetchData = () => {
    setLoading(true);
    axios.get("http://localhost:3000/young-professional")
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
  };

  const handleBack = () => {
    setEditData(null);
    setActiveSubTab('list');
  };

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      {/* Header Row similar to Cabinet Notes Other Ministry */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Young Professionals
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
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
            <ListView
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onRefresh={fetchData}
              triggerNotification={triggerNotification}
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
