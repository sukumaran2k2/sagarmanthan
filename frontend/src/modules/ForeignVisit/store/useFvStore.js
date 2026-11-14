import { create } from 'zustand';
import {
  fetchOrganisations,
  fetchDesignations,
  fetchVisitTypes,
  fetchVisitStages,
  fetchCountries,
} from '../api';
import { registerStoreReset } from '../../../stores/resetRegistry';

const initialState = {
  // Reference data, loaded once per session and shared by all four pages
  organisations: [],
  designations: [],
  visitTypes: [],
  // The unfiltered master, kept so a saved record whose type was de-duplicated out of
  // `visitTypes` can still be resolved back to its name.
  allVisitTypes: [],
  stages: [],
  countries: [],
  loadingMetadata: false,
  metadataError: null,

  // Data List view state
  activeTab: 'ongoing',
  searchTerm: '',
  selectedOrganisation: 'All',
  selectedStage: 'All',
  selectedVisitType: 'All',
  selectedYear: 'All',
  showFilterPanel: false,
  pageSize: 10,
};

export const useFvStore = create((set, get) => ({
  ...initialState,

  setActiveTab: (activeTab) => set({ activeTab, selectedStage: 'All' }),
  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setSelectedOrganisation: (selectedOrganisation) => set({ selectedOrganisation }),
  setSelectedStage: (selectedStage) => set({ selectedStage }),
  setSelectedVisitType: (selectedVisitType) => set({ selectedVisitType }),
  setSelectedYear: (selectedYear) => set({ selectedYear }),
  toggleFilterPanel: () => set((s) => ({ showFilterPanel: !s.showFilterPanel })),
  setPageSize: (pageSize) => set({ pageSize }),

  resetFilters: () =>
    set({
      searchTerm: '',
      selectedOrganisation: 'All',
      selectedStage: 'All',
      selectedVisitType: 'All',
      selectedYear: 'All',
    }),

  reset: () => set(initialState),

  /**
   * Load the five master lists once. Uses allSettled so one failing master does not blank the
   * other four -- a missing dropdown degrades that one field rather than the whole form.
   */
  loadMetadata: async () => {
    const { organisations, loadingMetadata } = get();
    if (organisations.length > 0 || loadingMetadata) return;

    set({ loadingMetadata: true, metadataError: null });

    const [orgRes, desigRes, typeRes, stageRes, countryRes] = await Promise.allSettled([
      fetchOrganisations(),
      fetchDesignations(),
      fetchVisitTypes(),
      fetchVisitStages(),
      fetchCountries(),
    ]);

    const failed = [orgRes, desigRes, typeRes, stageRes, countryRes].filter((r) => r.status === 'rejected');
    failed.forEach((r) => console.error('Failed to load Foreign Visit reference data:', r.reason));

    const data = (res) => (res.status === 'fulfilled' ? res.value.data || [] : []);

    // mmt_ofv_visit_type holds a few duplicated names under different ids (ANF Committee Meeting
    // appears three times). Keep the first id per name so the picker reads cleanly. Existing rows
    // may point at one of the dropped ids, so the full list is kept alongside and the form adds
    // the record's own type back when it is missing.
    const allVisitTypes = data(typeRes);
    const seenType = new Set();
    const visitTypes = allVisitTypes.filter((t) => {
      const name = String(t.visit_type_name || '').trim();
      if (!name || seenType.has(name.toLowerCase())) return false;
      seenType.add(name.toLowerCase());
      return true;
    });

    set({
      organisations: data(orgRes),
      designations: data(desigRes),
      visitTypes,
      allVisitTypes,
      stages: data(stageRes),
      countries: data(countryRes),
      loadingMetadata: false,
      metadataError: failed.length > 0 ? 'Some dropdown lists could not be loaded.' : null,
    });
  },
}));

registerStoreReset(() => useFvStore.getState().reset());
