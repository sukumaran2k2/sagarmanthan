import StudentEnrollmentDataList from '../components/StudentEnrollmentDataList';
import FinalYearPassPercentageDataList from '../components/FinalYearPassPercentageDataList';
import NewCourseUpgradationDataList from '../components/NewCourseUpgradationDataList';
import FacilitiesDataList from '../components/FacilitiesDataList';
import PartnershipDataList from '../components/PartnershipDataList';
import ResearchDataList from '../components/ResearchDataList';

const LIST_VIEW_REGISTRY = {
  studentEnrollment: StudentEnrollmentDataList,
  finalYearPassPercentage: FinalYearPassPercentageDataList,
  newCourseUpgradation: NewCourseUpgradationDataList,
  facilities: FacilitiesDataList,
  partnership: PartnershipDataList,
  research: ResearchDataList,
};

export function resolveIMUListView(sectionId) {
  return LIST_VIEW_REGISTRY[sectionId] || null;
}

export default resolveIMUListView;
