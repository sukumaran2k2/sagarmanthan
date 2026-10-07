import React, { useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import InternalNavigation from '../../../components/InternalNavigation';
import { FileText, GraduationCap } from 'lucide-react';
import ContractualDataForm from '../components/ContractualDataForm';
import TrainingDataForm from '../components/TrainingDataForm';

export default function InputForm({ triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/training-data')) return 'training-data';
    return 'contractual-data';
  }, [location.pathname]);

  const isEditMode = !!location.state?.editData;

  const tabs = [
    { id: 'contractual-data', label: isEditMode && currentTab === 'contractual-data' ? 'Update Contractual Data' : 'Contractual Data', icon: FileText },
    { id: 'training-data', label: isEditMode && currentTab === 'training-data' ? 'Update Training Data' : 'Training Data', icon: GraduationCap },
  ];

  const visibleTabs = isEditMode ? tabs.filter(t => t.id === currentTab) : tabs;

  const handleTabChange = (tabId) => {
    navigate(`/hr/hr-management/input-form/${tabId}`);
  };

  const BRAND = '#0f417a';
  const ACCENT = '#f1f5f9'; 
  const BORDER = '#e2e8f0'; 

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="overflow-hidden border-b mb-6 rounded-t-xl" style={{ borderColor: BORDER, background: 'transparent' }}>
        <div className="flex items-center overflow-x-auto px-2 gap-1 scrollbar-none">
          {visibleTabs.map((r) => {
            const Icon = r.icon;
            const isActive = currentTab === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => handleTabChange(r.id)}
                style={{
                  color: isActive ? '#ffffff' : '#64748b',
                  backgroundColor: isActive ? BRAND : 'transparent',
                }}
                className={`flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-200 cursor-pointer rounded-t-lg ${!isActive && 'hover:bg-[#0f417a] hover:text-white'}`}
              >
                <Icon size={16} strokeWidth={2.2} />
                <span>{r.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden border-l-4 border-l-[#0f417a] animate-fade-in min-h-[500px]">
        <div className="bg-gradient-to-r from-[#0f417a] to-[#1a5ba3] px-6 py-4.5 flex items-center justify-between text-white border-b border-[#0a2d55]/20">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider font-display">
              {currentTab === 'training-data' 
                ? (isEditMode ? 'Update Training Data' : 'Training Data Input Form') 
                : (isEditMode ? 'Update Contractual Data' : 'Contractual Data Input Form')}
            </h3>
            <p className="text-[10px] text-[#eadede] font-semibold tracking-wide mt-0.5">Ministry of Ports, Shipping and Waterways</p>
          </div>
        </div>
        <div className="p-6">
          <Routes>
            <Route path="contractual-data" element={<ContractualDataForm triggerNotification={triggerNotification} />} />
            <Route path="training-data" element={<TrainingDataForm triggerNotification={triggerNotification} />} />
            <Route index element={<Navigate to="contractual-data" replace />} />
            <Route path="*" element={<Navigate to="contractual-data" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
