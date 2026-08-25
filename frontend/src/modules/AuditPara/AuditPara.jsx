import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { FileText, ClipboardList } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import AuditParaInput from './AuditParaInput';
import AuditParaReports from './AuditParaReports';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';

export default function AuditPara({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [auditParas, setAuditParas] = useState([]);

  const navTabs = [
    { id: 'input-form', label: 'Input Form', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/reports') || path.includes('/report')) return 'reports';
    return 'input-form';
  }, [location.pathname]);

  const fetchData = () => {
    axios.get(`${API_BASE_URL}/audit-para`)
      .then(res => {
        const mapped = res.data.map(r => {
          const steps = {
            1: r.received_at_ministry || 'No',
            2: r.comments_sought || 'No',
            3: r.comments_rec || 'No',
            4: r.under_clarification || 'No',
            5: r.comments_furnished || 'No',
            6: r.cag_accepted || 'No',
            7: r.disposed || 'No'
          };
          const dates = {
            1: r.date_of_receipt ? new Date(r.date_of_receipt).toISOString().split('T')[0] : '',
            2: r.comments_sought_date ? new Date(r.comments_sought_date).toISOString().split('T')[0] : '',
            3: r.comments_rec_date ? new Date(r.comments_rec_date).toISOString().split('T')[0] : '',
            4: '',
            5: r.comments_furnished_date ? new Date(r.comments_furnished_date).toISOString().split('T')[0] : '',
            6: r.cag_accepted_date ? new Date(r.cag_accepted_date).toISOString().split('T')[0] : '',
            7: r.disposed_date ? new Date(r.disposed_date).toISOString().split('T')[0] : ''
          };
          return {
            id: r.audit_para_id,
            paraNumber: r.para_number || '',
            subject: r.subject || '',
            wing: r.wing_name || '',
            division: r.division_name || '',
            category: r.category || 'Transaction Audit',
            statusSteps: steps,
            statusDates: dates,
            remarks: r.remarks || '',
            lastUpdated: r.updated_date ? new Date(r.updated_date).toISOString().split('T')[0] : ''
          };
        });
        setAuditParas(mapped);
      })
      .catch(err => console.error("Error fetching Audit Paras:", err));
  };

  useEffect(() => {
    fetchData();
  }, [location.pathname]);

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800">
      
      {/* Main Page Title and Internal Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-[#0f417a] tracking-wide uppercase font-display">
            Audit Paras
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Manage Audit Para records, divisional comments, and track progress status wing-wise.
          </p>
        </div>
        <div>
          <InternalNavigation
            tabs={navTabs}
            currentTab={currentTab}
            onTabChange={(tabId) => {
              if (tabId === 'reports') navigate('/governance/audit-paras/reports');
              else navigate('/governance/audit-paras/input-form');
            }}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <Routes>
          <Route path="input-form" element={
            <AuditParaInput
              auditParas={auditParas}
              setAuditParas={setAuditParas}
              refreshData={fetchData}
              triggerNotification={triggerNotification}
            />
          } />

          <Route path="reports" element={
            <AuditParaReports auditParas={auditParas} triggerNotification={triggerNotification} />
          } />

          <Route index element={<Navigate to="input-form" replace />} />
          <Route path="*" element={<Navigate to="input-form" replace />} />
        </Routes>
      </div>

    </div>
  );
}
