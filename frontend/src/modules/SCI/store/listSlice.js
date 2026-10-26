/**
 * List state shared by the SCI sections: filters, search, filter panel, pagination.
 * Each section's list lives in its own slice of the SCI store, keyed by section id
 * (e.g. 'timeVoyageBulk'). Same shape as the KPI Major Ports and HR list slices.
 */

export const listState = (filters) => ({
  ...filters,
  searchTerm: '',
  debouncedSearch: '',
  showFilterPanel: false,
  currentPage: 1,
  pageSize: 10,
});

// Accept a value or an updater function, like React's setState
export const resolve = (updater, prev) => (typeof updater === 'function' ? updater(prev) : updater);

/** Same actions for every list; each one only touches its own slice. */
export function createListActions(key, filterDefaults, set, get) {
  const patch = (changes) => set((state) => ({ [key]: { ...state[key], ...changes } }));

  return {
    setSearchTerm: (searchTerm) => patch({ searchTerm }),

    // The debounce also fires on mount; skip it when nothing changed so the page is kept
    setDebouncedSearch: (debouncedSearch) => {
      if (get()[key].debouncedSearch === debouncedSearch) return;
      patch({ debouncedSearch, currentPage: 1 });
    },

    // Any filter change returns to page 1
    setFilters: (changes) => patch({ ...changes, currentPage: 1 }),

    setShowFilterPanel: (updater) =>
      set((state) => ({
        [key]: { ...state[key], showFilterPanel: resolve(updater, state[key].showFilterPanel) },
      })),

    setCurrentPage: (updater) =>
      set((state) => ({
        [key]: { ...state[key], currentPage: resolve(updater, state[key].currentPage) },
      })),

    setPageSize: (pageSize) => patch({ pageSize, currentPage: 1 }),

    resetFilters: () => patch({ ...filterDefaults(), currentPage: 1 }),

    setVisibleCols: (updater) =>
      set((state) => ({
        [key]: { ...state[key], visibleCols: resolve(updater, state[key].visibleCols) },
      })),
  };
}
