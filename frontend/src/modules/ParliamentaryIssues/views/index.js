import StandardListView from './StandardListView';
import SecretaryJsListView from './SecretaryJsListView';
import DirectorListView from './DirectorListView';

// Data List per UI view code. A plain lookup (not a function call during render),
// so React keeps the same component between renders.
export const PARLIAMENTARY_LIST_VIEWS = {
  SECRETARY_JS: SecretaryJsListView,
  DIRECTOR: DirectorListView,
  STANDARD: StandardListView,
};

export const listViewKey = (uiViewCode) => {
  const key = String(uiViewCode || 'STANDARD').toUpperCase();
  return key in PARLIAMENTARY_LIST_VIEWS ? key : 'STANDARD';
};
