import StandardListView from './StandardListView';
import SecretaryJsListView from './SecretaryJsListView';
import DirectorListView from './DirectorListView';

// Vacancy Management is only offered in the Standard view (see canViewVacancyManagement),
// so the Secretary/JS view has no entry here.
const VIEW_REGISTRY = {
  STANDARD: StandardListView,
};

export function resolveHRListView(uiViewCode) {
  const key = String(uiViewCode || 'STANDARD').toUpperCase();
  return VIEW_REGISTRY[key] || StandardListView;
}

export {
  StandardListView,
  SecretaryJsListView,
  DirectorListView,
};

export default resolveHRListView;
