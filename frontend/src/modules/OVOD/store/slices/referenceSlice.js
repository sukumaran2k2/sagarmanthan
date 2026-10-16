import { fetchOrganisations } from '../../api';

/**
 * Reference data shared by the Dashboard, Intervention List and Add Initiative form.
 * Fetched once and cached for the session (reset on logout).
 */
export const createInitialReferenceState = () => ({
  organisations: [],
  loadingOrganisations: false,
});

// The endpoint returns { ia_id, ia_name } rows; accept the older organisation_* names too
const normalizeOrganisation = (org) => ({
  ia_id: org.ia_id ?? org.organisation_id,
  ia_name: org.ia_name ?? org.organisation_name ?? '',
});

export const createReferenceSlice = (set, get) => ({
  ...createInitialReferenceState(),

  loadOrganisations: async () => {
    const { organisations, loadingOrganisations } = get();
    if (organisations.length > 0 || loadingOrganisations) return;

    set({ loadingOrganisations: true });
    try {
      const rows = await fetchOrganisations();
      const list = (Array.isArray(rows) ? rows : [])
        .map(normalizeOrganisation)
        .filter((org) => org.ia_id !== undefined && org.ia_id !== null);
      // An empty list is not cached, so the next page that needs it tries again
      set({ organisations: list, loadingOrganisations: false });
    } catch (err) {
      console.error('Failed to load OVOD organisations:', err);
      set({ loadingOrganisations: false });
    }
  },
});
