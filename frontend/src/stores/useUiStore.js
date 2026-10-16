import { create } from 'zustand';

/**
 * Global UI & Theme Store
 * Centralized control for platform-wide styling properties, layout density,
 * and module aesthetics.
 */
export const useUiStore = create((set) => ({
  // Global layout theme properties
  density: 'comfortable', // 'compact' | 'comfortable' | 'spacious'
  headerColor: '#0f417a',
  internalNavColor: '#0f417a',

  // Actions
  setDensity: (density) => set({ density }),
  setHeaderColor: (headerColor) => set({ headerColor }),
  setInternalNavColor: (internalNavColor) => set({ internalNavColor }),
}));
