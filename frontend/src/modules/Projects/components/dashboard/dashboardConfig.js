// Filter definitions of the Projects dashboard, as on the workbook's Dashboard sheet.

export const SELECT_FILTERS = [
  { key: 'delayStatus', label: 'Delay Status (ongoing)' },
  { key: 'category', label: 'Project Category' },
  { key: 'approvalRoute', label: 'Approval Route' },
  { key: 'state', label: 'State' },
  { key: 'scheme', label: 'Scheme' },
  { key: 'funding', label: 'Source of Funding' },
  { key: 'costBand', label: 'Cost Band' },
  { key: 'capacityBand', label: 'Capacity Band' },
  { key: 'progressBand', label: 'Implementation Milestone' },
  { key: 'foundationLaid', label: 'Foundation Laid' },
  { key: 'inaugurated', label: 'Inaugurated' },
];

export const RANGE_FILTERS = [
  { key: 'estimatedCost', label: 'Estimated Cost (₹ Cr)' },
  { key: 'physicalProgress', label: 'Physical Progress (%)' },
  { key: 'capacity', label: 'Capacity Addition (MTPA)' },
];

export const DATE_FILTERS = [
  { key: 'initiated', label: 'Project Initiated Date' },
  { key: 'chairmanApproval', label: 'Chairman / Board Approval Date' },
  { key: 'adminApproval', label: 'Admin Approval Date' },
  { key: 'sanctioned', label: 'Sanctioned Date (board / admin approval)' },
  { key: 'awardOriginal', label: 'Original Target Award / LOA Issued Date' },
  { key: 'awardLatest', label: 'Latest Target Award / LOA Issued Date' },
  { key: 'awardActual', label: 'Actual Award / LOA Issued Date' },
  { key: 'targetOriginal', label: 'Original Target Completion Date' },
  { key: 'targetLatest', label: 'Latest Target Completion Date' },
  { key: 'completion', label: 'Actual Date of Completion' },
  { key: 'foundationActual', label: 'Foundation Date (Actual)' },
  { key: 'foundationExpected', label: 'Foundation Date (Expected)' },
  { key: 'inaugurationActual', label: 'Inauguration Date (Actual)' },
  { key: 'inaugurationExpected', label: 'Inauguration Date (Expected)' },
  { key: 'lastUpdated', label: 'Last Updated Date' },
];

// Keys of the "More filters" panel, in the query-string form the API takes.
export const PANEL_KEYS = [
  ...SELECT_FILTERS.map((f) => f.key),
  ...RANGE_FILTERS.flatMap((f) => [`${f.key}Min`, `${f.key}Max`]),
  ...DATE_FILTERS.flatMap((f) => [`${f.key}From`, `${f.key}To`]),
];
