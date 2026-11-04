// Option lists shared by the Employee Data form and the Employee Details page

// Values stored in tbl_employee_master, as the legacy Add Employee page (addHrEmpData.html) saved them
export const PWBD_OPTIONS = [
  { value: 'NA', label: 'Not Applicable (NA)' },
  { value: 'HH', label: 'Hearing Handicapped (HH)' },
  { value: 'PH', label: 'Physically Handicapped (PH)' },
  { value: 'OH', label: 'Orthopedically Handicapped (OH)' },
  { value: 'VH', label: 'Visually Handicapped (VH)' },
  { value: 'MD', label: 'Multiple Disability (MD)' },
];

// Discipline of each UG / PG degree (ids stored comma-separated in ug_discipline / pg_discipline),
// the same list as the legacy Add Employee page
export const DISCIPLINES = [
  { value: '1', label: 'Arts' },
  { value: '2', label: 'Science' },
  { value: '3', label: 'Engineering' },
  { value: '4', label: 'Computer Application' },
  { value: '5', label: 'Management' },
  { value: '6', label: 'Economics' },
  { value: '7', label: 'Commerce' },
  { value: '8', label: 'Medical' },
  { value: '9', label: 'Law' },
];
