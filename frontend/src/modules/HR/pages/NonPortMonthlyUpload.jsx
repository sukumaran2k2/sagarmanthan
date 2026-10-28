import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Database, History } from 'lucide-react';
import NonPortUploadHistory from '../components/NonPortUploadHistory';
import { HrIconTabs } from '../components/HrFormControls';
import NonPortVacancyList from './NonPortVacancyList';

const BASE = '/hr/hr-management/non-port-monthly-upload';

const TABS = [
  { id: 'data', label: 'Uploaded Data', icon: Database },
  { id: 'history', label: 'Upload History', icon: History },
];

/**
 * Non-port organisations report their posts and employees as one Excel file a month
 * (legacy otherOrghrMonthlyUploadHistory): the uploaded rows and the list of files uploaded.
 * The file itself is uploaded from Input Forms (input-form/non-port-upload).
 */
export default function NonPortMonthlyUpload({ notify, triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();
  const current = TABS.find((t) => location.pathname.toLowerCase().includes(`/non-port-monthly-upload/${t.id}`))?.id;

  return (
    <div className="space-y-4 animate-fade-in">
      <HrIconTabs tabs={TABS} current={current} onChange={(id) => navigate(`${BASE}/${id}`)} label="Non port monthly upload" variant="pill" />

      <Routes>
        <Route path="data" element={<NonPortVacancyList triggerNotification={triggerNotification} />} />
        <Route path="history" element={<NonPortUploadHistory notify={notify} triggerNotification={triggerNotification} />} />
        <Route path="*" element={<Navigate to={`${BASE}/data`} replace />} />
      </Routes>
    </div>
  );
}
