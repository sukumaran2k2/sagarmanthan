import React, { useState, useEffect } from 'react';
import axios from 'axios';
import InternalNavigation from '../../components/InternalNavigation';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';

export default function CabinetNotesOther({ activeSubTab: activeSubTabProp, setActiveSubTab: setActiveSubTabProp, triggerNotification }) {
  const [activeSubTab, setActiveSubTab] = useState('list'); // 'list' | 'add' | 'report'
  const [loading, setLoading] = useState(false);
  const [rowData, setRowData] = useState([]);
  const [editData, setEditData] = useState(null);

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
    } else if (activeSubTabProp === 'Cabinet Notes-Other Ministry' || activeSubTabProp === 'Data List') {
      setActiveSubTab('list');
    }
  }, [activeSubTabProp]);

  const [wingsList, setWingsList] = useState([]);

  useEffect(() => {
    axios.get("http://localhost:3000/mmt-dropdown/mmt_wings")
      .then(res => setWingsList(res.data || []))
      .catch(err => console.error("Error loading wings:", err));
  }, []);

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

  const fetchData = () => {
    setLoading(true);
    const userId = getActiveUserId();
    axios.get(`http://localhost:3000/cabinet-ministry/${userId}`)
      .then(res => {
        setRowData(res.data || []);
      })
      .catch(err => console.error("Error loading Cabinet Notes Other Ministry data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (note) => {
    setEditData(note);
    setActiveSubTab('list');
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
            Cabinet Notes - Other Ministry
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Manage, record, and track Cabinet Notes received from other ministries and departments.
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
              triggerNotification={triggerNotification}
              editData={editData}
              wingsList={wingsList}
              readOnly={false}
            />
          ) : (
            <DataList
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
            onBack={handleBack}
            onSuccess={handleSuccess}
            triggerNotification={triggerNotification}
            editData={null}
            wingsList={wingsList}
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
