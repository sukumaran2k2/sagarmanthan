import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { createListActions, listState } from './listSlice';

/**
 * HR list store.
 * Keeps what must survive switching between the HR pages: filters, search and pagination
 * of each server-paged list, and the open Vacancy Management tab.
 *   employees   = HR Administration & Actions
 *   overview    = Vacancy Management - Vacancy Overview
 *   anticipated = Vacancy Management - Anticipated Vacancies
 *   abolished   = List of Abolished Posts
 * Fetched rows are not kept here; they come from the HR request cache (usePagedList).
 */

export const CURRENT_YEAR = new Date().getFullYear().toString();

const employeesFilterDefaults = () => ({ departmentId: '', postId: '', className: '', exactMatch: false });
const overviewFilterDefaults = () => ({ departmentId: '', postId: '', className: '', abolishingOnly: false });
const anticipatedFilterDefaults = () => ({ departmentId: '', postId: '', className: '', years: [CURRENT_YEAR] });
const abolishedFilterDefaults = () => ({ organisationName: '', departmentName: '', postName: '', className: '' });

const createInitialState = () => ({
  vacancyTab: 'overview',
  employees: listState(employeesFilterDefaults()),
  overview: listState(overviewFilterDefaults()),
  anticipated: listState(anticipatedFilterDefaults()),
  abolished: listState(abolishedFilterDefaults()),
});

export const useHrListStore = create((set, get) => ({
  ...createInitialState(),

  setVacancyTab: (vacancyTab) => set({ vacancyTab }),

  employeesActions: createListActions('employees', employeesFilterDefaults, set, get),
  overviewActions: createListActions('overview', overviewFilterDefaults, set, get),
  anticipatedActions: createListActions('anticipated', anticipatedFilterDefaults, set, get),
  abolishedActions: createListActions('abolished', abolishedFilterDefaults, set, get),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useHrListStore.getState().reset());
