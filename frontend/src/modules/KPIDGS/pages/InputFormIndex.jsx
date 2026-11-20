import { useLocation } from 'react-router-dom';
import IndexCardGrid from '../components/IndexCardGrid';
import INPUT_FORM_INDEX, { INPUT_FORM_LEAVES } from '../data/inputFormIndex';
import PlaceholderInputForm from '../components/PlaceholderInputForm';
import FlaggingShipsTonnage from './inputs/FlaggingShipsTonnage';
import EntryExitCandidates from './inputs/EntryExitCandidates';
import VesselPortSurvey from './inputs/VesselPortSurvey';
import ExamMonthlyPerformance from './inputs/ExamMonthlyPerformance';
import ExamOverallPerformance from './inputs/ExamOverallPerformance';

// slug → the real input-form component for sections that have been built.
// Any slug missing from this map falls through to PlaceholderInputForm.
const FORM_BY_SLUG = {
  'flagging-of-vessels': FlaggingShipsTonnage,
  'exam-monthly-performance': ExamMonthlyPerformance,
  'exam-overall-performance': ExamOverallPerformance,
  'entry-exit-of-candidates': EntryExitCandidates,
  'vessel-port-survey': VesselPortSurvey,
};

// K-2.3 forms open for edit from the Data List (row in route state); keying them by route entry
// resets them to a blank Add form when reopened from the left list. Other forms keep their key.
const RESET_ON_REOPEN = new Set(['exam-monthly-performance', 'exam-overall-performance']);

const BACKEND_NOTES = {
  'flagging-of-vessels': 'Backend: POST /add-kpi2-1-1 · GET /kpi2-1-list',
  'sbfap-shipyard-list': 'Backend: GET /mmt-dropdown/mmt_shipyard (shipyard master)',
  'sbfap-inprincipal-approval': 'Backend: POST /add-2-2-1-data · PUT /edit-2-2-1-data · GET /kpi2-2-list · template: /kpi2-2-template',
  'sbfap-financial-assistance': 'Backend: POST /add-2-2-fa-data · PUT /edit-2-2-fa-data · GET /kpi2-2-fa-list · template: /kpi2-2-fa-template',
  'exam-monthly-performance': 'Backend: POST /add-kpi2-3-1 · PUT /edit-2-3-1-data · GET /kpi2-3-1-list',
  'exam-overall-performance': 'Backend: POST /add-kpi2-3-2 · GET /kpi2-3-2-list · masterdata: /get_addkpi2_3_masterdata/:year/:month/:type',
  'entry-exit-of-candidates': 'Backend: POST /add-kpi2-3-1 · PUT /edit-2-3-1-data · GET /kpi2-3-1-list',
  'marine-casualty-previous-current': 'Backend: Marine casualty endpoints (to be confirmed with DGS team)',
  'marine-casualty-yearwise': 'Backend: Marine casualty endpoints (to be confirmed with DGS team)',
  'marine-casualty-country-wise': 'Backend: Marine casualty endpoints (to be confirmed with DGS team)',
  'marine-casualty-vessel-wise': 'Backend: Marine casualty endpoints (to be confirmed with DGS team)',
  'flag-state-inspection': 'Backend: POST /add-kpi2-6-1, /add-kpi2-6-2-data · GET /kpi2-6-1-list, /kpi2-6-2-list',
  'port-state-control': 'Backend: POST /add-kpi2-7-1, /add-kpi2-7-2-data · GET /kpi2-7-1-list, /kpi2-7-2-list',
  'vessel-port-survey': 'Backend: POST /submit-vessel-survey-data · PUT /update-vessel-survey-data · GET /get-vessel-survey-data',
  'mti-master': 'Backend: POST /submit-mti-master-data · PUT /update-mti-master-data · GET /get-mti-master-data',
  'course-master': 'Backend: POST /submit-course-master-data · PUT /update-course-master-data · GET /get-course-master-data',
  'capacity-utilisation': 'Backend: Capacity utilisation endpoints under /get-course-type and MTI course master',
  'placement-record': 'Backend: Placement record endpoints under MTI master',
};

export default function InputFormIndex({ triggerNotification }) {
  const location = useLocation();

  return (
    <IndexCardGrid
      title="Input Forms"
      subtitle="Pick a section to open its data-entry form on the right."
      rows={INPUT_FORM_INDEX}
      routePrefix="/kpi/dgs/input-forms"
      renderRight={(slug) => {
        if (!slug) return null;
        const leaf = INPUT_FORM_LEAVES.find((l) => l.slug === slug);
        if (!leaf) {
          return (
            <PlaceholderInputForm
              code="--"
              title="Unknown input form"
              backendNote={`No input form is registered for slug "${slug}".`}
            />
          );
        }
        const RealForm = FORM_BY_SLUG[leaf.slug];
        if (RealForm) {
          const formKey = RESET_ON_REOPEN.has(leaf.slug) ? `${leaf.slug}-${location.key}` : leaf.slug;
          return <RealForm key={formKey} triggerNotification={triggerNotification} />;
        }
        return (
          <PlaceholderInputForm
            code={leaf.code}
            title={leaf.label}
            backendNote={BACKEND_NOTES[leaf.slug]}
          />
        );
      }}
    />
  );
}
