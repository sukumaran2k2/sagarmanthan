import IndexCardGrid from '../components/IndexCardGrid';
import INPUT_FORM_INDEX, { INPUT_FORM_LEAVES } from '../data/inputFormIndex';
import GenericReportPage from '../components/GenericReportPage';
import * as api from '../api';

const LIST_FETCH_BY_SLUG = {
  'flagging-of-vessels': () => api.fetchKpi2_1_List(),
  // K-2.2 SBFAP is split into 3 views: shipyard master, in-principle approval list,
  // financial-assistance (fund release) list.
  'sbfap-shipyard-list': () => api.fetchShipyardList(),
  'sbfap-inprincipal-approval': () => api.fetchKpi2_2_List(),
  'sbfap-financial-assistance': () => api.fetchKpi2_2_Fa_List(),
  'exam-overall-performance': () => api.fetchKpi2_3_2_List(),
  'entry-exit-of-candidates': () => api.fetchEntryExitList(),
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

export default function DataListIndex({ triggerNotification }) {
  return (
    <IndexCardGrid
      title="Data List"
      subtitle="Pick a section to view its saved entries on the right."
      rows={INPUT_FORM_INDEX}
      routePrefix="/kpi/dgs/data-list"
      renderRight={(slug) => {
        if (!slug) return null;
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
            key={slug}
            code={leaf.code}
            title={leaf.label}
            fetchFn={fetchFn}
            triggerNotification={triggerNotification}
            showBack={false}
          />
        );
      }}
    />
  );
}
