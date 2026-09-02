import { useState, useEffect } from 'react';
import { GraduationCap, BookOpen, Building2, Handshake, FlaskConical, Users, Construction } from 'lucide-react';
import InternalNavigation from '../../components/InternalNavigation';
import RestrictedAccess from '../../components/RestrictedAccess';
import StudentEnrollmentDataList from './pages/StudentEnrollment/DataList';
import StudentEnrollmentInputForm from './pages/StudentEnrollment/InputForm';
import StudentEnrollmentReports from './pages/StudentEnrollment/Reports';
import FinalYearPassPercentageDataList from './pages/FinalYearPassPercentage/DataList';
import FinalYearPassPercentageInputForm from './pages/FinalYearPassPercentage/InputForm';
import FinalYearPassPercentageReports from './pages/FinalYearPassPercentage/Reports';
import NewCourseUpgradationDataList from './pages/NewCourseUpgradation/DataList';
import NewCourseUpgradationInputForm from './pages/NewCourseUpgradation/InputForm';
import NewCourseUpgradationReports from './pages/NewCourseUpgradation/Reports';
import FacilitiesDataList from './pages/Facilities/DataList';
import FacilitiesInputForm from './pages/Facilities/InputForm';
import FacilitiesReports from './pages/Facilities/Reports';
import PartnershipDataList from './pages/Partnership/DataList';
import PartnershipInputForm from './pages/Partnership/InputForm';
import PartnershipReports from './pages/Partnership/Reports';
import ResearchDataList from './pages/Research/DataList';
import ResearchInputForm from './pages/Research/InputForm';
import ResearchReports from './pages/Research/Reports';
import { useIMUPermissions } from './hooks/useIMUPermissions';
import { getCurrentUserId } from '../../utils/authSession';
import {
  fetchStudentEnrollment, deleteStudentEnrollment,
  fetchFinalYearPassPercentage, deleteFinalYearPassPercentage,
  fetchNewCourseUpgradation, deleteNewCourseUpgradation,
  fetchFacilities, deleteFacilities,
  fetchPartnership, deletePartnership,
  fetchResearch, deleteResearch,
} from './api';

// The 5 real IMU KPI sections (K-5.1 through K-5.5), confirmed against the
// legacy site's report form numbers. Final Year Pass Percentage (K-5.1.1)
// is a sub-section of Student Enrollment (K-5.1), not its own top-level
// item, matching how the legacy site treats it. HR & Faculty has a legacy
// page (imuHrFaculty.html) but no backend controller or report function --
// left out until that's built.
const SECTIONS = [
  { id: 'studentEnrollment', code: 'K-5.1', label: 'IMU - Student Enrollment', icon: GraduationCap, ready: true },
  { id: 'finalYearPassPercentage', code: 'K-5.1.1', label: 'IMU - Final Year Pass %', icon: Users, ready: true },
  { id: 'newCourseUpgradation', code: 'K-5.2', label: 'IMU - New Courses & Upgradation', icon: BookOpen, ready: true },
  { id: 'facilities', code: 'K-5.3', label: 'IMU - Facilities', icon: Building2, ready: true },
  { id: 'partnership', code: 'K-5.4', label: 'IMU - Partnerships/MoUs', icon: Handshake, ready: true },
  { id: 'research', code: 'K-5.5', label: 'IMU - Research, Innovation & Startups', icon: FlaskConical, ready: true },
];

export default function IMUView({ activeTab, triggerNotification }) {
  const permissions = useIMUPermissions();
  const { canAdd, canEdit, canView, canRemove } = permissions;

  const [activeSection, setActiveSection] = useState('studentEnrollment');
  const [activeSubTab, setActiveSubTab] = useState(activeTab === 'IMU Reports' ? 'report' : 'list');

  const [rowData, setRowData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState(null);

  const currentSection = SECTIONS.find((s) => s.id === activeSection);

  const tabs = [];
  if (canAdd) tabs.push({ id: 'add', label: 'Input Form' });
  if (canView) tabs.push({ id: 'list', label: 'Data List' });
  if (canView) tabs.push({ id: 'report', label: 'Reports' });

  const fetchData = () => {
    if (activeSection === 'studentEnrollment') {
      setLoading(true);
      fetchStudentEnrollment()
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Student Enrollment data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'finalYearPassPercentage') {
      setLoading(true);
      fetchFinalYearPassPercentage()
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Final Year Pass Percentage data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'newCourseUpgradation') {
      setLoading(true);
      fetchNewCourseUpgradation()
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading New Course Upgradation data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'facilities') {
      setLoading(true);
      fetchFacilities()
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Facilities data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'partnership') {
      setLoading(true);
      fetchPartnership()
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Partnership data:', err))
        .finally(() => setLoading(false));
    } else if (activeSection === 'research') {
      setLoading(true);
      fetchResearch()
        .then((res) => setRowData(res.data || []))
        .catch((err) => console.error('Error loading Research data:', err))
        .finally(() => setLoading(false));
    }
  };

    useEffect(() => {
    setEditData(null);
    fetchData();
  }, [activeSection]);

  const handleEdit = (row) => {
    setEditData(row);
    setActiveSubTab('add');
  };

  const handleSuccess = () => {
    setEditData(null);
    setActiveSubTab('list');
    fetchData();
  };

  const handleDelete = (row) => {
    if (activeSection === 'studentEnrollment') {
      if (!window.confirm(`Delete the Student Enrollment entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteStudentEnrollment(row.student_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Student Enrollment entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Student Enrollment entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'finalYearPassPercentage') {
      if (!window.confirm(`Delete the Final Year Pass Percentage entry for ${row.programme} ${row.batch}? This cannot be undone.`)) return;
      deleteFinalYearPassPercentage(row.id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Final Year Pass Percentage entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Final Year Pass Percentage entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'newCourseUpgradation') {
      if (!window.confirm(`Delete the New Course Upgradation entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteNewCourseUpgradation(row.course_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('New Course Upgradation entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting New Course Upgradation entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'facilities') {
      if (!window.confirm(`Delete the Facilities entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteFacilities(row.facilities_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Facilities entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Facilities entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'partnership') {
      if (!window.confirm(`Delete the Partnership entry for ${row.financial_year}? This cannot be undone.`)) return;
      deletePartnership(row.partnership_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Partnership entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Partnership entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    } else if (activeSection === 'research') {
      if (!window.confirm(`Delete the Research entry for ${row.financial_year}? This cannot be undone.`)) return;
      deleteResearch(row.research_id, getCurrentUserId())
        .then(() => {
          triggerNotification && triggerNotification('Research entry deleted successfully', 'success');
          fetchData();
        })
        .catch((err) => {
          console.error('Error deleting Research entry:', err);
          triggerNotification ? triggerNotification('Failed to delete entry.', 'error') : alert('Failed to delete entry.');
        });
    }
  };

  if (!canAdd && !canView && !canEdit) {
    return <RestrictedAccess moduleName="KPI - IMU" />;
  }

  return (
    <div className="space-y-6 px-1 md:px-2 py-4 animate-fade-in text-slate-800 dark:text-slate-100">
      <div className="flex flex-col gap-5 pb-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#0f417a] dark:text-blue-400 tracking-wide uppercase font-display">
              KPI - IMU
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
              Indian Maritime University -- track KPI data across all sections.
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

        <div className="border-b border-slate-200 dark:border-slate-700" />

        <div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Section</span>
          <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-left transition cursor-pointer border flex-shrink-0 ${
                    activeSection === s.id ? 'bg-[#0f417a]/10 dark:bg-blue-500/10 border-[#0f417a]/30 dark:border-blue-500/40' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">{s.code}</span>
                    <span className={`text-xs font-bold whitespace-nowrap ${activeSection === s.id ? 'text-[#0f417a] dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{s.label}</span>
                  </div>
                  {!s.ready && (
                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">Soon</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mt-1.5">Scroll for more sections →</p>
        </div>
      </div>

      <div className={(activeSubTab === 'report' || activeSubTab === 'add') ? 'mt-2' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mt-2'}>
        {!currentSection.ready ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Construction className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{currentSection.label}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">This section is coming soon.</p>
          </div>
        ) : activeSection === 'studentEnrollment' ? (
          activeSubTab === 'report' ? (
            <StudentEnrollmentReports />
          ) : activeSubTab === 'add' ? (
            <StudentEnrollmentInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <StudentEnrollmentDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'finalYearPassPercentage' ? (
          activeSubTab === 'report' ? (
            <FinalYearPassPercentageReports />
          ) : activeSubTab === 'add' ? (
            <FinalYearPassPercentageInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <FinalYearPassPercentageDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'newCourseUpgradation' ? (
          activeSubTab === 'report' ? (
            <NewCourseUpgradationReports />
          ) : activeSubTab === 'add' ? (
            <NewCourseUpgradationInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <NewCourseUpgradationDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'facilities' ? (
          activeSubTab === 'report' ? (
            <FacilitiesReports />
          ) : activeSubTab === 'add' ? (
            <FacilitiesInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <FacilitiesDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'partnership' ? (
          activeSubTab === 'report' ? (
            <PartnershipReports />
          ) : activeSubTab === 'add' ? (
            <PartnershipInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <PartnershipDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : activeSection === 'research' ? (
          activeSubTab === 'report' ? (
            <ResearchReports />
          ) : activeSubTab === 'add' ? (
            <ResearchInputForm
              editData={editData}
              onBack={() => { setEditData(null); setActiveSubTab('list'); }}
              onSuccess={handleSuccess}
              triggerNotification={triggerNotification}
            />
          ) : (
            <ResearchDataList
              rowData={rowData}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              canEdit={canEdit}
              canRemove={canRemove}
            />
          )
        ) : null}
      </div>
    </div>
  );
}
