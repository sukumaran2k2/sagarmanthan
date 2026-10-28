// Which HR pages each kind of user gets. One table, read by the HR tab bar (HR.jsx), the
// top menu (components/Tabs.jsx) and the route guard, so they never disagree.
//
//   PORT       organisation user of a Major Port (organisation category 1)
//   NON_PORT   organisation user of any other organisation (monthly Excel upload instead of posts)
//   SECRETARY  Secretary / Joint Secretary (UI view SECRETARY_JS)
//   MINISTRY   every other ministry-wide user

export const MAJOR_PORTS_CATEGORY_ID = 1;

export const HR_VIEWS = {
  PORT: 'PORT',
  NON_PORT: 'NON_PORT',
  SECRETARY: 'SECRETARY',
  MINISTRY: 'MINISTRY',
};

/**
 * organisationCategoryId: undefined when not known yet (a session from before the claim existed
 * and the organisation master not loaded); such a user keeps the Major Port pages until it is.
 * null means the organisation has no category, which is not a Major Port.
 */
export function resolveHrView({ isOrgUser, uiViewCode, organisationCategoryId }) {
  if (isOrgUser) {
    if (organisationCategoryId === undefined) return HR_VIEWS.PORT;
    return Number(organisationCategoryId) === MAJOR_PORTS_CATEGORY_ID ? HR_VIEWS.PORT : HR_VIEWS.NON_PORT;
  }
  return String(uiViewCode || '').toUpperCase() === 'SECRETARY_JS' ? HR_VIEWS.SECRETARY : HR_VIEWS.MINISTRY;
}

// Pages (first path segment under /hr/hr-management) each view may open: its menu pages and
// the pages they lead to. Permission checks (create/update, Vacancy Management...) still apply.
const VIEW_PAGES = {
  [HR_VIEWS.PORT]: [
    'hr-dashboard', 'organisation-structure', 'vacancy-management', 'vacancy-details', 'abolished-posts',
    'employee-database', 'employee-details', 'add-employee', 'add-post', 'administration',
    'contractual-employment', 'training-details', 'input-form', 'reports',
  ],
  [HR_VIEWS.NON_PORT]: [
    'hr-dashboard', 'non-port-monthly-upload', 'contractual-employment', 'training-details', 'input-form', 'reports',
  ],
  [HR_VIEWS.SECRETARY]: [
    'hr-dashboard', 'abolished-posts', 'contractual-employment', 'training-details', 'reports',
  ],
  // Ministry users read posts through the dashboard and reports, not one organisation's structure
  [HR_VIEWS.MINISTRY]: [
    'hr-dashboard', 'abolished-posts', 'employee-database', 'employee-details',
    'contractual-employment', 'training-details', 'reports',
  ],
};

export function hrViewAllows(view, pageId) {
  return (VIEW_PAGES[view] || VIEW_PAGES[HR_VIEWS.MINISTRY]).includes(pageId);
}

// Input form tabs per view; non-port organisations have no post structure to add to, and
// report posts and employees through the monthly Excel upload instead.
const VIEW_INPUT_FORMS = {
  [HR_VIEWS.PORT]: ['contractual-data', 'training-data', 'employee-data', 'add-post'],
  [HR_VIEWS.NON_PORT]: ['contractual-data', 'training-data', 'non-port-upload'],
};

export function hrInputForms(view) {
  return VIEW_INPUT_FORMS[view] || [];
}

/** The page segment of an HR path: '/hr/hr-management/reports/x' -> 'reports'. */
export function hrPageFromPath(pathname) {
  const match = /\/hr-management\/([^/?#]+)/i.exec(pathname || '');
  return match ? match[1].toLowerCase() : 'hr-dashboard';
}
