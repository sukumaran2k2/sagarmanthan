import { useMemo } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { FileText, GraduationCap, UserPlus, Briefcase, CalendarDays } from 'lucide-react';
import ContractualDataForm from '../components/ContractualDataForm';
import TrainingDataForm from '../components/TrainingDataForm';
import EmployeeDataForm from '../components/EmployeeDataForm';
import AddPostForm from '../components/AddPostForm';
import NonPortMonthlyUploadForm from '../components/NonPortMonthlyUploadForm';
import { HrIconTabs } from '../components/HrFormControls';
import { HR_VIEWS, hrInputForms } from '../utils/hrViews';

const INPUT_BASE = '/hr/hr-management/input-form';

// Id of the record being edited, so its form remounts (fresh state) for each record
const recordKey = (item) =>
  item?.['Training ID'] ?? item?.TRAINING_ID ?? item?.trainingId ?? item?.id ?? item?.contract_id ?? item?.['Contract ID']
  ?? item?.emp_master_id ?? 'new';

export default function InputForm({ permissions, notify, triggerNotification }) {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/non-port-upload')) return 'non-port-upload';
    if (path.includes('/training-data')) return 'training-data';
    if (path.includes('/employee-data')) return 'employee-data';
    if (path.includes('/add-post') || path.includes('/post-data')) return 'add-post';
    return 'contractual-data';
  }, [location.pathname]);

  // The record being edited travels with the route, so leaving the form drops it
  const editItem = location.state?.item ?? null;
  const isEditMode = Boolean(editItem);
  const formKey = String(recordKey(editItem));

  // Non-port organisations know these forms by their legacy names
  const isNonPort = permissions?.hrView === HR_VIEWS.NON_PORT;
  const tabs = [
    {
      id: 'contractual-data',
      label: isEditMode && currentTab === 'contractual-data' ? 'Update Contractual Data' : (isNonPort ? 'Contractual Training & Employment Form' : 'Contractual Data'),
      icon: FileText,
    },
    {
      id: 'training-data',
      label: isEditMode && currentTab === 'training-data' ? 'Update Training Data' : (isNonPort ? 'Training Details Form' : 'Training Data'),
      icon: GraduationCap,
    },
    { id: 'employee-data', label: isEditMode && currentTab === 'employee-data' ? 'Update Employee Data' : 'Employee Data', icon: UserPlus },
    { id: 'add-post', label: 'Add Post', icon: Briefcase },
    { id: 'non-port-upload', label: 'Non Port Monthly Upload Form', icon: CalendarDays },
  ];

  const bannerTitle = {
    'contractual-data': isEditMode ? 'Update Contractual Data' : 'Contractual Data Input Form',
    'training-data': isEditMode ? 'Update Training Data' : (isNonPort ? 'Training Details Input Form' : 'Training Data Input Form'),
    'non-port-upload': 'Non Port Monthly Upload Form',
  }[currentTab];

  // Forms this user's view offers: non-port organisations have no posts or employees to add
  const offered = hrInputForms(permissions?.hrView);
  const visibleTabs = isEditMode
    ? tabs.filter((t) => t.id === currentTab)
    : tabs.filter((t) => offered.includes(t.id));

  const handleTabChange = (tabId) => {
    navigate(`${INPUT_BASE}/${tabId}`);
  };

  if (offered.length > 0 && !offered.includes(currentTab)) return <Navigate to={`${INPUT_BASE}/${offered[0]}`} replace />;

  return (
    <div className="space-y-4 animate-fade-in">
      <HrIconTabs tabs={visibleTabs} current={currentTab} onChange={handleTabChange} label="HR input forms" />

      {currentTab === 'employee-data' ? (
        <div className="animate-fade-in">
          <Routes>
            {/* Keyed by the query / record: a new hand-off or another employee starts a fresh form */}
            <Route
              path="employee-data"
              element={<EmployeeDataForm key={`${location.search}|${formKey}`} editData={editItem} notify={notify} />}
            />
          </Routes>
        </div>
      ) : currentTab === 'add-post' ? (
        <div className="animate-fade-in">
          <Routes>
            <Route path="add-post" element={<AddPostForm notify={notify} onCancel={() => navigate('/hr/hr-management/organisation-structure')} />} />
          </Routes>
        </div>
      ) : (
        <div className="module-form-card animate-fade-in min-h-[500px]">
          <div className="module-form-banner">
            <div>
              <h3 className="module-form-banner-title">{bannerTitle}</h3>
              <p className="module-form-banner-subtext">Ministry of Ports, Shipping and Waterways</p>
            </div>
          </div>
          <div className="p-6">
            <Routes>
              <Route path="contractual-data" element={<ContractualDataForm key={formKey} editData={editItem} notify={notify} />} />
              <Route path="training-data" element={<TrainingDataForm key={formKey} editData={editItem} notify={notify} />} />
              <Route path="employee-data" element={<EmployeeDataForm notify={notify} />} />
              <Route path="add-post" element={<AddPostForm notify={notify} />} />
              {/* After a successful upload the form opens the upload history */}
              <Route path="non-port-upload" element={<NonPortMonthlyUploadForm triggerNotification={triggerNotification} />} />
              <Route index element={<Navigate to="contractual-data" replace />} />
              {/* Absolute: a relative target inside a splat route is appended to the unknown path */}
              <Route path="*" element={<Navigate to={`${INPUT_BASE}/contractual-data`} replace />} />
            </Routes>
          </div>
        </div>
      )}
    </div>
  );
}
