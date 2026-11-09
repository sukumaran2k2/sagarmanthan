// The six CSR reports. Ministry-only ones compare organisations, so organisation users don't
// get them (the server returns nothing for them too). Names and numbers follow the approved
// report list (CSR.xlsx): the Ministry and organisations each have their own sheet, numbered
// from 1.1, so the three organisation reports carry their organisation names in `org` (QC R-16).
export const CSR_REPORTS = [
  {
    id: 'fund-year-wise-report',
    label: 'CSR Fund Year Wise Report',
    tab: 'CSR Fund Year Wise Report',
    title: 'Report No.: C.S.R 1.1 - CSR Fund Year Wise Report',
    ministryOnly: true,
  },
  {
    id: 'fund-org-wise-report',
    label: 'CSR Fund Organisation Wise Report',
    tab: 'CSR Fund Organisation Wise Report',
    title: 'Report No.: C.S.R 1.2 - CSR Fund Organisation Wise Report',
    ministryOnly: true,
  },
  {
    id: 'fund-org-trend-report',
    label: 'Organisation-wise CSR Fund Trend',
    tab: 'Organisation-wise CSR Fund Trend',
    title: 'Report No.: C.S.R 1.3 - Organisation-wise CSR Fund Trend',
    org: { label: 'CSR Fund - Summary Report', tab: 'CSR Fund - Summary Report', title: 'Report No.: C.S.R 1.1 - CSR Fund - Summary Report' },
  },
  {
    id: 'projects-year-wise-summary',
    label: 'Financial Year-wise CSR Projects Summary',
    tab: 'Financial Year-wise Projects Summary',
    title: 'Report No.: C.S.R 1.4 - Financial Year-wise CSR Projects Summary',
    org: { title: 'Report No.: C.S.R 1.2 - Financial Year-wise CSR Projects Summary' },
  },
  {
    id: 'projects-org-wise-summary',
    label: 'Organisation-wise CSR Projects Summary',
    tab: 'Organisation-wise Projects Summary',
    title: 'Report No.: C.S.R 1.5 - Organisation-wise CSR Projects Summary',
    ministryOnly: true,
  },
  {
    id: 'projects-focus-wise-summary',
    label: 'CSR Focus/Project Area-wise CSR Projects Summary',
    tab: 'CSR Focus Area-wise Projects Summary',
    title: 'Report No.: C.S.R 1.6 - CSR Focus/Project Area-wise CSR Projects Summary',
    org: { title: 'Report No.: C.S.R 1.3 - CSR Focus/Project Area-wise CSR Projects Summary' },
  },
];

// The reports this user sees, with the organisation names and numbers for organisation users
export const reportsFor = (isOrgUser) => (isOrgUser
  ? CSR_REPORTS.filter((r) => !r.ministryOnly).map(({ org, ...r }) => ({ ...r, ...org }))
  : CSR_REPORTS);

// The stored report when the user can see it, else their first report
export const resolveReport = (reportType, isOrgUser) => {
  const list = reportsFor(isOrgUser);
  return list.find((r) => r.id === reportType) || list[0];
};
