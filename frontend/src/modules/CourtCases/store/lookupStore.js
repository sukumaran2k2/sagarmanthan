import { create } from "zustand";

const inflight = new Map();

/**
 * Cache for static master data (domains, departments, acts, states).
 * Loaded once and shared by every form instead of re-fetched on each mount.
 * `fetcher` must resolve to a ready-to-use options array.
 */
export const useLookupStore = create((set, get) => ({
  options: {},

  load: async (key, fetcher) => {
    if (get().options[key]?.length) return;
    if (inflight.has(key)) return inflight.get(key);

    const p = (async () => {
      try {
        const list = await fetcher();
        set((s) => ({ options: { ...s.options, [key]: list } }));
      } finally {
        inflight.delete(key);
      }
    })();

    inflight.set(key, p);
    return p;
  },

  // call on logout / organisation switch
  clear: () => set({ options: {} }),
}));
