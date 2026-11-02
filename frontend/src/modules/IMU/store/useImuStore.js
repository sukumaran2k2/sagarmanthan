import { create } from 'zustand';
import { registerStoreReset } from '../../../stores/resetRegistry';
import { createListActions, listState } from './listSlice';
import {
  fetchStudentEnrollment, fetchNewCourseUpgradation, fetchFacilities, fetchPartnership, fetchResearch,
} from '../api';

/**
 * KPI IMU store.
 * Keeps what must survive switching section or tab: each section's Data List search,
 * financial year, pagination and column visibility, plus each server-paged section's list
 * of financial years (loaded once).
 * The record being edited travels with the route (location.state); fetched rows stay
 * in the module shell.
 */

// Server-paged sections -> list fetcher (used here only to load their financial years).
// Final Year Pass % has no financial year; it is filtered and paged in the browser.
const YEAR_SOURCES = {
  studentEnrollment: fetchStudentEnrollment,
  newCourseUpgradation: fetchNewCourseUpgradation,
  facilities: fetchFacilities,
  partnership: fetchPartnership,
  research: fetchResearch,
};
export const IMU_SECTION_IDS = [
  'studentEnrollment', 'finalYearPassPercentage', 'newCourseUpgradation', 'facilities', 'partnership', 'research',
];

// visibleCols: null until the user changes it, so each Data List supplies its own default columns
const filterDefaults = () => ({ financialYear: '' });
const sectionState = () => ({ ...listState(filterDefaults()), visibleCols: null });

const createInitialState = () => ({
  ...Object.fromEntries(IMU_SECTION_IDS.map((id) => [id, sectionState()])),
  years: {}, // section id -> financial years, newest first
});

export const useImuStore = create((set, get) => ({
  ...createInitialState(),

  // One set of list actions per section, e.g. researchActions.setCurrentPage(2)
  ...Object.fromEntries(IMU_SECTION_IDS.map((id) => [`${id}Actions`, createListActions(id, filterDefaults, set, get)])),

  // Financial years for a section's dropdown, fetched once per section
  loadYears: async (sectionId) => {
    const fetcher = YEAR_SOURCES[sectionId];
    if (!fetcher || get().years[sectionId]) return;
    set((state) => ({ years: { ...state.years, [sectionId]: [] } })); // marks it as loading
    try {
      const res = await fetcher({ page: 1, limit: 100 });
      const years = [...new Set((res.data?.data || []).map((r) => r.financial_year).filter(Boolean))].sort().reverse();
      set((state) => ({ years: { ...state.years, [sectionId]: years } }));
    } catch (err) {
      console.error(`Failed to load IMU financial years (${sectionId}):`, err);
      // Allow a retry next time the section opens
      set((state) => {
        const years = { ...state.years };
        delete years[sectionId];
        return { years };
      });
    }
  },

  // Restore defaults (called on logout so nothing carries over to the next session)
  reset: () => set(createInitialState()),
}));

// Logout calls resetAllStores(); registering here is all that's needed
registerStoreReset(() => useImuStore.getState().reset());
