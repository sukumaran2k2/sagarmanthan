// HR reports, ported from the live (uncommented) rows of the legacy
// pages/HR/hrMinistryReviewReports.html. The index lists every section and report; inside a
// section with a Major Ports and a Non-Major Ports report, a filter switches between them.

// Organisations the legacy index treats as "other organisations": their users do not
// get the Major Ports vacancy history.
const NON_MAJOR_PORT_ORG_IDS = new Set([15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 27, 62]);

export function canSeeMajorPortVacancyHistory({ isOrgUser, orgId }) {
  return !(isOrgUser && NON_MAJOR_PORT_ORG_IDS.has(Number(orgId)));
}

export const REPORTS_BASE = '/hr/hr-management/reports';

export const MAJOR_PORTS = 1;
export const NON_MAJOR_PORTS = 3;

export const REPORT_SECTIONS = [
  {
    title: 'Vacancy History',
    coding: 'H-2.0',
    reports: [
      {
        id: 'vacancy-history',
        coding: 'H-2.0.1',
        title: 'Vacancy History - Major Ports',
        heading: 'Report No.: H 2.0.1 - Vacancy History (Major Ports)',
        kind: 'vacancyHistory',
        isVisible: canSeeMajorPortVacancyHistory,
      },
    ],
  },
  {
    title: 'Manpower Overview',
    coding: 'H-2.1',
    reports: [
      { id: 'manpower-overview-major', coding: 'H-2.1.1', title: 'Manpower Overview - Major Ports', heading: 'Report No.: H 2.1.1 - Manpower Overview (Major Ports)', kind: 'mis', mis: 'staffingOverview', orgCategory: MAJOR_PORTS },
      { id: 'manpower-overview-non-major', coding: 'H-2.1.2', title: 'Manpower Overview - Non Major Ports', heading: 'Report No.: H 2.1.2 - Manpower Overview (Non - Major Ports)', kind: 'mis', mis: 'staffingOverview', orgCategory: NON_MAJOR_PORTS },
    ],
  },
  {
    title: 'Total Manpower Sanction and actual',
    coding: 'H-2.2',
    reports: [
      { id: 'manpower-sanction-major', coding: 'H-2.2.1', title: 'Total Manpower Sanction and actual - Major Ports', heading: 'Report No.: H 2.2.1 - Total Manpower Sanction and actual (Major Ports)', kind: 'mis', mis: 'sanctionActual', orgCategory: MAJOR_PORTS, clusterToggle: true },
      { id: 'manpower-sanction-non-major', coding: 'H-2.2.2', title: 'Total Manpower Sanction and actual - Non Major Ports', heading: 'Report No.: H 2.2.2 - Total Manpower Sanction and actual (Non-Major Ports)', kind: 'mis', mis: 'sanctionActual', orgCategory: NON_MAJOR_PORTS },
    ],
  },
  {
    title: 'Gender Wise Manpower',
    coding: 'H-2.3',
    reports: [
      { id: 'gender-wise-major', coding: 'H-2.3.1', title: 'Gender Wise Manpower - Major Ports', heading: 'Report No.: H 2.3.1 - Gender Wise Manpower (Major Ports)', kind: 'mis', mis: 'genderWise', orgCategory: MAJOR_PORTS },
      { id: 'gender-wise-non-major', coding: 'H-2.3.2', title: 'Gender Wise Manpower - Non Major Ports', heading: 'Report No.: H 2.3.2 - Gender Wise Manpower (Non - Major Ports)', kind: 'mis', mis: 'genderWise', orgCategory: NON_MAJOR_PORTS },
    ],
  },
  {
    title: 'Actual Manpower Regular & Contract',
    coding: 'H-2.4',
    reports: [
      { id: 'manpower-class-wise-major', coding: 'H-2.4.1', title: 'Actual Manpower Regular & Contract - Major Ports', heading: 'Report No.: H 2.4.1 - Actual Manpower Regular - Class Wise (Major Port) Report', kind: 'mis', mis: 'classWise', orgCategory: MAJOR_PORTS, clusterToggle: true },
      { id: 'manpower-class-wise-non-major', coding: 'H-2.4.2', title: 'Actual Manpower Regular & Contract - Non Major Ports', heading: 'Report No.: H 2.4.2 - Actual Manpower Regular - Class Wise (Non Major Port) Report', kind: 'mis', mis: 'classWise', orgCategory: NON_MAJOR_PORTS },
    ],
  },
  {
    title: 'Contractual Details Report',
    coding: '',
    reports: [
      { id: 'contractual-details', coding: 'H-3.1', title: 'Abstract - Contractual Details Report', heading: 'Report No.: H-3.1 - Abstract - Overview of Contractual Details Reports', kind: 'contractual' },
    ],
  },
  {
    title: 'Training Details Report',
    coding: '',
    reports: [
      { id: 'training-details', coding: 'H-4.1', title: 'Abstract - Training Details Report', heading: 'Report No.: H-4.1 - Abstract - Overview of Training Details Reports', kind: 'training' },
    ],
  },
];

/** Sections and reports the signed-in user may open. */
export function visibleSections(identity) {
  return REPORT_SECTIONS.map((s) => ({
    ...s,
    reports: s.reports.filter((r) => !r.isVisible || r.isVisible(identity)),
  })).filter((s) => s.reports.length > 0);
}

export function visibleReports(identity) {
  return visibleSections(identity).flatMap((s) => s.reports);
}

export const portCategoryLabel = (report) =>
  report.orgCategory === NON_MAJOR_PORTS ? 'Non-Major Ports' : 'Major Ports';

/** The visible section holding `reportId`, or null. */
export function sectionOf(identity, reportId) {
  return visibleSections(identity).find((s) => s.reports.some((r) => r.id === reportId)) || null;
}

/** Rows for the reports index: a bold section row followed by its report links. */
export function indexRows(identity) {
  const rows = [];
  visibleSections(identity).forEach((section, i) => {
    rows.push({ key: `s-${i}`, sNo: String(i + 1), coding: section.coding, title: section.title, isSection: true });
    section.reports.forEach((r) => rows.push({ key: r.id, sNo: '', coding: r.coding, title: r.title, report: r }));
  });
  return rows;
}
