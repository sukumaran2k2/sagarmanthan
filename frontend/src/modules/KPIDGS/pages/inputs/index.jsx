import { useParams } from 'react-router-dom';
import PlaceholderInputForm from '../../components/PlaceholderInputForm';
import { INPUT_FORM_LEAVES } from '../../data/inputFormIndex';

// Notes shown under each placeholder, naming the backend endpoints that back this
// leaf so a developer picking up the UI knows exactly which controller to wire.
const BACKEND_NOTES = {
  'flagging-of-vessels': 'Backend: POST /add-kpi2-1-1 · GET /kpi2-1-list',
  'sbfap': 'Backend: POST /add-2-2-1-data, /add-2-2-fa-data · GET /kpi2-2-list, /kpi2-2-fa-list · templates: /kpi2-2-template, /kpi2-2-fa-template',
  'exam-overall-performance': 'Backend: POST /add-kpi2-3-2 · GET /kpi2-3-2-list · masterdata: /get_addkpi2_3_masterdata/:year/:month/:type',
  'entry-exit-of-candidates': 'Backend: POST /add-entry-exit-data · PUT /update-entry-exit-data-by-id · GET /get-entry-exit-data',
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

export default function InputFormLeaf() {
  const { slug } = useParams();
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

  return (
    <PlaceholderInputForm
      code={leaf.code}
      title={leaf.label}
      backendNote={BACKEND_NOTES[leaf.slug]}
    />
  );
}
