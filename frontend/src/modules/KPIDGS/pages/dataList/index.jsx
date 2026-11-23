import { useParams } from 'react-router-dom';
import GenericReportPage from '../../components/GenericReportPage';
import { INPUT_FORM_LEAVES } from '../../data/inputFormIndex';
import * as api from '../../api';

// slug (from inputFormIndex) → the list-GET endpoint for that section.
// Sections with two underlying list endpoints (K-2.2 SBFAP, K-2.6, K-2.7, K-2.9)
// use the primary one here; the alternative list is reachable from within the
// section's input form flow.
const LIST_FETCH_BY_SLUG = {
  'flagging-of-vessels': () => api.fetchKpi2_1_List(),
  'sbfap': () => api.fetchKpi2_2_List(),
  'exam-overall-performance': () => api.fetchKpi2_3_2_List(),
  'entry-exit-of-candidates': () => api.fetchKpi2_3_1_List(),
  // K-2.5 marine casualty: endpoints TBD; fall back to parent section list.
  'marine-casualty-previous-current': () => api.fetchKpi2_1_List(),
  'marine-casualty-yearwise': () => api.fetchKpi2_1_List(),
  'marine-casualty-country-wise': () => api.fetchKpi2_1_List(),
  'marine-casualty-vessel-wise': () => api.fetchKpi2_1_List(),
  'flag-state-inspection': () => api.fetchKpi2_6_1_List(),
  'port-state-control': () => api.fetchKpi2_7_1_List(),
  'vessel-port-survey': () => api.fetchVesselSurveyList(),
  'mti-master': () => api.fetchMtiMasterList(),
  'course-master': () => api.fetchCourseMasterList(),
  'capacity-utilisation': () => api.fetchCourseMasterList(),
  'placement-record': () => api.fetchMtiMasterList(),
};

export default function DataListLeaf({ triggerNotification }) {
  const { slug } = useParams();
  const leaf = INPUT_FORM_LEAVES.find((l) => l.slug === slug);
  const fetchFn = LIST_FETCH_BY_SLUG[slug];

  if (!leaf || !fetchFn) {
    return (
      <div className="module-card">
        <p className="text-sm text-slate-600">No data list is registered for slug "{slug}".</p>
      </div>
    );
  }

  return (
    <GenericReportPage
      code={leaf.code}
      title={leaf.label}
      fetchFn={fetchFn}
      triggerNotification={triggerNotification}
      backTo="/kpi/dgs/data-list"
      backLabel="Back to Data List"
    />
  );
}
