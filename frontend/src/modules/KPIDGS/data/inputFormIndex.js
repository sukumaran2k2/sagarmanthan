// Rows for the "KPI - DGS (Input Forms)" landing page (screenshot 2).
//
// Each row is either:
//   - A leaf:   { code, label, slug }               → renders as a blue link, and a route is
//                                                     registered at /kpi/dgs/input-forms/:slug
//   - A header: { code, label, isGroup: true, children: [...leaves...] }
//
// `slug` is also the key used by inputRouteMap.js to pick the page component.

const INPUT_FORM_INDEX = [
  { code: 'K-2.1', label: 'DGS- Flagging of Vessels', slug: 'flagging-of-vessels' },
  {
    code: 'K-2.2',
    label: 'DGS- Shipbuilding Financial Assistance Policy (SBFAP)',
    isGroup: true,
    children: [
      { code: 'K-2.2.A', label: 'Shipyard List', slug: 'sbfap-shipyard-list' },
      { code: 'K-2.2.B', label: 'In-Principle Approval Application', slug: 'sbfap-inprincipal-approval' },
      { code: 'K-2.2.C', label: 'Financial Assistance Application', slug: 'sbfap-financial-assistance' },
    ],
  },
  {
    code: 'K-2.3',
    label: 'DGS- Exam Performance',
    isGroup: true,
    children: [
      { code: 'K-2.3.1', label: 'Exam Monthly Performance', slug: 'exam-monthly-performance' },
      { code: 'K-2.3.2', label: 'Exam Overall Performance Statistics', slug: 'exam-overall-performance' },
    ],
  },
  { code: 'K-2.4', label: 'DGS- Entry and Exit of Candidates', slug: 'entry-exit-of-candidates' },
  {
    code: 'K-2.5',
    label: 'DGS- Marine Casualty Serious & Other Incidents',
    isGroup: true,
    children: [
      { code: 'K-2.5.1', label: 'Marine Casualty Serious & Other Incidents- Previous & Current Year', slug: 'marine-casualty-previous-current' },
      { code: 'K-2.5.2', label: 'Marine Casualty Incidents- Yearwise', slug: 'marine-casualty-yearwise' },
      { code: 'K-2.5.3', label: 'Marine Casualty Serious & Other Incidents- Country (Flag)-Wise', slug: 'marine-casualty-country-wise' },
      { code: 'K-2.5.4', label: 'Marine Casualty Serious & Other Incidents- Vessel-Wise', slug: 'marine-casualty-vessel-wise' },
    ],
  },
  {
    code: 'K-2.6',
    label: 'DGS- Flag State Inspection',
    isGroup: true,
    children: [
      { code: 'K-2.6.1', label: 'Flag State Inspection - MMD Wise List', slug: 'flag-state-inspection-mmd-wise' },
      { code: 'K-2.6.2', label: 'Flag State Inspection & GI Performance- Vessel Wise List', slug: 'flag-state-inspection-vessel-wise' },
    ],
  },
  {
    code: 'K-2.7',
    label: 'DGS- Port State Control (PSC) Inspection',
    isGroup: true,
    children: [
      { code: 'K-2.7.1', label: 'Port State Inspection - MMD Wise List', slug: 'port-state-inspection-mmd-wise' },
      { code: 'K-2.7.2', label: 'Port State Inspection & GI Performance- Vessel Wise List', slug: 'port-state-inspection-vessel-wise' },
    ],
  },
  { code: 'K-2.8', label: 'Vessel and Port Survey/Audits by MMDs', slug: 'vessel-port-survey' },
  {
    code: 'K-2.9',
    label: 'Maritime Training Institutes (MTIs) Performance',
    isGroup: true,
    children: [
      { code: 'K-2.9.MTI', label: 'MTI Master', slug: 'mti-master' },
      { code: 'K-2.9.COURSE', label: 'Course Master', slug: 'course-master' },
      { code: 'K-2.9.CAP', label: 'Capacity Utilisation', slug: 'capacity-utilisation' },
      { code: 'K-2.9.PLACE', label: 'Placement Record', slug: 'placement-record' },
    ],
  },
];

export default INPUT_FORM_INDEX;

// Flat list of every leaf row, useful for route/page registration.
export const INPUT_FORM_LEAVES = INPUT_FORM_INDEX.flatMap((row) =>
  row.isGroup ? row.children : [row]
);
