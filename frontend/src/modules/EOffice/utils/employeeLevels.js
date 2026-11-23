// Level of designation codes in the employee list (mmt_employee_info.level), as in 2.0
export const EMPLOYEE_LEVELS = [
  { value: 'JS', label: 'JS and Above Level' },
  { value: 'DSDIR', label: 'Director and DS Level' },
  { value: 'US', label: 'US and Equivalent Level (US)' },
  { value: 'SO', label: 'SO and Equivalent Level' },
  { value: 'ASO', label: 'ASO and Equivalent Level (ASO)' },
  { value: 'YP', label: 'Young Professionals' },
  { value: 'CONSULTANT', label: 'Consultants' },
];

const LABELS = Object.fromEntries(EMPLOYEE_LEVELS.map((l) => [l.value, l.label]));
export const levelLabel = (code) => (code ? LABELS[String(code).toUpperCase()] || code : '');
