import StandardListView from './StandardListView';
import SecretaryJsListView from './SecretaryJsListView';
import DirectorListView from './DirectorListView';

const VIEW_REGISTRY = {
  SECRETARY_JS: SecretaryJsListView,
  DIRECTOR: DirectorListView,
  STANDARD: StandardListView,
};

export function resolveParliamentaryListView(uiViewCode) {
  const key = String(uiViewCode || 'STANDARD').toUpperCase();
  return VIEW_REGISTRY[key] || StandardListView;
}

export default resolveParliamentaryListView;
