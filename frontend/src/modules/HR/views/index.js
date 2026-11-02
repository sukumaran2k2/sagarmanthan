import StandardListView from './StandardListView';
import SecretaryJsListView from './SecretaryJsListView';
import DirectorListView from './DirectorListView';

// One list view per UI view code, as in Parliamentary Issues. All three render the same
// page; what each user sees is narrowed server-side by their data scope.
// Vacancy Management itself is offered only where canViewVacancyManagement allows.
export const HR_LIST_VIEWS = {
  SECRETARY_JS: SecretaryJsListView,
  DIRECTOR: DirectorListView,
  STANDARD: StandardListView,
};

export const hrListViewKey = (uiViewCode) => String(uiViewCode || 'STANDARD').toUpperCase();

export function resolveHRListView(uiViewCode) {
  return HR_LIST_VIEWS[hrListViewKey(uiViewCode)] || StandardListView;
}

export default resolveHRListView;
