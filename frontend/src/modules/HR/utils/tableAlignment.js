// Column alignment rule for HR data tables:
//   names and descriptive text  -> left aligned (header and cell)
//   numbers, codes / IDs, dates, S.No, status badges and actions -> centred
// Styles live in ../hrTables.css; the classes override the per-column centring utilities.

const LEFT_KEYS = new Set([
  // organisation / department / post
  'Organisation', 'Organisation Name', 'organisation_name',
  'department', 'department_name', 'Department', 'emp_department_name',
  'post_name', 'Post Name', 'emp_post_name', 'Designation',
  // people
  'emp_name', 'Name', 'Employee Name', 'Current Occupant',
  // descriptive text
  'Training Title', 'Title', 'Training Type', 'Training Source',
  'to_be_filled_through', 'expected_method', 'method_of_appointment',
  'reason_for_exemption',
]);

const join = (...parts) => parts.filter(Boolean).join(' ');

function isLeft(col) {
  return LEFT_KEYS.has(col.field) || LEFT_KEYS.has(col.headerName);
}

function alignColumn(col) {
  if (Array.isArray(col.children)) {
    return { ...col, headerClass: join(col.headerClass, 'hr-col-center'), children: col.children.map(alignColumn) };
  }
  const side = isLeft(col) ? 'left' : 'center';
  return {
    ...col,
    headerClass: addClass(col.headerClass, `hr-col-${side}`),
    cellClass: addClass(col.cellClass, `hr-cell-${side}`),
  };
}

// ag-grid accepts a class as a string, an array or a function of params.
function addClass(existing, cls) {
  if (typeof existing === 'function') return (params) => join(existing(params), cls);
  if (Array.isArray(existing)) return [...existing, cls];
  return join(existing, cls);
}

export function alignHrColumns(columnDefs = []) {
  return columnDefs.map(alignColumn);
}
