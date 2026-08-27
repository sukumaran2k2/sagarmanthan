import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import InternalNavigation from '../../components/InternalNavigation';
import DataList from './pages/DataList';
import InputForm from './pages/InputForm';
import Reports from './pages/Reports';
import {fetchWings,fetchDivisions} from '../ParliamentaryIssues/api'


export default function VIPReference({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [vipReferences, setVipReferences] = useState([]);
  const [wings, setWings] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [editData, setEditData] = useState(null);

  const tabs = [
    { id: 'input-form', label: 'Input Form' },
    { id: 'data-list', label: 'Data List' },
    { id: 'reports', label: 'Report' }
  ];

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/input-form') || path.includes('/add') || path.includes('/edit')) return 'input-form';
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    return 'data-list';
  }, [location.pathname]);

  // Fetch wings and divisions on mount
useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [wingsRes, divisionsRes] = await Promise.all([
          fetchWings(),
          fetchDivisions(),
        ]);

        setWings(wingsRes.data || []);
        setDivisions(divisionsRes.data || []);
      } catch (error) {
        console.error('Error loading dropdowns:', error);

        if (error.response?.status === 401) {
          console.error('Authentication failed. Token may be missing or expired.');
        }
      }
    };

    loadDropdowns();
  }, []);

  const fetchData = () => {
    axios.get(`${API_BASE_URL}/vip-reference`)
      .then(res => {
        const dataArray = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const mapped = dataArray.map(r => {
          const steps = {
            1: r.received_at_ministry || 'No',
            2: r.submitted_for_approval || 'No',
            3: r.comments_sought || 'No',
            4: r.comments_received || 'No',
            5: r.reply_furnished || 'No',
            6: r.disposed || 'No'
          };
          const dates = {
            1: r.received_at_ministry_date ? new Date(r.received_at_ministry_date).toISOString().split('T')[0] : '',
            2: r.submitted_for_approval_date ? new Date(r.submitted_for_approval_date).toISOString().split('T')[0] : '',
            3: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            4: r.comments_received_date ? new Date(r.comments_received_date).toISOString().split('T')[0] : '',
            5: r.reply_furnished_date ? new Date(r.reply_furnished_date).toISOString().split('T')[0] : '',
            6: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.vip_reference_id,
            vipName: r.name_of_vip || '',
            vipType: r.vip_type || '',
            vipDesignation: r.vip_designation || '',
            subject: r.subject || '',
            wing: r.wing_name || '',
            division: r.division_name || '',
            statusSteps: steps,
            statusDates: dates,
            remarks: r.remarks || '',
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : ''
          };
        });
        setVipReferences(mapped);
      })
      .catch(err => console.error("Error fetching VIP References:", err));
  };


  useEffect(() => {
    fetchData();
  }, [location.pathname]);

  const handleEdit = (row) => {
    setEditData(row);
    navigate('/governance/vip-reference/input-form', { state: { item: row } });
  };

  const handleBack = () => {
    setEditData(null);
    navigate('/governance/vip-reference/data-list');
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-800">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6 select-none">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            VIP References
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium font-sans">
            Track and manage VIP communications, queries, and action status across departments.
          </p>
        </div>

        <InternalNavigation
          tabs={tabs}
          currentTab={currentTab}
          onTabChange={(tabId) => {
            if (tabId !== 'input-form') setEditData(null);
            if (tabId === 'input-form') navigate('/governance/vip-reference/input-form');
            else if (tabId === 'reports') navigate('/governance/vip-reference/reports');
            else navigate('/governance/vip-reference/data-list');
          }}
        />
      </div>

      <Routes>
        <Route path="data-list" element={
          <DataList
            vipReferences={vipReferences}
            onEdit={handleEdit}
            fetchData={fetchData}
            triggerNotification={triggerNotification}
          />
        } />

        <Route path="input-form" element={
          <InputForm
            onBack={handleBack}
            editData={editData}
            fetchData={fetchData}
            wings={wings}
            divisions={divisions}
            triggerNotification={triggerNotification}
          />
        } />

        <Route path="reports" element={
          <Reports
            vipReferences={vipReferences}
            wings={wings}
            divisions={divisions}
            fetchData={fetchData}
            triggerNotification={triggerNotification}
          />
        } />

        <Route index element={<Navigate to="data-list" replace />} />
        <Route path="*" element={<Navigate to="data-list" replace />} />
      </Routes>
    </div>
  );
}
