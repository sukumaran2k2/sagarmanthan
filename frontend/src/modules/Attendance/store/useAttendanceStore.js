import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';

/**
 * Attendance module store.
 * Holds state that should survive switching between the module's tabs:
 *  - DataList filters (wing / month / year / week), search, filter panel,
 *    page size and column visibility
 *  - the report period (month / year / week); null until the latest uploaded
 *    period has been looked up
 *
 * Fetched rows stay in the pages; the drill-down list is local to the report.
 */
export const DEFAULT_VISIBLE_COLS = {
  EmpId: true,
  EmpName: true,
  Wing: true,
  Division: true,
  Designation: true,
  AttendanceMarked: true,
  WorkingHours: true,
  InTimeAvg: true,
  OutTimeAvg: true,
};

const DEFAULT_FILTERS = { wing: 'All', month: 'All', year: 'All', week: 'All' };

const initialState = {
  // DataList
  filters: DEFAULT_FILTERS,
  searchTerm: '',
  showFilterPanel: false,
  pageSize: 10,
  visibleCols: DEFAULT_VISIBLE_COLS,

  // Report
  reportPeriod: null, // { month, year, week }
};

// Accepts either a value or an updater function, like React's setState
const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

export const useAttendanceStore = create((set) => ({
  ...initialState,

  setFilters: (changes) => set((state) => ({ filters: { ...state.filters, ...changes } })),
  resetFilters: () => set({ filters: DEFAULT_FILTERS, searchTerm: '' }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setShowFilterPanel: (updater) => set((state) => ({ showFilterPanel: resolve(updater, state.showFilterPanel) })),
  setPageSize: (pageSize) => set({ pageSize }),
  setVisibleCols: (updater) => set((state) => ({ visibleCols: resolve(updater, state.visibleCols) })),

  setReportPeriod: (changes) => set((state) => ({ reportPeriod: { ...state.reportPeriod, ...changes } })),

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(initialState),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useAttendanceStore.getState().reset());
