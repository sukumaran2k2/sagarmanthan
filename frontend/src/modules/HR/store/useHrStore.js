import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { fetchHrDepartments, fetchMmtDropdown } from '../api';
import { createListActions, listState } from './listSlice';
import { clearDepartmentCache } from '../hooks/useHrFilterOptions';

/**
 * HR Management store.
 * Keeps what must survive switching between the HR pages:
 *  - reference data (the organisation's departments, all organisations), loaded once
 *  - filters, search, pagination and column visibility of each list
 *      employees          = HR Administration & Actions (server-paged)
 *      overview           = Vacancy Management - Vacancy Overview (server-paged)
 *      anticipated        = Vacancy Management - Anticipated Vacancies (server-paged)
 *      abolished          = List of Abolished Posts (server-paged)
 *      employeeDatabase   = Employee Database
 *      orgStructure       = Organisation Structure
 *      contractual        = Contractual Employment
 *      training           = Training Details
 *  - the open Vacancy Management tab
 * visibleCols holds only the user's changes; each page merges them over its own defaults.
 * The record being edited travels with the route (location.state.item); fetched rows come
 * from the HR request cache (usePagedList) or the page's own state.
 */

export const CURRENT_YEAR = new Date().getFullYear().toString();

const employeesFilterDefaults = () => ({ departmentId: '', postId: '', className: '', exactMatch: false });
const overviewFilterDefaults = () => ({ departmentId: '', postId: '', className: '', abolishingOnly: false, exactMatch: false });
const anticipatedFilterDefaults = () => ({ departmentId: '', postId: '', className: '', years: [CURRENT_YEAR] });
// Filters hold ids (department_id, post_id, organisation_id) and the class label, as on Vacancy Management
const abolishedFilterDefaults = () => ({ organisationId: '', departmentId: '', postId: '', className: '' });
// workingStatus null = the view's default (Active for organisation users, all for the Ministry)
const employeeDatabaseFilterDefaults = () => ({
  organisationId: '', departmentId: '', postId: '', className: '', workingStatus: null,
});
const orgStructureFilterDefaults = () => ({ organisationId: '', departmentId: '', postId: '', className: '' });
const contractualFilterDefaults = () => ({ organisation: '', year: '' });
const trainingFilterDefaults = () => ({ organisation: '', year: '', type: '', source: '' });

const withColumns = (state) => ({ ...state, visibleCols: {} });

const createInitialState = () => ({
  departments: [],
  organisations: [],
  mastersOrgId: null,
  loadingMasters: false,
  mastersError: null,

  vacancyTab: 'overview',
  employees: withColumns(listState(employeesFilterDefaults())),
  overview: withColumns(listState(overviewFilterDefaults())),
  anticipated: withColumns(listState(anticipatedFilterDefaults())),
  abolished: withColumns(listState(abolishedFilterDefaults())),
  employeeDatabase: withColumns(listState(employeeDatabaseFilterDefaults())),
  orgStructure: withColumns(listState(orgStructureFilterDefaults())),
  contractual: withColumns(listState(contractualFilterDefaults())),
  training: withColumns(listState(trainingFilterDefaults())),
});

const asList = (res) => (Array.isArray(res?.data) ? res.data : res?.data?.data || []);

export const useHrStore = create((set, get) => ({
  ...createInitialState(),

  setVacancyTab: (vacancyTab) => set({ vacancyTab }),

  employeesActions: createListActions('employees', employeesFilterDefaults, set, get),
  overviewActions: createListActions('overview', overviewFilterDefaults, set, get),
  anticipatedActions: createListActions('anticipated', anticipatedFilterDefaults, set, get),
  abolishedActions: createListActions('abolished', abolishedFilterDefaults, set, get),
  employeeDatabaseActions: createListActions('employeeDatabase', employeeDatabaseFilterDefaults, set, get),
  orgStructureActions: createListActions('orgStructure', orgStructureFilterDefaults, set, get),
  contractualActions: createListActions('contractual', contractualFilterDefaults, set, get),
  trainingActions: createListActions('training', trainingFilterDefaults, set, get),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => {
    clearDepartmentCache();
    set(createInitialState());
  },

  /** Departments of the signed-in organisation and the organisation list, loaded once. */
  loadMasters: async (orgId) => {
    const { mastersOrgId, organisations, loadingMasters } = get();
    if (loadingMasters || (organisations.length > 0 && mastersOrgId === (orgId || null))) return;

    set({ loadingMasters: true, mastersError: null });
    const [deptRes, orgRes] = await Promise.allSettled([
      orgId ? fetchHrDepartments(orgId) : Promise.resolve({ data: [] }),
      fetchMmtDropdown('mmt_organisation'),
    ]);
    const failed = [deptRes, orgRes].filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.error('Failed to load HR reference data:', r.reason));
    set({
      departments: deptRes.status === 'fulfilled' ? asList(deptRes.value) : [],
      organisations: orgRes.status === 'fulfilled' ? asList(orgRes.value) : [],
      mastersOrgId: orgId || null,
      loadingMasters: false,
      mastersError: failed.length > 0 ? 'HR reference data' : null,
    });
  },
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useHrStore.getState().reset());
