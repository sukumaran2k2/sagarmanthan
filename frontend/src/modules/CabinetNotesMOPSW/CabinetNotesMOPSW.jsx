import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InternalNavigation from '../../components/InternalNavigation';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';

export default function CabinetNotesMOPSW({ activeSubTab: activeSubTabProp, setActiveSubTab: setActiveSubTabProp, triggerNotification }) {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'report' | 'add'
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);

  const tabs = [
    { id: 'add', label: 'Input Form' },
    { id: 'list', label: 'Data List' },
    { id: 'report', label: 'Reports' }
  ];

  useEffect(() => {
    if (activeSubTabProp === 'Input Form') {
      setActiveSubTab('add');
    } else if (activeSubTabProp === 'Reports' || activeSubTabProp === 'Report') {
      setActiveSubTab('report');
    } else if (activeSubTabProp === 'Cabinet Notes-MoPSW' || activeSubTabProp === 'Data List') {
      setActiveSubTab('list');
    }
  }, [activeSubTabProp]);

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
    axios.get("http://localhost:3000/cabinet-mopsw-all")
      .then(res => {
        setRowData(res.data || []);
      })
      .catch(err => console.error("Error loading Cabinet Notes MoPSW data list:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (note) => {
    setEditData(note);
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Cabinet Notes-MoPSW
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Manage, record, and track Cabinet Notes stages for the Ministry of Ports, Shipping and Waterways.
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
              wings={wings}
              divisions={divisions}
              onBack={handleBack}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
              editData={editData}
              readOnly={false}
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
