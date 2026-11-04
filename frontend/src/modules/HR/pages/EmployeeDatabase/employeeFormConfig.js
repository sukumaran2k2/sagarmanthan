// Employee Data form: limits and stages shared by the form and its stage panels.

export const MAX_DEGREES = 10;
export const DEGREE_KEYS = { ugCount: 'ugDisciplines', pgCount: 'pgDisciplines' };

// Column sizes in tbl_employee_master: longer text fails the insert (SQL error 2628)
export const MAX_LENGTH = { employeeName: 50, referenceNumber: 50, empDivisionName: 100, otherParentOrg: 100 };

export const EMPLOYEE_STAGES = [
  { id: 'basic', number: '01', title: 'Basic Details', subtitle: 'Personal & Demographics' },
  { id: 'education', number: '02', title: 'Educational Qualification', subtitle: 'Degrees & Highest Level' },
  { id: 'designation', number: '03', title: 'Designation & Post', subtitle: 'Post, Dept & Joining' },
];
